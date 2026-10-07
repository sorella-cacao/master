/** One-off charge per personalised label wording, however many bars carry it. */
export const LABEL_FEE = 15;

export const MAX_LABEL_WORDS = 3;

/** Keep typed label text to three words, still allowing a space before the next word. */
export function limitWords(value: string) {
  const text = value.trimStart();
  const words = text.split(/\s+/);
  return words.length > MAX_LABEL_WORDS ? words.slice(0, MAX_LABEL_WORDS).join(" ") : text;
}

/** Tidy label text for the cart: trimmed, with single spaces between words. */
export function cleanLabel(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

/** Each distinct wording is charged once, ignoring capitalisation. */
export function distinctLabels(labels: (string | undefined)[]) {
  const seen = new Map<string, string>();
  for (const label of labels) {
    if (label && !seen.has(label.toLowerCase())) seen.set(label.toLowerCase(), label);
  }
  return [...seen.values()];
}
