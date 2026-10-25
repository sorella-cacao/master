"use client";

import { useActionState } from "react";
import { buttonClass } from "@/components/button";
import { logIn } from "./actions";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(logIn, undefined);

  return (
    <form action={formAction} className="space-y-5">
      <label className="block">
        <span className="eyebrow mb-2 block text-cream/70">Email</span>
        <input type="email" name="email" required autoComplete="email" className="admin-input" />
      </label>
      <label className="block">
        <span className="eyebrow mb-2 block text-cream/70">Password</span>
        <input type="password" name="password" required autoComplete="current-password" className="admin-input" />
      </label>
      {state?.error && (
        <p role="alert" className="text-base text-gold">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className={`${buttonClass()} w-full disabled:opacity-60`}>
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
