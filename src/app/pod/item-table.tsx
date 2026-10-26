/**
 * A striped table with one row per flavour or size, so each box clearly
 * belongs to the item on its row. Works in server and client components.
 */
export function ItemTable({
  caption,
  headings,
  highlight = [],
  columnWidth = "w-24",
  collapsible = false,
  bare = false,
  children,
}: {
  /** No outer border (used inside a collapsible table). */
  bare?: boolean;
  caption?: string;
  /** Let the table fold away by tapping its caption bar (starts open). */
  collapsible?: boolean;
  /** Width of every column after the item name, so tables stacked together line up. */
  columnWidth?: string;
  /** Column positions (0 = item name) to shade so they stand out. */
  highlight?: number[];
  /** Column headings; the first is the item name, the rest are right-aligned. */
  headings: string[];
  children: React.ReactNode;
}) {

  if (collapsible && caption) {
    return (
      <details open className="group overflow-hidden rounded-xl border border-white/15">
        <summary
          className={`eyebrow flex cursor-pointer list-none items-center justify-between bg-white/5 text-cream/80 hover:text-gold [&::-webkit-details-marker]:hidden px-3 py-1.5`}
        >
          {caption}
          <span aria-hidden className="text-base transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="border-t border-white/15">
          <ItemTable headings={headings} highlight={highlight} columnWidth={columnWidth} bare>
            {children}
          </ItemTable>
        </div>
      </details>
    );
  }

  return (
    <div className={`overflow-x-auto ${bare ? "" : "rounded-xl border border-white/15"}`}>
      <table className="w-full table-fixed font-sans text-sm">
        {caption && (
          <caption
            className="eyebrow border-b border-white/15 bg-white/5 px-3 py-1.5 text-left text-cream/80"
          >
            {caption}
          </caption>
        )}
        <thead>
          <tr className="text-xs text-cream/70">
            {headings.map((heading, i) => (
              <th
                key={heading}
                scope="col"
                className={`px-3 py-1 ${i === 0 ? "text-left" : `${columnWidth} text-right`} ${
                  highlight.includes(i) ? "border-l border-white/30 bg-[#efb94f] font-semibold text-cream" : "font-normal"
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
  accent = false,
}: {
  name: React.ReactNode;
  cells: React.ReactNode[];
  /** Colour the highlighted boxes terracotta instead of honey, e.g. flavours made from 75% Dark. */
  accent?: boolean;
  /** Column positions (0 = item name) to shade, matching the table's. */
  highlight?: number[];
}) {
  return (
    <tr className="border-t border-white/10 odd:bg-cacao-950/60">
      <th scope="row" className="px-3 py-1 text-left font-normal">
        {name}
      </th>
      {cells.map((cell, i) => (
        <td
          key={i}
          className={`px-3 py-1 text-right tabular-nums ${highlight.includes(i + 1) ? `border-l border-t border-white/30 ${accent ? "bg-[#e7b28e]" : "bg-[#f6cf7a] font-semibold"} text-cream` : ""}`}
        >
          {cell}
        </td>
      ))}
    </tr>
  );
}
