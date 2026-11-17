"use server";

import { revalidatePath } from "next/cache";
import type { SaveState } from "../actions";
import { getSession } from "../session";

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

export async function deleteMessage(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const { error } = await supabase.from("contact_messages").delete().eq("id", text(data, "id"));
  if (error) return { error: "Couldn't delete. Please try again." };
  revalidatePath("/pod/replies");
  return { ok: "Deleted" };
}
