"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { savesInFlight } from "./make-checklist";

/** Opens Labels with how many of each to print filled in from what's been made in the week. */
export function ConvertToLabels({ week }: { week: string }) {
  const router = useRouter();
  const [opening, startOpening] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-white/10 pt-5">
      <button
        type="button"
        disabled={opening}
        onClick={() =>
          startOpening(async () => {
            // Wait for a number only just typed, so its labels are counted.
            await Promise.allSettled([...savesInFlight]);
            startOpening(() => router.push(`/pod/labels?week=${week}`));
          })
        }
        className="eyebrow rounded-full bg-caramel px-5 py-2.5 text-cacao-950 transition-colors hover:bg-gold disabled:opacity-60"
      >
        {opening ? "Opening labels…" : "Convert to labels"}
      </button>
      <p className="font-sans text-sm text-cream/70">Fills in how many labels to print from the numbers you’ve put in Made.</p>
    </div>
  );
}
