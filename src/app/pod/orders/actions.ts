"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isDate } from "@/lib/weeks";
import type { SaveState } from "../actions";
import { getSession } from "../session";

const NO_ACCESS: SaveState = { error: "This account doesn't have access to the Pod." };

function refresh() {
  revalidatePath("/pod/orders");
  revalidatePath("/pod/stock");
}

/** Messages raised by the database functions are written for people; show them as-is. */
function failed(error: { message?: string; code?: string }): SaveState {
  if (error.code === "P0001" && error.message) return { error: error.message };
  console.error(error);
  return { error: "Couldn't save. Please try again." };
}

export async function saveOrder(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;

  const orderId = String(data.get("order_id") ?? "") || null;
  const customer = String(data.get("customer") ?? "").trim();
  const neededBy = String(data.get("needed_by") ?? "");
  if (!customer) return { error: "Enter who the order is for." };
  if (neededBy && !isDate(neededBy)) return { error: "Choose a valid date." };

  const lines: ({ stock_item_id: string; quantity: number } | { parent_id: string; fruit: string; quantity: number })[] = [];
  for (const [key, raw] of data) {
    if (!key.startsWith("qty:") || String(raw).trim() === "") continue;
    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || quantity < 0) return { error: "Use whole numbers for quantities." };
    if (quantity > 0) lines.push({ stock_item_id: key.slice(4), quantity });
  }

  // Fruits typed into a "which fruit?" row, paired with their quantities in order.
  const parents = new Set([...data.keys()].filter((k) => k.startsWith("variety_name:")).map((k) => k.slice(13)));
  for (const parentId of parents) {
    const names = data.getAll(`variety_name:${parentId}`).map((v) => String(v).trim());
    const quantities = data.getAll(`variety_qty:${parentId}`).map((v) => String(v).trim());
    for (const [i, fruit] of names.entries()) {
      const quantity = Number(quantities[i] || 0);
      if (!Number.isInteger(quantity) || quantity < 0) return { error: "Use whole numbers for quantities." };
      if (!fruit && quantity > 0) return { error: "Type which fruit, e.g. Fig, next to each Local Fruit amount." };
      if (fruit && quantity > 0) lines.push({ parent_id: parentId, fruit, quantity });
    }
  }
  if (!lines.length) return { error: "Add at least one item to the order." };

  const { data: savedId, error } = await supabase.rpc("pod_save_order", {
    order_id: orderId,
    customer,
    needed_by: neededBy || null,
    note: String(data.get("note") ?? ""),
    lines,
  });
  if (error) return failed(error);
  refresh();
  if (orderId) return { ok: "Saved" };
  // Show the new order in the Orders list, opened up.
  redirect(`/pod/orders?saved=${savedId}#order-${savedId}`);
}

export async function setOrderStatus(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const status = String(data.get("status"));
  const { error } = await supabase.rpc("pod_set_order_status", { order_id: String(data.get("order_id")), status });
  if (error) return failed(error);
  refresh();
  return { ok: status === "sent" ? "Sent, and taken off stock" : "Updated" };
}

export async function deleteOrder(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const id = String(data.get("order_id"));
  const { data: order } = await supabase.from("orders").select("status").eq("id", id).maybeSingle();
  if (order?.status === "sent") return { error: "Move it back to Packed first, so its stock is put back." };
  const { error } = await supabase.from("orders").delete().eq("id", id);
  if (error) return failed(error);
  refresh();
  return { ok: "Deleted" };
}

export async function undoSale(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const { error } = await supabase.rpc("pod_undo_sale", { order_id: String(data.get("order_id")) });
  if (error) return failed(error);
  refresh();
  return { ok: "Removed, and put back in stock" };
}
