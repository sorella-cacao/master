import type { Metadata } from "next";
import { addDays, isDate, shortDate, sydneyToday } from "@/lib/weeks";
import { PodNav } from "../pod-nav";
import { PodPanel } from "../pod-panel";
import { getSession } from "../session";
import { getStockGroups } from "../stock-items";
import { labelsForMade } from "./from-made";
import { getLabels } from "./label-data";
import { LabelMaker } from "./label-maker";

export const metadata: Metadata = { title: "Labels" };

export default async function LabelsPage(props: PageProps<"/pod/labels">) {
  const { supabase, email, isAdmin } = await getSession();
  if (!isAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="font-script text-6xl text-gold">The Pod</h1>
        <p className="mt-6 text-xl">{email ?? "This account"} doesn’t have access to the Pod yet.</p>
      </div>
    );
  }

  const [allLabels, groups] = await Promise.all([
    getLabels(supabase),
    getStockGroups(supabase, { includeHidden: true, includeUntracked: true }),
  ]);
  // Labels for flavours that are asleep (Stock › Flavour list) are left out until they wake up.
  const asleep = new Set(groups.flatMap((g) => g.items.filter((i) => !i.isActive).map((i) => i.id)));
  const labels = allLabels.filter((l) => !l.stockItemId || !asleep.has(l.stockItemId));
  const today = sydneyToday();
  // "Convert to labels" on Orders: fill in what's been made in that week.
  const { week } = await props.searchParams;
  const made = typeof week === "string" && isDate(week) ? { week, ...(await labelsForMade(supabase, labels, week)) } : null;

  return (
    <div className="space-y-6">
      <header className="space-y-6">
        <h1 className="font-script text-6xl text-gold sm:text-7xl">The Pod</h1>
        <PodNav current="/pod/labels" />
      </header>

      <PodPanel
        open
        title="Print labels"
        hint="Your Canva labels, from Sorella › Labels › Canva. Pick the best before date, the first 4 batch digits and how many of each: they’re stamped onto the backs and printed with their fronts. After changing a label in Canva, ask Claude to copy it across again."
      >
        <LabelMaker
          key={made?.week}
          fromMade={made && { copies: made.copies, missing: made.missing, weekOf: shortDate(made.week) }}
          labels={labels.map(({ id, size, name, frontFile, backFile, stamps, section }) => ({ id, size, name, frontFile, backFile, stamps, section }))}
          today={today}
          defaultBestBefore={addDays(today, 365)}
        />
      </PodPanel>
    </div>
  );
}
