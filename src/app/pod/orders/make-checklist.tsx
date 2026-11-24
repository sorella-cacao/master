"use client";

import { useOptimistic, useState, useTransition } from "react";
import { ItemRow, ItemTable } from "../item-table";
import { setMadeThisWeek } from "./actions";

export type MakeGroup = {
  title: string;
  /** Bars show how many to make; other things (Pure Cacao, bundles) also show their weight. */
  weighed: boolean;
  /** `need` is how many to make in all, and `made` how many are noted as made so far. */
  rows: { id: string; name: string; need: number; made: number; accent: boolean; weight: string }[];
};

const BAR_TOTALS = [
  { title: "Large Bar", label: "Large bars" },
  { title: "Small Bar", label: "Small bars" },
];

/**
 * The week's "To make" tables. Each row has a box for how many are made so far and shows how many
 * are left; its tick marks the lot as made. Saved as they're changed. Beside the tables is how many
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
      const result = await setMadeThisWeek(week, id, quantity);
      setError(result.error ?? "");
    });
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
              {g.rows.map((r) => {
                const left = leftOf(r);
                const done = left === 0;
                return (
                  <ItemRow
                    key={r.id}
                    done={done}
                    name={
                      <label className="flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={done}
                          onChange={(e) => save(r.id, e.target.checked ? r.need : 0)}
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
                      <MadeBox key={made[r.id]} name={r.name} made={made[r.id]} onSave={(quantity) => save(r.id, quantity)} />,
                      left,
                    ]}
                  />
                );
              })}
            </ItemTable>
          );
        })}
      </div>
    </div>
  );
}

/** The box for how many are made so far; saves when you leave it or press Enter. */
function MadeBox({ name, made, onSave }: { name: string; made: number; onSave: (quantity: number) => void }) {
  return (
    <input
      inputMode="numeric"
      defaultValue={made || ""}
      placeholder="0"
      aria-label={`${name} made so far`}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      onChange={(e) => {
        e.target.value = e.target.value.replace(/\D/g, "").slice(0, 4);
      }}
      onBlur={(e) => {
        const quantity = Number(e.target.value || 0);
        if (quantity !== made) onSave(quantity);
      }}
      className="w-full rounded-lg border border-white/15 bg-cacao-800 px-1.5 py-1 text-right text-sm text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none"
    />
  );
}
