"use client";

import { Cinzel_Decorative } from "next/font/google";
import Image from "next/image";
import { createContext, useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PersonalisedLabel } from "@/data/types";

// The printed labels use EFCO Brookshire (a Canva font without a web licence);
// Cinzel Decorative is the closest free match for previews.
const labelFont = Cinzel_Decorative({ subsets: ["latin"], weight: "700" });

/** Where the "Sorella Cacao" heading sits on each size of label artwork. */
const LABEL_LAYOUT = {
  large: { aspectRatio: "1600 / 766", headingTop: "3%", headingHeight: "23%", centreX: "48.2%", fontSize: "7.5cqw" },
  small: { aspectRatio: "1600 / 1024", headingTop: "3%", headingHeight: "19.5%", centreX: "47.8%", fontSize: "9cqw" },
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

/** Shows the label preview in place of the product photos once "Yes" is chosen. */
export function LabelPreviewSwitch({
  label,
  children,
}: {
  label: PersonalisedLabel;
  children: React.ReactNode;
}) {
  const choice = useLabelChoice();
  if (!choice?.wanted) return children;
  return (
    <div className="flex aspect-[4/5] items-center justify-center rounded-2xl bg-cacao-800 p-6 sm:p-10">
      <LabelPreview label={label} text={choice.text} flavour={choice.flavour} />
    </div>
  );
}

/** The bar's real label artwork with the customer's words as the heading. */
export function LabelPreview({
  label,
  text,
  flavour,
}: {
  label: PersonalisedLabel;
  text: string;
  flavour?: string;
}) {
  const layout = LABEL_LAYOUT[label.size];
  const src = (flavour && label.images[flavour]) || label.images[label.defaultFlavour];
  const heading = text.trim();
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);

  // Shrink long wording to fit across the label.
  useLayoutEffect(() => {
    const box = boxRef.current;
    const el = textRef.current;
    if (!box || !el) return;
    const fit = () => {
      const scale = Math.min(1, box.clientWidth / el.scrollWidth);
      el.style.transform = `scale(${scale})`;
    };
    fit();
    document.fonts.ready.then(fit);
    const observer = new ResizeObserver(fit);
    observer.observe(box);
    return () => observer.disconnect();
  }, [heading]);

  return (
    <figure className="w-full">
      <div
        className="relative w-full overflow-hidden rounded-sm bg-white shadow-2xl shadow-black/40 [container-type:inline-size]"
        style={{ aspectRatio: layout.aspectRatio }}
      >
        <Image src={src} alt="" fill sizes="(min-width: 1024px) 40vw, 90vw" className="object-contain" />
        <div
          ref={boxRef}
          className="absolute flex w-[90%] -translate-x-1/2 items-center justify-center"
          style={{ top: layout.headingTop, height: layout.headingHeight, left: layout.centreX }}
        >
          <span
            ref={textRef}
            className={`${labelFont.className} inline-block whitespace-nowrap leading-none ${heading ? "text-black" : "text-black/25"}`}
            style={{ fontSize: layout.fontSize }}
          >
            {heading || "Your Words Here"}
          </span>
        </div>
      </div>
      <figcaption className="eyebrow mt-4 text-center text-cream/60">
        Label preview{flavour ? ` · ${flavour}` : ""}
      </figcaption>
    </figure>
  );
}
