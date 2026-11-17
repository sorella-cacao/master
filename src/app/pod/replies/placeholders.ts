/**
 * What each automatic email can fill in, with sample values for the preview. Matches what the
 * Edge Functions fill in (supabase/functions/_shared/email.ts and contact-message).
 */
const ORDER = {
  first_name: "Anna",
  name: "Anna Smith",
  items: "2 × Large Bar – 75% Dark (label: “Happy Birthday Mum”)\n1 × Small Bar – 84% Dark",
  total: "$67.00",
  delivery: "Post (Australia-wide) ($16.00): 12 Main St, Katoomba NSW 2780",
  address: "12 Main St, Katoomba NSW 2780",
};

export const PLACEHOLDERS: Record<string, Record<string, string>> = {
  order_received: { first_name: ORDER.first_name, name: ORDER.name, items: ORDER.items, total: ORDER.total, delivery: ORDER.delivery },
  workshop_booking: {
    first_name: ORDER.first_name,
    name: ORDER.name,
    workshops: "2 × Chocolate Making Workshop – Adult $95",
    total: "$190.00",
  },
  order_posted: { first_name: ORDER.first_name, name: ORDER.name, items: ORDER.items, address: ORDER.address },
  order_ready: { first_name: ORDER.first_name, name: ORDER.name, items: ORDER.items },
  contact_reply: { first_name: ORDER.first_name, name: ORDER.name, message: "Hi! Do you make vegan chocolate?" },
};

/** "Hi {first_name}" → "Hi Anna". Unknown placeholders are left as they are. */
export const fill = (text: string, values: Record<string, string>) =>
  text.replace(/\{(\w+)\}/g, (whole, key) => (key in values ? values[key] : whole));
