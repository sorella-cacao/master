// Data access layer. Pages only call these functions, so the source can
// later move from local files to Supabase without touching the pages.

import { products, workshops } from "./catalog";
import type { Workshop } from "./types";

export { fromPrice } from "@/lib/format";

export async function getProducts() {
  return products;
}

export async function getProduct(slug: string) {
  return products.find((p) => p.slug === slug);
}

export async function getWorkshops() {
  return workshops;
}

export async function getWorkshop(slug: string) {
  return workshops.find((w) => w.slug === slug);
}


export type { ContentBlock, Product, Variant, Workshop } from "./types";
export { site } from "./site";

/** Date and time lines from a workshop's original description. */
export function workshopWhen(workshop: Workshop) {
  return workshop.description
    .flatMap((b) => ("p" in b && b.p !== "SOLD OUT" ? [b.p] : []))
    .slice(0, 2);
}
