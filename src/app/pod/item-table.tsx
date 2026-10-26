/**
 * A striped table with one row per flavour or size, so each box clearly
 * belongs to the item on its row. Works in server and client components.
 */
export function ItemTable({
  caption,
  headings,
  highlight = [],
  columnWidth = "w-28",
  compact = false,
  children,
}: {
  caption?: string;
  /** Tighter rows and smaller text, for an at-a-glance summary. */
  compact?: boolean;
  /** Width of every column after the item name, so tables stacked together line up. */
  columnWidth?: string;
  /** Column positions (0 = item name) to shade so they stand out. */
  highlight?: number[];
  /** Column headings; the first is the item name, the rest are right-aligned. */
  headings: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/15">
      <table className={`w-full table-fixed font-sans ${compact ? "text-sm" : "text-base"}`}>
        {caption && (
          <caption
            className={`eyebrow border-b border-white/15 bg-white/5 text-left text-cream/80 ${compact ? "px-3 py-1.5" : "px-4 py-2.5"}`}
          >
            {caption}
          </caption>
        )}
        <thead>
          <tr className={`text-cream/70 ${compact ? "text-xs" : "text-sm"}`}>
            {headings.map((heading, i) => (
              <th
                key={heading}
                scope="col"
                className={`${compact ? "px-3 py-1" : "px-4 py-2"} ${i === 0 ? "text-left" : `${columnWidth} text-right`} ${
                  highlight.includes(i) ? "bg-[#efb94f] font-semibold text-cream" : "font-normal"
                }`}
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

/** One item's row: its name, then a cell for each further column. */
export function ItemRow({
  name,
  cells,
  highlight = [],
  compact = false,
  accent = false,
}: {
  name: React.ReactNode;
  cells: React.ReactNode[];
  compact?: boolean;
  /** Colour the highlighted boxes terracotta instead of honey, e.g. flavours made from 75% Dark. */
  accent?: boolean;
  /** Column positions (0 = item name) to shade, matching the table's. */
  highlight?: number[];
}) {
  return (
    <tr className="border-t border-white/10 odd:bg-cacao-950/60">
      <th scope="row" className={`${compact ? "px-3 py-1" : "px-4 py-2"} text-left font-normal`}>
        {name}
      </th>
      {cells.map((cell, i) => (
        <td
          key={i}
          className={`${compact ? "px-3 py-1" : "px-4 py-2"} text-right tabular-nums ${highlight.includes(i + 1) ? `${accent ? "bg-[#e7b28e]" : "bg-[#f6cf7a] font-semibold"} text-cream` : ""}`}
        >
          {cell}
        </td>
      ))}
    </tr>
  );
}
