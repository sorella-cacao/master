"use server";

import { revalidatePath } from "next/cache";
import type { SaveState } from "../actions";
import { getSession } from "../session";
import { renderEmail } from "../../../../supabase/functions/_shared/email-html";
import { SAMPLES } from "./placeholders";

const NO_ACCESS: SaveState = { error: "This account doesn't have access to the Pod." };

const text = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

export async function saveReply(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const subject = text(data, "subject");
  const body = String(data.get("body") ?? "").trim();
  if (!subject) return { error: "Enter a subject." };
  if (!body) return { error: "Enter the message." };
  const enabled = data.get("enabled") === "on";
  const { error } = await supabase.from("email_templates").update({ subject, body, enabled }).eq("key", text(data, "key"));
  if (error) {
    console.error(error);
    return { error: "Couldn't save. Please try again." };
  }
  revalidatePath("/pod/replies");
  return { ok: enabled ? "Saved. This email is switched on." : "Saved. It won’t be sent until you tick “Send this email”." };
}

/** Sends an email as it's written now (saved or not), with the sample details, to the business inbox. */
export async function sendTestReply(key: string, subject: string, body: string): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  if (!subject.trim() || !body.trim()) return { error: "Write a subject and message first." };
  const sample = SAMPLES[key] ?? { values: {}, receipts: {} };
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; to?: string; error?: string }>("test-email", {
    body: renderEmail(subject, body, sample.values, sample.receipts),
  });
  if (error || !data?.ok) {
    const reason = error && "context" in error ? await (error.context as Response).json().catch(() => null) : null;
    return { error: reason?.error ?? data?.error ?? "Couldn't send the test. Please try again." };
  }
  return { ok: `Test sent to ${data.to}. Check your inbox.` };
}

/** Emails an order's carrier and tracking number to the customer, and keeps them on the order. */
export async function sendShippingEmail(
  orderId: string,
  fields: { name: string; email: string; carrier: string; tracking: string },
): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const { data, error } = await supabase.functions.invoke<{ sent?: boolean; to?: string; error?: string }>("shipping-email", {
    body: { orderId, ...fields },
  });
  if (error || !data?.sent) {
    const reason = error && "context" in error ? await (error.context as Response).json().catch(() => null) : null;
    return { error: reason?.error ?? data?.error ?? "Couldn't send it. Please try again." };
  }
  revalidatePath("/pod/orders");
  revalidatePath("/pod/replies");
  return { ok: `Sent to ${data.to}.` };
}

export async function deleteMessage(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const { error } = await supabase.from("contact_messages").delete().eq("id", text(data, "id"));
  if (error) return { error: "Couldn't delete. Please try again." };
  revalidatePath("/pod/replies");
  return { ok: "Deleted" };
}
