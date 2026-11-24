import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { formatPrice } from "@/lib/format";
import { addDays, isDate, mondayOf, shortDate, sydneyToday } from "@/lib/weeks";
import { ItemRow, ItemTable } from "../item-table";
import { PodForm } from "../pod-form";
import { PodNav } from "../pod-nav";
import { PodPanel } from "../pod-panel";
import { getSession } from "../session";
import { type StockGroup, getStockGroups, saleGroups } from "../stock-items";
import { recordSale } from "../stock/actions";
import { SaleFields } from "../stock/sale-fields";
import { deleteOrder, saveOrder, saveWeekNote, undoSale } from "./actions";
import { type OrderCustomer, type OrderGroup, OrderFields } from "./order-fields";
import { OrderStatus } from "./order-status";
import { MakeChecklist } from "./make-checklist";
import { ScrollTo } from "./scroll-to";

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
  invoice: { id: string; number: number; number_suffix: string | null } | null;
  /** Paid on the website: who bought it and how it gets to them. */
  web: WebOrder | null;
};
type WebOrder = {
  name: string;
  email: string;
  phone: string;
  address: string;
  delivery: string;
  delivery_price: number;
  total: number;
  paid_at: string;
  items: { title: string; variant: string; quantity: number; unit_price: number; label: string | null; workshop: boolean }[];
  label_fees: { label: string; amount: number }[];
};

const ORDER_COLUMNS =
  "id, customer, kind, needed_by, status, note, sent_at, lines:order_lines(stock_item_id, quantity, unit_price), invoice:invoices(id, number, number_suffix), web:web_orders(name, email, phone, address, delivery, delivery_price, total, paid_at, items, label_fees)";

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

/** The small bars' names for flavours the large bars call something else. */
const SAME_FLAVOUR: Record<string, string> = {
  "60% Goats Milk": "Goats Milk",
  "Local Roasted Hazelnut Gianduja": "Local Roasted Hazelnut Gianduja & Salt",
  "White Choc & Local Peaches": "White Choc w/ Local Peaches",
};

/**
 * The row a bar goes on in "Chocolate by flavour": 75% Dark and every 75% Dark & Local Fruit
 * (whatever the fruit) share one, as they're made from the same chocolate.
 */
