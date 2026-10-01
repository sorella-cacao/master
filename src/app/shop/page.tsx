import type { Metadata } from "next";
import { ProductCard } from "@/components/product-card";
import { fromPrice, getProducts, site } from "@/data";

export const metadata: Metadata = { title: site.shop.title };

export default async function ShopPage() {
  const products = await getProducts();
  return (
    <section className="grain bg-cacao-900">
      <div className="mx-auto max-w-7xl px-5 pb-28 pt-16 sm:px-8 md:pt-24">
        <h1 className="font-script text-7xl text-gold sm:text-8xl">{site.shop.title}</h1>
        <div className="mt-14 grid gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
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
  );
}
