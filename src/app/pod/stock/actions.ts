"use server";

import { revalidatePath } from "next/cache";
import type { SaveState } from "../actions";
import { getSession } from "../session";

const NO_ACCESS: SaveState = { error: "This account doesn't have access to the Pod." };

/** Whole-number entries named `${prefix}:<stock item id>`; blanks are skipped. */
function counts(data: FormData, prefix: string) {
  const entries: { id: string; quantity: number }[] = [];
  for (const [key, raw] of data) {
    if (!key.startsWith(`${prefix}:`) || String(raw).trim() === "") continue;
    const quantity = Number(raw);
    if (!Number.isInteger(quantity) || quantity < 0) return null;
    entries.push({ id: key.slice(prefix.length + 1), quantity });
  }
  return entries;
}

function refresh() {
  revalidatePath("/pod/stock");
  revalidatePath("/pod/orders");
}

function failed(error: unknown): SaveState {
  console.error(error);
  return { error: "Couldn't save. Please try again." };
}

export async function addMade(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const made = counts(data, "made");
  if (!made) return { error: "Use whole numbers, e.g. 24." };
  const added = made.filter((m) => m.quantity > 0);
  if (!added.length) return { error: "Enter how many of each you made." };

  const { error } = await supabase.rpc("pod_add_made", { counts: added });
  if (error) return failed(error);
  refresh();
  const total = added.reduce((n, m) => n + m.quantity, 0);
  return { ok: `Added ${total} to stock.` };
}

export async function saveStockTake(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const counted = counts(data, "count");
  if (!counted) return { error: "Use whole numbers, e.g. 24." };

  const { error } = await supabase.rpc("pod_save_stock_take", { counts: counted });
  if (error) return failed(error);
  refresh();
  return { ok: "Stock take saved." };
}

export async function addOneOffFlavour(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;

  const productId = String(data.get("product_id") ?? "");
  const name = String(data.get("name") ?? "").trim();
  if (!name) return { error: "Enter the flavour's name." };

  // A one-off flavour is sold at the same wholesale price as the size's other flavours.
  const { data: last } = await supabase
    .from("stock_items")
    .select("position, wholesale_price")
    .eq("product_id", productId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("stock_items").insert({
    product_id: productId,
    name,
    wholesale_price: last?.wholesale_price ?? 0,
    is_extra: true,
    position: (last?.position ?? -1) + 1,
  });
  if (error?.code === "23505") return { error: "There's already a flavour with that name in this size." };
  if (error) return failed(error);
  refresh();
  return { ok: `Added ${name}.` };
}

export async function setFlavourHidden(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const hidden = data.get("hidden") === "true";
  const { error } = await supabase
    .from("stock_items")
    .update({ is_active: !hidden })
    .eq("id", String(data.get("id")))
    .eq("is_extra", true);
  if (error) return failed(error);
  refresh();
  return { ok: hidden ? "Hidden" : "Showing again" };
}

/** Makes a one-off flavour part of the main stock, so it's no longer listed as a one-off. */
export async function addToMainStock(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const { error } = await supabase
    .from("stock_items")
    .update({ is_extra: false })
    .eq("id", String(data.get("id")))
    .is("parent_id", null);
  if (error) return failed(error);
  refresh();
  return { ok: "Added to main stock" };
}

/** A spontaneous buy or a market day: recorded in order history and taken off stock straight away. */
export async function recordSale(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;

  const kind = String(data.get("kind"));
  if (kind !== "spontaneous" && kind !== "market") return { error: "Couldn't save. Please try again." };
  const priceList = kind === "market" ? "retail" : String(data.get("price_list"));
  if (priceList !== "wholesale" && priceList !== "retail") return { error: "Choose wholesale or retail." };
  const ids = data.getAll("line_item").map(String);
  const quantities = data.getAll("line_qty").map((q) => Number(q));
  if (ids.some((id) => !id)) return { error: "Choose a flavour on every line." };
  if (quantities.some((q) => !Number.isInteger(q) || q <= 0)) return { error: "Use whole numbers for quantities, e.g. 2." };
  const lines = ids.map((id, i) => ({ stock_item_id: id, quantity: quantities[i] }));
  if (!lines.length) return { error: "Add at least one item." };

  const { error } = await supabase.rpc("pod_record_sale", {
    kind,
    customer: String(data.get("customer") ?? ""),
    note: String(data.get("note") ?? ""),
    lines,
    price_list: priceList,
  });
  if (error) return failed(error);
  refresh();
  const total = quantities.reduce((n, q) => n + q, 0);
  return { ok: `Saved. ${total} taken off stock and added to order history.` };
}
