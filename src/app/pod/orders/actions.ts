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
  const orderId = String(data.get("order_id"));
  const { error } = await supabase.rpc("pod_set_order_status", { order_id: orderId, status });
  if (error) return failed(error);
  refresh();
  const done = status === "sent" ? "Sent, and taken off stock" : "Updated";
  // Website customers hear when their order's posted or ready to pick up (Pod › Replies).
  if (status === "sent" || status === "packed") {
    const { data: emailed } = await supabase.functions.invoke<{ sent: boolean; to?: string }>("order-email", {
      body: { orderId, status },
    });
    if (emailed?.sent) return { ok: `${done}. Emailed ${emailed.to}.` };
  }
  return { ok: done };
}

/** Deletes an order; if it was already sent, its items go back into stock. Its invoice, if any, is kept. */
export async function deleteOrder(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const { error } = await supabase.rpc("pod_delete_order", { order_id: String(data.get("order_id")) });
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
  return { ok: "Removed" };
}

/** Adds notes about a week's orders: one for each line. */
export async function addOrderNotes(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const week = String(data.get("week") ?? "");
  if (!isDate(week)) return { error: "Couldn't save. Please try again." };
  const notes = String(data.get("note") ?? "")
    .split("\n")
    .map((line) => line.replace(/^\s*[-•*]\s+/, "").trim())
    .filter(Boolean);
  if (!notes.length) return { error: "Write a note first." };
  const { error } = await supabase.from("order_notes").insert(notes.map((note, position) => ({ note, position, week_start: week })));
  if (error) return failed(error);
  revalidatePath("/pod/orders");
  return { ok: notes.length === 1 ? "Note saved" : `${notes.length} notes saved` };
}

/** Ticks a note off (in the week it's ticked) or back on, so it carries on again. */
export async function setOrderNoteDone(week: string, id: string, done: boolean): Promise<{ error?: string }> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return { error: "This account doesn't have access to the Pod." };
  if (!isDate(week)) return { error: "Couldn't save. Please try again." };
  const { error } = await supabase.from("order_notes").update({ done_week: done ? week : null }).eq("id", id);
  if (error) {
    console.error(error);
    return { error: "Couldn't save the tick. Please try again." };
  }
  revalidatePath("/pod/orders");
  return {};
}

/** Changes a note's words; clearing them removes the note. */
export async function editOrderNote(id: string, text: string): Promise<{ error?: string }> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return { error: "This account doesn't have access to the Pod." };
  const note = text.trim();
  const { error } = note
    ? await supabase.from("order_notes").update({ note }).eq("id", id)
    : await supabase.from("order_notes").delete().eq("id", id);
  if (error) {
    console.error(error);
    return { error: "Couldn't save the note. Please try again." };
  }
  revalidatePath("/pod/orders");
  return {};
}

/** Notes how many of an item are made so far for the week's "To make" list, and adds them to stock. */
export async function setMadeThisWeek(week: string, stockItemId: string, made: number): Promise<{ error?: string }> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return { error: "This account doesn't have access to the Pod." };
  if (!isDate(week)) return { error: "Couldn't save. Please try again." };
  if (!Number.isInteger(made) || made < 0) return { error: "Use whole numbers, e.g. 16." };
  const { error } = await supabase.rpc("pod_set_made", { week, item: stockItemId, made });
  if (error) {
    console.error(error);
    return { error: "Couldn't save what you made. Please try again." };
  }
  refresh();
  return {};
}

/** Marks how many of an order's line a sale-or-return shop has sold, ready to invoice. */
export async function setSold(lineId: string, sold: number): Promise<{ error?: string }> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return { error: "This account doesn't have access to the Pod." };
  if (!Number.isInteger(sold) || sold < 0) return { error: "Use whole numbers, e.g. 3." };
  const { error } = await supabase.rpc("pod_set_sold", { line: lineId, sold });
  if (error) return { error: failed(error)?.error };
  refresh();
  return {};
}

/** Makes one invoice for everything a sale-or-return shop has sold, and opens it. */
export async function invoiceSold(customerId: string): Promise<{ error?: string }> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return { error: "This account doesn't have access to the Pod." };
  const { data: id, error } = await supabase.rpc("pod_invoice_sold", { customer: customerId });
  if (error) return { error: failed(error)?.error };
  revalidatePath("/pod/invoices", "layout");
  refresh();
  redirect(`/pod/invoices/${id}`);
}
