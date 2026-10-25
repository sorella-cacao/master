"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import type { SaveState } from "./actions";

type Props = {
  action: (state: SaveState, data: FormData) => Promise<SaveState>;
  submitLabel: string;
  children?: React.ReactNode;
  /** Ask before submitting, e.g. for deletes. */
  confirmMessage?: string;
  /** Clear the fields after a successful save, e.g. for "add" forms. */
  resetOnSuccess?: boolean;
  variant?: "primary" | "quiet";
  className?: string;
};

/** A form for one change in the Pod, with its own saving / saved / error message. */
export function PodForm({
  action,
  submitLabel,
  children,
  confirmMessage,
  resetOnSuccess,
  variant = "primary",
  className = "",
}: Props) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const [edited, setEdited] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    // Submit manually so React doesn't reset the fields back to their old values.
    e.preventDefault();
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    const data = new FormData(e.currentTarget);
    setEdited(false);
    startTransition(() => formAction(data));
  }

  useEffect(() => {
    if (resetOnSuccess && state?.ok) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  const status = pending ? "Saving…" : edited ? "" : state?.error ?? state?.ok ?? "";

  return (
    <form ref={formRef} onSubmit={submit} onChange={() => setEdited(true)} className={className}>
      {children}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="submit"
          disabled={pending}
          className={
            variant === "primary"
              ? "eyebrow rounded-full bg-caramel px-5 py-2.5 text-cacao-950 transition-colors hover:bg-gold disabled:opacity-60"
              : "eyebrow rounded-full border border-white/20 px-4 py-2 text-cream/70 transition-colors hover:border-gold hover:text-gold disabled:opacity-60"
          }
        >
          {submitLabel}
        </button>
        <p role="status" className={`font-sans text-sm ${state?.error && !pending && !edited ? "text-gold" : "text-cream/70"}`}>
          {status}
        </p>
      </div>
    </form>
  );
}
