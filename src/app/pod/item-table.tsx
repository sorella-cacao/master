/**
 * A striped table with one row per flavour or size, so each box clearly
 * belongs to the item on its row. Works in server and client components.
 */
export function ItemTable({
  caption,
  headings,
  children,
}: {
  caption?: string;
  /** Column headings; the first is the item name, the rest are right-aligned. */
  headings: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/15">
      <table className="w-full font-sans text-base">
        {caption && (
          <caption className="eyebrow border-b border-white/15 bg-white/5 px-4 py-2.5 text-left text-cream/80">
            {caption}
          </caption>
        )}
        <thead>
          <tr className="text-sm text-cream/70">
            {headings.map((heading, i) => (
              <th key={heading} scope="col" className={`px-4 py-2 font-normal ${i === 0 ? "text-left" : "text-right"}`}>
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
export function ItemRow({ name, cells }: { name: React.ReactNode; cells: React.ReactNode[] }) {
  return (
    <tr className="border-t border-white/10 odd:bg-cacao-950/60">
      <th scope="row" className="px-4 py-2 text-left font-normal">
        {name}
      </th>
      {cells.map((cell, i) => (
        <td key={i} className="px-4 py-2 text-right tabular-nums">
          {cell}
        </td>
      ))}
    </tr>
  );
}
