// The "Shipping & tracking" email: carriers and their tracking pages, and the receipt it shows.
// Used by the shipping-email Edge Function to send and by the Pod to preview, so it imports nothing
// (the Receipt shape matches email-html.ts).

export const CARRIERS = [
  { name: "Australia Post", track: "https://auspost.com.au/mypost/track/details/" },
  { name: "StarTrack", track: "https://startrack.com.au/track/details/" },
  { name: "Sendle", track: "https://www.sendle.com/tracking?ref=" },
  { name: "Aramex", track: "https://www.aramex.com.au/tools/track?l=" },
  { name: "CouriersPlease", track: "https://www.couriersplease.com.au/tools-track/no/" },
] as const;

/** The carrier's page for this parcel, or (for a carrier not listed) where to look it up. */
export function trackingLink(carrier: string, tracking: string) {
  const known = CARRIERS.find((c) => c.name === carrier);
  return known ? known.track + encodeURIComponent(tracking.trim()) : `the ${carrier} website`;
}

type Receipt = {
  heading: string;
  lines: { name: string; quantity?: number; amount: number; note?: string }[];
  extras: { name: string; amount: number }[];
  total: number;
};

/** A website order's chocolate, labels and postage, as in its other emails. */
export function webReceipt(web: {
  items: { title: string; variant: string; quantity: number; unit_price: number; label: string | null; workshop: boolean }[];
  label_fees: { label: string; amount: number }[] | null;
  delivery: string;
  delivery_price: number;
}): Receipt | null {
  const lines = web.items
    .filter((i) => !i.workshop)
    .map((i) => ({ name: `${i.title}, ${i.variant}`, quantity: i.quantity, amount: i.quantity * Number(i.unit_price), note: i.label ?? undefined }));
  if (!lines.length) return null;
  const extras = [
    ...(web.label_fees ?? []).map((f) => ({ name: `Personalised label “${f.label}”`, amount: Number(f.amount) })),
    ...(web.delivery ? [{ name: web.delivery, amount: Number(web.delivery_price) }] : []),
  ];
  const sum = (rows: { amount: number }[]) => rows.reduce((n, r) => n + Number(r.amount), 0);
  return { heading: "Your Order", lines, extras, total: sum(lines) + sum(extras) };
}

/** Any other order (e.g. a spontaneous buy), from its lines named like "Large Bar, 75% Dark". */
export function linesReceipt(lines: { name: string; quantity: number; unit_price: number }[]): Receipt | null {
  if (!lines.length) return null;
  const rows = lines.map((l) => ({ name: l.name, quantity: l.quantity, amount: l.quantity * Number(l.unit_price) }));
  return { heading: "Your Order", lines: rows, extras: [], total: rows.reduce((n, r) => n + r.amount, 0) };
}

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";
