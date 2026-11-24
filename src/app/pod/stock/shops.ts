import "server-only";
import type { getSession } from "../session";
import { getStockGroups } from "../stock-items";
import type { ShopOrder } from "./shop-sales";

type Db = Awaited<ReturnType<typeof getSession>>["supabase"];

export type Shop = { id: string; name: string; orders: ShopOrder[] };

/** Sale-or-return shops with stock they haven't been invoiced for yet, oldest order first, however long ago it was sent. */
export async function getShops(supabase: Db): Promise<Shop[]> {
  const [{ data, error }, groups] = await Promise.all([
    supabase
      .from("orders")
      .select(
        "id, sent_at, invoice:invoices!invoices_order_id_fkey(id), shop:customers!orders_customer_id_fkey!inner(id, name, sale_or_return), lines:order_lines(id, stock_item_id, quantity, unit_price, sales:consignment_sales(quantity, invoice_id))",
      )
      .eq("status", "sent")
      .eq("shop.sale_or_return", true)
      .order("sent_at", { ascending: true }),
    getStockGroups(supabase, { includeHidden: true, includeUntracked: true }),
  ]);
  if (error) throw error;

  const order = groups.flatMap((g) => g.items.map((i) => i.id));
  const items = new Map(groups.flatMap((g) => g.items.map((i) => [i.id, { name: i.name, group: g.title }] as const)));
  const shops = new Map<string, Shop>();
  for (const o of data) {
    if (o.invoice) continue; // Invoiced in full, before the shop was sale or return.
    const lines = o.lines
      .toSorted((a, b) => order.indexOf(a.stock_item_id) - order.indexOf(b.stock_item_id))
      .map((l) => {
        const count = (invoiced: boolean) => l.sales.filter((s) => (s.invoice_id !== null) === invoiced).reduce((n, s) => n + s.quantity, 0);
        const item = items.get(l.stock_item_id);
        return {
          id: l.id,
          name: item?.name ?? "Unknown item",
          group: item?.group ?? "Other",
          quantity: l.quantity,
          invoiced: count(true),
          sold: count(false),
          price: Number(l.unit_price),
        };
      });
    if (lines.every((l) => l.invoiced >= l.quantity)) continue;
    const sent = o.sent_at
      ? `Sent ${new Date(o.sent_at).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "short" })}`
      : "Sent";
    const shop = shops.get(o.shop.id) ?? { id: o.shop.id, name: o.shop.name, orders: [] };
    shop.orders.push({ id: o.id, sent, lines });
    shops.set(o.shop.id, shop);
  }
  return [...shops.values()];
}
