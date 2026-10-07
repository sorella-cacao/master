import Image from "next/image";
import Link from "next/link";

/** Shared two-column layout for product and workshop pages. */
export function DetailLayout({
  crumb,
  title,
  images,
  media,
  purchase,
  children,
}: {
  crumb: { label: string; href: string };
  title: string;
  images: string[];
  /** Replaces the photo column, e.g. to swap in a live label preview. */
  media?: React.ReactNode;
  purchase: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="grain bg-cacao-900">
      <div className="mx-auto max-w-7xl px-5 pb-28 pt-10 sm:px-8 md:pt-14">
        <nav aria-label="Breadcrumb" className="eyebrow text-cream/60">
          <Link href={crumb.href} className="hover:text-gold">
            {crumb.label}
          </Link>
          <span className="mx-3">›</span>
          <span className="text-cream/90">{title}</span>
        </nav>

        <div className="mt-8 grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="space-y-4 lg:sticky lg:top-28 lg:self-start">
            {media ?? <DetailImages title={title} images={images} />}
          </div>

          <div>
            <h1 className="text-5xl leading-tight sm:text-6xl">{title}</h1>
            <div className="mt-8 rounded-2xl border border-white/10 bg-cacao-950/40 p-6 sm:p-8">
              {purchase}
            </div>
            <div className="mt-12 text-lg leading-relaxed text-cream/85">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function DetailImages({ title, images }: { title: string; images: string[] }) {
  return images.map((src, i) => (
    <div key={src} className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-cacao-800">
      <Image
        src={src}
        alt={i === 0 ? title : ""}
        fill
        priority={i === 0}
        sizes="(min-width: 1024px) 45vw, 100vw"
        className="object-cover"
      />
    </div>
  ));
}
