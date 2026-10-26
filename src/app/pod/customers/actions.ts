"use server";

import { revalidatePath } from "next/cache";
import type { SaveState } from "../actions";
import { getSession } from "../session";

const NO_ACCESS: SaveState = { error: "This account doesn't have access to the Pod." };

const text = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

function failed(error: { code?: string }): SaveState {
  if (error.code === "23505") return { error: "There’s already a customer with that name." };
  console.error(error);
  return { error: "Couldn't save. Please try again." };
}

function refresh() {
  revalidatePath("/pod/customers");
  revalidatePath("/pod/orders");
}

const details = (data: FormData) => ({
  name: text(data, "name"),
  contact: text(data, "contact") || null,
  email: text(data, "email") || null,
  phone: text(data, "phone") || null,
  address: text(data, "address") || null,
  notes: text(data, "notes") || null,
  invoice_postage: data.get("invoice_postage") === "on",
});

/** "Next invoice #" from the form, or a message if it isn't a whole number from 1. */
function nextInvoiceNumber(data: FormData) {
  const value = Number(text(data, "next_invoice_number") || "1");
  return Number.isInteger(value) && value > 0 ? value : null;
}

export async function addCustomer(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const customer = details(data);
  if (!customer.name) return { error: "Enter the customer’s name." };
  const next = nextInvoiceNumber(data);
  if (!next) return { error: "Enter the next invoice number as a whole number, e.g. 1." };
  const { error } = await supabase.from("customers").insert({ ...customer, next_invoice_number: next });
  if (error) return failed(error);
  refresh();
  return { ok: `Added ${customer.name}. Open them below to set their prices.` };
}

/** Saves a customer's details and prices; a blank price means they pay the standard wholesale price. */
export async function saveCustomer(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const id = text(data, "id");
  const customer = details(data);
  if (!customer.name) return { error: "Enter the customer’s name." };

  const prices: { customer_id: string; stock_item_id: string; price: number }[] = [];
  const standard: string[] = [];
  for (const [key, raw] of data) {
    if (!key.startsWith("price:")) continue;
    const value = String(raw).trim().replace(/^\$/, "");
    if (!value) {
      standard.push(key.slice(6));
      continue;
    }
    const price = Number(value);
    if (!Number.isFinite(price) || price < 0) return { error: "Enter prices as numbers, e.g. 14 or 8.50." };
    prices.push({ customer_id: id, stock_item_id: key.slice(6), price: Math.round(price * 100) / 100 });
  }

  const next = nextInvoiceNumber(data);
  if (!next) return { error: "Enter the next invoice number as a whole number, e.g. 13." };
  const saved = await supabase.from("customers").update({ ...customer, next_invoice_number: next }).eq("id", id);
  if (saved.error) return failed(saved.error);
  if (prices.length) {
    const { error } = await supabase.from("customer_prices").upsert(prices);
    if (error) return failed(error);
  }
  if (standard.length) {
    const { error } = await supabase.from("customer_prices").delete().eq("customer_id", id).in("stock_item_id", standard);
    if (error) return failed(error);
  }
  refresh();
  return { ok: "Saved. New orders for them use these prices." };
}

export async function deleteCustomer(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const { error } = await supabase.from("customers").delete().eq("id", text(data, "id"));
  if (error) return failed(error);
  refresh();
  return { ok: "Deleted" };
}
