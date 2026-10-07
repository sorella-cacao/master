import type { Metadata } from "next";
import Image from "next/image";
import { site } from "@/data";

const { about } = site;

export const metadata: Metadata = { title: about.title };

export default function AboutPage() {
  return (
    <>
      <section className="grain bg-cacao-900">
        <div className="mx-auto max-w-7xl px-5 pb-24 pt-16 sm:px-8 md:pb-32 md:pt-24">
          <p className="eyebrow text-gold">{about.title}</p>
          <div className="mt-6 grid gap-14 lg:grid-cols-2 lg:gap-20">
            <div>
              <h1 className="font-script text-6xl text-gold sm:text-7xl">{about.beganHeading}</h1>
              <div className="prose-cacao mt-8 text-xl leading-relaxed text-cream/90">
                {about.began.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </div>

            <figure>
              <div className="grid grid-cols-2 gap-4">
                <div className="relative col-span-2 aspect-[16/9] overflow-hidden rounded-2xl">
                  <Image src="/images/teacher-1.webp" alt="" fill sizes="(min-width: 1024px) 45vw, 90vw" className="object-cover" />
                </div>
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
                  <Image src="/images/teacher-2.webp" alt="" fill sizes="(min-width: 1024px) 22vw, 45vw" className="object-cover" />
                </div>
                <div className="relative aspect-[3/4] overflow-hidden rounded-2xl">
                  <Image src="/images/teacher-3.webp" alt="" fill sizes="(min-width: 1024px) 22vw, 45vw" className="object-cover object-top" />
                </div>
              </div>
              <figcaption className="mt-4 text-lg italic text-cream/70">
                {about.teachersCaption}
              </figcaption>
            </figure>
          </div>
        </div>
      </section>

      <section className="bg-cream text-cacao-900">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 md:py-32">
          <h2 className="text-center text-5xl sm:text-6xl">{about.valuesHeading}</h2>
          <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {about.values.map((value, i) => (
              <li key={value} className="rounded-2xl border border-cacao-900/10 bg-parchment/60 p-8">
                <span className="font-script text-5xl text-caramel">{i + 1}</span>
                <p className="mt-4 text-2xl leading-snug">{value}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="grain bg-cacao-900">
        <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-8 md:grid-cols-[0.9fr_1.1fr] md:gap-20 md:py-32">
          <div className="relative aspect-[3/4] overflow-hidden rounded-2xl md:sticky md:top-28 md:self-start">
            <Image src="/images/workshop-2.webp" alt="" fill sizes="(min-width: 768px) 40vw, 100vw" className="object-cover" />
          </div>
          <div>
            <h2 className="text-5xl text-gold sm:text-6xl">{about.whatWeDoHeading}</h2>
            <p className="mt-8 text-2xl italic leading-relaxed sm:text-3xl">{about.whatWeDo[0]}</p>
            <div className="prose-cacao mt-8 text-xl leading-relaxed text-cream/85">
              {about.whatWeDo.slice(1).map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
