"use client";

import { useEffect, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";

export type SaleGroup = { title: string; items: { id: string; name: string; price: number; inStock: number }[] };

type Line = { key: number; group: string; item: string; qty: string };

/** Who (optional), then a type, flavour and quantity for each thing sold, with a running total. */
export function SaleFields({ kind, groups }: { kind: "spontaneous" | "market"; groups: SaleGroup[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const nextKey = useRef(1);
  const blank = (key: number): Line => ({ key, group: groups[0]?.title ?? "", item: "", qty: "" });
  const [lines, setLines] = useState<Line[]>([blank(0)]);

  const items = new Map(groups.flatMap((g) => g.items.map((i) => [i.id, i] as const)));
  const total = lines.reduce((sum, l) => sum + (Number(l.qty) > 0 ? Number(l.qty) * (items.get(l.item)?.price ?? 0) : 0), 0);

  const update = (key: number, change: Partial<Line>) => setLines((all) => all.map((l) => (l.key === key ? { ...l, ...change } : l)));
  const add = () => setLines((all) => [...all, blank(nextKey.current++)]);

  // Clearing the form after saving goes back to one empty line.
  useEffect(() => {
    const form = ref.current?.closest("form");
    const onReset = () => setLines([{ key: nextKey.current++, group: groups[0]?.title ?? "", item: "", qty: "" }]);
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, [groups]);

  return (
    <div ref={ref} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="eyebrow mb-2 block text-cream/70">{kind === "market" ? "Which market" : "Who bought"}</span>
          <input
            name="customer"
            placeholder={kind === "market" ? "Optional, e.g. Bondi Farmers Market" : "Optional, e.g. a café down the road"}
            className="pod-input"
          />
        </label>
        <label className="block">
          <span className="eyebrow mb-2 block text-cream/70">Note</span>
          <input name="note" placeholder="Optional" className="pod-input" />
        </label>
      </div>

      <div className="space-y-3">
        {lines.map((line, index) => {
          const group = groups.find((g) => g.title === line.group);
          return (
            <div
              key={line.key}
              className="grid grid-cols-[1fr_5.5rem] items-end gap-3 rounded-xl border border-white/15 p-3 odd:bg-cacao-950/60 sm:grid-cols-[10rem_1fr_6rem_2.5rem]"
            >
              <label className="col-start-1 row-start-1 block">
                <span className="eyebrow mb-1 block text-xs text-cream/70">Type</span>
                <select
                  value={line.group}
                  onChange={(e) => update(line.key, { group: e.target.value, item: "" })}
                  aria-label={`Line ${index + 1} type`}
                  className="pod-input"
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
                  className="pod-input"
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
                  className="pod-input text-right"
                />
              </label>
              {lines.length > 1 ? (
                <button
                  type="button"
                  onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))}
                  aria-label={`Remove line ${index + 1}`}
                  className="col-span-2 row-start-3 h-10 justify-self-end rounded-full px-3 text-xl text-cream/70 hover:text-gold sm:col-span-1 sm:col-start-4 sm:row-start-1"
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
          {kind === "market" ? "At website prices." : "At wholesale prices."}
        </span>
      </p>
    </div>
  );
}
