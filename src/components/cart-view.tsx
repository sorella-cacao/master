"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatPrice } from "@/lib/format";
import { ButtonLink, buttonClass } from "./button";
import { useCart } from "./cart";

export type DeliveryOption = { id: string; name: string; description: string; needsAddress: boolean; price: number; freeOver: number | null };

/** Workshop tickets aren't posted, so they don't need delivery. */
const isWorkshop = (href: string) => href.startsWith("/workshops/");

export function CartView({ deliveryOptions }: { deliveryOptions: DeliveryOption[] }) {
  const { items, labelFees, subtotal, setQuantity, removeItem } = useCart();
  const [deliveryId, setDeliveryId] = useState(deliveryOptions[0]?.id ?? "");
  // A free postage code: what's typed, and the one accepted.
  const [codeTyped, setCodeTyped] = useState("");
  const [code, setCode] = useState("");
  const [codeMessage, setCodeMessage] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const needsDelivery = items.some((i) => !isWorkshop(i.href));
  // Free postage counts the products (and label fees), not workshop tickets.
  const productsTotal =
    items.filter((i) => !isWorkshop(i.href)).reduce((n, i) => n + i.unitPrice * i.quantity, 0) +
    labelFees.reduce((n, f) => n + f.amount, 0);
  const fullPrice = (option: DeliveryOption) => (option.freeOver !== null && productsTotal >= option.freeOver ? 0 : option.price);
  const deliveryPrice = (option: DeliveryOption) => (code && option.needsAddress ? 0 : fullPrice(option));
  const delivery = needsDelivery ? deliveryOptions.find((d) => d.id === deliveryId) : undefined;
  const total = subtotal + (delivery ? deliveryPrice(delivery) : 0);
  const hasSubscription = items.some((i) => i.frequency);

  async function applyCode(e: React.FormEvent) {
    e.preventDefault();
    const typed = codeTyped.trim().toUpperCase();
    if (!typed) return;
    setCodeMessage("");
    setCheckingCode(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/check_discount_code`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY! },
        body: JSON.stringify({ code: typed }),
      });
      if (!res.ok) throw new Error();
      if (await res.json()) {
        setCode(typed);
        setCodeTyped("");
      } else setCodeMessage("That code isn’t valid, or has already been used.");
    } catch {
      setCodeMessage("We couldn’t check that code. Please try again.");
    } finally {
      setCheckingCode(false);
    }
  }

  // Prices are checked again on the server, then the customer pays on Stripe's page.
  async function checkout() {
    setError("");
    setPaying(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/create-checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site: window.location.origin,
          deliveryId: needsDelivery ? deliveryId : undefined,
          code: code || undefined,
          items: items.map(({ href, variant, quantity, label, frequency }) => ({ href, variant, quantity, label, frequency })),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.url) throw new Error(body.error || "Checkout isn’t working right now. Please try again shortly.");
      window.location.assign(body.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout isn’t working right now. Please try again shortly.");
      setPaying(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mt-10">
        <p className="text-xl text-cream/80">Your cart is empty.</p>
        <ButtonLink href="/shop" className="mt-8">
          Products
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="mt-10">
      <ul className="divide-y divide-white/10 border-y border-white/10">
        {items.map((item) => (
          <li key={item.key} className="flex gap-5 py-6">
            <Link href={item.href} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-28">
              <Image src={item.image} alt={item.title} fill sizes="112px" className="object-cover" />
            </Link>
            <div className="flex flex-1 flex-col justify-between gap-3 sm:flex-row">
              <div>
                <Link href={item.href} className="text-2xl hover:text-gold">
                  {item.title}
                </Link>
                <p className="text-cream/70">{item.variant}</p>
                {item.label && <p className="text-cream/70">Personalised label: “{item.label}”</p>}
                {item.frequency && <p className="text-cream/70">Subscribe · {item.frequency}</p>}
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  className="eyebrow mt-2 text-cream/50 hover:text-gold"
                >
                  Remove
                </button>
              </div>
              <div className="flex items-center gap-6 sm:flex-col sm:items-end">
                <div className="inline-flex items-center rounded-full border border-white/15">
                  <button
                    type="button"
                    aria-label="Decrease quantity"
                    onClick={() => setQuantity(item.key, item.quantity - 1)}
                    className="h-9 w-9 text-lg text-cream/80 hover:text-gold"
                  >
                    −
                  </button>
                  <span className="w-8 text-center font-sans text-base">{item.quantity}</span>
                  <button
                    type="button"
                    aria-label="Increase quantity"
                    onClick={() => setQuantity(item.key, item.quantity + 1)}
                    className="h-9 w-9 text-lg text-cream/80 hover:text-gold"
                  >
                    +
                  </button>
                </div>
                <p className="text-xl">{formatPrice(item.unitPrice * item.quantity)}</p>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {labelFees.length > 0 && (
        <ul className="divide-y divide-white/10 border-b border-white/10">
          {labelFees.map((fee) => (
            <li key={fee.label} className="flex items-baseline justify-between gap-5 py-4">
              <p className="text-cream/80">
                Personalised label “{fee.label}”
                <span className="block text-base text-cream/50">One-off, for every bar with this wording</span>
              </p>
              <p className="text-xl">{formatPrice(fee.amount)}</p>
            </li>
          ))}
        </ul>
      )}

      {needsDelivery && deliveryOptions.length > 0 && (
        <fieldset className="mt-8">
          <legend className="eyebrow mb-3 text-cream/70">Delivery</legend>
          <div className="space-y-2">
            {deliveryOptions.map((option) => {
              const price = deliveryPrice(option);
              return (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-baseline gap-4 rounded-xl border px-4 py-3 transition-colors ${
                    option.id === deliveryId ? "border-gold bg-white/5" : "border-white/15 hover:border-white/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery"
                    value={option.id}
                    checked={option.id === deliveryId}
                    onChange={() => setDeliveryId(option.id)}
                    className="accent-[#d9ad68]"
                  />
                  <span className="flex-1">
                    {option.name}
                    {option.description && <span className="block text-base text-cream/60">{option.description}</span>}
                  </span>
                  <span className="text-xl">{price ? formatPrice(price) : "Free"}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {delivery?.needsAddress && fullPrice(delivery) > 0 && (
        <div className="mt-6">
          {code ? (
            <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-lg" role="status">
              <span>
                Code <strong className="font-sans text-base font-medium tracking-wide text-gold">{code}</strong> added: free postage
              </span>
              <button type="button" onClick={() => setCode("")} className="eyebrow text-cream/60 hover:text-gold">
                Remove
              </button>
            </p>
          ) : (
            <form onSubmit={applyCode} className="space-y-2">
              <label htmlFor="discount-code" className="eyebrow block text-cream/70">
                Discount code
              </label>
              <div className="flex max-w-md gap-3">
                <input
                  id="discount-code"
                  value={codeTyped}
                  onChange={(e) => {
                    setCodeTyped(e.target.value);
                    setCodeMessage("");
                  }}
                  maxLength={30}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  className="min-w-0 flex-1 rounded-xl border border-white/15 bg-cacao-800 px-4 py-3 font-sans text-base uppercase text-cream focus:border-gold focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={checkingCode || !codeTyped.trim()}
                  className={`${buttonClass("outline")} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {checkingCode ? "Checking…" : "Apply"}
                </button>
              </div>
              <p role="status" className="text-base text-gold">
                {codeMessage}
              </p>
            </form>
          )}
        </div>
      )}

      <div className="mt-8 flex flex-col items-end gap-4">
        <p className="text-xl text-cream/80">
          <span className="eyebrow mr-4 text-cream/70">Subtotal</span>
          {formatPrice(subtotal)}
        </p>
        {delivery && (
          <p className="text-xl text-cream/80">
            <span className="eyebrow mr-4 text-cream/70">{delivery.name}</span>
            {deliveryPrice(delivery) ? formatPrice(deliveryPrice(delivery)) : "Free"}
          </p>
        )}
        <p className="text-2xl">
          <span className="eyebrow mr-4 text-cream/70">Total</span>
          {formatPrice(total)}
        </p>
        {hasSubscription && (
          <p className="max-w-md text-right text-base text-gold">
            Subscriptions aren’t available online yet. Please remove the subscription, or add it again as a one-off.
          </p>
        )}
        <button
          type="button"
          onClick={checkout}
          disabled={paying || hasSubscription}
          className={`${buttonClass()} disabled:cursor-not-allowed disabled:opacity-60`}
        >
          {paying ? "Opening secure checkout…" : "Checkout"}
        </button>
        <p role="status" className="max-w-md text-right text-base text-gold">
          {error}
        </p>
        <p className="text-sm text-cream/50">Secure payment by Stripe. Card, Apple Pay or Google Pay.</p>
      </div>
    </div>
  );
}
