"use client";

import { useState, useTransition } from "react";
import { useConfirm } from "../confirm-dialog";
import { setFlavourAsleep } from "./actions";

/** Puts a flavour to sleep (out of stock lists and labels, its count kept) or wakes it up again. */
export function SleepButton({ id, name, asleep, inStock }: { id: string; name: string; asleep: boolean; inStock: number }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const { confirm, dialog } = useConfirm();

  async function press() {
    if (
      !asleep &&
      inStock > 0 &&
      !(await confirm(`Put ${name} to sleep?`, { yes: "Yes", no: "No" }, `You still have ${inStock} in stock. They’re kept for when it wakes up.`))
    )
      return;
    startTransition(async () => setError((await setFlavourAsleep(id, !asleep)).error ?? ""));
  }

  return (
    <>
      <button
        type="button"
        onClick={press}
        disabled={pending}
        aria-label={asleep ? `Wake ${name}` : `Put ${name} to sleep`}
        className={`w-full rounded-full px-2 py-1 font-sans text-sm transition-colors disabled:opacity-60 ${
          asleep ? "bg-caramel text-cacao-950 hover:bg-gold" : "border border-white/20 text-cream/70 hover:border-gold hover:text-gold"
        }`}
      >
        {asleep ? "Wake" : "Sleep"}
      </button>
      {error && (
        <span role="alert" className="block text-xs">
          {error}
        </span>
      )}
      {dialog}
    </>
  );
}
