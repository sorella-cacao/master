import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailLayout } from "@/components/detail-layout";
import { PurchaseForm } from "@/components/purchase-form";
import { RichText } from "@/components/rich-text";
import { getProduct, getProducts, site } from "@/data";

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

  return (
    <DetailLayout
      crumb={{ label: site.shop.title, href: "/shop" }}
      title={product.title}
      images={[product.image]}
      purchase={
        <PurchaseForm
          href={`/shop/${product.slug}`}
          title={product.title}
          image={product.image}
          optionName={product.optionName}
          variants={product.variants}
          subscription={product.subscription}
          personalisedLabel={product.personalisedLabel}
          ingredientsNote={product.ingredientsNote}
          actionLabel="Add To Cart"
        />
      }
    >
      <RichText blocks={product.description} />
    </DetailLayout>
  );
}
