"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import { ItemRow, ItemTable } from "../item-table";

export type OrderGroup = { title: string; items: { id: string; name: string; price: number }[] };

/** Who, when, and a quantity box for every item, with the order total kept up to date. */
export function OrderFields({
  groups,
  customers,
  initial,
}: {
  groups: OrderGroup[];
  customers: string[];
  initial?: {
    customer: string;
    neededBy: string | null;
    note: string | null;
    quantities: Record<string, number>;
    /** Prices of the lines already on the order, which keep their original price. */
    prices: Record<string, number>;
  };
}) {
  const ref = useRef<HTMLDivElement>(null);
  const listId = useId();

  const priceOf = new Map([
    ...groups.flatMap((g) => g.items.map((i) => [i.id, i.price] as const)),
    ...Object.entries(initial?.prices ?? {}),
  ]);
  const totalOf = (quantities: [string, number][]) =>
    Math.round(quantities.reduce((sum, [id, qty]) => sum + (qty > 0 ? qty * (priceOf.get(id) ?? 0) : 0), 0) * 100) / 100;

  const initialTotal = totalOf(Object.entries(initial?.quantities ?? {}));
  const [total, setTotal] = useState(initialTotal);

  function recalculate() {
    const inputs = ref.current?.querySelectorAll<HTMLInputElement>("input[data-qty]") ?? [];
    setTotal(totalOf([...inputs].map((input) => [input.dataset.qty!, Number(input.value) || 0])));
  }

  // Clearing the form after saving puts the boxes back without firing input events.
  useEffect(() => {
    const form = ref.current?.closest("form");
    const onReset = () => setTotal(initialTotal);
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, [initialTotal]);

  return (
    <div ref={ref} onInput={recalculate} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <label className="block">
          <span className="eyebrow mb-2 block text-cream/70">Customer</span>
          <input name="customer" required list={listId} defaultValue={initial?.customer} placeholder="e.g. Bronte Dispensary" className="pod-input" />
          <datalist id={listId}>
            {customers.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="block">
          <span className="eyebrow mb-2 block text-cream/70">Needed by</span>
          <input type="date" name="needed_by" defaultValue={initial?.neededBy ?? ""} className="pod-input" />
        </label>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <ItemTable
            key={group.title}
            caption={group.title}
            headings={[group.title === "Pure Cacao" ? "Size" : "Flavour", "Price", "Qty"]}
            columnWidth="w-36"
          >
            {group.items.map((item) => (
              <ItemRow
                key={item.id}
                name={item.name}
                cells={[
                  formatPrice(priceOf.get(item.id) ?? item.price),
                  <input
                    key="qty"
                    type="number"
                    name={`qty:${item.id}`}
                    data-qty={item.id}
                    min="0"
                    step="1"
                    inputMode="numeric"
                    placeholder="0"
                    defaultValue={initial?.quantities[item.id] || undefined}
                    aria-label={`${group.title} ${item.name}`}
                    className="pod-input w-24 py-2 text-right"
                  />,
                ]}
              />
            ))}
          </ItemTable>
        ))}
      </div>

      <label className="block">
        <span className="eyebrow mb-2 block text-cream/70">Note</span>
        <input name="note" defaultValue={initial?.note ?? ""} placeholder="Optional, e.g. deliver Thursday" className="pod-input" />
      </label>

      <p className="text-right font-sans text-lg">
        Order total <strong className="ml-2 text-2xl font-medium">{formatPrice(total)}</strong>
      </p>
    </div>
  );
}
