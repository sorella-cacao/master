"use client";

import { useRef, useState } from "react";
import { formatPrice } from "@/lib/format";

type Line = { key: number; description: string; price: string; qty: string };

const money = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/** Everything on an invoice that can be changed, with lines to add, remove or edit and a running total. */
export function InvoiceFields({
  invoice,
}: {
  invoice: {
    id: string;
    number: number;
    issuedOn: string;
    dueOn: string;
    billTo: string;
    notes: string | null;
    lines: { description: string; quantity: number; unit_price: number }[];
  };
}) {
  const nextKey = useRef(invoice.lines.length);
  const [lines, setLines] = useState<Line[]>(() =>
    invoice.lines.map((l, i) => ({ key: i, description: l.description, price: money(l.unit_price), qty: money(l.quantity) })),
  );
  const total = lines.reduce((n, l) => n + (Number(l.price) || 0) * (Number(l.qty) || 0), 0);

  const update = (key: number, change: Partial<Line>) => setLines((all) => all.map((l) => (l.key === key ? { ...l, ...change } : l)));
  const add = (description = "", qty = "1") =>
    setLines((all) => [...all, { key: nextKey.current++, description, price: "", qty }]);

  return (
    <div className="space-y-5">
      <input type="hidden" name="invoice_id" value={invoice.id} />
      <div className="grid grid-cols-3 gap-3">
        <label className="block">
          <span className="eyebrow mb-1 block text-xs text-cream/70">Invoice #</span>
          <input name="number" type="number" min="1" step="1" required defaultValue={invoice.number} className="pod-input py-2 text-sm" />
        </label>
        <label className="block">
          <span className="eyebrow mb-1 block text-xs text-cream/70">Date</span>
          <input name="issued_on" type="date" required defaultValue={invoice.issuedOn} className="pod-input px-2 py-2 text-sm" />
        </label>
        <label className="block">
          <span className="eyebrow mb-1 block text-xs text-cream/70">Due</span>
          <input name="due_on" type="date" required defaultValue={invoice.dueOn} className="pod-input px-2 py-2 text-sm" />
        </label>
      </div>

      <label className="block">
        <span className="eyebrow mb-1 block text-xs text-cream/70">Invoice for</span>
        <textarea name="bill_to" rows={3} defaultValue={invoice.billTo} className="pod-input py-2 text-sm" />
      </label>

      <div className="overflow-hidden rounded-xl border border-white/15">
        <div className="grid grid-cols-[1fr_4.5rem_3.5rem_4.5rem_1.75rem] gap-2 bg-white/5 px-3 py-1.5 font-sans text-xs text-cream/70">
          <span>Description</span>
          <span className="text-right">Price</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Total</span>
          <span />
        </div>
        {lines.map((line, index) => (
          <div
            key={line.key}
            className="grid grid-cols-[1fr_4.5rem_3.5rem_4.5rem_1.75rem] items-center gap-2 border-t border-white/10 px-3 py-1.5 odd:bg-cacao-950/60"
          >
            <input
              name="line_description"
              value={line.description}
              onChange={(e) => update(line.key, { description: e.target.value })}
              aria-label={`Line ${index + 1} description`}
              className="pod-input px-2 py-1 text-sm"
            />
            <input
              name="line_price"
              inputMode="decimal"
              value={line.price}
              onChange={(e) => update(line.key, { price: e.target.value })}
              aria-label={`Line ${index + 1} price`}
              className="pod-input px-2 py-1 text-right text-sm"
            />
            <input
              name="line_qty"
              inputMode="decimal"
              value={line.qty}
              onChange={(e) => update(line.key, { qty: e.target.value })}
              aria-label={`Line ${index + 1} quantity`}
              className="pod-input px-2 py-1 text-right text-sm"
            />
            <span className="text-right font-sans text-sm tabular-nums">
              {formatPrice((Number(line.price) || 0) * (Number(line.qty) || 0))}
            </span>
            <button
              type="button"
              onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))}
              aria-label={`Remove line ${index + 1}`}
              className="text-lg text-cream/60 hover:text-gold"
            >
              ×
            </button>
          </div>
        ))}
        <div className="flex items-baseline justify-between border-t border-white/15 px-3 py-2 font-sans">
          <span className="text-sm text-cream/70">Total</span>
          <strong className="text-lg font-medium tabular-nums">{formatPrice(total)}</strong>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => add()}
          className="eyebrow rounded-full border border-white/20 px-4 py-2 text-cream/70 transition-colors hover:border-gold hover:text-gold"
        >
          + Add a line
        </button>
        <button
          type="button"
          onClick={() => add("Shipping")}
          className="eyebrow rounded-full border border-white/20 px-4 py-2 text-cream/70 transition-colors hover:border-gold hover:text-gold"
        >
          + Shipping
        </button>
      </div>

      <label className="block">
        <span className="eyebrow mb-1 block text-xs text-cream/70">Note on the invoice</span>
        <textarea name="notes" rows={2} defaultValue={invoice.notes ?? ""} placeholder="Optional" className="pod-input py-2 text-sm" />
      </label>
    </div>
  );
}
