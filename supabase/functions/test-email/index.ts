// Sends a test of an automatic email (Pod › Replies, "Send me a test email") to the business's own
// inbox, so it can be seen as customers will see it. Only ever sends to the business address.
// Called by the Pod with the signed-in admin's access token.

import { createClient } from "npm:@supabase/supabase-js@2";
import { BUSINESS, sendEmail } from "../_shared/email.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const PUBLISHABLE_KEY =
  JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") ?? "{}").default ?? Deno.env.get("SUPABASE_ANON_KEY")!;

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
  // Made in the Pod with renderEmail, exactly as a customer would get it.
  const { subject, text, html } = await req.json().catch(() => ({}));
  if (!subject || !text) return json({ error: "Missing the subject or message." }, 400);
  try {
    await sendEmail({
      to: BUSINESS,
      subject: `TEST: ${String(subject).slice(0, 300)}`,
      text: String(text).slice(0, 20000),
      html: html ? String(html).slice(0, 200000) : undefined,
    });
    return json({ ok: true, to: BUSINESS.email });
  } catch (e) {
    console.error(e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 502);
  }
});
