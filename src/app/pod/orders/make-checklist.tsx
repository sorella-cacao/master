"use client";

import { Fragment, useOptimistic, useState, useTransition } from "react";
import { useConfirm } from "../confirm-dialog";
import { ItemRow, ItemTable, SectionRow } from "../item-table";
import { setMadeThisWeek } from "./actions";

export type MakeGroup = {
  title: string;
  /** Bars show how many to make; other things (Pure Cacao, bundles) also show their weight. */
  weighed: boolean;
  /** `need` is how many to make in all, and `made` how many are noted as made so far. */
  rows: { id: string; name: string; section: string | null; need: number; made: number; accent: boolean; weight: string }[];
};

const BAR_TOTALS = [
  { title: "Large Bar", label: "Large bars" },
  { title: "Small Bar", label: "Small bars" },
];

/** Saves still on their way, so leaving for Labels can wait for them. */
export const savesInFlight = new Set<Promise<unknown>>();

/**
 * The week's "To make" tables. Each row has a box for how many are made so far and shows how many
 * are left; its tick marks the lot as made. Saved as they're changed, and added to stock. Beside the tables is how many
 * large and small bars are still left to make.
 */
export function MakeChecklist({ week, groups }: { week: string; groups: MakeGroup[] }) {
  const saved = Object.fromEntries(groups.flatMap((g) => g.rows.map((r) => [r.id, r.made])));
  const [made, setMade] = useOptimistic(saved, (current: Record<string, number>, change: { id: string; made: number }) => ({
    ...current,
    [change.id]: change.made,
  }));
  const [, startTransition] = useTransition();
  const [error, setError] = useState("");

  const save = (id: string, quantity: number) =>
    startTransition(async () => {
      setMade({ id, made: quantity });
      const request = setMadeThisWeek(week, id, quantity);
      savesInFlight.add(request);
      try {
        setError((await request).error ?? "");
      } finally {
        savesInFlight.delete(request);
      }
    });
  const { confirm, dialog } = useConfirm();
  // Unticking takes what was made back out of stock, so it asks first.
  async function tick(r: { id: string; name: string; need: number }, checked: boolean) {
    if (checked) return save(r.id, r.need);
    if (await confirm(`Untick ${r.name}?`, { yes: "Yes", no: "No" }, `The ${made[r.id]} you made come back off your stock.`)) save(r.id, 0);
  }
  const leftOf = (r: { id: string; need: number }) => Math.max(0, r.need - made[r.id]);

  const totals = BAR_TOTALS.map(({ title, label }) => {
    const rows = groups.find((g) => g.title === title)?.rows ?? [];
    return { label, all: rows.reduce((n, r) => n + r.need, 0), left: rows.reduce((n, r) => n + leftOf(r), 0) };
  }).filter((t) => t.all > 0);

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_13rem] lg:items-start">
      {totals.length > 0 && (
        <aside className="pod-card space-y-3 p-4 lg:sticky lg:top-6 lg:order-2" aria-live="polite">
          <p className="eyebrow text-xs text-cream/70">Still to make</p>
          {totals.map((t) => (
            <p key={t.label} className="font-sans">
              <span className="block text-sm text-cream/80">{t.label}</span>
              <strong className="text-3xl font-medium text-gold">{t.left}</strong>
              <span className="text-sm text-cream/70"> of {t.all}</span>
            </p>
          ))}
        </aside>
      )}
      <div className="min-w-0 space-y-3 lg:order-1">
        {error && (
          <p role="alert" className="font-sans text-base font-semibold">
            {error}
          </p>
        )}
        {groups.map((g) => {
          const highlight = g.weighed ? [4] : [3];
          return (
            <ItemTable
              key={g.title}
              caption={g.title}
              headings={[
                g.weighed ? (g.title === "Pure Cacao" ? "Size" : "Item") : "Flavour",
                "To make",
                ...(g.weighed ? ["Weight"] : []),
                "Made",
                "Left",
              ]}
              columnWidth={g.weighed ? "w-14 sm:w-24" : "w-16 sm:w-24"}
              highlight={highlight}
              collapsible
            >
              {g.rows.map((r, i) => {
                const left = leftOf(r);
                const done = left === 0;
                return (
                  <Fragment key={r.id}>
                  <SectionRow item={r} previous={g.rows[i - 1]} columns={g.weighed ? 5 : 4} />
                  <ItemRow
                    done={done}
                    name={
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={(e) => tick(r, e.target.checked)}
                          className="h-4 w-4 shrink-0 accent-[#5e9a4a]"
                          aria-label={`All of ${r.name} made`}
                        />
                        {r.name}
                      </label>
                    }
                    highlight={highlight}
                    accent={r.accent}
                    cells={[
                      r.need,
                      ...(g.weighed ? [r.weight] : []),
                      <MadeBox key={made[r.id]} label={`${r.name} made so far`} value={made[r.id]} onSave={(quantity) => save(r.id, quantity)} />,
                      made[r.id] > r.need ? <span className="inline-block">{made[r.id] - r.need} extra</span> : left,
                    ]}
                  />
                  </Fragment>
                );
              })}
            </ItemTable>
          );
        })}
      </div>
      {dialog}
    </div>
  );
}

/** A box for how many (made so far, or sold); saves when you leave it or press Enter. */
export function MadeBox({ label, value, max, onSave }: { label: string; value: number; max?: number; onSave: (quantity: number) => void }) {
  return (
    <input
      inputMode="numeric"
      defaultValue={value || ""}
      placeholder="0"
      aria-label={label}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      onChange={(e) => {
        e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
      }}
      onBlur={(e) => {
        const quantity = Math.min(Number(e.target.value || 0), max ?? Infinity);
        e.target.value = quantity ? String(quantity) : "";
        if (quantity !== value) onSave(quantity);
      }}
      className="w-full rounded-lg border border-white/15 bg-cacao-800 px-1.5 py-1 text-right text-sm text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none"
    />
  );
}
