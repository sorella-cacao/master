"use client";

import { Cinzel_Decorative } from "next/font/google";
import Image from "next/image";
import { createContext, useContext, useMemo, useState } from "react";
import type { PersonalisedLabel } from "@/data/types";
import { MAX_LABEL_WORDS, cleanLabel, limitWords } from "@/lib/labels";

// The printed labels use EFCO Brookshire (a Canva font without a web licence);
// Cinzel Decorative is the closest free match for previews.
const labelFont = Cinzel_Decorative({ subsets: ["latin"], weight: "700" });

/** Where the "Sorella Cacao" heading sits on each size of label artwork (font size in cqw). */
const LABEL_LAYOUT = {
  large: { aspectRatio: "1600 / 766", headingTop: "3%", headingHeight: "23%", centreX: "48.2%", fontSize: 7.5 },
  small: { aspectRatio: "1600 / 1024", headingTop: "3%", headingHeight: "19.5%", centreX: "47.8%", fontSize: 9 },
} as const;

export type LabelChoice = {
  /** null until the customer answers Yes or No. */
  wanted: boolean | null;
  text: string;
  flavour?: string;
  setWanted: (wanted: boolean) => void;
  setText: (text: string) => void;
  setFlavour: (flavour?: string) => void;
};

const LabelChoiceContext = createContext<LabelChoice | null>(null);

/** Shares the label choice between the purchase form and the image column. */
export function LabelChoiceProvider({ children }: { children: React.ReactNode }) {
  const [wanted, setWanted] = useState<boolean | null>(null);
  const [text, setText] = useState("");
  const [flavour, setFlavour] = useState<string>();
  const value = useMemo(
    () => ({ wanted, text, flavour, setWanted, setText, setFlavour }),
    [wanted, text, flavour],
  );
  return <LabelChoiceContext value={value}>{children}</LabelChoiceContext>;
}

/** The label choice, or null on pages that don't offer personalised labels. */
export function useLabelChoice() {
  return useContext(LabelChoiceContext);
}

/** On wide screens, swaps the product photo for the label once "Yes" is chosen. */
export function LabelEditorSwitch({
  label,
  children,
}: {
  label: PersonalisedLabel;
  children: React.ReactNode;
}) {
  const choice = useLabelChoice();
  if (!choice?.wanted) return children;
  return (
    <>
      {/* Phones show the label under the question instead, so keep the photo here. */}
      <div className="space-y-4 lg:hidden">{children}</div>
      <div className="hidden aspect-[4/5] items-center justify-center rounded-2xl bg-cacao-800 p-10 lg:flex">
        <LabelEditor label={label} choice={choice} />
      </div>
    </>
  );
}

/** The bar's real label artwork; customers tap the heading and type their words onto it. */
export function LabelEditor({ label, choice }: { label: PersonalisedLabel; choice: LabelChoice }) {
  const layout = LABEL_LAYOUT[label.size];
  const src = (choice.flavour && label.images[choice.flavour]) || label.images[label.defaultFlavour];
  const text = cleanLabel(choice.text);
  const words = text ? text.split(" ").length : 0;
  // Shrink long wording so it stays on the label.
  const fontSize = Math.min(layout.fontSize, 86 / (Math.max(text.length, 10) * 0.68));

  return (
    <figure className="w-full">
      <div
        className="relative w-full overflow-hidden rounded-sm bg-white shadow-2xl shadow-black/40 [container-type:inline-size]"
        style={{ aspectRatio: layout.aspectRatio }}
      >
        <Image src={src} alt="" fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-contain" />
        <input
          type="text"
          data-label-input
          // Appears only once the customer chooses "Yes", so it's ready to type into.
          autoFocus
          aria-label={`Your label words (up to ${MAX_LABEL_WORDS})`}
          placeholder="Your words here"
          maxLength={40}
          value={choice.text}
          onChange={(e) => choice.setText(limitWords(e.target.value))}
          className={`${labelFont.className} absolute w-[90%] -translate-x-1/2 rounded-md border-2 border-dashed px-2 text-center leading-none text-black outline-none placeholder:text-black/30 focus:border-caramel ${
            text ? "border-transparent bg-transparent hover:border-black/15" : "border-caramel/80 bg-caramel/10"
          }`}
          style={{
            top: layout.headingTop,
            height: layout.headingHeight,
            left: layout.centreX,
            fontSize: `${fontSize}cqw`,
          }}
        />
      </div>
      <figcaption className="mt-4 flex items-center justify-center gap-3 font-sans text-sm text-cream/75">
        <span className="flex gap-1.5" aria-hidden>
          {Array.from({ length: MAX_LABEL_WORDS }, (_, i) => (
            <span key={i} className={`h-2.5 w-2.5 rounded-full border border-gold ${i < words ? "bg-gold" : ""}`} />
          ))}
        </span>
        {words} of {MAX_LABEL_WORDS} words
      </figcaption>
    </figure>
  );
}

/** Puts the cursor in whichever label is showing (beside the form on wide screens, inside it on phones). */
export function focusLabelInput() {
  const inputs = document.querySelectorAll<HTMLInputElement>("input[data-label-input]");
  Array.from(inputs).find((el) => el.offsetParent !== null)?.focus();
}
