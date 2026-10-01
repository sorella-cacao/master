import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";

export function ProductCard({
  href,
  title,
  image,
  price,
}: {
  href: string;
  title: string;
  image: string;
  price: number;
}) {
  return (
    <Link href={href} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-cacao-800">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition duration-700 group-hover:scale-105"
        />
      </div>
      <div className="mt-5 flex items-baseline justify-between gap-4">
        <h3 className="text-2xl transition-colors group-hover:text-gold">{title}</h3>
        <p className="shrink-0 text-cream/70">from {formatPrice(price)}</p>
      </div>
    </Link>
  );
}
