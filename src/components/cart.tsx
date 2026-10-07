"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { LABEL_FEE, distinctLabels } from "@/lib/labels";

export type CartItem = {
  /** Unique per product + variant + purchase frequency + label wording. */
  key: string;
  href: string;
  title: string;
  variant: string;
  frequency?: string;
  /** Personalised label wording, printed in place of "Sorella Cacao". */
  label?: string;
  image: string;
  unitPrice: number;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  count: number;
  /** One-off fee for each distinct personalised label wording. */
  labelFees: { label: string; amount: number }[];
  subtotal: number;
  addItem: (item: Omit<CartItem, "key">) => void;
  setQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "sorella-cart";

function itemKey(item: Omit<CartItem, "key">) {
  return [item.href, item.variant, item.frequency ?? "", item.label ?? ""].join("|");
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate from storage once on mount
      if (saved) setItems(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, loaded]);

  const addItem = useCallback((item: Omit<CartItem, "key">) => {
    const key = itemKey(item);
    setItems((current) => {
      const existing = current.find((i) => i.key === key);
      if (existing) {
        return current.map((i) =>
          i.key === key ? { ...i, quantity: i.quantity + item.quantity } : i,
        );
      }
      return [...current, { ...item, key }];
    });
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((current) =>
      quantity <= 0
        ? current.filter((i) => i.key !== key)
        : current.map((i) => (i.key === key ? { ...i, quantity } : i)),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((current) => current.filter((i) => i.key !== key));
  }, []);

  const value = useMemo(() => {
    const labelFees = distinctLabels(items.map((i) => i.label)).map((label) => ({
      label,
      amount: LABEL_FEE,
    }));
    return {
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      labelFees,
      subtotal:
        items.reduce((n, i) => n + i.unitPrice * i.quantity, 0) +
        labelFees.reduce((n, f) => n + f.amount, 0),
      addItem,
      setQuantity,
      removeItem,
    };
  }, [items, addItem, setQuantity, removeItem]);

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const cart = useContext(CartContext);
  if (!cart) throw new Error("useCart must be used inside CartProvider");
  return cart;
}
