"use client";

import Link from "next/link";
import { startTransition, useActionState, useState, useTransition } from "react";
import type { SaveState } from "../actions";
import { useConfirm } from "../confirm-dialog";
import { createInvoice } from "../invoices/actions";
import { invoiceNumber } from "../invoices/invoice-number";
import { setOrderStatus } from "./actions";

const STATUSES = [
  { value: "to_make", label: "To make" },
  { value: "packed", label: "Packed" },
  { value: "sent", label: "Sent" },
] as const;

/** One-tap status buttons (marking an order Sent takes its items off stock), and the order's invoice. */
export function OrderStatus({
  orderId,
  status,
  itemCount,
  invoice,
  paidOnline = false,
  saleOrReturn = false,
  noInvoice = false,
  shipping,
  invoiceBelow = false,
}: {
  orderId: string;
  status: string;
  itemCount: number;
  invoice: { id: string; number: number; number_suffix: string | null; number_label: string | null } | null;
  /** Paid on the website: Stripe has sent the receipt, so there's no invoice to make. */
  paidOnline?: boolean;
  /** Pays later for what they sell: invoiced from Stock › With shops rather than in full. */
  saleOrReturn?: boolean;
  /** An odd buy (e.g. a spontaneous buy) still to make: no invoice. */
  noInvoice?: boolean;
  /** Shown in place of the invoice: "Email shipping", for website orders and spontaneous buys. */
  shipping?: React.ReactNode;
  /** Its invoice is open below the order, so there's no link to it here. */
  invoiceBelow?: boolean;
}) {
  const [state, formAction, pending] = useActionState(setOrderStatus, undefined as SaveState);
  const { confirm, dialog } = useConfirm();
  const [invoiceError, setInvoiceError] = useState("");
  const [sending, startSending] = useTransition();

  async function choose(next: string) {
    if (next === status) return;
    if (next === "sent" && !(await confirm(`Mark as sent? This takes ${itemCount} items off your stock.`))) return;
    if (status === "sent" && !(await confirm("Un-send this order? Its items go back into stock."))) return;
    const data = new FormData();
    data.set("order_id", orderId);
    data.set("status", next);

    // When sending an order without an invoice, offer to make the invoice too, then open it.
    if (next === "sent" && !invoice && !paidOnline && !saleOrReturn && !noInvoice && (await confirm("Generate the invoice now?", { yes: "Yes", no: "Not now" }))) {
      setInvoiceError("");
      startSending(async () => {
        const result = await setOrderStatus(undefined, data);
        if (result?.error) {
          setInvoiceError(result.error);
          return;
        }
        const invoiceData = new FormData();
        invoiceData.set("order_id", orderId);
        invoiceData.set("from", "orders");
        await createInvoice(invoiceData);
      });
      return;
    }
    startTransition(() => formAction(data));
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div role="group" aria-label="Order status" className="inline-flex rounded-full border border-white/20 p-1">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            disabled={pending || sending}
            aria-pressed={s.value === status}
            onClick={() => choose(s.value)}
            className={`eyebrow rounded-full px-4 py-2 transition-colors disabled:opacity-60 ${
              s.value === status ? "bg-caramel text-cacao-950" : "text-cream/70 hover:text-gold"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {paidOnline || noInvoice ? (shipping ?? null) : saleOrReturn ? (
        status === "sent" ? (
          <Link
            href={`/pod/stock#sold-${orderId}`}
            className="eyebrow rounded-full border border-white/20 px-4 py-2 text-cream/70 transition-colors hover:border-gold hover:text-gold"
          >
            Tick what’s sold
          </Link>
        ) : null
      ) : invoiceBelow ? null : invoice ? (
        <Link
          href={`/pod/invoices/${invoice.id}`}
          className="eyebrow rounded-full border border-white/20 px-4 py-2 text-cream/70 transition-colors hover:border-gold hover:text-gold"
        >
          View invoice #{invoiceNumber(invoice.number, invoice.number_suffix, invoice.number_label)}
        </Link>
      ) : (
        <form action={createInvoice}>
          <input type="hidden" name="order_id" value={orderId} />
          <input type="hidden" name="from" value="orders" />
          <button
            type="submit"
            className="eyebrow rounded-full border border-white/20 px-4 py-2 text-cream/70 transition-colors hover:border-gold hover:text-gold"
          >
            Generate invoice
          </button>
        </form>
      )}
      <p role="status" className={`font-sans text-sm ${state?.error || invoiceError ? "text-gold" : "text-cream/70"}`}>
        {pending || sending ? "Saving…" : (invoiceError || state?.error || state?.ok || "")}
      </p>
      {dialog}
    </div>
  );
}
