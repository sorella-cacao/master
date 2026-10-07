const aud = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

export function formatPrice(amount: number) {
  return aud.format(amount);
}

/** Lowest price across a product's options. */
export function fromPrice(variants: { label: string; price: number }[]) {
  return Math.min(...variants.map((v) => v.price));
}
