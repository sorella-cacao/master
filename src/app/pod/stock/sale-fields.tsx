"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";

export type SaleGroup = {
  title: string;
  items: { id: string; name: string; inStock: number; wholesale: number; retail: number }[];
};

type Line = { key: number; group: string; item: string; qty: string };
type PriceList = "wholesale" | "retail" | "free";

/** The kinds of odd buy, and the price each starts on. */
const ODD_BUYS = [
  { value: "spontaneous", label: "Spontaneous buy", price: "wholesale", who: "Optional, e.g. a café down the road" },
  { value: "gift", label: "Gift", price: "free", who: "Optional, who it was for" },
  { value: "personal", label: "Personal use", price: "free", who: "Optional" },
  { value: "staff", label: "Staff", price: "wholesale", who: "Optional, who took them" },
] as const;

/** For an odd buy, what kind and the price; who (optional); then a size, flavour and quantity for each item, with a running total. */
export function SaleFields({ kind, groups }: { kind: "odd" | "market"; groups: SaleGroup[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const nextKey = useRef(1);
  const blank = (key: number): Line => ({ key, group: groups[0]?.title ?? "", item: "", qty: "" });
  const [lines, setLines] = useState<Line[]>([blank(0)]);
  const [oddType, setOddType] = useState<(typeof ODD_BUYS)[number]["value"]>("spontaneous");
  const [priceList, setPriceList] = useState<PriceList>(kind === "market" ? "retail" : "wholesale");
  const odd = ODD_BUYS.find((o) => o.value === oddType)!;

  const items = new Map(groups.flatMap((g) => g.items.map((i) => [i.id, i] as const)));
  const unitPrice = (id: string) => (priceList === "free" ? 0 : (items.get(id)?.[priceList] ?? 0));
  const total = lines.reduce((sum, l) => sum + (Number(l.qty) > 0 ? Number(l.qty) * unitPrice(l.item) : 0), 0);

  const update = (key: number, change: Partial<Line>) => setLines((all) => all.map((l) => (l.key === key ? { ...l, ...change } : l)));
  const add = () => setLines((all) => [...all, blank(nextKey.current++)]);

  // Clearing the form after saving goes back to one empty line.
  useEffect(() => {
    const form = ref.current?.closest("form");
    const onReset = () => {
      setLines([{ key: nextKey.current++, group: groups[0]?.title ?? "", item: "", qty: "" }]);
      setPriceList(kind === "market" ? "retail" : "wholesale");
      setOddType("spontaneous");
    };
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, [groups, kind]);

  return (
    <div ref={ref} className="space-y-6">
      <div className={`grid gap-4 ${kind === "odd" ? "sm:grid-cols-[11rem_1fr_1fr_9rem]" : "sm:grid-cols-2"}`}>
        {kind === "odd" && (
          <label className="block">
            <span className="eyebrow mb-2 block text-cream/70">What for</span>
            <select
              name="kind"
              value={oddType}
              onChange={(e) => {
                const next = ODD_BUYS.find((o) => o.value === e.target.value)!;
                setOddType(next.value);
                setPriceList(next.price);
              }}
              className="pod-input"
            >
              {ODD_BUYS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="eyebrow mb-2 block text-cream/70">{kind === "market" ? "Which market" : "Who"}</span>
          <input
            name="customer"
            placeholder={kind === "market" ? "Optional, e.g. Bondi Farmers Market" : odd.who}
            className="pod-input"
          />
        </label>
        <label className="block">
          <span className="eyebrow mb-2 block text-cream/70">Note</span>
          <input name="note" placeholder="Optional" className="pod-input" />
        </label>
        {kind === "odd" && (
          <label className="block">
            <span className="eyebrow mb-2 block text-cream/70">Price</span>
            <select
              name="price_list"
              value={priceList}
              onChange={(e) => setPriceList(e.target.value as PriceList)}
              className="pod-input"
            >
              <option value="wholesale">Wholesale</option>
              <option value="retail">Retail</option>
              <option value="free">Free</option>
            </select>
          </label>
        )}
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => {
          const group = groups.find((g) => g.title === line.group);
          return (
            <div
              key={line.key}
              className="grid grid-cols-[1fr_5.5rem] items-end gap-2 rounded-xl border border-white/15 px-3 py-2 odd:bg-cacao-950/60 sm:grid-cols-[10rem_1fr_6rem_2.5rem]"
            >
              <label className="col-start-1 row-start-1 block">
                <span className="eyebrow mb-1 block text-xs text-cream/70">Type</span>
                <select
                  value={line.group}
                  onChange={(e) => update(line.key, { group: e.target.value, item: "" })}
                  aria-label={`Line ${index + 1} type`}
                  className="pod-input py-1.5 text-sm"
                >
                  {groups.map((g) => (
                    <option key={g.title} value={g.title}>
                      {g.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-span-2 col-start-1 row-start-2 block sm:col-span-1 sm:col-start-2 sm:row-start-1">
                <span className="eyebrow mb-1 block text-xs text-cream/70">{line.group === "Pure Cacao" ? "Size" : "Flavour"}</span>
                <select
                  name="line_item"
                  required
                  value={line.item}
                  onChange={(e) => update(line.key, { item: e.target.value })}
                  aria-label={`Line ${index + 1} ${line.group === "Pure Cacao" ? "size" : "flavour"}`}
                  className="pod-input py-1.5 text-sm"
                >
                  <option value="" disabled>
                    Choose…
                  </option>
                  {group?.items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.inStock} in stock)
                    </option>
                  ))}
                </select>
              </label>
              <label className="col-start-2 row-start-1 block sm:col-start-3">
                <span className="eyebrow mb-1 block text-xs text-cream/70">Qty</span>
                <input
                  type="number"
                  name="line_qty"
                  required
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={line.qty}
                  onChange={(e) => update(line.key, { qty: e.target.value })}
                  aria-label={`Line ${index + 1} quantity`}
                  className="pod-input py-1.5 text-right text-sm"
                />
              </label>
              {lines.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))}
                  aria-label={`Remove line ${index + 1}`}
                  className="col-span-2 row-start-3 h-8 justify-self-end rounded-full px-3 text-xl text-cream/70 hover:text-gold sm:col-span-1 sm:col-start-4 sm:row-start-1"
                >
                  ×
                </button>
              ) : (
                <span aria-hidden className="hidden sm:col-start-4 sm:row-start-1 sm:block" />
              )}
            </div>
          );
        })}
        <button
          type="button"
          onClick={add}
          className="eyebrow rounded-full border border-white/20 px-4 py-2 text-cream/70 transition-colors hover:border-gold hover:text-gold"
        >
          + Add another
        </button>
      </div>

      <p className="text-right font-sans text-lg">
        Total <strong className="ml-2 text-2xl font-medium">{formatPrice(total)}</strong>
        <span className="mt-1 block text-sm text-cream/70">
          {priceList === "free" ? "Free: no charge." : priceList === "retail" ? "At retail (website) prices." : "At wholesale prices."}
        </span>
      </p>
    </div>
  );
}
