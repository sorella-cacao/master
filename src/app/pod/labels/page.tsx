import type { Metadata } from "next";
import { addDays, sydneyToday } from "@/lib/weeks";
import { PodNav } from "../pod-nav";
import { PodPanel } from "../pod-panel";
import { getSession } from "../session";
import { getLabels } from "./label-data";
import { LabelMaker } from "./label-maker";

export const metadata: Metadata = { title: "Labels" };

export default async function LabelsPage() {
  const { supabase, email, isAdmin } = await getSession();
  if (!isAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="font-script text-6xl text-gold">The Pod</h1>
        <p className="mt-6 text-xl">{email ?? "This account"} doesn’t have access to the Pod yet.</p>
      </div>
    );
  }

  const labels = await getLabels(supabase);
  const today = sydneyToday();

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
          labels={labels.map(({ id, size, name, frontFile, backFile, stamps }) => ({ id, size, name, frontFile, backFile, stamps }))}
          today={today}
          defaultBestBefore={addDays(today, 365)}
        />
      </PodPanel>
    </div>
  );
}
