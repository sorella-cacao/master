import { formatPrice } from "@/lib/format";
import { shortDate, sydneyToday } from "@/lib/weeks";
import { PodForm } from "../pod-form";
import { deleteInvoice, saveInvoice, setInvoicePaid } from "./actions";
import { EmailInvoiceButton } from "./email-invoice-button";
import { type Invoice, billToName, invoiceNumber, invoiceStatus, invoiceTotal } from "./invoice-data";
import { InvoiceFields } from "./invoice-fields";
import { StatusChip } from "./status-chip";

/**
 * One invoice to check, change, email or download, with a preview of its PDF. Shown on its own page,
 * and under its order on Orders until it's emailed (`inOrders`, so deleting it stays on Orders).
 */
export function InvoiceEditor({ invoice, inOrders = false }: { invoice: Invoice; inOrders?: boolean }) {
  const status = invoiceStatus(invoice, sydneyToday());
  const pdf = `/pod/invoices/${invoice.id}/pdf`;
  const number = invoiceNumber(invoice.number, invoice.numberSuffix, invoice.numberLabel);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <div>
          <h2 className={inOrders ? "text-2xl" : "text-3xl"}>
            Invoice #{number} · {billToName(invoice.billTo)}
          </h2>
          <p className="mt-1 text-cream/70">
            {formatPrice(invoiceTotal(invoice.lines))} · due {shortDate(invoice.dueOn)}
            <StatusChip status={status} />
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3">
          <EmailInvoiceButton invoiceId={invoice.id} />
          <a
            href={`${pdf}?download=1`}
            className="eyebrow rounded-full bg-caramel px-5 py-2.5 text-cacao-950 transition-colors hover:bg-gold"
          >
            Download PDF
          </a>
        </div>
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
            title={`Invoice ${number} preview`}
            loading="lazy"
            className="aspect-[1/1.414] w-full rounded-xl border border-white/15 bg-white"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-x-6 border-t border-white/10 pt-2">
        <PodForm action={setInvoicePaid} submitLabel={invoice.paidOn ? "Mark as unpaid" : "Mark as paid"} variant="quiet">
          <input type="hidden" name="invoice_id" value={invoice.id} />
          <input type="hidden" name="paid" value={invoice.paidOn ? "false" : "true"} />
        </PodForm>
        <PodForm action={deleteInvoice} submitLabel="Delete invoice" variant="quiet" confirmMessage={`Delete invoice #${number}? This can’t be undone.`}>
          <input type="hidden" name="invoice_id" value={invoice.id} />
          {inOrders && invoice.orderId && <input type="hidden" name="back_to_order" value={invoice.orderId} />}
        </PodForm>
      </div>
    </div>
  );
}
