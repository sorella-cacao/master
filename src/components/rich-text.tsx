import type { ContentBlock } from "@/data/types";

const BULLET = /^•\s*/;

/**
 * Renders original copy blocks. Paragraphs that start with "•" are grouped
 * into a list so they read as one; the wording itself is untouched.
 */
export function RichText({
  blocks,
  className = "",
}: {
  blocks: ContentBlock[];
  className?: string;
}) {
  const groups: ContentBlock[] = [];
  for (const block of blocks) {
    const last = groups.at(-1);
    if ("p" in block && BULLET.test(block.p)) {
      const text = block.p.replace(BULLET, "");
      if (last && "list" in last) last.list.push(text);
      else groups.push({ list: [text] });
    } else {
      groups.push("list" in block ? { list: [...block.list] } : block);
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {groups.map((block, i) =>
        "p" in block ? (
          <p key={i}>{block.p}</p>
        ) : (
          <ul key={i} className="space-y-2 pl-1">
            {block.list.map((item, j) => (
              <li key={j} className="flex gap-3">
                <span aria-hidden className="mt-[0.7em] h-1 w-1 shrink-0 rounded-full bg-caramel" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
