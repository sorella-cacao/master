import type { Metadata } from "next";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { sydneyToday } from "@/lib/weeks";
import { ItemRow, ItemTable } from "../item-table";
import { PodForm } from "../pod-form";
import { PodNav } from "../pod-nav";
import { PodPanel } from "../pod-panel";
import { getSession } from "../session";
import { saveInvoiceSettings } from "./actions";
import { billToName, invoiceNumber, invoiceStatus, invoiceTotal } from "./invoice-data";
import { StatusChip } from "./status-chip";

export const metadata: Metadata = { title: "Invoices" };

export default async function InvoicesPage() {
  const { supabase, email, isAdmin } = await getSession();
  if (!isAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="font-script text-6xl text-gold">The Pod</h1>
        <p className="mt-6 text-xl">{email ?? "This account"} doesn’t have access to the Pod yet.</p>
      </div>
    );
  }

  const [list, settings] = await Promise.all([
    supabase
      .from("invoices")
      .select("id, number, bill_to, issued_on, due_on, paid_on, lines:invoice_lines(description, quantity, unit_price)")
      .order("number", { ascending: false }),
    supabase.from("invoice_settings").select("*").eq("id", true).single(),
  ]);
  if (list.error) throw list.error;
  if (settings.error) throw settings.error;
  const today = sydneyToday();
  const invoices = list.data.map((i) => ({
    id: i.id,
    number: i.number,
    name: billToName(i.bill_to),
    issuedOn: i.issued_on,
    dueOn: i.due_on,
    paidOn: i.paid_on,
    total: invoiceTotal(i.lines.map((l) => ({ ...l, quantity: Number(l.quantity), unit_price: Number(l.unit_price) }))),
  }));
  const unpaid = invoices.filter((i) => !i.paidOn);
  const s = settings.data;

  return (
    <div className="space-y-6">
      <header className="space-y-6">
        <h1 className="font-script text-6xl text-gold sm:text-7xl">The Pod</h1>
        <PodNav current="/pod/invoices" />
      </header>

      <PodPanel
        title="Invoices"
        hint={
          unpaid.length
            ? `${unpaid.length} unpaid, ${formatPrice(unpaid.reduce((n, i) => n + i.total, 0))} owing. Make a new one from an order on the Orders page.`
            : "Everything’s paid. Make a new invoice from an order on the Orders page."
        }
        open
      >
        {invoices.length === 0 ? (
          <p className="text-xl text-cream/70">No invoices yet.</p>
        ) : (
          <ItemTable headings={["Invoice", "Date", "Due", "Total", "Status"]} columnWidth="w-28">
            {invoices.map((i) => (
              <ItemRow
                key={i.id}
                name={
                  <Link href={`/pod/invoices/${i.id}`} className="underline decoration-white/30 underline-offset-2 hover:text-gold">
                    #{invoiceNumber(i.number)} · {i.name}
                  </Link>
                }
                cells={[
                  dayMonth(i.issuedOn),
                  dayMonth(i.dueOn),
                  formatPrice(i.total),
                  <StatusChip key="status" status={invoiceStatus(i, today)} />,
                ]}
              />
            ))}
          </ItemTable>
        )}
      </PodPanel>

      <PodPanel title="Your business details" hint="What goes on every new invoice. Invoices already made keep the details they were made with.">
        <PodForm action={saveInvoiceSettings} submitLabel="Save details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name" name="business_name" value={s.business_name} />
            <Field label="Payable to" name="payable_to" value={s.payable_to} />
            <Field label="Address" name="address" value={s.address} />
            <Field label="ABN" name="abn" value={s.abn} />
            <Field label="Email" name="email" value={s.email} />
            <Field label="Phone" name="phone" value={s.phone} />
            <Field label="Bank account name" name="bank_account_name" value={s.bank_account_name} />
            <Field label="BSB" name="bank_bsb" value={s.bank_bsb} />
            <Field label="Account number" name="bank_account_number" value={s.bank_account_number} />
            <div className="grid grid-cols-2 gap-4">
              <Field label="Pay within (days)" name="payment_terms_days" value={String(s.payment_terms_days)} type="number" />
              <Field label="Next invoice #" name="next_number" value={String(s.next_number)} type="number" />
            </div>
          </div>
        </PodForm>
      </PodPanel>
    </div>
  );
}

/** "26 Oct" */
const dayMonth = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "short" });

function Field({ label, name, value, type = "text" }: { label: string; name: string; value: string; type?: string }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1 block text-xs text-cream/70">{label}</span>
      <input name={name} type={type} min={type === "number" ? 0 : undefined} defaultValue={value} className="pod-input py-2 text-sm" />
    </label>
  );
}
