"use client";

import { startTransition, useActionState } from "react";
import { setInvoicePaid } from "./actions";

/** One tap to mark an invoice paid, which files it away from the unpaid list. */
export function MarkPaidButton({ invoiceId }: { invoiceId: string }) {
  const [state, action, pending] = useActionState(setInvoicePaid, undefined);

  function markPaid() {
    const data = new FormData();
    data.set("invoice_id", invoiceId);
    data.set("paid", "true");
    startTransition(() => action(data));
  }

  return (
    <span className="inline-flex items-center gap-2">
      {state?.error && <span className="text-xs text-gold">{state.error}</span>}
      <button
        type="button"
        onClick={markPaid}
        disabled={pending}
        className="eyebrow rounded-full bg-[#5e9a4a] px-3 py-1 text-[0.65rem] text-white transition-opacity hover:opacity-85 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Paid"}
      </button>
    </span>
  );
}
