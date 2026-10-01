const aud = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
});

export function formatPrice(amount: number) {
  return aud.format(amount);
}

/** Lowest price, ignoring add-ons like the $1 personalised label. */
export function fromPrice(variants: { label: string; price: number }[]) {
  const items = variants.filter((v) => !/personalised label/i.test(v.label));
  return Math.min(...(items.length ? items : variants).map((v) => v.price));
}
