/** A file saved with a receipt, as recorded by the sync-receipts function. */
export type ReceiptFile = { name: string; path: string; type: string; size: number };

const sydneyMonthFormat = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Sydney",
  year: "numeric",
  month: "2-digit",
});

/** "2026-10": the month a receipt was emailed, in Sydney time. */
export function sydneyMonth(iso: string) {
  const parts = sydneyMonthFormat.formatToParts(new Date(iso));
  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  return `${year}-${month}`;
}

/** "October 2026" for "2026-10". */
export function monthLabel(month: string) {
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m - 1, 15)).toLocaleDateString("en-AU", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Australian financial year (1 July to 30 June) for a month, e.g. "2026–27". */
export function financialYear(month: string) {
  const [year, m] = month.split("-").map(Number);
  const start = m >= 7 ? year : year - 1;
  return `${start}–${String((start + 1) % 100).padStart(2, "0")}`;
}

export function receiptDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AU", {
    timeZone: "Australia/Sydney",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}
