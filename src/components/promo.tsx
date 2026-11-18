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
    <section className="bg-cacao-950 px-5 py-10 sm:px-8 md:py-14">
      <div className="grain mx-auto max-w-2xl rounded-2xl border-[3px] border-double border-gold bg-cacao-800 px-5 py-8 text-center shadow-2xl sm:px-10">
        <div aria-hidden className="flex items-center justify-center gap-3 text-sm tracking-[0.4em] text-gold">
          <span className="w-12 border-t border-gold sm:w-16" />
          ❄ ✦ ❄
          <span className="w-12 border-t border-gold sm:w-16" />
        </div>
        <h2 className="mt-2 font-script text-4xl leading-tight text-gold sm:text-5xl">{promo.bannerTitle}</h2>
        <p className="mt-2 text-lg text-cream/85">
          {promo.bannerText} {product.priceFrom ? "from" : "for"}{" "}
          <span className="font-semibold text-gold">{formatPrice(product.price)}</span>
          {product.availableUntil && (
            <span className="whitespace-nowrap"> · order by {orderByDate(product.availableUntil)}</span>
          )}
        </p>
        <ButtonLink href={`/shop/${product.slug}`} variant="outline" className="mt-5 text-gold">
          Shop the bundles
        </ButtonLink>
      </div>
    </section>
  );
}
