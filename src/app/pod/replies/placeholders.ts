import type { Receipt } from "../../../../supabase/functions/_shared/email-html";

/**
 * Sample details for previewing and testing each automatic email: what its placeholders are filled
 * with, and the receipts {items} and {workshops} become. Matches what the Edge Functions fill in
 * (orderEmail in supabase/functions/_shared/email.ts, and contact-message).
 */
const ORDER: Receipt = {
  heading: "Your Order",
  lines: [
    { name: "Large Bar, 75% Dark", quantity: 2, amount: 28, note: "Happy Birthday Mum" },
    { name: "Small Bar, 84% Dark", quantity: 1, amount: 8 },
  ],
  extras: [
    { name: "Personalised label “Happy Birthday Mum”", amount: 15 },
    { name: "Post (Australia-wide)", amount: 16 },
  ],
  total: 67,
};
const PERSON = { first_name: "Anna", name: "Anna Smith" };
const ADDRESS = "12 Main St, Katoomba NSW 2780";

export const SAMPLES: Record<string, { values: Record<string, string>; receipts: Record<string, Receipt> }> = {
  order_received: {
    values: { ...PERSON, total: "$67.00", delivery: `Post (Australia-wide) ($16.00): ${ADDRESS}`, address: ADDRESS },
    receipts: { items: ORDER },
  },
  workshop_booking: {
    values: { ...PERSON, total: "$190.00" },
    receipts: {
      workshops: { heading: "Your Booking", lines: [{ name: "Chocolate Making Workshop, Adult", quantity: 2, amount: 190 }], extras: [], total: 190 },
    },
  },
  order_posted: { values: { ...PERSON, address: ADDRESS, total: "$67.00" }, receipts: { items: ORDER } },
  order_shipped: {
    values: {
      ...PERSON,
      carrier: "Australia Post",
      tracking_number: "33LPK1234567",
      tracking_link: "https://auspost.com.au/mypost/track/details/33LPK1234567",
      address: ADDRESS,
    },
    receipts: { items: ORDER },
  },
  order_ready: {
    values: { ...PERSON, total: "$51.00" },
    receipts: { items: { ...ORDER, extras: [ORDER.extras[0], { name: "Pick up in Lawson", amount: 0 }], total: 51 } },
  },
  contact_reply: { values: { ...PERSON, message: "Hi! Do you make vegan chocolate?" }, receipts: {} },
};

/** The placeholders an email can use, for the hint under its preview. */
export const placeholderNames = (key: string) => {
  const sample = SAMPLES[key];
  return sample ? [...Object.keys(sample.receipts), ...Object.keys(sample.values)] : [];
};
