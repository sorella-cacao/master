"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart";

/** Empties the cart once it's been paid for. */
export function ClearCart() {
  const { clear } = useCart();
  useEffect(clear, [clear]);
  return null;
}
