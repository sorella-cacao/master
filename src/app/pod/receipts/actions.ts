"use server";

import { revalidatePath } from "next/cache";
import type { ReceiptFile } from "@/lib/receipts";
import type { SaveState } from "../actions";
import { getSession } from "../session";

type SyncResult = {
  connected?: boolean;
  filed?: number;
  failed?: number;
  more?: boolean;
  error?: string;
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** Runs the Fastmail check straight away instead of waiting for Monday. */
export async function checkReceipts(): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return { error: "This account doesn't have access to the Pod." };

  const { data, error } = await supabase.functions.invoke<SyncResult>("sync-receipts", { method: "POST" });
  if (error || !data) {
    console.error(error);
    return { error: "Couldn't reach the receipts checker. Please try again." };
  }
  if (data.connected === false) {
    return { error: "Fastmail isn't connected yet, so there's nothing to check." };
  }
  if (data.error) return { error: `Couldn't check Fastmail: ${data.error}` };

  revalidatePath("/pod/receipts");
  const filed = data.filed ?? 0;
  const parts = [filed ? `Filed ${plural(filed, "new receipt")}.` : "No new receipts."];
  if (data.failed) parts.push(`${plural(data.failed, "email")} couldn't be filed and will be tried again.`);
  if (data.more) parts.push("There are more to file. Press Check now again.");
  return { ok: parts.join(" ") };
}

function money(data: FormData, name: string) {
  const raw = String(data.get(name) ?? "").trim().replace(/^\$/, "");
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.round(value * 100) / 100 : undefined;
}

export async function saveReceipt(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return { error: "This account doesn't have access to the Pod." };

  const amount = money(data, "amount");
  const gst = money(data, "gst");
  if (amount === undefined || gst === undefined) return { error: "Enter amounts as numbers, e.g. 24.95." };
  if (amount !== null && gst !== null && gst > amount) return { error: "GST can't be more than the total." };

  const { error } = await supabase
    .from("receipts")
    .update({ amount, gst, note: String(data.get("note") ?? "").trim() || null })
    .eq("id", String(data.get("id")));
  if (error) {
    console.error(error);
    return { error: "Couldn't save. Please try again." };
  }
  revalidatePath("/pod/receipts");
  return { ok: "Saved" };
}

export async function deleteReceipt(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return { error: "This account doesn't have access to the Pod." };

  const id = String(data.get("id"));
  const { data: receipt } = await supabase.from("receipts").select("files").eq("id", id).single();
  const paths = ((receipt?.files ?? []) as ReceiptFile[]).map((f) => f.path);
  if (paths.length) {
    const { error } = await supabase.storage.from("receipts").remove(paths);
    if (error) {
      console.error(error);
      return { error: "Couldn't delete the files. Please try again." };
    }
  }
  const { error } = await supabase.from("receipts").delete().eq("id", id);
  if (error) {
    console.error(error);
    return { error: "Couldn't delete. Please try again." };
  }
  revalidatePath("/pod/receipts");
  return { ok: "Deleted" };
}
