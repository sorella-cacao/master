"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendTestReply } from "./actions";
import { renderEmail } from "../../../../supabase/functions/_shared/email-html";
import { SAMPLES, placeholderNames } from "./placeholders";

/** The email as a customer would get it, with sample details, redrawn as its form is edited. */
export function ReplyPreview({ templateKey, subject, body }: { templateKey: string; subject: string; body: string }) {
  const [text, setText] = useState({ subject, body });
  const ref = useRef<HTMLDivElement>(null);
  const sample = SAMPLES[templateKey] ?? { values: {}, receipts: {} };
  const email = renderEmail(text.subject, text.body, sample.values, sample.receipts);
  const [sending, startSending] = useTransition();
  const [status, setStatus] = useState<{ ok?: string; error?: string }>();

  // Sends what's in the boxes now, so changes can be tried before saving.
  function sendTest() {
    setStatus(undefined);
    startSending(async () => setStatus(await sendTestReply(templateKey, text.subject, text.body)));
  }

  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const update = () => {
      const data = new FormData(form);
      setText({ subject: String(data.get("subject") ?? ""), body: String(data.get("body") ?? "") });
    };
    form.addEventListener("input", update);
    return () => form.removeEventListener("input", update);
  }, []);

  return (
    <div ref={ref} className="space-y-2">
      <p className="eyebrow text-xs text-cream/70">Preview, with sample details</p>
      <p className="font-sans text-sm">
        <span className="text-cream/60">Subject:</span> {email.subject}
      </p>
      {/* The same design the email is sent with. */}
      <iframe
        title="Email preview"
        srcDoc={email.html}
        className="h-[34rem] w-full rounded-xl border border-white/15 bg-[#1c1003]"
      />
      <p className="font-sans text-xs text-cream/60">
        You can use: {placeholderNames(templateKey).map((key) => `{${key}}`).join(" ")}
      </p>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        <button
          type="button"
          onClick={sendTest}
          disabled={sending}
          className="eyebrow rounded-full border border-white/20 px-4 py-2 text-cream/70 transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
        >
          {sending ? "Sending…" : "Send me a test email"}
        </button>
        <p role="status" className={`font-sans text-sm ${status?.error ? "text-gold" : "text-cream/70"}`}>
          {status?.error ?? status?.ok ?? ""}
        </p>
      </div>
    </div>
  );
}
