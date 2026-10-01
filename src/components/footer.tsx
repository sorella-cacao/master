import Image from "next/image";
import Link from "next/link";
import { site } from "@/data/site";

export function Footer() {
  const { contact } = site;
  return (
    <footer className="grain bg-cacao-950 text-cream/80">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-3">
            <Image
              src="/images/logo.webp"
              alt=""
              width={52}
              height={53}
              className="rounded-full"
            />
            <span className="font-script text-4xl text-gold">{site.name}</span>
          </Link>
          <p className="mt-4 max-w-xs italic text-cream/60">{site.tagline}</p>
        </div>

        <nav aria-label="Footer">
          <ul className="space-y-2">
            {site.nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="hover:text-gold">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <h2 className="eyebrow mb-3 text-gold">Location</h2>
          <p>{contact.location}</p>
        </div>

        <div>
          <h2 className="eyebrow mb-3 text-gold">Contact</h2>
          <p>
            <a href={`mailto:${contact.email}`} className="hover:text-gold">
              {contact.email}
            </a>
          </p>
          <p className="mt-1">
            <a href={`tel:${contact.phone}`} className="hover:text-gold">
              {contact.phone}
            </a>
          </p>
        </div>
      </div>
      <div className="border-t border-white/5">
        <p className="mx-auto max-w-7xl px-5 py-6 text-sm text-cream/40 sm:px-8">
          © {new Date().getFullYear()} {site.name}
        </p>
      </div>
    </footer>
  );
}