function chocolateFlavour(name: string) {
  if (name === "75% Dark" || name.startsWith("75% Dark & Local Fruit")) return "75% Dark & Local Fruit (all fruit)";
  return SAME_FLAVOUR[name] ?? name;
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
        .map((i) => ({
          id: i.id,
          name: i.name,
          price: i.wholesalePrice,
          variety: i.variety,
          parentId: i.parentId,
          hasVarieties: i.hasVarieties,
        })),
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

  const { week, saved: savedParam } = await props.searchParams;
  const justSavedId = typeof savedParam === "string" ? savedParam : null;
  const today = sydneyToday();
  const thisMonday = mondayOf(today);
  const weekStart = mondayOf(typeof week === "string" && isDate(week) ? week : today);
  const weekEnd = addDays(weekStart, 6);

  const [groups, open, sent, customerRows, customerList, priceRows, weekNote, madeRows] = await Promise.all([
    getStockGroups(supabase, { includeHidden: true, includeUntracked: true }),
    supabase
      .from("orders")
      .select(ORDER_COLUMNS)
      .neq("status", "sent")
      .order("needed_by", { ascending: true, nullsFirst: false })
      .order("created_at"),
    supabase.from("orders").select(ORDER_COLUMNS).eq("status", "sent").order("sent_at", { ascending: false }).limit(30),
    supabase.from("orders").select("customer").eq("kind", "order").order("created_at", { ascending: false }).limit(500),
    supabase.from("customers").select("id, name").order("name"),
    supabase.from("customer_prices").select("customer_id, stock_item_id, price"),
    supabase.from("week_notes").select("note").eq("week_start", weekStart).maybeSingle(),
    supabase.rpc("pod_week_made", { week: weekStart }),
  ]);
  if (open.error) throw open.error;
  if (sent.error) throw sent.error;
  if (madeRows.error) throw madeRows.error;
  // How many of each are noted as made so far this week, until they're counted into stock.
  const notedMade = new Map(madeRows.data.map((m) => [m.stock_item_id, m]));
  const openOrders = open.data as Order[];
  const sentOrders = sent.data as Order[];
  // Saved customers (with their own prices), then anyone else orders have been for.
  const customers: OrderCustomer[] = (customerList.data ?? []).map((c) => ({
    name: c.name,
    prices: Object.fromEntries((priceRows.data ?? []).filter((p) => p.customer_id === c.id).map((p) => [p.stock_item_id, Number(p.price)])),
  }));
  const saved = new Set(customers.map((c) => c.name.toLowerCase()));
  for (const name of new Set((customerRows.data ?? []).map((r) => r.customer))) {
    if (!saved.has(name.toLowerCase())) customers.push({ name, prices: {} });
  }

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
  // Bars are weighed by flavour across both sizes, in their own table, rather than in each size's table.
  const BAR_SIZES = ["Large Bar", "Small Bar"];
  const flavourKg = new Map<string, { large: number; small: number }>();
  for (const g of makeList.filter((g) => BAR_SIZES.includes(g.title))) {
    for (const r of g.rows) {
      const flavour = chocolateFlavour(r.name);
      const entry = flavourKg.get(flavour) ?? { large: 0, small: 0 };
      entry[g.title === "Large Bar" ? "large" : "small"] += r.kg;
      flavourKg.set(flavour, entry);
    }
  }
  const laterOrders = openOrders.filter((o) => o.needed_by && o.needed_by > weekEnd).length;

  return (
    <div className="space-y-3">
      <header className="space-y-6">
        <h1 className="font-script text-6xl text-gold sm:text-7xl">The Pod</h1>
        <PodNav current="/pod/orders" />
      </header>

      <PodPanel small
        title={weekStart === thisMonday ? "To make this week" : "To make"}
        hint={`Week of ${shortDate(weekStart)} to ${shortDate(weekEnd)}`}
      >
        <div className="space-y-5">
          <nav aria-label="Choose a week" className="flex flex-wrap gap-2">
            <WeekLink href={`/pod/orders?week=${addDays(weekStart, -7)}`}>← Previous</WeekLink>
            {weekStart !== thisMonday && <WeekLink href="/pod/orders">This week</WeekLink>}
            <WeekLink href={`/pod/orders?week=${addDays(weekStart, 7)}`}>Next →</WeekLink>
          </nav>

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
                <MakeChecklist
                  week={weekStart}
                  groups={makeList.map((g) => ({
                    title: g.title,
                    weighed: !BAR_SIZES.includes(g.title),
                    rows: g.rows.map((r) => {
                      const note = notedMade.get(r.id);
                      return {
                        id: r.id,
                        name: r.name,
                        need: note ? Math.max(0, r.ordered - r.inStock + note.need_offset) : r.toMake,
                        made: note?.quantity ?? 0,
                        accent: !!r.base,
                        weight: formatGrams(r.kg),
                      };
                    }),
                  }))}
                />
                {flavourKg.size > 0 && (
                  <ItemTable caption="Chocolate by flavour" headings={["Flavour", "Large", "Small", "Total"]} highlight={[3]} collapsible>
                    {[...flavourKg].map(([name, kg]) => (
                      <ItemRow
                        key={name}
                        name={name}
                        highlight={[3]}
                        cells={[kg.large ? formatGrams(kg.large) : "–", kg.small ? formatGrams(kg.small) : "–", formatGrams(kg.large + kg.small)]}
                      />
                    ))}
                  </ItemTable>
                )}
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

          <PodForm key={weekStart} action={saveWeekNote} submitLabel="Save notes">
            <input type="hidden" name="week" value={weekStart} />
            <label className="block">
              <span className="eyebrow mb-2 block text-cream/70">Notes for this week</span>
              <textarea
                name="note"
                // Grows with what's written, so all of it shows (rows covers browsers without field-sizing).
                rows={Math.max(3, (weekNote.data?.note ?? "").split("\n").length + 1)}
                defaultValue={weekNote.data?.note ?? ""}
                placeholder="e.g. Council order goes out Thursday; use the new wrappers for the Christmas bundles"
                className="pod-input min-h-24 resize-y [field-sizing:content]"
              />
            </label>
          </PodForm>
        </div>
      </PodPanel>

      {plan.length > 0 && (
        <PodPanel small
          title={weekStart === thisMonday ? "This week’s orders" : "Orders for the week"}
          hint="How many of each are ordered, and how many you have."
        >
          <div className="space-y-3">
            {plan.map((g) => (
              <ItemTable
                key={g.title}
                caption={g.title}
                headings={[g.title === "Pure Cacao" ? "Size" : "Flavour", "Ordered", "In stock"]}
                collapsible
              >
                {g.rows.map((r) => (
                  <ItemRow key={r.id} name={r.name} cells={[r.ordered, r.inStock]} />
                ))}
              </ItemTable>
            ))}
          </div>
        </PodPanel>
      )}

      <PodPanel small title="New order" hint="Copy in an order from your email.">
        <PodForm action={saveOrder} submitLabel="Save order" resetOnSuccess>
          <OrderFields groups={formGroups(groups)} customers={customers} />
        </PodForm>
      </PodPanel>

      <PodPanel
        small
        title="Odd buys"
        hint="Bars that leave without an order: a spontaneous buy, a gift, personal use or staff. If they’re already made they come off stock and go into order history; if not, they go to Orders to make."
      >
        <PodForm action={recordSale} submitLabel="Save" resetOnSuccess>
          <SaleFields kind="odd" groups={saleGroups(groups)} />
        </PodForm>
      </PodPanel>

      {justSavedId && <ScrollTo id={`order-${justSavedId}`} />}
      <PodPanel
        small
        open={!!justSavedId}
        title="Orders"
        hint={`${openOrders.filter((o) => o.status === "to_make").length} to make · ${openOrders.filter((o) => o.status === "packed").length} packed · the latest ${sentOrders.length} sent. Tap an order to open it.`}
      >
        <div className="space-y-3">
          <p className="flex flex-wrap gap-x-4 gap-y-1 font-sans text-sm text-cream/80">
            {Object.entries(STATUS_STYLE).map(([status, style]) => (
              <span key={status} className="flex items-center gap-1.5">
                <span aria-hidden className={`inline-block h-3 w-5 rounded border-l-4 ${style.card}`} />
                {style.label}
              </span>
            ))}
          </p>
          {openOrders.length === 0 && sentOrders.length === 0 && <p className="text-xl text-cream/70">No orders yet.</p>}
          {openOrders.map((order) => (
            <OrderCard key={order.id} order={order} items={items} today={today} justSaved={order.id === justSavedId}>
              {/* Website orders are as paid for: changes and refunds are made in Stripe. */}
              {!order.web && (
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
              )}
            </OrderCard>
          ))}
          {sentOrders.map((order) => (
            <OrderCard key={order.id} order={order} items={items} today={today}>
              {order.kind === "order" && (
                <PodForm
                  action={deleteOrder}
                  submitLabel="Delete order"
                  variant="quiet"
                  confirmMessage={`Delete the order for ${order.customer}? Its ${itemCount(order)} items go back into stock.${order.invoice ? " Its invoice stays in your invoices." : ""}`}
                >
                  <input type="hidden" name="order_id" value={order.id} />
                </PodForm>
              )}
            </OrderCard>
          ))}
        </div>
      </PodPanel>
    </div>
  );
}

