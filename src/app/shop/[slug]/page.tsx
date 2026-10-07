import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailImages, DetailLayout } from "@/components/detail-layout";
import { LabelChoiceProvider, LabelPreviewSwitch } from "@/components/personalised-label";
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

  const label = product.personalisedLabel;

  return (
    <LabelChoiceProvider>
      <DetailLayout
        crumb={{ label: site.shop.title, href: "/shop" }}
        title={product.title}
        images={[product.image]}
        media={
          label && (
            <LabelPreviewSwitch label={label}>
              <DetailImages title={product.title} images={[product.image]} />
            </LabelPreviewSwitch>
          )
        }
        purchase={
          <PurchaseForm
            href={`/shop/${product.slug}`}
            title={product.title}
            image={product.image}
            optionName={product.optionName}
            variants={product.variants}
            subscription={product.subscription}
            personalisedLabel={label}
            actionLabel="Add To Cart"
          />
        }
      >
        <RichText blocks={product.description} />
      </DetailLayout>
    </LabelChoiceProvider>
  );
}
