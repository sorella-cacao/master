"use client";

import { useId, useRef, useState } from "react";

/**
 * A "So sure" / "Shit! No" question in a box in the middle of the screen, in the Pod's colours.
 * `confirm(message)` opens it and resolves true for So sure; render `dialog` once in the component.
 * Other button wording can be passed, e.g. `confirm("Generate the invoice now?", { yes: "Yes", no: "Not now" })`.
 */
export function useConfirm() {
  const ref = useRef<HTMLDialogElement>(null);
  const answer = useRef<((yes: boolean) => void) | null>(null);
  const [message, setMessage] = useState("");
  const [labels, setLabels] = useState({ yes: "So sure", no: "Shit! No" });
  const messageId = useId();

  function confirm(question: string, buttons?: { yes: string; no: string }) {
    setMessage(question);
    setLabels(buttons ?? { yes: "So sure", no: "Shit! No" });
    ref.current?.showModal();
    return new Promise<boolean>((resolve) => {
      answer.current = resolve;
    });
  }

  function reply(yes: boolean) {
    answer.current?.(yes);
    answer.current = null;
    ref.current?.close();
  }

  const dialog = (
    <dialog
      ref={ref}
      // Escape or tapping outside counts as No. (Not onClose: closing one box fires that event late,
      // which would answer the next box when two questions come one after the other.)
      onCancel={(e) => {
        e.preventDefault();
        reply(false);
      }}
      onClick={(e) => e.target === e.currentTarget && reply(false)}
      aria-labelledby={messageId}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border-2 border-[#efb94f] bg-cacao-950 p-0 text-cream shadow-2xl backdrop:bg-[#1f1208]/40 backdrop:backdrop-blur-sm"
    >
      <div className="space-y-6 p-6 text-center sm:p-8">
        <p id={messageId} className="text-2xl leading-snug">
          {message}
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={() => reply(true)}
            className="eyebrow min-w-24 rounded-full bg-caramel px-5 py-2.5 text-cacao-950 transition-colors hover:bg-gold"
          >
            {labels.yes}
          </button>
          <button
            type="button"
            autoFocus
            onClick={() => reply(false)}
            className="eyebrow min-w-24 rounded-full border border-white/20 px-5 py-2.5 text-cream/70 transition-colors hover:border-gold hover:text-gold"
          >
            {labels.no}
          </button>
        </div>
      </div>
    </dialog>
  );

  return { confirm, dialog };
}
