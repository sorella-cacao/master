import type { Metadata } from "next";
import { Fragment } from "react";
import { ItemName, ItemRow, ItemTable, SectionRow } from "../item-table";
import { PodForm } from "../pod-form";
import { PodNav } from "../pod-nav";
import { PodPanel } from "../pod-panel";
import { getSession } from "../session";
import { type StockGroup, getStockGroups, saleGroups } from "../stock-items";
import { addMade, addOneOffFlavour, addToMainStock, recordSale, saveStockTake } from "./actions";
import { SaleFields } from "./sale-fields";
import { ShopSales } from "./shop-sales";
import { getShops } from "./shops";
import { SleepButton } from "./sleep-button";

export const metadata: Metadata = { title: "Stock" };

function when(iso: string | undefined) {
  if (!iso) return "never";
  return new Date(iso).toLocaleDateString("en-AU", {
    timeZone: "Australia/Sydney",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export default async function StockPage() {
  const { supabase, email, isAdmin } = await getSession();
  if (!isAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="font-script text-6xl text-gold">The Pod</h1>
        <p className="mt-6 text-xl">{email ?? "This account"} doesn’t have access to the Pod yet.</p>
      </div>
    );
  }

  const [allGroups, shops, lastTake, lastMade] = await Promise.all([
    getStockGroups(supabase, { includeHidden: true }),
    getShops(supabase),
    supabase.from("stock_movements").select("created_at").eq("reason", "stock_take").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("stock_movements").select("created_at").eq("reason", "made").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const groups = allGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.isActive) }))
    .filter((g) => g.items.length);
  const asleep = allGroups.reduce((n, g) => n + g.items.filter((i) => !i.isActive).length, 0);

  return (
    <div className="space-y-3">
      <header className="space-y-6">
        <h1 className="font-script text-6xl text-gold sm:text-7xl">The Pod</h1>
        <PodNav current="/pod/stock" />
      </header>

      <PodPanel small
        title="Stock"
        hint={`Last stock take: ${when(lastTake.data?.created_at)} · Last batch added: ${when(lastMade.data?.created_at)}. Orders marked Sent come off automatically.`}
      >
        <div className="space-y-3">
          {groups.map((group) => (
            <ItemTable key={group.productId} caption={group.title} headings={[itemHeading(group), "In stock"]} collapsible>
              {group.items.map((item, i) => (
                <Fragment key={item.id}>
                <SectionRow item={item} previous={group.items[i - 1]} columns={2} />
                <ItemRow
                  name={
                    <>
                      <ItemName item={item} />
                      {item.isExtra && !item.parentId && (
                        <span className="eyebrow ml-2 rounded-full border border-white/20 px-2 py-0.5 text-[0.65rem] text-cream/70">
                          One-off
                        </span>
                      )}
                    </>
                  }
                  cells={[
                    <span key="qty" className={item.quantity < 0 ? "text-gold" : ""}>
                      {item.quantity}
                    </span>,
                  ]}
                />
                </Fragment>
              ))}
            </ItemTable>
          ))}
        </div>
      </PodPanel>

      {shops.length > 0 && (
        <PodPanel
          small
          title="With shops"
          hint="Sale or return: stock shops have now and pay for once it’s sold. Open an order, tick what’s sold, then invoice it."
        >
          <div className="space-y-8">
            {shops.map((shop) => (
              <section key={shop.id} className="space-y-3">
                <h3 className="text-xl text-gold">{shop.name}</h3>
                <ShopSales customerId={shop.id} name={shop.name} orders={shop.orders} />
              </section>
            ))}
          </div>
        </PodPanel>
      )}

      <PodPanel small title="Add what I made this week" hint="Type how many of each you made. They’re added to the stock above. What’s marked as made in Orders isn’t in stock until it’s added here.">
        <PodForm action={addMade} submitLabel="Add to stock" resetOnSuccess>
          <CountTables groups={groups} name="made" />
        </PodForm>
      </PodPanel>

      <PodPanel small title="Full stock take" hint="Count everything on the shelf. These numbers replace the stock above.">
        <PodForm action={saveStockTake} submitLabel="Save stock take" confirmMessage="Are you sure you want to make these changes?"
          confirmDetail="These amounts will override your full stock amounts.">
          <CountTables groups={groups} name="count" />
        </PodForm>
      </PodPanel>

      <PodPanel small
        title="Flavour list"
        hint={`Put a flavour to sleep to take it out of stock and labels, and wake it to bring it back.${asleep ? ` ${asleep} asleep.` : ""}`}
      >
        <div className="mb-8 space-y-3">
          {allGroups.map((group) => (
            <ItemTable key={group.productId} caption={group.title} headings={[itemHeading(group), "In stock", "Sleep"]} columnWidth="w-20 sm:w-28" collapsible>
              {group.items.map((item, i) => (
                <Fragment key={item.id}>
                <SectionRow item={item} previous={group.items[i - 1]} columns={3} />
                <ItemRow
                  name={
                    <span className={item.isActive ? "" : "text-cream/50"}>
                      <ItemName item={item} />
                      {!item.isActive && (
                        <span className="eyebrow ml-2 rounded-full border border-white/20 px-2 py-0.5 text-[0.65rem]">Asleep</span>
                      )}
                    </span>
                  }
                  cells={[
                    item.quantity,
                    // A fruit sleeps and wakes with Local Fruit while that's asleep.
                    item.sleepsWithParent ? (
                      "–"
                    ) : (
                      <SleepButton key="sleep" id={item.id} name={`${item.name} (${group.title})`} asleep={!item.isActive} inStock={item.quantity} />
                    ),
                  ]}
                />
                </Fragment>
              ))}
            </ItemTable>
          ))}
        </div>

        <h3 className="mb-1 text-xl">Add a one-off flavour</h3>
        <p className="mb-4 text-cream/70">For a flavour you’re making that isn’t on the website. It appears in stock and orders, never in the shop.</p>
        <PodForm action={addOneOffFlavour} submitLabel="Add flavour" resetOnSuccess>
          <div className="grid gap-4 sm:grid-cols-[12rem_1fr]">
            <label className="block">
              <span className="eyebrow mb-2 block text-cream/70">Size</span>
              <select name="product_id" className="pod-input">
                {groups.map((g) => (
                  <option key={g.productId} value={g.productId}>
                    {g.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="eyebrow mb-2 block text-cream/70">Flavour</span>
              <input name="name" required placeholder="e.g. 75% Dark & Local Figs" className="pod-input" />
            </label>
          </div>
        </PodForm>

        {groups.some((g) => g.items.some((i) => i.isExtra && !i.parentId)) && (
          <div className="mt-8 space-y-2">
            <p className="eyebrow text-cream/70">One-off flavours</p>
            {groups.flatMap((g) =>
              g.items
                .filter((i) => i.isExtra && !i.parentId)
                .map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 border-t border-white/10 pt-2">
                    <span>
                      {item.name} <span className="text-cream/70">· {g.title}</span>
                    </span>
                    <span className="flex flex-wrap gap-x-3">
                      <PodForm
                        action={addToMainStock}
                        submitLabel="Add to main stock"
                        variant="quiet"
                        className="-mt-4"
                        confirmMessage={`Make ${item.name} (${g.title}) part of your main stock?`}
                      >
                        <input type="hidden" name="id" value={item.id} />
                      </PodForm>
                    </span>
                  </div>
                )),
            )}
          </div>
        )}
      </PodPanel>

      <PodPanel small title="Market" hint="Add what sold at a market. It comes off stock and goes into order history.">
        <PodForm action={recordSale} submitLabel="Save and take off stock" resetOnSuccess>
          <input type="hidden" name="kind" value="market" />
          <SaleFields kind="market" groups={saleGroups(groups)} />
        </PodForm>
      </PodPanel>
    </div>
  );
}

const itemHeading = (group: StockGroup) => (group.title === "Pure Cacao" ? "Size" : "Flavour");

/** A table per size with a number box on every item's row. */
function CountTables({ groups, name }: { groups: StockGroup[]; name: "made" | "count" }) {
  const isCount = name === "count";
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <ItemTable
          key={group.productId}
          caption={group.title}
          headings={[itemHeading(group), isCount ? "Was" : "In stock", isCount ? "Count now" : "Made"]}
          columnWidth="w-28"
          collapsible
        >
          {group.items.map((item, i) => (
            <Fragment key={item.id}>
            <SectionRow item={item} previous={group.items[i - 1]} columns={3} />
            <ItemRow
              name={<ItemName item={item} />}
              cells={[
                item.quantity,
                <input
                  key="box"
                  type="number"
                  name={`${name}:${item.id}`}
                  min="0"
                  step="1"
                  inputMode="numeric"
                  placeholder={isCount ? undefined : "0"}
                  defaultValue={isCount ? Math.max(item.quantity, 0) : undefined}
                  aria-label={`${group.title} ${item.name}`}
                  className="pod-input w-20 px-2 py-1 text-right text-sm"
                />,
              ]}
            />
            </Fragment>
          ))}
        </ItemTable>
      ))}
    </div>
  );
}
