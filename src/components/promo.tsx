import Link from "next/link";
import type { Promo } from "@/data";
import { formatPrice } from "@/lib/format";
import { ButtonLink } from "./button";

/** "20 December" from "2026-12-20". */
export const orderByDate = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en-AU", { timeZone: "UTC", day: "numeric", month: "long" });

/** The red strip across the top of every page, linking to the promoted product. */
export function PromoStrip({ promo }: { promo: Promo }) {
  const until = promo.product.availableUntil;
  return (
    <Link
      href={`/shop/${promo.product.slug}`}
      className="eyebrow block bg-[#7a1f1f] px-4 py-2 text-center text-[0.7rem] text-cream transition-colors hover:bg-[#8e2a2a] sm:text-xs"
    >
      ✦ {promo.stripText}
      {until && ` · Order by ${orderByDate(until)}`}
      <span className="underline underline-offset-4"> · Shop now</span> ✦
    </Link>
  );
}

/** The promoted product's banner on the home page: a slim band of words between gold rules (the photo is on its page). */
export function PromoBanner({ promo }: { promo: Promo }) {
  const { product } = promo;
  return (
    <section className="grain bg-cacao-900 px-5 py-12 text-center sm:px-8 md:py-16">
      <div aria-hidden className="flex items-center justify-center gap-4 tracking-[0.5em] text-gold">
        <span className="w-14 border-t border-gold sm:w-20" />
        ❄ ✦ ❄
        <span className="w-14 border-t border-gold sm:w-20" />
      </div>
      <h2 className="mt-3 font-script text-5xl leading-tight text-gold sm:text-6xl">{promo.bannerTitle}</h2>
      <p className="mx-auto mt-3 max-w-xl text-xl text-cream/85">
        {promo.bannerText}{" "}
        <span className="whitespace-nowrap">
          {product.priceFrom && "from "}
          <span className="font-semibold text-gold">{formatPrice(product.price)}</span>
          {product.availableUntil && ` · order by ${orderByDate(product.availableUntil)}`}
        </span>
      </p>
      <ButtonLink href={`/shop/${product.slug}`} variant="outline" className="mt-6 text-gold">
        Shop the bundle
      </ButtonLink>
    </section>
  );
}
