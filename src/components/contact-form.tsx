"use client";

import { useState } from "react";
import { buttonClass } from "./button";

const field =
  "w-full rounded-xl border border-white/15 bg-cacao-800 px-4 py-3.5 font-sans text-base text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none";

/**
 * Sends the message to the business (via the contact-message Edge Function, which also emails the
 * sender the reply set in the Pod). If it can't, the visitor is shown the email address instead.
 */
export function ContactForm({ to }: { to: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setError("");
    setState("sending");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/contact-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${data.get("firstName")} ${data.get("lastName")}`.trim(),
          email: data.get("email"),
          message: data.get("message"),
          website: data.get("website"),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error);
      setState("sent");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : `Your message couldn’t be sent. Please email us at ${to}.`);
      setState("idle");
    }
  }

  if (state === "sent") {
    return (
      <div role="status" className="space-y-3">
        <p className="text-2xl text-gold">Thank you, your message is on its way.</p>
        <p className="text-cream/80">We’ll get back to you as soon as we can.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Left empty by people; bots that fill it in are ignored. */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <fieldset>
        <legend className="eyebrow mb-3 text-cream/70">Name</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Label text="First Name">
            <input name="firstName" required autoComplete="given-name" className={field} />
          </Label>
          <Label text="Last Name">
            <input name="lastName" required autoComplete="family-name" className={field} />
          </Label>
        </div>
      </fieldset>
      <Label text="Email" eyebrow>
        <input name="email" type="email" required autoComplete="email" className={field} />
      </Label>
      <Label text="Message" eyebrow>
        <textarea name="message" required rows={6} className={field} />
      </Label>
      <button type="submit" disabled={state === "sending"} className={`${buttonClass()} disabled:opacity-60`}>
        {state === "sending" ? "Sending…" : "Send"}
      </button>
      <p role="status" className="text-gold">
        {error}
      </p>
    </form>
  );
}

function Label({
  text,
  eyebrow,
  children,
}: {
  text: string;
  eyebrow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className={`mb-2 block ${eyebrow ? "eyebrow text-cream/70" : "text-cream/80"}`}>
        {text} <span className="text-cream/40">(required)</span>
      </span>
      {children}
    </label>
  );
}
