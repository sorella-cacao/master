// Emails a customer their order's carrier and tracking number ("Shipping & tracking" in Pod › Replies),
// for a website order or a spontaneous buy, and keeps them on the order. Sent when the Pod's "Email
// shipping" is pressed, so it can be sent again (e.g. after a typo). Called by the Pod with the
// signed-in admin's access token.

import { createClient } from "npm:@supabase/supabase-js@2";
import { sendTemplate } from "../_shared/email.ts";
import { firstName, linesReceipt, trackingLink, webReceipt } from "../_shared/shipping.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const PUBLISHABLE_KEY =
  JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}").default ?? Deno.env.get("SUPABASE_ANON_KEY")!;
const db = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** A signed-in admin. */
async function isAdmin(req: Request) {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const asUser = createClient(SUPABASE_URL, PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });
  const { data } = await asUser.auth.getClaims(token);
  const userId = data?.claims?.sub;
  if (!userId) return false;
  // Row level security only shows the admins list to admins.
  const { data: row } = await asUser.from("admins").select("user_id").eq("user_id", userId).maybeSingle();
  return !!row;
}

type Line = {
  quantity: number;
  unit_price: number;
  item: { name: string; parent: { name: string } | { name: string }[] | null; product: { title: string } | null } | null;
};
/** A fruit under Local Fruit is named like "75% Dark & Local Fig". */
function lineName(l: Line) {
  const parent = [l.item?.parent].flat()[0];
  return `${l.item?.product?.title ?? "Item"}, ${parent ? parent.name.replace("Fruit", l.item?.name ?? "") : (l.item?.name ?? "")}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  if (!(await isAdmin(req))) return json({ error: "Not allowed." }, 401);
  const body = await req.json().catch(() => ({}));
  const orderId = String(body.orderId ?? "");
  const name = String(body.name ?? "").trim().slice(0, 200);
  const email = String(body.email ?? "").trim().slice(0, 200);
  const carrier = String(body.carrier ?? "").trim().slice(0, 60);
  const tracking = String(body.tracking ?? "").trim().slice(0, 80);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Enter the customer’s email address." }, 400);
  if (!carrier) return json({ error: "Choose the carrier." }, 400);
  if (!tracking) return json({ error: "Enter the tracking number." }, 400);

  const { data: order } = await db
    .from("orders")
    .select(
      "id, customer, kind, lines:order_lines(quantity, unit_price, item:stock_items(name, parent:stock_items!stock_items_parent_id_fkey(name), product:products(title))), web:web_orders(name, address, delivery, delivery_price, items, label_fees)",
    )
    .eq("id", orderId)
    .maybeSingle();
  if (!order) return json({ error: "That order no longer exists." }, 404);
  if (order.kind !== "web" && order.kind !== "spontaneous") return json({ error: "Shipping emails are for website orders and spontaneous buys." }, 400);

  // deno-lint-ignore no-explicit-any
  const web = (Array.isArray(order.web) ? order.web[0] : order.web) as any;
  const receipt = web
    ? webReceipt(web)
    : linesReceipt(
        (order.lines as unknown as Line[]).map((l) => ({
          name: lineName(l),
          quantity: l.quantity,
          unit_price: l.unit_price,
        })),
      );
  const who = name || web?.name || order.customer;
  const values = {
    first_name: firstName(who),
    name: who,
    carrier,
    tracking_number: tracking,
    tracking_link: trackingLink(carrier, tracking),
    address: web?.address ?? "",
    items: "",
  };
  const sent = await sendTemplate(db, "order_shipped", { name: who, email }, values, {
    orderId,
    receipts: receipt ? { items: receipt } : {},
  });
  if (!sent) {
    const { data: template } = await db.from("email_templates").select("enabled").eq("key", "order_shipped").maybeSingle();
    if (!template?.enabled) return json({ error: "The Shipping & tracking email is switched off. Tick “Send this email” below first." }, 400);
    const { data: last } = await db.from("sent_emails").select("error").eq("order_id", orderId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    return json({ error: `Couldn’t send it${last?.error ? `: ${last.error}` : "."}` }, 502);
  }

  await db
    .from("orders")
    .update({ ship_email: email, ship_carrier: carrier, ship_tracking: tracking, ship_emailed_at: new Date().toISOString() })
    .eq("id", orderId);
  // Website customers then don't also get the "Order posted" email when it's marked Sent.
  if (web) await db.from("web_orders").update({ update_emailed_at: new Date().toISOString() }).eq("order_id", orderId).is("update_emailed_at", null);
  return json({ sent: true, to: email });
});
