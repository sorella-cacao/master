import Image from "next/image";
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

/** The promoted product's banner on the home page: photo, title, words and price in a double gold frame. */
export function PromoBanner({ promo }: { promo: Promo }) {
  const { product } = promo;
  return (
    <section className="grain bg-cacao-900 px-5 py-16 sm:px-8 md:py-24">
      <div className="mx-auto grid max-w-5xl overflow-hidden rounded-2xl border-[3px] border-double border-gold bg-cacao-950 md:grid-cols-2">
        <div className="relative aspect-[4/3] md:aspect-auto md:min-h-96">
          <Image src={product.image} alt={product.title} fill sizes="(min-width: 768px) 40vw, 90vw" className="object-cover" />
        </div>
        <div className="flex flex-col items-center justify-center px-6 py-10 text-center sm:px-10">
          <p aria-hidden className="tracking-[0.5em] text-gold">
            ❄ ✦ ❄
          </p>
          <h2 className="mt-2 font-script text-6xl leading-tight text-gold sm:text-7xl">{promo.bannerTitle}</h2>
          <p className="mt-4 max-w-sm text-xl text-cream/85">{promo.bannerText}</p>
          <p className="mt-5 text-3xl">{formatPrice(product.price)}</p>
          {product.availableUntil && (
            <p className="mt-1 italic text-cream/70">Order by {orderByDate(product.availableUntil)}</p>
          )}
          <ButtonLink href={`/shop/${product.slug}`} className="mt-7">
            Shop now
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
