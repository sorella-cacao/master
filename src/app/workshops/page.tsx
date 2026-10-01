import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ButtonLink } from "@/components/button";
import { getWorkshops, site, workshopWhen } from "@/data";

export const metadata: Metadata = { title: site.workshops.title };

export default async function WorkshopsPage() {
  const workshops = await getWorkshops();

  return (
    <>
      <section className="grain bg-cacao-900">
        <div className="mx-auto max-w-7xl px-5 pb-24 pt-16 sm:px-8 md:pt-24">
          <p className="eyebrow text-center text-gold">{site.workshops.title}</p>
          <h1 className="mx-auto mt-4 max-w-3xl text-center font-script text-7xl leading-tight text-gold sm:text-8xl">
            {site.workshops.heading}
          </h1>

          <div className="mt-16 space-y-6">
            {workshops.map((w) => {
              const intro = w.description.find(
                (b) => "p" in b && b.p.startsWith("Step into"),
              );
              return (
                <Link
                  key={w.slug}
                  href={`/workshops/${w.slug}`}
                  className={`group grid items-center gap-6 overflow-hidden rounded-2xl border border-white/10 bg-cacao-800/60 p-4 transition hover:border-caramel sm:grid-cols-[220px_1fr] sm:gap-10 sm:p-5 ${
                    w.soldOut ? "opacity-70" : ""
                  }`}
                >
                  <div className="relative aspect-square overflow-hidden rounded-xl">
                    <Image
                      src={w.images[0]}
                      alt=""
                      fill
                      sizes="220px"
                      className="object-cover transition duration-700 group-hover:scale-105"
                    />
                    {w.soldOut && (
                      <span className="eyebrow absolute left-3 top-3 rounded-full bg-cacao-950/85 px-3 py-1 text-cream">
                        Sold Out
                      </span>
                    )}
                  </div>
                  <div className="pb-2 sm:pb-0">
                    <h2 className="text-3xl transition-colors group-hover:text-gold">{w.title}</h2>
                    <div className="mt-2 text-cream/70">
                      {workshopWhen(w).map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                    {intro && "p" in intro && (
                      <p className="mt-4 line-clamp-2 text-cream/85">{intro.p}</p>
                    )}
                    <p className="eyebrow mt-4 text-gold">Learn More →</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-cream text-cacao-900">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-24 sm:px-8 md:grid-cols-2 md:gap-20">
          <div className="relative aspect-[1.1] overflow-hidden rounded-2xl">
            <Image
              src="/images/workshop-group.webp"
              alt=""
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
            />
          </div>
          <div>
            <p className="text-3xl leading-snug sm:text-4xl">{site.workshops.privateGroups}</p>
            <ButtonLink href="/contact" className="mt-10">
              {site.contactPage.title}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
