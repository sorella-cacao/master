// Automatic emails: the wording comes from the email_templates table (edited in the Pod's Replies
// page) and each one is sent from chocolate@sorellacacao.com.au through Fastmail's JMAP API. Needs
// the FASTMAIL_API_TOKEN secret with Email and Email submission access. Every email is recorded in
// sent_emails, with the reason when it couldn't be sent.

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export const BUSINESS = { name: "Sorella Cacao", email: "chocolate@sorellacacao.com.au" };

type Address = { name?: string | null; email: string };
export type Outgoing = { to: Address; subject: string; text: string; replyTo?: Address };

const USING = ["urn:ietf:params:jmap:core", "urn:ietf:params:jmap:mail", "urn:ietf:params:jmap:submission"];

/** Sends one plain-text email from the business address, filed in Sent. */
export async function sendEmail(email: Outgoing) {
  const token = Deno.env.get("FASTMAIL_API_TOKEN");
  if (!token) throw new Error("Fastmail isn't connected (no FASTMAIL_API_TOKEN secret).");
  const auth = { Authorization: `Bearer ${token}` };
  const sessionRes = await fetch("https://api.fastmail.com/jmap/session", { headers: auth });
  if (!sessionRes.ok) throw new Error(`Fastmail refused the API token (${sessionRes.status}).`);
  const session = await sessionRes.json();
  if (!session.capabilities["urn:ietf:params:jmap:submission"]) {
    throw new Error("The Fastmail API token can't send email. It needs Email submission access.");
  }
  const accountId: string = session.primaryAccounts["urn:ietf:params:jmap:submission"] ?? session.primaryAccounts["urn:ietf:params:jmap:mail"];

  async function jmap(methodCalls: unknown[]) {
    const res = await fetch(session.apiUrl, {
      method: "POST",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ using: USING, methodCalls }),
    });
    if (!res.ok) throw new Error(`Fastmail request failed (${res.status}).`);
    const { methodResponses } = await res.json();
    for (const [name, result] of methodResponses) {
      if (name === "error") throw new Error(`Fastmail error: ${result.type}`);
    }
    // deno-lint-ignore no-explicit-any
    return methodResponses as [string, Record<string, any>, string][];
  }

  const [[, identities], [, drafts], [, sent]] = await jmap([
    ["Identity/get", { accountId }, "identities"],
    ["Mailbox/query", { accountId, filter: { role: "drafts" } }, "drafts"],
    ["Mailbox/query", { accountId, filter: { role: "sent" } }, "sent"],
  ]);
  const identity = identities.list.find((i: { email: string }) => i.email.toLowerCase() === BUSINESS.email);
  if (!identity) throw new Error(`Fastmail has no sending identity for ${BUSINESS.email}.`);
  const draftsId: string = drafts.ids[0];
  const sentId: string | undefined = sent.ids[0];

  // Made as a draft, then submitted; once it's sent it moves to Sent.
  const responses = await jmap([
    [
      "Email/set",
      {
        accountId,
        create: {
          message: {
            mailboxIds: { [draftsId]: true },
            keywords: { $draft: true, $seen: true },
            from: [BUSINESS],
            to: [email.to],
            ...(email.replyTo ? { replyTo: [email.replyTo] } : {}),
            subject: email.subject,
            bodyValues: { text: { value: email.text } },
            textBody: [{ partId: "text", type: "text/plain" }],
          },
        },
      },
      "email",
    ],
    [
      "EmailSubmission/set",
      {
        accountId,
        create: { send: { identityId: identity.id, emailId: "#message" } },
        onSuccessUpdateEmail: {
          "#send": { [`mailboxIds/${draftsId}`]: null, ...(sentId ? { [`mailboxIds/${sentId}`]: true } : {}), "keywords/$draft": null },
        },
      },
      "submit",
    ],
  ]);
  const created = responses.find(([name]) => name === "Email/set")?.[1];
  if (!created?.created?.message) throw new Error(`Fastmail didn't make the email (${created?.notCreated?.message?.type ?? "unknown"}).`);
  const submitted = responses.find(([name]) => name === "EmailSubmission/set")?.[1];
  if (!submitted?.created?.send) {
    const reason = submitted?.notCreated?.send;
    throw new Error(
      reason?.type === "forbidden" ? "The Fastmail API token can't send email. It needs Email submission access." : `Fastmail didn't send it (${reason?.type ?? "unknown"}).`,
    );
  }
}

/** "Hi {first_name}" → "Hi Anna". Unknown placeholders are left as they are. */
export const fill = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (whole, key) => (key in values ? values[key] : whole));

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

/**
 * Sends a template's email (when it's switched on) and records it in sent_emails. Returns whether it
 * was sent; never throws, so a failed email never stops an order being saved.
 */
export async function sendTemplate(
  db: SupabaseClient,
  key: string,
  to: Address,
  values: Record<string, string>,
  { orderId, replyTo }: { orderId?: string; replyTo?: Address } = {},
) {
  const { data: template } = await db.from("email_templates").select("subject, body, enabled").eq("key", key).maybeSingle();
  if (!template?.enabled) return false;
  const subject = fill(template.subject, values);
  let error: string | null = null;
  try {
    await sendEmail({ to, subject, text: fill(template.body, values), replyTo });
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    console.error(`Couldn't send ${key} to ${to.email}:`, error);
  }
  await db.from("sent_emails").insert({ template: key, to_email: to.email, subject, order_id: orderId ?? null, error });
  return !error;
}

const money = (n: number) => `$${Number(n).toFixed(2)}`;

type Item = { title: string; variant: string; quantity: number; unit_price: number; label: string | null; workshop: boolean };
export type WebOrder = { name: string; email: string; address: string; delivery: string; delivery_price: number; total: number; items: Item[] };

/** The placeholders for a website order's emails. */
export function orderValues(order: WebOrder) {
  const line = (i: Item) => `${i.quantity} × ${i.title} – ${i.variant}${i.label ? ` (label: “${i.label}”)` : ""}`;
  return {
    first_name: firstName(order.name),
    name: order.name,
    items: order.items.filter((i) => !i.workshop).map(line).join("\n"),
    workshops: order.items.filter((i) => i.workshop).map(line).join("\n"),
    total: money(order.total),
    delivery: order.delivery
      ? `${order.delivery}${Number(order.delivery_price) ? ` (${money(order.delivery_price)})` : " (free)"}${order.address ? `: ${order.address}` : ""}`
      : "",
    address: order.address,
  };
}
