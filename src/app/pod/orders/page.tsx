import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { formatPrice } from "@/lib/format";
import { addDays, isDate, mondayOf, shortDate, sydneyToday } from "@/lib/weeks";
import { ItemRow, ItemTable } from "../item-table";
import { PodForm } from "../pod-form";
import { PodNav } from "../pod-nav";
import { getSession } from "../session";
import { type StockGroup, getStockGroups } from "../stock-items";
import { deleteOrder, saveOrder, undoSale } from "./actions";
import { type OrderGroup, OrderFields } from "./order-fields";
import { OrderStatus } from "./order-status";

export const metadata: Metadata = { title: "Orders" };

type Line = { stock_item_id: string; quantity: number; unit_price: number };
type Order = {
  id: string;
  customer: string;
  kind: string;
  needed_by: string | null;
  status: string;
  note: string | null;
  sent_at: string | null;
  lines: Line[];
};

const ORDER_COLUMNS = "id, customer, kind, needed_by, status, note, sent_at, lines:order_lines(stock_item_id, quantity, unit_price)";

/**
 * Chocolate in one item, in kg: its own amount when set (e.g. 90g of 75% Dark in a mandarin bar),
 * otherwise bars by size and Pure Cacao by its size name (e.g. "250g", "1kg").
 */
function itemKg(groupTitle: string, itemName: string, chocolateGrams: number | null) {
  if (chocolateGrams) return chocolateGrams / 1000;
  if (groupTitle === "Large Bar") return 0.1;
  if (groupTitle === "Small Bar") return 0.05;
  const size = itemName.trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(kg|g)$/);
  if (!size) return 0;
  return size[2] === "kg" ? Number(size[1]) : Number(size[1]) / 1000;
}

const formatKg = (kg: number) => kg.toLocaleString("en-AU", { maximumFractionDigits: 2 });

/** "600g", or "1,980g" for larger amounts. */
const formatGrams = (kg: number) => `${Math.round(kg * 1000).toLocaleString("en-AU")}g`;

const orderTotal = (order: Order) => order.lines.reduce((sum, l) => sum + l.quantity * Number(l.unit_price), 0);
const itemCount = (order: Order) => order.lines.reduce((sum, l) => sum + l.quantity, 0);

/** Order form groups: the active items, plus any hidden ones already on this order. */
function formGroups(groups: StockGroup[], order?: Order): OrderGroup[] {
  const onOrder = new Set(order?.lines.map((l) => l.stock_item_id));
  return groups
    .map((g) => ({
      title: g.title,
      items: g.items
        .filter((i) => i.isActive || onOrder.has(i.id))
        .map((i) => ({ id: i.id, name: i.name, price: i.wholesalePrice })),
    }))
    .filter((g) => g.items.length);
}

