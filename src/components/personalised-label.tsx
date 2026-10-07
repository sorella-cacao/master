"use client";

import { Cinzel_Decorative } from "next/font/google";
import Image from "next/image";
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

/** The bar's real label artwork; customers type their words straight onto the heading. */
export function LabelEditor({
  label,
  flavour,
  text,
  onTextChange,
}: {
  label: PersonalisedLabel;
  flavour?: string;
  text: string;
  onTextChange: (text: string) => void;
}) {
  const layout = LABEL_LAYOUT[label.size];
  const src = (flavour && label.images[flavour]) || label.images[label.defaultFlavour];
  const wording = cleanLabel(text);
  const words = wording ? wording.split(" ").length : 0;
  // Shrink long wording so it stays on the label.
  const fontSize = Math.min(layout.fontSize, 86 / (Math.max(wording.length, 10) * 0.68));

  return (
    <figure>
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
          value={text}
          onChange={(e) => onTextChange(limitWords(e.target.value))}
          className={`${labelFont.className} absolute w-[90%] -translate-x-1/2 rounded-md border-2 border-dashed px-2 text-center leading-none text-black outline-none placeholder:text-black/30 focus:border-caramel ${
            wording ? "border-transparent bg-transparent hover:border-black/15" : "border-caramel/80 bg-caramel/10"
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

/** Puts the cursor back on the label, e.g. when Add to Cart is pressed with no words. */
export function focusLabelInput() {
  document.querySelector<HTMLInputElement>("input[data-label-input]")?.focus();
}
