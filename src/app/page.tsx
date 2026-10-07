import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/button";
import { ProductCard } from "@/components/product-card";
import { fromPrice, getProducts, getWorkshops, site, workshopWhen } from "@/data";

export default async function Home() {
  const [products, workshops] = await Promise.all([getProducts(), getWorkshops()]);
  const nextWorkshop = workshops.find((w) => !w.soldOut) ?? workshops[0];

  return (
    <>
      {/* Hero */}
      <section className="relative -mt-20 flex min-h-[100svh] items-center justify-center overflow-hidden">
        <Image
          src="/images/home-hero.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-cacao-950/70 via-cacao-950/45 to-cacao-900" />
        <div className="relative px-5 pt-20 text-center">
          <h1 className="font-script text-7xl leading-none text-gold drop-shadow-lg sm:text-8xl md:text-9xl">
            {site.name}
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-xl italic text-cream/90 sm:text-2xl">
            {site.tagline}
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <ButtonLink href="/shop">Products</ButtonLink>
            <ButtonLink href="/workshops" variant="outline" className="text-cream">
              Workshops
            </ButtonLink>
          </div>
        </div>
      </section>

      {/* Welcome */}
      <section className="bg-cream text-cacao-900">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 sm:px-8 md:grid-cols-2 md:gap-20 md:py-32">
          <div className="relative mx-auto aspect-[2/3] w-full max-w-md overflow-hidden rounded-2xl">
            <Image
              src="/images/home-bowl.webp"
              alt=""
              fill
              sizes="(min-width: 768px) 40vw, 90vw"
              className="origin-top scale-110 object-cover"
            />
          </div>
          <div>
            <h2 className="font-script text-6xl text-husk sm:text-7xl">
              {site.home.welcomeHeading}
            </h2>
            <p className="mt-8 text-xl leading-relaxed sm:text-2xl">{site.home.welcome}</p>
            <blockquote className="mt-10 border-l-2 border-caramel pl-6 text-lg italic leading-relaxed text-cacao-700">
              {site.home.acknowledgement}
            </blockquote>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="grain bg-cacao-900">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 md:py-32">
          <div className="flex items-end justify-between gap-6">
            <h2 className="text-5xl sm:text-6xl">{site.shop.title}</h2>
            <Link href="/shop" className="eyebrow text-gold hover:text-cream">
              View all →
            </Link>
          </div>
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <ProductCard
                key={p.slug}
                href={`/shop/${p.slug}`}
                title={p.title}
                image={p.image}
                price={fromPrice(p.variants)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Workshops */}
      <section className="bg-parchment text-cacao-900">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 sm:px-8 md:grid-cols-[1fr_1.1fr] md:gap-20 md:py-32">
          <div>
            <h2 className="font-script text-6xl leading-tight text-husk sm:text-7xl">
              {site.workshops.heading}
            </h2>
            {nextWorkshop && (
              <Link
                href={`/workshops/${nextWorkshop.slug}`}
                className="group mt-8 block rounded-2xl border border-cacao-900/10 bg-cream p-6 transition hover:border-caramel"
              >
                <p className="text-2xl group-hover:text-husk">{nextWorkshop.title}</p>
                {workshopWhen(nextWorkshop).map((line) => (
                  <p key={line} className="mt-1 text-cacao-700">
                    {line}
                  </p>
                ))}
                <p className="eyebrow mt-4 text-husk">Learn More →</p>
              </Link>
            )}
            <ButtonLink href="/workshops" className="mt-8">
              {site.workshops.title}
            </ButtonLink>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl">
            <Image
              src="/images/workshop-2.webp"
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
        </div>
      </section>
    </>
  );
}
