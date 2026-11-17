// Stripe tells this function when a website checkout is paid; it turns the checkout into an order
// in the Pod (record_web_order) with the customer's name, contact details and delivery address, and
// emails the customer (order received and/or workshop booking, from the Pod's Replies).
//
// Every request is checked against the STRIPE_WEBHOOK_SECRET signing secret, so only Stripe can
// add orders. Set up in Stripe as a webhook endpoint for checkout.session.completed,
// checkout.session.async_payment_succeeded and checkout.session.expired.

import { createClient } from "npm:@supabase/supabase-js@2";
import { orderEmail, sendTemplate, WEB_ORDER_COLUMNS, type WebOrder } from "../_shared/email.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const TOLERANCE_SECONDS = 300;

/** Whether the request really came from Stripe: an HMAC of "timestamp.body" with the signing secret. */
async function fromStripe(body: string, header: string | null) {
  const parts = Object.fromEntries((header ?? "").split(",").map((p) => p.split("=") as [string, string]));
  const signatures = (header ?? "").split(",").filter((p) => p.startsWith("v1=")).map((p) => p.slice(3));
  const timestamp = Number(parts.t);
  if (!timestamp || !signatures.length || Math.abs(Date.now() / 1000 - timestamp) > TOLERANCE_SECONDS) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(Deno.env.get("STRIPE_WEBHOOK_SECRET")!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${body}`)));
  const expected = [...mac].map((b) => b.toString(16).padStart(2, "0")).join("");
  // Compared in full whatever the contents, so timing doesn't give anything away.
  return signatures.some((s) => s.length === expected.length && [...s].reduce((d, c, i) => d | (c.charCodeAt(0) ^ expected.charCodeAt(i)), 0) === 0);
}

type Address = { line1?: string; line2?: string; city?: string; state?: string; postal_code?: string; country?: string };

/** "12 Main St, Lawson NSW 2783" */
const addressText = (a?: Address | null) =>
  a ? [a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(" ")].filter(Boolean).join(", ") : "";

/** The order-received and workshop-booking emails, once per order. */
async function emailNewOrder(orderId: string) {
  // Claimed before sending, so the same Stripe event arriving twice doesn't send them twice.
  const { data: claimed } = await db
    .from("web_orders")
    .update({ received_emailed_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .is("received_emailed_at", null)
    .select(WEB_ORDER_COLUMNS);
  const order = claimed?.[0] as WebOrder | undefined;
  if (!order?.email) return;
  const { values, receipts } = orderEmail(order);
  const to = { name: order.name, email: order.email };
  if (receipts.items) await sendTemplate(db, "order_received", to, values, { orderId, receipts });
  if (receipts.workshops) await sendTemplate(db, "workshop_booking", to, values, { orderId, receipts });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Not allowed", { status: 405 });
  const body = await req.text();
  if (!(await fromStripe(body, req.headers.get("Stripe-Signature")))) return new Response("Bad signature", { status: 400 });

  const event = JSON.parse(body);
  const session = event.data?.object ?? {};
  const checkoutId = session.metadata?.checkout_id ?? session.client_reference_id;
  if (!checkoutId) return new Response("ok");

  try {
    if (
      (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") &&
      session.payment_status === "paid"
    ) {
      // Newer Stripe API versions put the delivery address under collected_information.
      const shipping = session.collected_information?.shipping_details ?? session.shipping_details;
      const { data: orderId, error } = await db.rpc("record_web_order", {
        checkout_id: checkoutId,
        name: shipping?.name ?? session.customer_details?.name ?? "",
        email: session.customer_details?.email ?? "",
        phone: session.customer_details?.phone ?? "",
        address: addressText(shipping?.address),
        total: (session.amount_total ?? 0) / 100,
      });
      if (error) throw error;
      await emailNewOrder(orderId);
    } else if (event.type === "checkout.session.expired") {
      await db.from("checkouts").update({ status: "expired" }).eq("id", checkoutId).eq("status", "open");
    }
    return new Response("ok");
  } catch (error) {
    // Stripe tries again later when it doesn't get a 2xx.
    console.error(error);
    return new Response("Couldn't record the order", { status: 500 });
  }
});
