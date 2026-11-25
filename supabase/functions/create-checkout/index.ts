// Opens a Stripe Checkout payment page for the website's cart.
//
// The cart sends what's in it (product links, options, quantities, personalised labels) and the
// delivery chosen (and a free postage code, if they have one); every price is looked up here from the catalogue, never taken from the browser.
// The priced cart is saved as a checkout, which the stripe-webhook function turns into an order
// once Stripe says it's paid. Uses the STRIPE_SECRET_KEY secret. Called by anyone (no sign-in).

import { createClient } from "npm:@supabase/supabase-js@2";

const LABEL_FEE = 15; // Per personalised label wording; matches src/lib/labels.ts.
const MAX_LABEL_WORDS = 3;
// Pages Stripe may send customers back to.
const SITES = ["https://sorella-cacao.vercel.app", "https://sorellacacao.com.au", "https://www.sorellacacao.com.au", "http://localhost:3001"];

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

/** A problem with the cart, shown to the customer. */
class CartError extends Error {}

type CartLine = { href: string; variant: string; quantity: number; label?: string; frequency?: string };
type Priced = {
  title: string;
  variant: string;
  quantity: number;
  unit_price: number;
  label: string | null;
  stock_item_id: string | null;
  workshop: boolean;
  image: string;
};

const cents = (dollars: number) => Math.round(dollars * 100);
/** Today in Sydney, as "2026-12-20". */
const sydneyToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());

/** Each cart line with its catalogue price. */
async function price(lines: CartLine[]): Promise<Priced[]> {
  if (!Array.isArray(lines) || !lines.length) throw new CartError("Your cart is empty.");
  const priced: Priced[] = [];
  for (const line of lines) {
    const quantity = Number(line.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 200) throw new CartError("Please check the quantities in your cart.");
    if (line.frequency) throw new CartError("Subscriptions aren’t available online yet. Please remove the subscription from your cart.");
    const [, section, slug] = String(line.href).match(/^\/(shop|workshops)\/([\w-]+)$/) ?? [];
    if (!section) throw new CartError("Something in your cart is no longer available.");

    if (section === "shop") {
      const { data: product } = await db
        .from("products")
        .select("title, image, label_size, available_until, product_variants(id, label, price, sold_out)")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      const variant = product?.product_variants.find((v) => v.label === line.variant);
      if (!product || !variant) throw new CartError(`${product?.title ?? "Something"} in your cart is no longer available. Please remove it and add it again.`);
      if (variant.sold_out) throw new CartError(`${product.title} (${variant.label}) has sold out. Please remove it from your cart.`);
      if (product.available_until && product.available_until < sydneyToday()) {
        throw new CartError(`Orders for the ${product.title} have closed. Please remove it from your cart.`);
      }
      const { data: stock } = await db.from("stock_items").select("id").eq("variant_id", variant.id).maybeSingle();
      const label = product.label_size && line.label ? String(line.label).trim().replace(/\s+/g, " ") : "";
      if (label.split(" ").length > MAX_LABEL_WORDS) throw new CartError("Personalised labels can be up to three words.");
      priced.push({ title: product.title, variant: variant.label, quantity, unit_price: Number(variant.price), label: label || null, stock_item_id: stock?.id ?? null, workshop: false, image: product.image });
    } else {
      const { data: workshop } = await db
        .from("workshops")
        .select("title, images, sold_out, workshop_variants(label, price, sold_out)")
        .eq("slug", slug)
        .eq("is_published", true)
        .maybeSingle();
      const ticket = workshop?.workshop_variants.find((v) => v.label === line.variant);
      if (!workshop || !ticket) throw new CartError(`${workshop?.title ?? "A workshop"} in your cart is no longer available. Please remove it.`);
      if (workshop.sold_out || ticket.sold_out) throw new CartError(`${workshop.title} has sold out. Please remove it from your cart.`);
      priced.push({ title: workshop.title, variant: ticket.label, quantity, unit_price: Number(ticket.price), label: null, stock_item_id: null, workshop: true, image: workshop.images[0] ?? "" });
    }
  }
  return priced;
}

/** One fee per distinct label wording, ignoring capitals. */
function labelFees(items: Priced[]) {
  const seen = new Map<string, string>();
  for (const { label } of items) if (label && !seen.has(label.toLowerCase())) seen.set(label.toLowerCase(), label);
  return [...seen.values()].map((label) => ({ label, amount: LABEL_FEE }));
}

