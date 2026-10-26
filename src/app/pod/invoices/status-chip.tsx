/** Paid (green), Overdue (terracotta) or Unpaid (outlined). */
export function StatusChip({ status }: { status: string }) {
  const style =
    status === "Paid" ? "bg-[#cfe3c4] text-cream" : status === "Overdue" ? "bg-[#e7b28e] text-cream" : "border border-white/20 text-cream/70";
  return <span className={`eyebrow ml-3 rounded-full px-2 py-0.5 align-middle text-[0.65rem] ${style}`}>{status}</span>;
}
