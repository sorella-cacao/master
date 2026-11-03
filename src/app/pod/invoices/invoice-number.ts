/** "012", or "01CULTURAL" for customers whose invoice numbers carry a suffix (the council's). */
export const invoiceNumber = (n: number, suffix?: string | null) =>
  suffix ? `${String(n).padStart(2, "0")}${suffix}` : String(n).padStart(3, "0");
