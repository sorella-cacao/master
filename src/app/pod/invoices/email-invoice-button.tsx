"use client";

import { useState, useTransition } from "react";
import { emailInvoice } from "./actions";

const FASTMAIL_DRAFTS = "https://app.fastmail.com/mail/Drafts/";

/** Makes the invoice email (PDF attached) in Fastmail Drafts, then opens Drafts to check and send it. */
export function EmailInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok?: string; error?: string } | null>(null);

  function draft() {
    // Open the tab now, while it still counts as a click, and point it at Fastmail once the draft is made.
    const tab = window.open("", "_blank");
    setMessage(null);
    startTransition(async () => {
      const result = await emailInvoice(invoiceId);
      if (result?.ok) {
        if (tab) tab.location.href = FASTMAIL_DRAFTS;
        else window.open(FASTMAIL_DRAFTS, "_blank");
      } else {
        tab?.close();
      }
      setMessage(result ?? null);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={draft}
        disabled={pending}
        className="eyebrow rounded-full border border-white/20 px-5 py-2.5 text-cream/70 transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
      >
        {pending ? "Making email…" : "Email invoice"}
      </button>
      {message && (
        <p role="status" className={`max-w-64 text-right font-sans text-sm ${message.error ? "text-gold" : "text-cream/70"}`}>
          {message.error ?? `${message.ok}. It opens in a new tab.`}
        </p>
      )}
    </div>
  );
}
