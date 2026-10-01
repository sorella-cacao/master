import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DetailLayout } from "@/components/detail-layout";
import { PurchaseForm } from "@/components/purchase-form";
import { RichText } from "@/components/rich-text";
import { getWorkshop, getWorkshops, site } from "@/data";

export async function generateStaticParams() {
  const workshops = await getWorkshops();
  return workshops.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/workshops/[slug]">): Promise<Metadata> {
  const workshop = await getWorkshop((await params).slug);
  return { title: workshop?.title };
}

export default async function WorkshopPage({ params }: PageProps<"/workshops/[slug]">) {
  const workshop = await getWorkshop((await params).slug);
  if (!workshop) notFound();

  return (
    <DetailLayout
      crumb={{ label: site.workshops.title, href: "/workshops" }}
      title={workshop.title}
      images={workshop.images}
      purchase={
        <PurchaseForm
          href={`/workshops/${workshop.slug}`}
          title={workshop.title}
          image={workshop.images[0]}
          optionName={workshop.optionName}
          variants={workshop.variants}
          soldOut={workshop.soldOut}
          actionLabel="Register"
        />
      }
    >
      <RichText blocks={workshop.description} />
    </DetailLayout>
  );
}
