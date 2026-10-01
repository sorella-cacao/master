import type { Metadata } from "next";
import Image from "next/image";
import { ContactForm } from "@/components/contact-form";
import { site } from "@/data";

export const metadata: Metadata = { title: site.contactPage.title };

export default function ContactPage() {
  const { contact, contactPage } = site;
  return (
    <section className="grain bg-cacao-900">
      <div className="mx-auto grid max-w-7xl gap-14 px-5 pb-28 pt-16 sm:px-8 md:pt-24 lg:grid-cols-2 lg:gap-20">
        <div>
          <h1 className="font-script text-7xl text-gold sm:text-8xl">{contactPage.title}</h1>
          <p className="mt-4 text-2xl italic text-cream/85">{contactPage.intro}</p>

          <dl className="mt-10 grid gap-6 border-y border-white/10 py-8 sm:grid-cols-2">
            <div>
              <dt className="eyebrow text-gold">Location</dt>
              <dd className="mt-2">{contact.location}</dd>
            </div>
            <div>
              <dt className="eyebrow text-gold">Contact</dt>
              <dd className="mt-2">
                <a href={`mailto:${contact.email}`} className="block hover:text-gold">
                  {contact.email}
                </a>
                <a href={`tel:${contact.phone}`} className="block hover:text-gold">
                  {contact.phone}
                </a>
              </dd>
            </div>
          </dl>

          <div className="mt-10">
            <ContactForm to={contact.email} />
          </div>
        </div>

        <div className="relative hidden aspect-[3/4] overflow-hidden rounded-t-full lg:block lg:sticky lg:top-28 lg:self-start">
          <Image src="/images/contact.webp" alt="" fill sizes="45vw" className="object-cover" />
        </div>
      </div>
    </section>
  );
}