/** Each order's card is coloured by where it's up to: making (green), packed (yellow), sent (brown). */
const STATUS_STYLE: Record<string, { label: string; card: string }> = {
  to_make: { label: "To make", card: "border-l-[#5e9a4a] bg-[#dcebd2]" },
  packed: { label: "Packed", card: "border-l-[#e0a92c] bg-[#fcefc4]" },
  sent: { label: "Sent", card: "border-l-[#8a5226] bg-[#ead8c4]" },
};

/** Sales recorded without an order, by kind. */
const SALE_KINDS: Record<string, string | undefined> = {
  spontaneous: "Spontaneous buy",
  gift: "Gift",
  personal: "Personal use",
  staff: "Staff",
  market: "Market",
};

function OrderCard({
  order,
  items,
  today,
  justSaved = false,
  children,
}: {
  order: Order;
  items: Map<string, { name: string; group: string }>;
  today: string;
  /** Just added: shown opened up and outlined, and scrolled to. */
  justSaved?: boolean;
  children?: React.ReactNode;
}) {
  const overdue = order.status !== "sent" && order.needed_by && order.needed_by < today;
  const sale = SALE_KINDS[order.kind];
  const { web } = order;
  return (
    <details
      id={`order-${order.id}`}
      open={justSaved}
      className={`group scroll-mt-6 rounded-2xl border border-l-[6px] border-white/15 ${STATUS_STYLE[order.status]?.card ?? "bg-cacao-800/60"} ${justSaved ? "ring-2 ring-[#efb94f]" : ""}`}
    >
      <summary className="cursor-pointer list-none px-4 py-3 sm:px-5 [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h3 className="text-xl text-gold">
            {order.customer}
            {((sale && order.customer !== sale) || web) && (
              <span className="eyebrow ml-3 rounded-full border border-white/20 px-2 py-0.5 align-middle text-[0.65rem] text-cream/70">
                {web ? "Website" : sale}
              </span>
            )}
          </h3>
          <p className="flex items-baseline gap-3 font-sans text-base">
            {formatPrice(web ? Number(web.total) : orderTotal(order))}
            <span aria-hidden className="text-base text-cream/70 transition-transform group-open:rotate-180">
              ▾
            </span>
          </p>
        </div>
        <p className="mt-1 text-cream/80">
          {order.status === "sent" && order.sent_at
            ? `${sale ? "Sold" : "Sent"} ${new Date(order.sent_at).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "short" })}`
            : web
              ? `Paid ${new Date(web.paid_at).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "short" })} · ${web.delivery || "Workshop tickets"}`
              : order.needed_by
                ? `Needed by ${shortDate(order.needed_by)}`
                : "No date set"}
          {overdue && <span className="eyebrow ml-3 rounded-full bg-gold/15 px-2 py-0.5 text-gold">Overdue</span>}
        </p>
      </summary>
      <div className="px-4 pb-4 sm:px-6 sm:pb-6">
        {!sale && (
          <div>
            <OrderStatus orderId={order.id} status={order.status} itemCount={itemCount(order)} invoice={order.invoice} paidOnline={!!web} />
          </div>
        )}

        {web && <WebOrderDetails web={web} />}

        <div className={sale ? "" : "mt-4"}>
          <ItemTable headings={["Item", "Qty", "Each", "Total"]} columnWidth="w-28">
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
      </div>
    </details>
  );
}

function WeekLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="eyebrow rounded-full border border-white/20 px-4 py-2 text-cream/70 hover:border-gold hover:text-gold">
      {children}
    </Link>
  );
}

/** A website order's customer, delivery and everything bought (personalised labels and workshop tickets included). */
function WebOrderDetails({ web }: { web: WebOrder }) {
  return (
    <div className="mt-4 grid gap-4 font-sans text-sm sm:grid-cols-2">
      <div className="space-y-1">
        <p className="eyebrow text-xs text-cream/70">Customer</p>
        <p className="text-base">{web.name || "No name given"}</p>
        {web.email && (
          <a href={`mailto:${web.email}`} className="block underline decoration-white/30 underline-offset-2 hover:text-gold">
            {web.email}
          </a>
        )}
        {web.phone && (
          <a href={`tel:${web.phone}`} className="block underline decoration-white/30 underline-offset-2 hover:text-gold">
            {web.phone}
          </a>
        )}
      </div>
      <div className="space-y-1">
        <p className="eyebrow text-xs text-cream/70">{web.delivery || "Delivery"}</p>
        <p className="text-base">{web.address || (web.delivery ? "Picking up" : "Nothing to send")}</p>
        {web.delivery && <p className="text-cream/70">{Number(web.delivery_price) ? formatPrice(Number(web.delivery_price)) : "Free"}</p>}
      </div>
      <ul className="space-y-1 sm:col-span-2">
        {web.items.map((item, i) => (
          <li key={i}>
            {item.quantity} × {item.title} – {item.variant}
            {item.label && <span className="text-gold"> · label “{item.label}”</span>}
          </li>
        ))}
        {web.label_fees.map((fee) => (
          <li key={fee.label} className="text-cream/70">
            Personalised label “{fee.label}” · {formatPrice(fee.amount)}
          </li>
        ))}
      </ul>
    </div>
  );
}
