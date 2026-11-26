"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { type Receipt, renderEmail } from "../../../../supabase/functions/_shared/email-html";
import { CARRIERS, firstName, trackingLink } from "../../../../supabase/functions/_shared/shipping";
import { sendShippingEmail } from "./actions";

const OTHER = "other";

/**
 * The "Shipping & tracking" email for one order: who it goes to, the carrier and tracking number,
 * and a preview of the email as it will be sent.
 */
export function ShipForm({
  orderId,
  template,
  defaults,
  receipt,
  address,
  emailedAt,
}: {
  orderId: string;
  template: { subject: string; body: string; enabled: boolean };
  defaults: { name: string; email: string; carrier: string; tracking: string };
  receipt: Receipt | null;
  address: string;
  /** When it was last emailed, if it has been. */
  emailedAt: string | null;
}) {
  const known = !defaults.carrier || CARRIERS.some((c) => c.name === defaults.carrier);
  const [name, setName] = useState(defaults.name);
  const [email, setEmail] = useState(defaults.email);
  const [carrierChoice, setCarrierChoice] = useState<string>(known ? defaults.carrier || CARRIERS[0].name : OTHER);
  const [otherCarrier, setOtherCarrier] = useState(known ? "" : defaults.carrier);
  const [tracking, setTracking] = useState(defaults.tracking);
  const [status, setStatus] = useState<{ ok?: string; error?: string }>();
  const [sending, startSending] = useTransition();

  const carrier = carrierChoice === OTHER ? otherCarrier.trim() : carrierChoice;
  const preview = renderEmail(
    template.subject,
    template.body,
    {
      first_name: firstName(name),
      name,
      carrier: carrier || "…",
      tracking_number: tracking.trim() || "…",
      tracking_link: carrier && tracking.trim() ? trackingLink(carrier, tracking) : "…",
      address,
      items: "",
    },
    receipt ? { items: receipt } : {},
  );

  function send(e: React.FormEvent) {
    e.preventDefault();
    setStatus(undefined);
    startSending(async () => setStatus(await sendShippingEmail(orderId, { name, email, carrier, tracking })));
  }

  return (
    <form onSubmit={send} className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4 font-sans text-sm">
        <label className="block">
          <span className="eyebrow mb-1 block text-xs text-cream/70">Their name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required className="pod-input py-2 text-sm" />
        </label>
        <label className="block">
          <span className="eyebrow mb-1 block text-xs text-cream/70">Their email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="pod-input py-2 text-sm" />
        </label>
        <label className="block">
          <span className="eyebrow mb-1 block text-xs text-cream/70">Carrier</span>
          <select value={carrierChoice} onChange={(e) => setCarrierChoice(e.target.value)} className="pod-input py-2 text-sm">
            {CARRIERS.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
            <option value={OTHER}>Other…</option>
          </select>
        </label>
        {carrierChoice === OTHER && (
          <label className="block">
            <span className="eyebrow mb-1 block text-xs text-cream/70">Carrier’s name</span>
            <input value={otherCarrier} onChange={(e) => setOtherCarrier(e.target.value)} required className="pod-input py-2 text-sm" />
          </label>
        )}
        <label className="block">
          <span className="eyebrow mb-1 block text-xs text-cream/70">Tracking number</span>
          <input
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            required
            autoComplete="off"
            spellCheck={false}
            className="pod-input py-2 text-sm"
          />
        </label>
        {!template.enabled && (
          <p className="text-gold">This email is switched off. Tick “Send this email” under Shipping &amp; tracking below first.</p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
          <button
            type="submit"
            disabled={sending || !template.enabled}
            className="eyebrow rounded-full bg-caramel px-5 py-2.5 text-cacao-950 transition-colors hover:bg-gold disabled:opacity-60"
          >
            {sending ? "Sending…" : emailedAt || status?.ok ? "Send again" : "Send shipping email"}
          </button>
          <Link href={`/pod/orders#order-${orderId}`} className="eyebrow text-cream/70 hover:text-gold">
            Back to orders
          </Link>
        </div>
        <p role="status" className={`text-sm ${status?.error ? "text-gold" : "text-cream/70"}`}>
          {status?.error ?? status?.ok ?? (emailedAt ? `Already emailed ${emailedAt}.` : "")}
        </p>
      </div>
      <div className="space-y-2">
        <p className="eyebrow text-xs text-cream/70">Preview</p>
        <p className="font-sans text-sm">
          <span className="text-cream/60">Subject:</span> {preview.subject}
        </p>
        <iframe title="Shipping email preview" srcDoc={preview.html} className="h-[34rem] w-full rounded-xl border border-white/15 bg-[#1c1003]" />
      </div>
    </form>
  );
}
