import type { Metadata } from "next";
import { ItemRow, ItemTable } from "../item-table";
import { PodForm } from "../pod-form";
import { PodNav } from "../pod-nav";
import { PodPanel } from "../pod-panel";
import { getSession } from "../session";
import { type StockGroup, getStockGroups } from "../stock-items";
import { addMade, addOneOffFlavour, recordSale, saveStockTake, setFlavourHidden } from "./actions";
import { type SaleGroup, SaleFields } from "./sale-fields";

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

  const [allGroups, lastTake, lastMade] = await Promise.all([
    getStockGroups(supabase, { includeHidden: true }),
    supabase.from("stock_movements").select("created_at").eq("reason", "stock_take").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("stock_movements").select("created_at").eq("reason", "made").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  const groups = allGroups
    .map((g) => ({ ...g, items: g.items.filter((i) => i.isActive) }))
    .filter((g) => g.items.length);
  const hidden = allGroups.flatMap((g) => g.items.filter((i) => !i.isActive).map((i) => ({ ...i, title: g.title })));

  return (
    <div className="space-y-3">
      <header className="space-y-6">
        <h1 className="font-script text-6xl text-gold sm:text-7xl">The Pod</h1>
        <PodNav current="/pod/stock" />
      </header>

      <PodPanel small
        title="Stock"
        hint={`Last stock take: ${when(lastTake.data?.created_at)} · Last batch added: ${when(lastMade.data?.created_at)}. Orders marked Sent come off automatically.`}
        open
      >
        <div className="space-y-3">
          {groups.map((group) => (
            <ItemTable key={group.productId} caption={group.title} headings={[itemHeading(group), "In stock"]} collapsible>
              {group.items.map((item) => (
                <ItemRow
                  key={item.id}
                  name={
                    <>
                      {item.name}
                      {item.isExtra && (
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
              ))}
            </ItemTable>
          ))}
        </div>
      </PodPanel>

      <PodPanel small title="Add what I made this week" hint="Type how many of each you made. They’re added to the stock above." open>
        <PodForm action={addMade} submitLabel="Add to stock" resetOnSuccess>
          <CountTables groups={groups} name="made" />
        </PodForm>
      </PodPanel>

      <PodPanel small title="Full stock take" hint="Count everything on the shelf. These numbers replace the stock above.">
        <PodForm action={saveStockTake} submitLabel="Save stock take" confirmMessage="Are you sure you want to make these changes?">
          <CountTables groups={groups} name="count" />
        </PodForm>
      </PodPanel>

      <PodPanel small
        title="Add a one-off flavour"
        hint="For a flavour you’re making that isn’t on the website. It appears in stock and orders, never in the shop."
      >
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

        {groups.some((g) => g.items.some((i) => i.isExtra)) && (
          <div className="mt-8 space-y-2">
            <p className="eyebrow text-cream/70">One-off flavours</p>
            {groups.flatMap((g) =>
              g.items
                .filter((i) => i.isExtra)
                .map((item) => (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 border-t border-white/10 pt-2">
                    <span>
                      {item.name} <span className="text-cream/70">· {g.title}</span>
                    </span>
                    <PodForm action={setFlavourHidden} submitLabel="Hide" variant="quiet" className="-mt-4">
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="hidden" value="true" />
                    </PodForm>
                  </div>
                )),
            )}
          </div>
        )}

        {hidden.length > 0 && (
          <div className="mt-8 space-y-2">
            <p className="eyebrow text-cream/70">Hidden flavours</p>
            {hidden.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 border-t border-white/10 pt-2">
                <span className="text-cream/70">
                  {item.name} · {item.title}
                </span>
                <PodForm action={setFlavourHidden} submitLabel="Show again" variant="quiet" className="-mt-4">
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="hidden" value="false" />
                </PodForm>
              </div>
            ))}
          </div>
        )}
      </PodPanel>

      <PodPanel small
        title="Spontaneous buy"
        hint="Someone bought without an order? Add what they took. It comes off stock and goes into order history."
      >
        <PodForm action={recordSale} submitLabel="Save and take off stock" resetOnSuccess>
          <input type="hidden" name="kind" value="spontaneous" />
          <SaleFields kind="spontaneous" groups={saleGroups(groups)} />
        </PodForm>
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

/** Sizes and flavours for the sale forms, with both prices (one-off flavours have no website price, so use wholesale). */
const saleGroups = (groups: StockGroup[]): SaleGroup[] =>
  groups.map((g) => ({
    title: g.title,
    items: g.items.map((i) => ({
      id: i.id,
      name: i.name,
      inStock: i.quantity,
      wholesale: i.wholesalePrice,
      retail: i.retailPrice ?? i.wholesalePrice,
    })),
  }));

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
          {group.items.map((item) => (
            <ItemRow
              key={item.id}
              name={item.name}
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
          ))}
        </ItemTable>
      ))}
    </div>
  );
}