async function stripe(path: string, params: URLSearchParams) {
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Stripe: ${body.error?.message ?? res.status}`);
  return body;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Not allowed" }, 405);
  let checkoutId: string | undefined;
  try {
    const { items: lines, deliveryId, site, code } = await req.json();
    if (!SITES.includes(site)) return json({ error: "Not allowed" }, 403);

    const items = await price(lines);
    const fees = labelFees(items);
    const products = items.filter((i) => !i.workshop);
    const productsTotal = products.reduce((n, i) => n + i.unit_price * i.quantity, 0) + fees.reduce((n, f) => n + f.amount, 0);

    // Delivery only for things that are posted or picked up, not workshop tickets.
    let delivery: { name: string; price: number; needs_address: boolean } | null = null;
    let discountCode: string | null = null;
    if (products.length) {
      const { data: option } = await db
        .from("delivery_options")
        .select("name, price, free_over, needs_address")
        .eq("id", deliveryId ?? "")
        .eq("is_active", true)
        .maybeSingle();
      if (!option) throw new CartError("Please choose postage or pick up.");
      const free = option.free_over !== null && productsTotal >= Number(option.free_over);
      delivery = { name: option.name, price: free ? 0 : Number(option.price), needs_address: option.needs_address };
      // A code makes postage free. It's left unused when there's no postage to pay anyway.
      const typed = typeof code === "string" ? code.trim().toUpperCase().slice(0, 30) : "";
      if (typed && delivery.needs_address && delivery.price > 0) {
        const { data: valid, error } = await db.rpc("check_discount_code", { code: typed });
        if (error) throw error;
        if (!valid) throw new CartError("That code isn’t valid, or has already been used. Please remove it and try again.");
        delivery.price = 0;
        discountCode = typed;
      }
    }

    const total = items.reduce((n, i) => n + i.unit_price * i.quantity, 0) + fees.reduce((n, f) => n + f.amount, 0) + (delivery?.price ?? 0);
    const { data: checkout, error } = await db
      .from("checkouts")
      .insert({ items, label_fees: fees, delivery, total: Math.round(total * 100) / 100, discount_code: discountCode })
      .select("id")
      .single();
    if (error) throw error;
    checkoutId = checkout.id;

    const params = new URLSearchParams({
      mode: "payment",
      client_reference_id: checkout.id,
      "metadata[checkout_id]": checkout.id,
      success_url: `${site}/checkout/thanks?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/cart`,
      "phone_number_collection[enabled]": "true",
      locale: "en",
    });
    // A payment page with a code closes sooner, so a code for one order isn't left open on several.
    if (discountCode) params.set("expires_at", String(Math.floor(Date.now() / 1000) + 31 * 60));
    items.forEach((item, i) => {
      params.set(`line_items[${i}][quantity]`, String(item.quantity));
      params.set(`line_items[${i}][price_data][currency]`, "aud");
      params.set(`line_items[${i}][price_data][unit_amount]`, String(cents(item.unit_price)));
      params.set(`line_items[${i}][price_data][product_data][name]`, `${item.title} – ${item.variant}`);
      if (item.label) params.set(`line_items[${i}][price_data][product_data][description]`, `Personalised label: “${item.label}”`);
      // Stripe shows photos only from public https addresses (not while testing on this computer).
      if (item.image && site.startsWith("https://")) {
        params.set(`line_items[${i}][price_data][product_data][images][0]`, new URL(item.image, site).href);
      }
    });
    fees.forEach((fee, f) => {
      const i = items.length + f;
      params.set(`line_items[${i}][quantity]`, "1");
      params.set(`line_items[${i}][price_data][currency]`, "aud");
      params.set(`line_items[${i}][price_data][unit_amount]`, String(cents(fee.amount)));
      params.set(`line_items[${i}][price_data][product_data][name]`, `Personalised label “${fee.label}”`);
    });
    if (delivery?.needs_address) {
      params.set("shipping_address_collection[allowed_countries][0]", "AU");
      params.set("shipping_options[0][shipping_rate_data][type]", "fixed_amount");
      params.set("shipping_options[0][shipping_rate_data][display_name]", delivery.price ? delivery.name : `${delivery.name} – free`);
      params.set("shipping_options[0][shipping_rate_data][fixed_amount][amount]", String(cents(delivery.price)));
      params.set("shipping_options[0][shipping_rate_data][fixed_amount][currency]", "aud");
    } else if (delivery) {
      params.set("custom_text[submit][message]", `${delivery.name}: we’ll be in touch to arrange a time.`);
    }

    const session = await stripe("checkout/sessions", params);
    await db.from("checkouts").update({ stripe_session_id: session.id }).eq("id", checkout.id);
    return json({ url: session.url });
  } catch (error) {
    if (error instanceof CartError) return json({ error: error.message }, 400);
    console.error(error);
    // Stripe didn't make a payment page, so the checkout can't be paid: don't keep it.
    if (checkoutId) await db.from("checkouts").delete().eq("id", checkoutId).is("stripe_session_id", null);
    return json({ error: "Checkout isn’t working right now. Please try again shortly." }, 500);
  }
});
