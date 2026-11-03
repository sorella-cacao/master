import "server-only";
import type { getSession } from "../session";

type Db = Awaited<ReturnType<typeof getSession>>["supabase"];

/** Business and bank details, as printed at the top and bottom of an invoice. */
export type Seller = {
  business_name: string;
  address: string;
  email: string;
  phone: string;
  abn: string;
  payable_to: string;
  bank_account_name: string;
  bank_bsb: string;
  bank_account_number: string;
  // Printed on council invoices; missing from invoices made before they were added.
  owner_name?: string;
  street_address?: string;
  bank_name?: string;
};

/** A line with no price yet (e.g. postage to fill in) has a null price and is left off the PDF. */
export type InvoiceLine = { description: string; quantity: number; unit_price: number | null };

export type Invoice = {
  id: string;
  number: number;
  numberSuffix: string | null;
  /** "council" invoices are laid out like the council's own template. */
  layout: "standard" | "council";
  orderId: string | null;
  billTo: string;
  issuedOn: string;
  dueOn: string;
  notes: string | null;
  paidOn: string | null;
  seller: Seller;
  lines: InvoiceLine[];
  updatedAt: string;
};

export { invoiceNumber } from "./invoice-number";

export const lineTotal = (l: InvoiceLine) => Math.round(l.quantity * (l.unit_price ?? 0) * 100) / 100;
export const invoiceTotal = (lines: InvoiceLine[]) => Math.round(lines.reduce((n, l) => n + lineTotal(l), 0) * 100) / 100;

/** The first line of "Bill to", which is the customer's name. */
export const billToName = (billTo: string) => billTo.split("\n")[0]?.replace(/,\s*$/, "") || "Customer";

/** "Paid", "Overdue" or "Unpaid", given today's date. */
export function invoiceStatus(invoice: { paidOn: string | null; dueOn: string }, today: string) {
  if (invoice.paidOn) return "Paid";
  return invoice.dueOn < today ? "Overdue" : "Unpaid";
}

export async function getInvoice(supabase: Db, id: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from("invoices")
    .select("id, number, number_suffix, layout, order_id, bill_to, issued_on, due_on, notes, paid_on, seller, updated_at, lines:invoice_lines(description, quantity, unit_price, position)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    number: data.number,
    numberSuffix: data.number_suffix,
    layout: data.layout === "council" ? "council" : "standard",
    orderId: data.order_id,
    billTo: data.bill_to,
    issuedOn: data.issued_on,
    dueOn: data.due_on,
    notes: data.notes,
    paidOn: data.paid_on,
    seller: data.seller as Seller,
    updatedAt: data.updated_at,
    lines: [...data.lines]
      .sort((a, b) => a.position - b.position)
      .map((l) => ({ description: l.description, quantity: Number(l.quantity), unit_price: l.unit_price === null ? null : Number(l.unit_price) })),
  };
}
