import "server-only";
import type { getSession } from "./session";

type Db = Awaited<ReturnType<typeof getSession>>["supabase"];

export type StockItem = {
  id: string;
  name: string;
  quantity: number;
  wholesalePrice: number;
  /** The website price, for market sales; one-off flavours have none. */
  retailPrice: number | null;
  isExtra: boolean;
  isActive: boolean;
  /** Grams of base chocolate in one, when it differs from the size's usual weight. */
  chocolateGrams: number | null;
  /** The chocolate it's made from (e.g. "75% Dark"), totalled together in the weekly plan. */
  baseChocolate: string | null;
  /** Takes a variety named in each order, e.g. Local Fruit (Fig, Mandarin, …). */
  hasVarieties: boolean;
  /** For a variety: the item it belongs to, and the variety on its own ("Fig"). `name` reads in full. */
  parentId: string | null;
  variety: string | null;
};

export type StockGroup = { productId: string; title: string; items: StockItem[] };

/** Stock items grouped by product (Large Bar, Small Bar, Pure Cacao), in shop order. */
export async function getStockGroups(supabase: Db, { includeHidden = false } = {}) {
  const { data, error } = await supabase
    .from("stock_items")
    .select("id, name, quantity, wholesale_price, is_extra, is_active, position, chocolate_grams, base_chocolate, has_varieties, parent_id, product:products(id, title, position), variant:product_variants(price)")
    .order("position");
  if (error) throw error;

  const names = new Map(data.map((row) => [row.id, row.name]));
  const groups = new Map<string, StockGroup & { position: number }>();
  for (const row of data) {
    if (!row.is_active && !includeHidden) continue;
    const product = row.product;
    if (!groups.has(product.id)) {
      groups.set(product.id, { productId: product.id, title: product.title, position: product.position, items: [] });
    }
    groups.get(product.id)!.items.push({
      id: row.id,
      name: row.parent_id ? `${names.get(row.parent_id) ?? ""}: ${row.name}` : row.name,
      quantity: row.quantity,
      wholesalePrice: Number(row.wholesale_price),
      retailPrice: row.variant ? Number(row.variant.price) : null,
      isExtra: row.is_extra,
      isActive: row.is_active,
      chocolateGrams: row.chocolate_grams,
      baseChocolate: row.base_chocolate,
      hasVarieties: row.has_varieties,
      parentId: row.parent_id,
      variety: row.parent_id ? row.name : null,
    });
  }
  // Varieties sit straight after the item they belong to, in name order.
  for (const group of groups.values()) {
    const varieties = group.items.filter((i) => i.parentId).sort((a, b) => a.name.localeCompare(b.name));
    const ordered: StockItem[] = [];
    for (const item of group.items.filter((i) => !i.parentId)) {
      ordered.push(item, ...varieties.filter((v) => v.parentId === item.id));
    }
    ordered.push(...varieties.filter((v) => !ordered.includes(v)));
    group.items = ordered;
  }
  return [...groups.values()].sort((a, b) => a.position - b.position);
}
