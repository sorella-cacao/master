"use client";

import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { ButtonLink, buttonClass } from "./button";
import { useCart } from "./cart";

export function CartView() {
  const { items, labelFees, subtotal, setQuantity, removeItem } = useCart();

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

      <div className="mt-8 flex flex-col items-end gap-6">
        <p className="text-2xl">
          <span className="eyebrow mr-4 text-cream/70">Subtotal</span>
          {formatPrice(subtotal)}
        </p>
        {/* Checkout will hand off to Stripe Checkout once payments are wired up. */}
        <button type="button" disabled className={`${buttonClass()} cursor-not-allowed opacity-60`}>
          Checkout
        </button>
      </div>
    </div>
  );
}
