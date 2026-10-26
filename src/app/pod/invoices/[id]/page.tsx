import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatPrice } from "@/lib/format";
import { shortDate, sydneyToday } from "@/lib/weeks";
import { PodForm } from "../../pod-form";
import { PodNav } from "../../pod-nav";
import { getSession } from "../../session";
import { deleteInvoice, saveInvoice, setInvoicePaid } from "../actions";
import { billToName, getInvoice, invoiceNumber, invoiceStatus, invoiceTotal } from "../invoice-data";
import { InvoiceFields } from "../invoice-fields";
import { StatusChip } from "../status-chip";

export const metadata: Metadata = { title: "Invoice" };

export default async function InvoicePage(props: PageProps<"/pod/invoices/[id]">) {
  const { supabase, email, isAdmin } = await getSession();
  if (!isAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="font-script text-6xl text-gold">The Pod</h1>
        <p className="mt-6 text-xl">{email ?? "This account"} doesn’t have access to the Pod yet.</p>
      </div>
    );
  }

  const { id } = await props.params;
  const invoice = await getInvoice(supabase, id);
  if (!invoice) notFound();
  const status = invoiceStatus(invoice, sydneyToday());
  const pdf = `/pod/invoices/${invoice.id}/pdf`;

  return (
    <div className="space-y-6">
      <header className="space-y-6">
        <h1 className="font-script text-6xl text-gold sm:text-7xl">The Pod</h1>
        <PodNav current="/pod/invoices" />
      </header>

      <section className="pod-card space-y-5 p-6 sm:p-8">
        <Link href="/pod/invoices" className="eyebrow text-cream/70 hover:text-gold">
          ← All invoices
        </Link>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h2 className="text-3xl">
              Invoice #{invoiceNumber(invoice.number)} · {billToName(invoice.billTo)}
            </h2>
            <p className="mt-1 text-cream/70">
              {formatPrice(invoiceTotal(invoice.lines))} · due {shortDate(invoice.dueOn)}
              <StatusChip status={status} />
            </p>
          </div>
          <a
            href={`${pdf}?download=1`}
            className="eyebrow rounded-full bg-caramel px-5 py-2.5 text-cacao-950 transition-colors hover:bg-gold"
          >
            Download PDF
          </a>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <PodForm action={saveInvoice} submitLabel="Save changes">
            <InvoiceFields invoice={invoice} />
          </PodForm>
          <div className="space-y-2">
            <p className="eyebrow text-xs text-cream/70">Preview</p>
            {/* Reloads after each save, as the page re-renders with a new updated time. */}
            <iframe
              key={invoice.updatedAt}
              src={`${pdf}?v=${encodeURIComponent(invoice.updatedAt)}#toolbar=0&navpanes=0&view=FitH`}
              title={`Invoice ${invoiceNumber(invoice.number)} preview`}
              className="aspect-[1/1.414] w-full rounded-xl border border-white/15 bg-white"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-start gap-x-6 border-t border-white/10 pt-2">
          <PodForm action={setInvoicePaid} submitLabel={invoice.paidOn ? "Mark as unpaid" : "Mark as paid"} variant="quiet">
            <input type="hidden" name="invoice_id" value={invoice.id} />
            <input type="hidden" name="paid" value={invoice.paidOn ? "false" : "true"} />
          </PodForm>
          <PodForm
            action={deleteInvoice}
            submitLabel="Delete invoice"
            variant="quiet"
            confirmMessage={`Delete invoice #${invoiceNumber(invoice.number)}? This can’t be undone.`}
          >
            <input type="hidden" name="invoice_id" value={invoice.id} />
          </PodForm>
          {invoice.orderId && (
            <Link href="/pod/orders" className="eyebrow mt-6 text-cream/70 hover:text-gold">
              Go to orders
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
