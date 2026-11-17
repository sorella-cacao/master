import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const { data, error } = await createPublicClient()
    .from("delivery_options")
    .select("id, name, description, price, free_over, needs_address")
    .eq("is_active", true)
    .order("position");
  if (error) throw error;
  const deliveryOptions = data.map((d) => ({
    id: d.id,
    name: d.name,
    description: d.description,
    price: Number(d.price),
    freeOver: d.free_over === null ? null : Number(d.free_over),
  }));

  return (
    <section className="grain bg-cacao-900">
      <div className="mx-auto max-w-4xl px-5 pb-28 pt-16 sm:px-8 md:pt-24">
        <h1 className="font-script text-7xl text-gold sm:text-8xl">Cart</h1>
        <CartView deliveryOptions={deliveryOptions} />
      </div>
    </section>
  );
}
