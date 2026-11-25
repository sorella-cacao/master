import "server-only";
import type { getSession } from "../session";
import { getStockGroups } from "../stock-items";
import type { Label } from "./label-data";

type Db = Awaited<ReturnType<typeof getSession>>["supabase"];

/**
 * How many of each label to print for what's been made in a week (by label id), and anything made that
 * has no label. A local fruit without its own label link is matched by name: "75% Dark & Local Plum".
 */
export async function labelsForMade(supabase: Db, labels: Label[], week: string) {
  const [made, groups] = await Promise.all([
    supabase.rpc("pod_made", { week }),
    getStockGroups(supabase, { includeHidden: true, includeUntracked: true }),
  ]);
  if (made.error) throw made.error;
  const items = new Map(groups.flatMap((g) => g.items.map((i) => [i.id, { ...i, group: g.title }] as const)));

  const copies: Record<string, string> = {};
  const missing: string[] = [];
  for (const { stock_item_id, quantity } of made.data) {
    const item = items.get(stock_item_id);
    const size = item?.group === "Large Bar" ? "large" : item?.group === "Small Bar" ? "small" : null;
    const fruit = item?.variety && size ? `${items.get(item.parentId!)?.name.replace("Fruit", item.variety)}`.toLowerCase() : null;
    const label =
      labels.find((l) => l.stockItemId === stock_item_id) ??
      (fruit ? labels.find((l) => !l.stockItemId && l.size === size && [fruit, `${fruit}s`].includes(l.name.toLowerCase())) : undefined);
    if (label) copies[label.id] = String(Number(copies[label.id] ?? 0) + quantity);
    else missing.push(`${item ? `${item.name} · ${item.group}` : "Unknown flavour"} (${quantity})`);
  }
  return { copies, missing };
}
