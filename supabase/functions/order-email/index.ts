// Emails a website customer when their order moves on in the Pod: "Order posted" when a posted order
// is marked Sent, "Ready to pick up" when a pick-up order is marked Packed. Each order gets one of
// these, once. Called by the Pod with the signed-in admin's access token.

import { createClient } from "npm:@supabase/supabase-js@2";
import { orderValues, sendTemplate, type WebOrder } from "../_shared/email.ts";

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

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST." }, 405);
  if (!(await isAdmin(req))) return json({ error: "Not allowed." }, 401);
  const { orderId, status } = await req.json().catch(() => ({}));
  if (!orderId || !status) return json({ error: "Missing the order or its status." }, 400);

  const { data: web } = await db
    .from("web_orders")
    .select("update_emailed_at, checkout:checkouts(delivery)")
    .eq("order_id", orderId)
    .maybeSingle();
  // Only website orders with something to post or pick up, and only once.
  const delivery = (web?.checkout as { delivery: { needs_address: boolean } | null } | null)?.delivery;
  if (!web || !delivery || web.update_emailed_at) return json({ sent: false });
  const template = delivery.needs_address ? (status === "sent" ? "order_posted" : null) : status === "packed" ? "order_ready" : null;
  if (!template) return json({ sent: false });

  const { data: claimed } = await db
    .from("web_orders")
    .update({ update_emailed_at: new Date().toISOString() })
    .eq("order_id", orderId)
    .is("update_emailed_at", null)
    .select("name, email, address, delivery, delivery_price, total, items");
  const order = claimed?.[0] as WebOrder | undefined;
  if (!order?.email) return json({ sent: false });
  const sent = await sendTemplate(db, template, { name: order.name, email: order.email }, orderValues(order), { orderId });
  // Not sent (switched off, or Fastmail failed): free it up to be tried next time.
  if (!sent) await db.from("web_orders").update({ update_emailed_at: null }).eq("order_id", orderId);
  return json({ sent, template, to: order.email });
});
