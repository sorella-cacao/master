import type { Metadata } from "next";
import { ButtonLink } from "@/components/button";
import { ClearCart } from "./clear-cart";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };

/** Where Stripe sends customers once they've paid. */
export default function ThanksPage() {
  return (
    <section className="grain bg-cacao-900">
      <div className="mx-auto max-w-3xl px-5 pb-28 pt-16 sm:px-8 md:pt-24">
        <ClearCart />
        <h1 className="font-script text-7xl text-gold sm:text-8xl">Thank you</h1>
        <p className="mt-8 text-2xl leading-relaxed text-cream/85">
          Your order is in and your receipt is on its way to your email. We’ll be in touch if we need anything, and when
          it’s on its way to you.
        </p>
        <ButtonLink href="/shop" className="mt-10">
          Back to the shop
        </ButtonLink>
      </div>
    </section>
  );
}
