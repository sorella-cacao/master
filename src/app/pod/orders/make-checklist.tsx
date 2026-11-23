"use client";

import { useOptimistic, useTransition, useState } from "react";
import { ItemRow, ItemTable } from "../item-table";
import { setMadeThisWeek } from "./actions";

export type MakeGroup = {
  title: string;
  /** Bars show how many to make; other things (Pure Cacao, bundles) also show their weight. */
  weighed: boolean;
  rows: { id: string; name: string; toMake: number; accent: boolean; weight: string }[];
};

const BAR_TOTALS = [
  { title: "Large Bar", label: "Large bars" },
  { title: "Small Bar", label: "Small bars" },
];

/**
 * The week's "To make" tables with a tick box on every row, saved as it's ticked, and beside them
 * how many large and small bars are still left to make.
 */
export function MakeChecklist({ week, groups, made }: { week: string; groups: MakeGroup[]; made: string[] }) {
  const [ticked, setTicked] = useOptimistic(new Set(made), (current, change: { id: string; made: boolean }) => {
    const next = new Set(current);
    if (change.made) next.add(change.id);
    else next.delete(change.id);
    return next;
  });
  const [, startTransition] = useTransition();
  const [error, setError] = useState("");

  const toggle = (id: string, isMade: boolean) =>
    startTransition(async () => {
      setTicked({ id, made: isMade });
      const result = await setMadeThisWeek(week, id, isMade);
      setError(result.error ?? "");
    });

  const totals = BAR_TOTALS.map(({ title, label }) => {
    const rows = groups.find((g) => g.title === title)?.rows ?? [];
    const all = rows.reduce((n, r) => n + r.toMake, 0);
    const left = rows.filter((r) => !ticked.has(r.id)).reduce((n, r) => n + r.toMake, 0);
    return { label, all, left };
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
          {error && <p className="font-sans text-sm text-red-300">{error}</p>}
        </aside>
      )}
      <div className="space-y-3 lg:order-1">
        {groups.map((g) => (
          <ItemTable
            key={g.title}
            caption={g.title}
            headings={g.weighed ? [g.title === "Pure Cacao" ? "Size" : "Item", "To make", "Weight"] : ["Flavour", "To make"]}
            highlight={g.weighed ? [1, 2] : [1]}
            collapsible
          >
            {g.rows.map((r) => {
              const done = ticked.has(r.id);
              return (
                <ItemRow
                  key={r.id}
                  done={done}
                  name={
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={done}
                        onChange={(e) => toggle(r.id, e.target.checked)}
                        className="h-4 w-4 shrink-0 accent-[#5e9a4a]"
                        aria-label={`Made ${r.name}`}
                      />
                      {r.name}
                    </label>
                  }
                  highlight={g.weighed ? [1, 2] : [1]}
                  accent={r.accent}
                  cells={g.weighed ? [r.toMake, r.weight] : [r.toMake]}
                />
              );
            })}
          </ItemTable>
        ))}
      </div>
    </div>
  );
}
