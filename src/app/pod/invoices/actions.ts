"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { isDate, sydneyToday } from "@/lib/weeks";
import type { SaveState } from "../actions";
import { getSession } from "../session";
import { billToName, getInvoice, invoiceNumber, invoiceTotal } from "./invoice-data";
import { renderInvoicePdf } from "./invoice-pdf";

const NO_ACCESS: SaveState = { error: "This account doesn't have access to the Pod." };

function refresh() {
  revalidatePath("/pod/invoices", "layout");
  revalidatePath("/pod/orders");
}

/** Messages raised by the database functions are written for people; show them as-is. */
function failed(error: { message?: string; code?: string }): SaveState {
  if (error.code === "P0001" && error.message) return { error: error.message };
  if (error.code === "23505") return { error: "This customer already has an invoice with that number." };
  console.error(error);
  return { error: "Couldn't save. Please try again." };
}

const text = (data: FormData, name: string) => String(data.get(name) ?? "").trim();

/** Makes the order's invoice (or finds the one it has) and opens it. */
export async function createInvoice(data: FormData) {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return;
  const { data: id, error } = await supabase.rpc("pod_create_invoice", { order_id: text(data, "order_id") });
  if (error) throw error;
  refresh();
  redirect(`/pod/invoices/${id}`);
}

export async function saveInvoice(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;

  const number = Number(text(data, "number"));
  if (!Number.isInteger(number) || number <= 0) return { error: "Enter the invoice number, e.g. 12." };
  const issuedOn = text(data, "issued_on");
  const dueOn = text(data, "due_on");
  if (!isDate(issuedOn) || !isDate(dueOn)) return { error: "Choose both dates." };

  const descriptions = data.getAll("line_description").map(String);
  const prices = data.getAll("line_price").map((v) => String(v).trim().replace(/^\$/, ""));
  const quantities = data.getAll("line_qty").map((v) => String(v).trim());
  const lines = [];
  for (const [i, description] of descriptions.entries()) {
    if (!description.trim() && !prices[i] && !quantities[i]) continue;
    const unitPrice = Number(prices[i]);
    const quantity = Number(quantities[i]);
    if (!description.trim()) return { error: "Every line needs a description." };
    // A blank price is kept (e.g. postage to fill in later) but left off the PDF.
    if (prices[i] && (!Number.isFinite(unitPrice) || unitPrice < 0)) return { error: `Enter the price for “${description}” as a number.` };
    if (!quantities[i] || !Number.isFinite(quantity) || quantity <= 0) return { error: `Enter a quantity for “${description}”.` };
    lines.push({ description, quantity, unit_price: prices[i] ? Math.round(unitPrice * 100) / 100 : null });
  }
  if (!lines.some((l) => l.unit_price !== null)) return { error: "Add at least one line with a price." };

  const { error } = await supabase.rpc("pod_save_invoice", {
    invoice_id: text(data, "invoice_id"),
    number,
    issued_on: issuedOn,
    due_on: dueOn,
    bill_to: text(data, "bill_to"),
    notes: text(data, "notes"),
    lines,
  });
  if (error) return failed(error);
  refresh();
  return { ok: "Saved" };
}

export async function setInvoicePaid(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const paid = data.get("paid") === "true";
  const { error } = await supabase
    .from("invoices")
    .update({ paid_on: paid ? sydneyToday() : null })
    .eq("id", text(data, "invoice_id"));
  if (error) return failed(error);
  refresh();
  return { ok: paid ? "Marked as paid" : "Marked as unpaid" };
}

export async function deleteInvoice(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const { error } = await supabase.from("invoices").delete().eq("id", text(data, "invoice_id"));
  if (error) return failed(error);
  refresh();
  redirect("/pod/invoices");
}

export async function saveInvoiceSettings(_: SaveState, data: FormData): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;
  const terms = Number(text(data, "payment_terms_days"));
  if (!Number.isInteger(terms) || terms < 0) return { error: "Enter payment terms in days, e.g. 7." };

  const { error } = await supabase
    .from("invoice_settings")
    .update({
      business_name: text(data, "business_name"),
      address: text(data, "address"),
      email: text(data, "email"),
      phone: text(data, "phone"),
      abn: text(data, "abn"),
      payable_to: text(data, "payable_to"),
      bank_account_name: text(data, "bank_account_name"),
      bank_bsb: text(data, "bank_bsb"),
      bank_account_number: text(data, "bank_account_number"),
      payment_terms_days: terms,
    })
    .eq("id", true);
  if (error) return failed(error);
  refresh();
  return { ok: "Saved. New invoices use these details; existing ones keep theirs." };
}

/**
 * Puts the invoice in an email, PDF attached, in the Fastmail Drafts folder to check and send.
 * Nothing is sent from here.
 */
export async function emailInvoice(invoiceId: string): Promise<SaveState> {
  const { supabase, isAdmin } = await getSession();
  if (!isAdmin) return NO_ACCESS;

  const invoice = await getInvoice(supabase, invoiceId);
  if (!invoice) return { error: "That invoice no longer exists." };
  const { data: row } = await supabase.from("invoices").select("customer:customers(name, email, contact)").eq("id", invoiceId).single();
  const name = row?.customer?.name ?? billToName(invoice.billTo);
  const to = row?.customer?.email?.trim();
  if (!to) return { error: `Add ${name}’s email address on the Customers page first.` };

  const number = invoiceNumber(invoice.number);
  const due = new Date(`${invoice.dueOn}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });
  const pdf = await renderInvoicePdf(invoice);

  const { error } = await supabase.functions.invoke("draft-invoice-email", {
    body: {
      to,
      toName: row?.customer?.contact ?? name,
      subject: `Invoice ${number} – ${invoice.seller.business_name || "Sorella Cacao"}`,
      text: `Hi ${name},\n\nPlease find attached invoice ${number} for ${formatPrice(invoiceTotal(invoice.lines))}, due ${due}.\n\nThank you!\n\n${invoice.seller.business_name || "Sorella Cacao"}`,
      filename: `Invoice ${number} - ${billToName(invoice.billTo)}.pdf`.replace(/[^\w .&()-]/g, ""),
      pdf: Buffer.from(pdf).toString("base64"),
    },
  });
  if (error) {
    // The function explains what went wrong (e.g. Fastmail isn't connected yet).
    const body = await (error as { context?: Response }).context?.json?.().catch(() => null);
    console.error(error);
    return { error: body?.error ?? "Couldn't make the email. Please try again." };
  }
  return { ok: "Draft ready in Fastmail" };
}
