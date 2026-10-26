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
};

export type InvoiceLine = { description: string; quantity: number; unit_price: number };

export type Invoice = {
  id: string;
  number: number;
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

/** "012" */
export const invoiceNumber = (n: number) => String(n).padStart(3, "0");

export const lineTotal = (l: InvoiceLine) => Math.round(l.quantity * l.unit_price * 100) / 100;
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
    .select("id, number, order_id, bill_to, issued_on, due_on, notes, paid_on, seller, updated_at, lines:invoice_lines(description, quantity, unit_price, position)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    number: data.number,
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
      .map((l) => ({ description: l.description, quantity: Number(l.quantity), unit_price: Number(l.unit_price) })),
  };
}
