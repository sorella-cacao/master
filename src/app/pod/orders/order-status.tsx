"use client";

import { startTransition, useActionState, useState } from "react";
import type { SaveState } from "../actions";
import { useConfirm } from "../confirm-dialog";
import { setOrderStatus } from "./actions";

const STATUSES = [
  { value: "to_make", label: "To make" },
  { value: "packed", label: "Packed" },
  { value: "sent", label: "Sent" },
] as const;

/** One-tap status buttons (marking an order Sent takes its items off stock), and the invoice button. */
export function OrderStatus({ orderId, status, itemCount }: { orderId: string; status: string; itemCount: number }) {
  const [state, formAction, pending] = useActionState(setOrderStatus, undefined as SaveState);
  const [invoiceNote, setInvoiceNote] = useState(false);
  const { confirm, dialog } = useConfirm();

  async function choose(next: string) {
    if (next === status) return;
    if (next === "sent" && !(await confirm(`Mark as sent? This takes ${itemCount} items off your stock.`))) return;
    if (status === "sent" && !(await confirm("Un-send this order? Its items go back into stock."))) return;
    const data = new FormData();
    data.set("order_id", orderId);
    data.set("status", next);
    startTransition(() => formAction(data));
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div role="group" aria-label="Order status" className="inline-flex rounded-full border border-white/20 p-1">
        {STATUSES.map((s) => (
          <button
            key={s.value}
            type="button"
            disabled={pending}
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
      {/* Placeholder until invoices are set up. */}
      <button
        type="button"
        onClick={() => setInvoiceNote(true)}
        className="eyebrow rounded-full border border-white/20 px-4 py-2 text-cream/70 transition-colors hover:border-gold hover:text-gold"
      >
        Generate invoice
      </button>
      <p role="status" className={`font-sans text-sm ${state?.error ? "text-gold" : "text-cream/70"}`}>
        {pending ? "Saving…" : (state?.error ?? state?.ok ?? (invoiceNote ? "Invoices are coming soon." : ""))}
      </p>
      {dialog}
    </div>
  );
}
