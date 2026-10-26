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
      .select("id, number, bill_to, issued_on, due_on, paid_on, customer:customers(name), lines:invoice_lines(description, quantity, unit_price)")
      .order("number", { ascending: false }),
    supabase.from("invoice_settings").select("*").eq("id", true).single(),
  ]);
  if (list.error) throw list.error;
  if (settings.error) throw settings.error;
  const today = sydneyToday();
  const invoices = list.data.map((i) => ({
    id: i.id,
    number: i.number,
    name: i.customer?.name ?? billToName(i.bill_to),
    issuedOn: i.issued_on,
    dueOn: i.due_on,
    paidOn: i.paid_on,
    total: invoiceTotal(i.lines.map((l) => ({ ...l, quantity: Number(l.quantity), unit_price: l.unit_price === null ? null : Number(l.unit_price) }))),
  }));
  const unpaid = invoices.filter((i) => !i.paidOn);
  const owing = (list: typeof invoices) => list.filter((i) => !i.paidOn).reduce((n, i) => n + i.total, 0);

  // One group per customer, in name order, each newest invoice first.
  const groups = new Map<string, typeof invoices>();
  for (const invoice of invoices) groups.set(invoice.name, [...(groups.get(invoice.name) ?? []), invoice]);
  const customers = [...groups].sort(([a], [b]) => a.localeCompare(b));
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
          invoices.length === 0
            ? "No invoices yet. Make one from an order on the Orders page."
            : unpaid.length
              ? `${unpaid.length} unpaid, ${formatPrice(owing(invoices))} owing. Tap a customer to see their invoices.`
              : "Everything’s paid. Tap a customer to see their invoices."
        }
      >
        {customers.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-white/15 font-sans text-sm">
            <div className="grid grid-cols-[1fr_6rem_7rem] gap-3 bg-white/5 px-3 py-1.5 text-xs text-cream/70">
              <span>Customer</span>
              <span className="text-right">Invoices</span>
              <span className="text-right">Owing</span>
            </div>
            {customers.map(([name, theirs]) => (
              <details key={name} className="group border-t border-white/10 odd:bg-cacao-950/60">
                <summary className="grid cursor-pointer list-none grid-cols-[1fr_6rem_7rem] gap-3 px-3 py-2 hover:text-gold [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="text-xs text-cream/60 transition-transform group-open:rotate-90">
                      ▸
                    </span>
                    {name}
                  </span>
                  <span className="text-right tabular-nums">{theirs.length}</span>
                  <span className="text-right tabular-nums">{owing(theirs) ? formatPrice(owing(theirs)) : "—"}</span>
                </summary>
                <div className="px-3 pb-3 pl-8">
                  <ItemTable headings={["Invoice", "Date", "Due", "Total", "Status"]} columnWidth="w-24">
                    {theirs.map((i) => (
                      <ItemRow
                        key={i.id}
                        name={
                          <Link href={`/pod/invoices/${i.id}`} className="underline decoration-white/30 underline-offset-2 hover:text-gold">
                            #{invoiceNumber(i.number)}
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
                </div>
              </details>
            ))}
          </div>
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
            <Field label="Pay within (days)" name="payment_terms_days" value={String(s.payment_terms_days)} type="number" />
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
