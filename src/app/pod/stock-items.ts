import "server-only";
import type { getSession } from "./session";

type Db = Awaited<ReturnType<typeof getSession>>["supabase"];

export type StockItem = {
  id: string;
  name: string;
  quantity: number;
  wholesalePrice: number;
  isExtra: boolean;
  isActive: boolean;
};

export type StockGroup = { productId: string; title: string; items: StockItem[] };

/** Stock items grouped by product (Large Bar, Small Bar, Pure Cacao), in shop order. */
export async function getStockGroups(supabase: Db, { includeHidden = false } = {}) {
  const { data, error } = await supabase
    .from("stock_items")
    .select("id, name, quantity, wholesale_price, is_extra, is_active, position, product:products(id, title, position)")
    .order("position");
  if (error) throw error;

  const groups = new Map<string, StockGroup & { position: number }>();
  for (const row of data) {
    if (!row.is_active && !includeHidden) continue;
    const product = row.product;
    if (!groups.has(product.id)) {
      groups.set(product.id, { productId: product.id, title: product.title, position: product.position, items: [] });
    }
    groups.get(product.id)!.items.push({
      id: row.id,
      name: row.name,
      quantity: row.quantity,
      wholesalePrice: Number(row.wholesale_price),
      isExtra: row.is_extra,
      isActive: row.is_active,
    });
  }
  return [...groups.values()].sort((a, b) => a.position - b.position);
}
