// Data access layer. Pages only call these functions; products and workshops
// live in Supabase and are edited in the Pod (/pod).

import { cache } from "react";
import { createPublicClient } from "@/lib/supabase/public";
import type { ContentBlock, Product, Variant, Workshop } from "./types";

export { fromPrice } from "@/lib/format";

const PRODUCT_COLUMNS =
  "slug, title, image, option_name, subscription_discount, subscription_interval, label_size, label_default_flavour, ingredients_note, description, variants:product_variants(label, price, sold_out, ingredients, label_image, position)";
const WORKSHOP_COLUMNS =
  "slug, title, images, sold_out, option_name, description, variants:workshop_variants(label, price, sold_out, position)";

type VariantRow = {
  label: string;
  price: number;
  sold_out: boolean;
  position: number;
  ingredients?: string | null;
  label_image?: string | null;
};

function toVariants(rows: VariantRow[]): Variant[] {
  return [...rows]
    .sort((a, b) => a.position - b.position)
    .map((v) => ({
      label: v.label,
      price: Number(v.price),
      ...(v.sold_out && { soldOut: true }),
      ...(v.ingredients && { ingredients: v.ingredients }),
    }));
}

type ProductRow = {
  slug: string;
  title: string;
  image: string;
  option_name: string;
  subscription_discount: number | null;
  subscription_interval: string | null;
  label_size: string | null;
  label_default_flavour: string | null;
  ingredients_note: string | null;
  description: unknown;
  variants: VariantRow[];
};

function toProduct(row: ProductRow): Product {
  return {
    slug: row.slug,
    title: row.title,
    image: row.image,
    optionName: row.option_name,
    variants: toVariants(row.variants),
    ...(row.subscription_discount !== null &&
      row.subscription_interval && {
        subscription: { discount: Number(row.subscription_discount), interval: row.subscription_interval },
      }),
    ...((row.label_size === "large" || row.label_size === "small") &&
      row.label_default_flavour && {
        personalisedLabel: {
          size: row.label_size,
          defaultFlavour: row.label_default_flavour,
          images: Object.fromEntries(
            row.variants.flatMap((v) => (v.label_image ? [[v.label, v.label_image]] : [])),
          ),
        },
      }),
    ...(row.ingredients_note && { ingredientsNote: row.ingredients_note }),
    description: row.description as ContentBlock[],
  };
}

type WorkshopRow = {
  slug: string;
  title: string;
  images: string[];
  sold_out: boolean;
  option_name: string;
  description: unknown;
  variants: VariantRow[];
};

function toWorkshop(row: WorkshopRow): Workshop {
  return {
    slug: row.slug,
    title: row.title,
    images: row.images,
    soldOut: row.sold_out,
    optionName: row.option_name,
    variants: toVariants(row.variants),
    description: row.description as ContentBlock[],
  };
}

export const getProducts = cache(async () => {
  const { data, error } = await createPublicClient()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_published", true)
    .order("position");
  if (error) throw error;
  return data.map(toProduct);
});

export const getProduct = cache(async (slug: string) => {
  const { data, error } = await createPublicClient()
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_published", true)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? toProduct(data) : undefined;
});

export const getWorkshops = cache(async () => {
  const { data, error } = await createPublicClient()
    .from("workshops")
    .select(WORKSHOP_COLUMNS)
    .eq("is_published", true)
    .order("position");
  if (error) throw error;
  return data.map(toWorkshop);
});

export const getWorkshop = cache(async (slug: string) => {
  const { data, error } = await createPublicClient()
    .from("workshops")
    .select(WORKSHOP_COLUMNS)
    .eq("is_published", true)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data ? toWorkshop(data) : undefined;
});

export type { ContentBlock, Product, Variant, Workshop } from "./types";
export { site } from "./site";

/** Date and time lines from a workshop's original description. */
export function workshopWhen(workshop: Workshop) {
  return workshop.description
    .flatMap((b) => ("p" in b && b.p !== "SOLD OUT" ? [b.p] : []))
    .slice(0, 2);
}
