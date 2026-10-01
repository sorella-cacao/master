import type { Metadata } from "next";
import { CartView } from "@/components/cart-view";

export const metadata: Metadata = { title: "Cart" };

export default function CartPage() {
  return (
    <section className="grain bg-cacao-900">
      <div className="mx-auto max-w-4xl px-5 pb-28 pt-16 sm:px-8 md:pt-24">
        <h1 className="font-script text-7xl text-gold sm:text-8xl">Cart</h1>
        <CartView />
      </div>
    </section>
  );
}
