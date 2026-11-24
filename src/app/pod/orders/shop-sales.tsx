"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { formatPrice } from "@/lib/format";
import { useConfirm } from "../confirm-dialog";
import { ItemTable, ItemRow } from "../item-table";
import { MadeBox } from "./make-checklist";
import { invoiceSold, setSold } from "./actions";

export type ShopOrder = {
  id: string;
  /** "Sent 12 Nov". */
  sent: string;
  /** `invoiced` have already been invoiced; `sold` are marked as sold, waiting for an invoice. */
  lines: { id: string; name: string; group: string; quantity: number; invoiced: number; sold: number; price: number }[];
};

/**
 * A sale-or-return shop's orders: tick what's sold (or type how many, if only some have), then make one
 * invoice for everything ticked. What isn't ticked stays with the shop.
 */
export function ShopSales({ customerId, name, orders }: { customerId: string; name: string; orders: ShopOrder[] }) {
  const lines = orders.flatMap((o) => o.lines);
  const [sold, setShown] = useOptimistic(
    Object.fromEntries(lines.map((l) => [l.id, l.sold])),
    (current: Record<string, number>, change: { id: string; sold: number }) => ({ ...current, [change.id]: change.sold }),
  );
  const [pending, startTransition] = useTransition();
  const [invoicing, startInvoicing] = useTransition();
  const [error, setError] = useState("");
  // Saves still on their way, so an invoice never leaves out something just ticked.
  const saving = useRef<Promise<string | undefined>[]>([]);
  const { confirm, dialog } = useConfirm();

  const save = (id: string, quantity: number) => {
    const request = setSold(id, quantity).then((r) => r.error);
    saving.current.push(request);
    startTransition(async () => {
      setShown({ id, sold: quantity });
      const problem = await request;
      setError(problem ?? "");
      saving.current = saving.current.filter((p) => p !== request);
    });
  };

  const count = lines.reduce((n, l) => n + sold[l.id], 0);
  const total = lines.reduce((n, l) => n + sold[l.id] * l.price, 0);

  async function makeInvoice() {
    const problems = (await Promise.all(saving.current)).filter(Boolean);
    if (problems.length) return setError(problems[0]!);
    if (!(await confirm(`Make the invoice for ${name}? ${count} sold, ${formatPrice(total)}.`, { yes: "Yes", no: "Not yet" }))) return;
    startInvoicing(async () => {
      const result = await invoiceSold(customerId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="space-y-3">
      {orders.map((o) => {
        const left = o.lines.reduce((n, l) => n + l.quantity - l.invoiced - sold[l.id], 0);
        return (
          <details key={o.id} id={`sold-${o.id}`} className="group scroll-mt-6 rounded-2xl border border-l-[6px] border-white/15 border-l-[#8a5226] bg-[#ead8c4]">
            <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-3 px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
              <span className="text-xl text-gold">{o.sent}</span>
              <span className="flex items-baseline gap-3 font-sans text-base text-cream/80">
                {left} still with them
                <span aria-hidden className="transition-transform group-open:rotate-180">
                  ▾
                </span>
              </span>
            </summary>
            <div className="space-y-3 px-3 pb-4 sm:px-5">
              {[...new Set(o.lines.map((l) => l.group))].map((group) => (
              <ItemTable key={group} caption={group} headings={["Item", "Had", "Sold", "Left"]} columnWidth="w-14 sm:w-24" highlight={[2]}>
                {o.lines.filter((l) => l.group === group).map((l) => {
                  const had = l.quantity - l.invoiced;
                  return had === 0 ? (
                    <ItemRow key={l.id} done name={l.name} highlight={[2]} cells={[0, "–", 0]} />
                  ) : (
                    <ItemRow
                      key={l.id}
                      name={
                        <label className="flex cursor-pointer items-center gap-2">
                          <input
                            type="checkbox"
                            checked={sold[l.id] === had}
                            onChange={(e) => save(l.id, e.target.checked ? had : 0)}
                            aria-label={`All ${had} ${l.name} sold (${group})`}
                            className="h-4 w-4 shrink-0 accent-[#5e9a4a]"
                          />
                          {l.name}
                        </label>
                      }
                      highlight={[2]}
                      cells={[
                        had,
                        <MadeBox key={sold[l.id]} label={`${l.name} sold (${group})`} value={sold[l.id]} max={had} onSave={(quantity) => save(l.id, quantity)} />,
                        had - sold[l.id],
                      ]}
                    />
                  );
                })}
              </ItemTable>
              ))}
            </div>
          </details>
        );
      })}
      {error && (
        <p role="alert" className="font-sans text-base font-semibold">
          {error}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={makeInvoice}
          disabled={count === 0 || invoicing}
          className="eyebrow rounded-full bg-caramel px-5 py-2.5 text-cacao-950 transition-colors hover:bg-gold disabled:opacity-50"
        >
          {invoicing ? "Making invoice…" : "Invoice what’s sold"}
        </button>
        <p role="status" className="font-sans text-base">
          {count ? `${count} sold, ${formatPrice(total)}` : "Tick what’s sold, or type how many."}
          {pending && !invoicing && <span className="ml-2 text-sm text-cream/70">Saving…</span>}
        </p>
      </div>
      {dialog}
    </div>
  );
}
