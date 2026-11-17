// The website's contact form: keeps the message (Pod › Replies), emails it to the business with Reply
// going to the sender, and sends the sender the "Contact form reply" from the Pod's Replies.
//
// Anyone can call it, so it's kept from being used to send lots of email: a hidden field that only
// bots fill in, sensible lengths, and a few messages an hour per email address and per connection.

import { createClient } from "npm:@supabase/supabase-js@2";
import { BUSINESS, firstName, sendEmail, sendTemplate } from "../_shared/email.ts";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const MAX_PER_HOUR = 3;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const clean = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Not allowed" }, 405);
  const body = await req.json().catch(() => ({}));

  // Filled in only by bots, which are told it went through.
  if (clean(body.website, 200)) return json({ ok: true });

  const name = clean(body.name, 100);
  const email = clean(body.email, 200).toLowerCase();
  const message = clean(body.message, 5000);
  if (!name || !message) return json({ error: "Please fill in your name and message." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Please check your email address." }, 400);

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "";
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const sentSince = async (column: "email" | "sender_ip", value: string) => {
    if (!value) return 0;
    const { count } = await db.from("contact_messages").select("id", { count: "exact", head: true }).gte("created_at", hourAgo).eq(column, value);
    return count ?? 0;
  };
  if ((await sentSince("email", email)) >= MAX_PER_HOUR || (await sentSince("sender_ip", ip)) >= MAX_PER_HOUR) {
    return json({ error: "Thanks, we’ve already got your messages. We’ll be in touch soon." }, 429);
  }

  const { error } = await db.from("contact_messages").insert({ name, email, message, sender_ip: ip });
  if (error) {
    console.error(error);
    return json({ error: "Your message couldn’t be sent. Please email us instead." }, 500);
  }

  // To the business first; the reply to the sender doesn't matter as much.
  try {
    await sendEmail({
      to: BUSINESS,
      replyTo: { name, email },
      subject: `Website message from ${name}`,
      text: `${message}\n\n— ${name}\n${email}\n\n(Sent from the contact form on the website. Reply to answer them.)`,
    });
  } catch (e) {
    // Still kept in the Pod, so it isn't lost.
    console.error("Couldn't email the message to the business:", e);
  }
  await sendTemplate(db, "contact_reply", { name, email }, { first_name: firstName(name), name, message });
  return json({ ok: true });
});
