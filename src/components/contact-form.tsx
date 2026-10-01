"use client";

import { buttonClass } from "./button";

const field =
  "w-full rounded-xl border border-white/15 bg-cacao-800 px-4 py-3.5 font-sans text-base text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none";

/**
 * Mock-up only: opens the visitor's email app with the message filled in.
 * Will be replaced by a server action that sends via Resend.
 */
export function ContactForm({ to }: { to: string }) {
  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = `${data.get("firstName")} ${data.get("lastName")}`.trim();
    const body = `${data.get("message")}\n\n${name}\n${data.get("email")}`;
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(
      `Message from ${name}`,
    )}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form onSubmit={submit} className="space-y-6">
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
      <button type="submit" className={buttonClass()}>
        Send
      </button>
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
