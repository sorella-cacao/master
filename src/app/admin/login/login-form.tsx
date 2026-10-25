"use client";

import { startTransition, useActionState } from "react";
import { buttonClass } from "@/components/button";
import { logIn } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(logIn, undefined);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    // Submit manually so a failed attempt keeps the email typed in.
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {state?.error && (
        <p role="alert" className="rounded-xl border border-gold/60 bg-gold/10 px-4 py-3 font-sans text-base text-cream">
          {state.error}
        </p>
      )}
      <label className="block">
        <span className="eyebrow mb-2 block text-cream/70">Email</span>
        <input type="email" name="email" required autoComplete="email" className="admin-input" />
      </label>
      <label className="block">
        <span className="eyebrow mb-2 block text-cream/70">Password</span>
        <input type="password" name="password" required autoComplete="current-password" className="admin-input" />
      </label>
      <button type="submit" disabled={pending} className={`${buttonClass()} w-full disabled:opacity-60`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
