/**
 * Label layouts: for each part of a label, how far it's moved from its standard place (x and y, in
 * mm, right and down), its width and text size (% of standard) and its font. Used by the PDF and by
 * the layout controls in the Pod, so it has no server-only code.
 */

export const FONTS = {
  "serif-condensed": "Serif condensed",
  "open-sans": "Open Sans",
  helvetica: "Helvetica",
  times: "Times",
  garamond: "EB Garamond",
} as const;
export type FontKey = keyof typeof FONTS;

export type PartLayout = { x?: number; y?: number; width?: number; size?: number; font?: FontKey };
export type LayoutPart = "headline" | "nutrition" | "story" | "ingredients" | "dates" | "packaging" | "contact";
export type Layout = Partial<Record<LayoutPart, PartLayout>>;

/** The parts of each size of label, in the order they're listed, with their standard font. */
export const LAYOUT_PARTS: Record<"large" | "small", { part: LayoutPart; name: string; font: FontKey }[]> = {
  large: [
    { part: "headline", name: "Headline", font: "serif-condensed" },
    { part: "nutrition", name: "Nutrition panel", font: "helvetica" },
    { part: "story", name: "Story", font: "open-sans" },
    { part: "ingredients", name: "Ingredients & may contain", font: "open-sans" },
    { part: "dates", name: "Best before & batch", font: "open-sans" },
    { part: "packaging", name: "Packaging note", font: "open-sans" },
    { part: "contact", name: "Follow our journey", font: "open-sans" },
  ],
  small: [
    { part: "headline", name: "Headline", font: "serif-condensed" },
    { part: "nutrition", name: "Nutrition panel & packaging note", font: "helvetica" },
    { part: "ingredients", name: "Ingredients", font: "open-sans" },
    { part: "dates", name: "May contain, batch & best before", font: "open-sans" },
    { part: "contact", name: "Follow our journey", font: "open-sans" },
  ],
};

const LIMITS = { x: [-40, 40], y: [-40, 40], width: [40, 200], size: [50, 200] } as const;
const STANDARD = { x: 0, y: 0, width: 100, size: 100 } as const;

/** A layout made safe to save and print: known parts and fonts only, numbers within limits, standard values left out. */
export function cleanLayout(raw: unknown): Layout {
  const layout: Layout = {};
  if (!raw || typeof raw !== "object") return layout;
  const parts = new Set([...LAYOUT_PARTS.large, ...LAYOUT_PARTS.small].map((p) => p.part));
  for (const [part, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!parts.has(part as LayoutPart) || !value || typeof value !== "object") continue;
    const given = value as Record<string, unknown>;
    const clean: PartLayout = {};
    for (const key of ["x", "y", "width", "size"] as const) {
      const n = Number(given[key]);
      if (!Number.isFinite(n)) continue;
      const [min, max] = LIMITS[key];
      const rounded = Math.round(Math.min(max, Math.max(min, n)) * 10) / 10;
      if (rounded !== STANDARD[key]) clean[key] = rounded;
    }
    if (typeof given.font === "string" && given.font in FONTS) clean.font = given.font as FontKey;
    if (Object.keys(clean).length) layout[part as LayoutPart] = clean;
  }
  return layout;
}
