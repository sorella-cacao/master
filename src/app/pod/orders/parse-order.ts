/**
 * Reads an order pasted from an email ("6 x 50g Hazelnut", "Goat milk large - 2", …)
 * into quantities per stock item. Lines it can't place are returned so they can be checked.
 */

export type ParseGroup = { title: string; items: { id: string; name: string }[] };
export type ParsedOrder = { quantities: Record<string, number>; unread: string[] };

type Size = "small" | "large" | "cacao";

// Different words people use for the same flavour, mapped to one word.
const SAME_AS: Record<string, string> = {
  goats: "goat",
  orange: "mandarin",
  oranges: "mandarin",
  mandarins: "mandarin",
  citrus: "mandarin",
  blood: "mandarin",
  peaches: "peach",
  white: "peach",
  chili: "chilli",
  smokey: "chilli",
  smoky: "chilli",
  smoking: "chilli",
  hot: "chilli",
  cayenne: "chilli",
  pepperberries: "pepper",
  pepperberry: "pepper",
  native: "pepper",
  gianduja: "hazelnut",
  hazelnuts: "hazelnut",
  nut: "hazelnut",
  figs: "fig",
};

// Words that don't tell flavours apart.
const IGNORE = new Set(["local", "and", "w", "with", "bar", "bars", "dark", "roasted", "the", "of", "choc", "chocolate", "salt", "milk", "x", "qty"]);

const words = (text: string) =>
  text
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9%.\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => SAME_AS[w] ?? w)
    .filter((w) => !IGNORE.has(w));

function sizeOf(line: string): Size | null {
  const l = line.toLowerCase();
  if (/\b(pure|cacao powder|drinking|ceremonial)\b/.test(l) || /\b(250|500)\s*g\b|\b1\s*kg\b/.test(l)) return "cacao";
  if (/\b(50|49\.?5)\s*g(rams?)?\b|\bsmall\b|\bsm\b|\bmini\b/.test(l)) return "small";
  if (/\b(1[0-9]{2}|90|99)\s*g(rams?)?\b|\blarge\b|\blg\b|\bbig\b/.test(l)) return "large";
  return null;
}

/** The quantity: a number that isn't a weight or a percentage, preferring one next to an "x". */
function quantityOf(line: string) {
  const l = line
    .toLowerCase()
    .replace(/\d+(\.\d+)?\s*(g|grams?|kg)\b/g, " ")
    .replace(/\d+(\.\d+)?\s*%/g, " ");
  const byX = l.match(/(\d{1,3})\s*x\b|\bx\s*(\d{1,3})\b|\b(?:qty|quantity)\s*:?\s*(\d{1,3})\b/);
  if (byX) return Number(byX[1] ?? byX[2] ?? byX[3]);
  const plain = l.match(/\b(\d{1,3})\b/);
  return plain ? Number(plain[1]) : null;
}

function groupFor(size: Size, groups: ParseGroup[]) {
  const title = { small: "small", large: "large", cacao: "cacao" }[size];
  return groups.find((g) => g.title.toLowerCase().includes(title));
}

/** The item in these groups whose name shares the most flavour words with the line. */
function bestMatch(line: string, groups: ParseGroup[], size: Size | null) {
  const lineWords = new Set(words(line));
  let best: { id: string; score: number; extra: number; group: string } | null = null;
  let tie = false;
  for (const group of groups) {
    for (const item of group.items) {
      const itemWords = words(item.name);
      if (size === "cacao") {
        // Pure Cacao items are named by weight, e.g. "250g".
        const weight = item.name.toLowerCase().replace(/\s/g, "");
        if (line.toLowerCase().replace(/\s/g, "").includes(weight)) return { id: item.id, group: group.title };
        continue;
      }
      // A percentage in the line must agree with the item's (75% isn't 84%).
      const linePercents = [...lineWords].filter((w) => w.endsWith("%"));
      const itemPercents = itemWords.filter((w) => w.endsWith("%"));
      if (linePercents.length && itemPercents.length && !itemPercents.some((p) => lineWords.has(p))) continue;
      const score = itemWords.filter((w) => lineWords.has(w)).length;
      if (!score) continue;
      const extra = itemWords.length - score;
      if (!best || score > best.score || (score === best.score && extra < best.extra)) {
        tie = !!best && score === best.score && extra === best.extra && best.group !== group.title;
        best = { id: item.id, score, extra, group: group.title };
      } else if (score === best.score && extra === best.extra) {
        tie = true;
      }
    }
  }
  return best && !tie ? { id: best.id, group: best.group } : null;
}

export function parseOrder(text: string, groups: ParseGroup[]): ParsedOrder {
  const quantities: Record<string, number> = {};
  const unread: string[] = [];
  // A heading like "Large bars:" sets the size for the lines under it.
  let sizeFromHeading: Size | null = null;

  const lines = text
    .split(/\r?\n|;/)
    .flatMap((l) => l.split(/,(?=[^,]*\d)/))
    .map((l) => l.replace(/^[\s\-•*·>]+/, "").trim())
    .filter(Boolean);

  for (const line of lines) {
    const size = sizeOf(line);
    const quantity = quantityOf(line);
    if (quantity === null) {
      if (size && words(line).length <= 2) sizeFromHeading = size;
      continue; // Greetings, sign-offs and headings.
    }
    if (quantity === 0) continue;
    const useSize = size ?? sizeFromHeading;
    const searchIn = useSize ? [groupFor(useSize, groups)].filter((g): g is ParseGroup => !!g) : groups.filter((g) => !/cacao/i.test(g.title));
    const match = bestMatch(line, searchIn, useSize);
    if (!match) {
      unread.push(line);
      continue;
    }
    quantities[match.id] = (quantities[match.id] ?? 0) + quantity;
  }
  return { quantities, unread };
}
