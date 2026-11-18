import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailLayout } from "@/components/detail-layout";
import { PurchaseForm } from "@/components/purchase-form";
import { orderByDate } from "@/components/promo";
import { RichText } from "@/components/rich-text";
import { getProduct, getProducts, orderingClosed, site } from "@/data";

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  return { title: product?.title };
}

export default async function ProductPage({ params }: PageProps<"/shop/[slug]">) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const closed = orderingClosed(product);

  return (
    <DetailLayout
      crumb={{ label: site.shop.title, href: "/shop" }}
      title={product.title}
      subheading={product.subheading}
      images={[product.image]}
      smallImage
      purchase={
        <div className="space-y-4">
          {product.availableUntil && (
            <p className="eyebrow inline-block rounded-full bg-[#2f4a35] px-3 py-1 text-xs text-cream">
              {closed ? "Orders have closed" : `Order by ${orderByDate(product.availableUntil)}`}
            </p>
          )}
          <PurchaseForm
            href={`/shop/${product.slug}`}
            title={product.title}
            image={product.image}
            optionName={product.optionName}
            variants={product.variants}
            // Subscriptions (product.subscription) come back once Stripe can bill them monthly.
            personalisedLabel={product.personalisedLabel}
            ingredientsNote={product.ingredientsNote}
            soldOut={closed}
            actionLabel="Add To Cart"
          />
        </div>
      }
    >
      <RichText blocks={product.description} />
    </DetailLayout>
  );
}