export default async function OrdersPage(props: PageProps<"/pod/orders">) {
  const { supabase, email, isAdmin } = await getSession();
  if (!isAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="font-script text-6xl text-gold">The Pod</h1>
        <p className="mt-6 text-xl">{email ?? "This account"} doesn’t have access to the Pod yet.</p>
      </div>
    );
  }

  const { week } = await props.searchParams;
  const today = sydneyToday();
  const thisMonday = mondayOf(today);
  const weekStart = mondayOf(typeof week === "string" && isDate(week) ? week : today);
  const weekEnd = addDays(weekStart, 6);

  const [groups, open, sent, customerRows] = await Promise.all([
    getStockGroups(supabase, { includeHidden: true }),
    supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .neq("status", "sent")
      .order("needed_by", { ascending: true, nullsFirst: false })
      .order("created_at"),
    supabase.from("orders").select(ORDER_COLUMNS).eq("status", "sent").order("sent_at", { ascending: false }).limit(30),
    supabase.from("orders").select("customer").eq("kind", "order").order("created_at", { ascending: false }).limit(500),
  ]);
  if (open.error) throw open.error;
  if (sent.error) throw sent.error;
  const openOrders = open.data as Order[];
  const sentOrders = sent.data as Order[];
  const customers = [...new Set((customerRows.data ?? []).map((r) => r.customer))].sort();

  const items = new Map(groups.flatMap((g) => g.items.map((i) => [i.id, { ...i, group: g.title }] as const)));

  // What's needed by the end of the chosen week: every order not yet sent, overdue ones included.
  const ordered = new Map<string, number>();
  for (const order of openOrders) {
    if (order.needed_by && order.needed_by > weekEnd) continue;
    for (const line of order.lines) ordered.set(line.stock_item_id, (ordered.get(line.stock_item_id) ?? 0) + line.quantity);
  }
  const plan = groups
    .map((g) => ({
      title: g.title,
      rows: g.items
        .filter((i) => ordered.has(i.id))
        .map((i) => {
          const need = ordered.get(i.id)!;
          const toMake = Math.max(0, need - Math.max(i.quantity, 0));
          const kg = toMake * itemKg(g.title, i.name, i.chocolateGrams);
          return { id: i.id, name: i.name, base: i.baseChocolate, ordered: need, inStock: i.quantity, toMake, kg };
        })
        // Flavours made from a shared chocolate (e.g. 75% Dark) go last, so they can be totalled together.
        .sort((a, b) => Number(!!a.base) - Number(!!b.base) || (a.base ?? "").localeCompare(b.base ?? "")),
    }))
    .filter((g) => g.rows.length);
  const totalToMake = plan.reduce((n, g) => n + g.rows.reduce((m, r) => m + r.toMake, 0), 0);
  const totalKg = plan.reduce((n, g) => n + g.rows.reduce((m, r) => m + r.kg, 0), 0);

  // Total chocolate per base (e.g. 75% Dark) across all sizes, for the summary line.
  const baseKg = new Map<string, number>();
  for (const r of plan.flatMap((g) => g.rows)) {
    if (r.base) baseKg.set(r.base, (baseKg.get(r.base) ?? 0) + r.kg);
  }
  // Just what still needs making.
  const makeList = plan
    .map((g) => ({ ...g, rows: g.rows.filter((r) => r.toMake > 0) }))
    .filter((g) => g.rows.length);
  const laterOrders = openOrders.filter((o) => o.needed_by && o.needed_by > weekEnd).length;

  return (
    <div className="space-y-12">
      <header className="space-y-6">
        <h1 className="font-script text-6xl text-gold sm:text-7xl">The Pod</h1>
        <PodNav current="/pod/orders" />
      </header>

      <section aria-labelledby="make-heading" className="space-y-5 rounded-2xl border-2 border-[#efb94f] bg-cacao-950/40 p-6 sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 id="make-heading" className="text-4xl">
              {weekStart === thisMonday ? "To make this week" : "To make"}
            </h2>
            <p className="mt-1 text-cream/70">
              Week of {shortDate(weekStart)} to {shortDate(weekEnd)}
            </p>
          </div>
          <nav aria-label="Choose a week" className="flex flex-wrap gap-2">
            <WeekLink href={`/pod/orders?week=${addDays(weekStart, -7)}`}>← Previous</WeekLink>
            {weekStart !== thisMonday && <WeekLink href="/pod/orders">This week</WeekLink>}
            <WeekLink href={`/pod/orders?week=${addDays(weekStart, 7)}`}>Next →</WeekLink>
          </nav>
        </div>

        {plan.length === 0 ? (
          <p className="text-xl text-cream/80">Nothing ordered for this week yet.</p>
        ) : makeList.length === 0 ? (
          <p className="text-xl text-cream/80">You have enough stock for everything ordered.</p>
        ) : (
          <>
            {baseKg.size > 0 && (
              <p className="flex flex-wrap items-center gap-2 font-sans text-sm text-cream/80">
                <span aria-hidden className="inline-block h-4 w-6 rounded border border-[#c98557] bg-[#e7b28e]" />
                Made from {[...baseKg.keys()].join(" and ")} chocolate
              </p>
            )}
            <div className="space-y-3">
              {makeList.map((g) => (
                <ItemTable
                  key={g.title}
                  caption={g.title}
                  headings={[g.title === "Pure Cacao" ? "Size" : "Flavour", "To make", "Weight"]}
                  highlight={[1, 2]}
                  columnWidth="w-24"
                  compact
                >
                  {g.rows.map((r, index) => (
                    <Fragment key={r.id}>
                      <ItemRow name={r.name} highlight={[1, 2]} compact accent={!!r.base} cells={[r.toMake, formatGrams(r.kg)]} />
                      {r.base && g.rows[index + 1]?.base !== r.base && (
                        <tr className="border-t-2 border-[#c98557]">
                          <td aria-hidden />
                          <th scope="row" className="whitespace-nowrap bg-[#e7b28e] px-2 py-1 text-right font-sans text-[0.7rem] font-semibold">
                            {r.base} total
                          </th>
                          <td className="bg-[#d9966a] px-3 py-1 text-right font-semibold tabular-nums">
                            {formatGrams(g.rows.filter((x) => x.base === r.base).reduce((n, x) => n + x.kg, 0))}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </ItemTable>
              ))}
            </div>
            <p className="font-sans text-lg">
              Make <strong className="text-gold">{totalToMake}</strong> in total, which is{" "}
              <strong className="text-gold">{formatKg(totalKg)} kg</strong> of chocolate
              {[...baseKg].map(([base, kg], i) => (
                <Fragment key={base}>
                  {i === 0 ? ", including " : " and "}
                  <strong className="text-gold">{formatKg(kg)} kg</strong> of {base}
                </Fragment>
              ))}
              .
            </p>
          </>
        )}
        <p className="text-base text-cream/70">
          Counts every order not yet sent that’s needed by {shortDate(weekEnd)}, including overdue ones.
          {laterOrders > 0 && ` ${laterOrders} later ${laterOrders === 1 ? "order isn’t" : "orders aren’t"} included yet.`}
        </p>
      </section>

      {plan.length > 0 && (
        <section aria-labelledby="plan-heading" className="space-y-5 rounded-2xl border border-white/10 bg-cacao-950/40 p-6 sm:p-8">
          <h2 id="plan-heading" className="text-4xl">
            {weekStart === thisMonday ? "This week’s orders" : "Orders for the week"}
          </h2>
          <div className="space-y-3">
            {plan.map((g) => (
              <ItemTable
                key={g.title}
                caption={g.title}
                headings={[g.title === "Pure Cacao" ? "Size" : "Flavour", "Ordered", "In stock"]}
                columnWidth="w-24"
                compact
              >
                {g.rows.map((r) => (
                  <ItemRow key={r.id} name={r.name} compact cells={[r.ordered, r.inStock]} />
                ))}
              </ItemTable>
            ))}
          </div>
        </section>
      )}

      <details open={openOrders.length === 0} className="rounded-2xl border border-white/10 bg-cacao-950/40">
        <summary className="cursor-pointer p-6 sm:px-8">
          <span className="text-3xl">New order</span>
          <span className="mt-1 block text-base text-cream/70">Copy in an order from your email.</span>
        </summary>
        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <PodForm action={saveOrder} submitLabel="Save order" resetOnSuccess>
            <OrderFields groups={formGroups(groups)} customers={customers} />
          </PodForm>
        </div>
      </details>

      <section aria-labelledby="open-heading" className="space-y-5">
        <h2 id="open-heading" className="text-4xl">
          Orders
        </h2>
        {openOrders.length === 0 && <p className="text-xl text-cream/70">No orders waiting.</p>}
        {openOrders.map((order) => (
          <OrderCard key={order.id} order={order} items={items} today={today}>
            <details className="mt-5 border-t border-white/10 pt-4">
              <summary className="eyebrow cursor-pointer text-cream/70 hover:text-gold">Edit order</summary>
              <div className="mt-4">
                <PodForm action={saveOrder} submitLabel="Save changes">
                  <input type="hidden" name="order_id" value={order.id} />
                  <OrderFields
                    groups={formGroups(groups, order)}
                    customers={customers}
                    initial={{
                      customer: order.customer,
                      neededBy: order.needed_by,
                      note: order.note,
                      quantities: Object.fromEntries(order.lines.map((l) => [l.stock_item_id, l.quantity])),
                      prices: Object.fromEntries(order.lines.map((l) => [l.stock_item_id, Number(l.unit_price)])),
                    }}
                  />
                </PodForm>
                <PodForm
                  action={deleteOrder}
                  submitLabel="Delete order"
                  variant="quiet"
                  confirmMessage={`Delete the order for ${order.customer}? This can’t be undone.`}
                >
                  <input type="hidden" name="order_id" value={order.id} />
                </PodForm>
              </div>
            </details>
          </OrderCard>
        ))}
      </section>

      {sentOrders.length > 0 && (
        <details className="rounded-2xl border border-white/10 bg-cacao-950/40">
          <summary className="cursor-pointer p-6 sm:px-8">
            <span className="text-3xl">Order history</span>
            <span className="mt-1 block text-base text-cream/70">
              The latest {sentOrders.length} sent orders, spontaneous buys and market sales.
            </span>
          </summary>
          <div className="space-y-5 px-6 pb-6 sm:px-8 sm:pb-8">
            {sentOrders.map((order) => (
              <OrderCard key={order.id} order={order} items={items} today={today} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

/** Sales recorded without an order, by kind. */
const SALE_KINDS: Record<string, string | undefined> = { spontaneous: "Spontaneous buy", market: "Market" };

function OrderCard({
  order,
  items,
  today,
  children,
}: {
  order: Order;
  items: Map<string, { name: string; group: string }>;
  today: string;
  children?: React.ReactNode;
}) {
  const overdue = order.status !== "sent" && order.needed_by && order.needed_by < today;
  const sale = SALE_KINDS[order.kind];
  return (
    <article className="rounded-2xl border border-white/10 bg-cacao-950/40 p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h3 className="text-3xl text-gold">
          {order.customer}
          {sale && order.customer !== sale && (
            <span className="eyebrow ml-3 rounded-full border border-white/20 px-2 py-0.5 align-middle text-[0.65rem] text-cream/70">
              {sale}
            </span>
          )}
        </h3>
        <p className="font-sans text-lg">{formatPrice(orderTotal(order))}</p>
      </div>
      <p className="mt-1 text-cream/80">
        {order.status === "sent" && order.sent_at
          ? `${sale ? "Sold" : "Sent"} ${new Date(order.sent_at).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "short" })}`
          : order.needed_by
            ? `Needed by ${shortDate(order.needed_by)}`
            : "No date set"}
        {overdue && <span className="eyebrow ml-3 rounded-full bg-gold/15 px-2 py-0.5 text-gold">Overdue</span>}
      </p>

      {!sale && (
        <div className="mt-4">
          <OrderStatus orderId={order.id} status={order.status} itemCount={itemCount(order)} />
        </div>
      )}

      <div className="mt-4">
        <ItemTable headings={["Item", "Qty", "Each", "Total"]}>
          {order.lines.map((line) => {
            const item = items.get(line.stock_item_id);
            return (
              <ItemRow
                key={line.stock_item_id}
                name={
                  <>
                    {item?.name ?? "Unknown item"} <span className="text-cream/70">· {item?.group}</span>
                  </>
                }
                cells={[
                  line.quantity,
                  formatPrice(Number(line.unit_price)),
                  formatPrice(line.quantity * Number(line.unit_price)),
                ]}
              />
            );
          })}
        </ItemTable>
      </div>
      {order.note && <p className="mt-3 italic text-cream/80">{order.note}</p>}
      {sale && (
        <PodForm
          action={undoSale}
          submitLabel="Undo this sale"
          variant="quiet"
          confirmMessage={`Remove this ${sale.toLowerCase()}? Its ${itemCount(order)} items go back into stock.`}
        >
          <input type="hidden" name="order_id" value={order.id} />
        </PodForm>
      )}
      {children}
    </article>
  );
}

function WeekLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="eyebrow rounded-full border border-white/20 px-4 py-2 text-cream/70 hover:border-gold hover:text-gold">
      {children}
    </Link>
  );
}
