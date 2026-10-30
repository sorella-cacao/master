"use client";

import { useEffect, useId, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import { ItemRow, ItemTable } from "../item-table";
import { parseOrder } from "./parse-order";

export type OrderGroup = { title: string; items: { id: string; name: string; price: number }[] };

/** A customer the order can be for, with any prices of their own (by stock item). */
export type OrderCustomer = { name: string; prices: Record<string, number> };

/** Who, when, and a quantity box for every item, with prices for that customer and the order total kept up to date. */
export function OrderFields({
  groups,
  customers,
  initial,
}: {
  groups: OrderGroup[];
  customers: OrderCustomer[];
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
  const initialCustomer = initial?.customer ?? "";
  const initialQuantities = initial?.quantities;
  const [customer, setCustomer] = useState(initialCustomer);
  const [quantities, setQuantities] = useState<Record<string, number>>(initialQuantities ?? {});

  const theirPrices = customers.find((c) => c.name.toLowerCase() === customer.trim().toLowerCase())?.prices ?? {};
  const priceOf = (id: string, standard: number) => initial?.prices[id] ?? theirPrices[id] ?? standard;
  const standardOf = new Map(groups.flatMap((g) => g.items.map((i) => [i.id, i.price] as const)));
  const total =
    Math.round(
      Object.entries(quantities).reduce((sum, [id, qty]) => sum + (qty > 0 ? qty * priceOf(id, standardOf.get(id) ?? 0) : 0), 0) * 100,
    ) / 100;

  const [pasted, setPasted] = useState("");
  const [pasteResult, setPasteResult] = useState<{ filled: number; unread: string[] } | null>(null);

  /** Fills the quantity boxes from an order pasted from an email. */
  function fillFromEmail() {
    const { quantities: found, unread } = parseOrder(pasted, groups);
    const inputs = ref.current?.querySelectorAll<HTMLInputElement>("input[data-qty]") ?? [];
    for (const input of inputs) input.value = found[input.dataset.qty!] ? String(found[input.dataset.qty!]) : "";
    recalculate();
    setPasteResult({ filled: Object.keys(found).length, unread });
  }

  function recalculate() {
    const inputs = ref.current?.querySelectorAll<HTMLInputElement>("input[data-qty]") ?? [];
    setQuantities(Object.fromEntries([...inputs].map((input) => [input.dataset.qty!, Number(input.value) || 0])));
  }

  // Clearing the form after saving puts the boxes back without firing input events.
  useEffect(() => {
    const form = ref.current?.closest("form");
    const onReset = () => {
      setCustomer(initialCustomer);
      setQuantities(initialQuantities ?? {});
      setPasted("");
      setPasteResult(null);
    };
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, [initialCustomer, initialQuantities]);

  return (
    <div ref={ref} onInput={recalculate} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
        <label className="block">
          <span className="eyebrow mb-2 block text-cream/70">Customer</span>
          <input
            name="customer"
            required
            list={listId}
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            placeholder="e.g. Bronte Dispensary"
            className="pod-input"
          />
          <datalist id={listId}>
            {customers.map((c) => (
              <option key={c.name} value={c.name} />
            ))}
          </datalist>
          {Object.keys(theirPrices).length > 0 && (
            <span className="mt-1 block font-sans text-sm text-cream/70">Using {customer.trim()}’s prices.</span>
          )}
        </label>
        <label className="block">
          <span className="eyebrow mb-2 block text-cream/70">Needed by</span>
          <input type="date" name="needed_by" defaultValue={initial?.neededBy ?? ""} className="pod-input" />
        </label>
      </div>

      {!initial && (
        <div className="space-y-2 rounded-xl border border-dashed border-white/25 p-4">
          <label className="block">
            <span className="eyebrow mb-2 block text-cream/70">Paste the order from the email</span>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={5}
              placeholder={"e.g.\n6 x 50g Hazelnut\n2 x 108g Goat Milk\n75% Blood Orange small - 6"}
              className="pod-input py-2 text-sm"
            />
          </label>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <button
              type="button"
              onClick={fillFromEmail}
              disabled={!pasted.trim()}
              className="eyebrow rounded-full border border-white/20 px-4 py-2 text-cream/70 transition-colors hover:border-gold hover:text-gold disabled:opacity-50"
            >
              Fill in amounts
            </button>
            {pasteResult && (
              <p className="font-sans text-sm text-cream/70">
                {pasteResult.filled
                  ? `Filled in ${pasteResult.filled} ${pasteResult.filled === 1 ? "item" : "items"} below. Check them before saving.`
                  : "Couldn’t find any flavours in that. Fill in the boxes below instead."}
              </p>
            )}
          </div>
          {pasteResult && pasteResult.unread.length > 0 && (
            <div className="rounded-lg bg-[#e7b28e]/40 px-3 py-2 font-sans text-sm">
              <p className="font-semibold">Couldn’t work out these lines, so add them yourself:</p>
              <ul className="mt-1 list-disc pl-5">
                {pasteResult.unread.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        {groups.map((group) => (
          <ItemTable
            key={group.title}
            caption={group.title}
            collapsible
            headings={[group.title === "Pure Cacao" ? "Size" : "Flavour", "Price", "Qty"]}
            columnWidth="w-28"
          >
            {group.items.map((item) => (
              <ItemRow
                key={item.id}
                name={item.name}
                cells={[
                  formatPrice(priceOf(item.id, item.price)),
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
                    className="pod-input w-20 px-2 py-1 text-right text-sm"
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
