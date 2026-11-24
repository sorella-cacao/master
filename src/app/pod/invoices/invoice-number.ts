/**
 * The number as typed when it has letters of its own ("RR01"), else "012", or "01CULTURAL" for customers
 * whose invoice numbers carry a suffix (the council's).
 */
export const invoiceNumber = (n: number, suffix?: string | null, label?: string | null) =>
  label || (suffix ? `${String(n).padStart(2, "0")}${suffix}` : String(n).padStart(3, "0"));

/**
 * Reads a typed invoice number: the number it counts up by (its last digits, or what it was when there
 * are only letters) and the label to keep when it's more than the plain number. Null if it can't be read.
 */
export function readInvoiceNumber(typed: string, was: { number: number; suffix: string | null }) {
  const label = typed.trim().replace(/^#\s*/, "");
  if (!label || label.length > 30 || !/^[A-Za-z0-9 ./_-]+$/.test(label)) return null;
  const digits = label.match(/(\d+)\D*$/)?.[1];
  const number = digits ? Number(digits) : was.number;
  if (!Number.isSafeInteger(number) || number <= 0 || number > 999_999_999) return null;
  const plain = /^\d+$/.test(label) || label === invoiceNumber(number, was.suffix);
  return { number, label: plain ? null : label };
}
