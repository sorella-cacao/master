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
    <section className="bg-[#7a1f1f] px-5 py-12 text-cream sm:px-8 md:py-14">
      <div className="mx-auto grid max-w-4xl items-center gap-6 text-center md:grid-cols-2 md:gap-12 md:text-left">
        <div>
          <p className="eyebrow text-[0.7rem] text-[#f3d9d9] sm:text-xs">
            {product.availableUntil ? `Limited · order by ${orderByDate(product.availableUntil)}` : "Limited · this Christmas only"}
          </p>
          <h2 className="mt-2 font-script text-5xl leading-tight text-gold sm:text-6xl">{promo.bannerTitle}</h2>
        </div>
        <div>
          {promo.bannerText && <p className="text-xl italic leading-snug">{promo.bannerText}</p>}
          <p className="mt-2 text-lg text-cream/85">
            {product.priceFrom ? "From " : ""}
            <span className="font-semibold text-gold">{formatPrice(product.price)}</span>
          </p>
          <ButtonLink href={`/shop/${product.slug}`} className="mt-5">
            Shop now
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
