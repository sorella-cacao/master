import type { Metadata } from "next";
import { formatPrice } from "@/lib/format";
import { ItemRow, ItemTable } from "../item-table";
import { PodForm } from "../pod-form";
import { PodNav } from "../pod-nav";
import { PodPanel } from "../pod-panel";
import { getSession } from "../session";
import { getStockGroups } from "../stock-items";
import { addCustomer, deleteCustomer, saveCustomer } from "./actions";

export const metadata: Metadata = { title: "Customers" };

type Customer = {
  id: string;
  name: string;
  contact: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  invoice_postage: boolean;
  invoice_variety: boolean;
  next_invoice_number: number;
};

export default async function CustomersPage() {
  const { supabase, email, isAdmin } = await getSession();
  if (!isAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="font-script text-6xl text-gold">The Pod</h1>
        <p className="mt-6 text-xl">{email ?? "This account"} doesn’t have access to the Pod yet.</p>
      </div>
    );
  }

  const [groups, list, priceRows] = await Promise.all([
    getStockGroups(supabase),
    supabase.from("customers").select("id, name, contact, email, phone, address, notes, invoice_postage, invoice_variety, next_invoice_number").order("name"),
    supabase.from("customer_prices").select("customer_id, stock_item_id, price"),
  ]);
  if (list.error) throw list.error;
  if (priceRows.error) throw priceRows.error;
  const customers = list.data as Customer[];
  const pricesFor = (customerId: string) =>
    new Map(priceRows.data.filter((p) => p.customer_id === customerId).map((p) => [p.stock_item_id, Number(p.price)]));

  return (
    <div className="space-y-6">
      <header className="space-y-6">
        <h1 className="font-script text-6xl text-gold sm:text-7xl">The Pod</h1>
        <PodNav current="/pod/customers" />
      </header>

      <div className="space-y-2">
        {customers.map((customer) => {
          const prices = pricesFor(customer.id);
          return (
            <PodPanel
              key={customer.id}
              title={customer.name}
              small
              hint={`${prices.size ? `Their own prices on ${prices.size} items` : "Standard wholesale prices"}${customer.address ? ` · ${customer.address.split("\n")[0].replace(/,\s*$/, "")}` : ""}`}
            >
              <PodForm action={saveCustomer} submitLabel="Save customer">
                <input type="hidden" name="id" value={customer.id} />
                <div className="space-y-6">
                  <CustomerFields customer={customer} />
                  <div className="space-y-3">
                    <p className="text-base text-cream/70">
                      Their prices. Leave a box empty to use your standard wholesale price.
                    </p>
                    {groups.map((group) => (
                      <ItemTable
                        key={group.productId}
                        caption={group.title}
                        headings={[group.title === "Pure Cacao" ? "Size" : "Flavour", "Standard", "Their price"]}
                        columnWidth="w-28"
                        collapsible
                      >
                        {group.items.map((item) => (
                          <ItemRow
                            key={item.id}
                            name={item.name}
                            cells={[
                              <span key="standard" className="text-cream/70">
                                {formatPrice(item.wholesalePrice)}
                              </span>,
                              <input
                                key="price"
                                name={`price:${item.id}`}
                                inputMode="decimal"
                                defaultValue={prices.has(item.id) ? prices.get(item.id)!.toFixed(2) : ""}
                                placeholder={item.wholesalePrice.toFixed(2)}
                                aria-label={`${customer.name} price for ${group.title} ${item.name}`}
                                className="pod-input w-20 px-2 py-1 text-right text-sm"
                              />,
                            ]}
                          />
                        ))}
                      </ItemTable>
                    ))}
                  </div>
                </div>
              </PodForm>
              <PodForm
                action={deleteCustomer}
                submitLabel="Delete customer"
                variant="quiet"
                confirmMessage={`Delete ${customer.name}? Their orders and invoices stay, but their prices are removed.`}
              >
                <input type="hidden" name="id" value={customer.id} />
              </PodForm>
            </PodPanel>
          );
        })}

      </div>

      <PodPanel title="Add a customer" hint="A shop you sell to wholesale. You can set their prices once they’re added.">
        <PodForm action={addCustomer} submitLabel="Add customer" resetOnSuccess>
          <CustomerFields />
        </PodForm>
      </PodPanel>
    </div>
  );
}

function CustomerFields({ customer }: { customer?: Customer }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Business name" name="name" value={customer?.name} required />
      <Field label="Contact name" name="contact" value={customer?.contact} />
      <Field label="Email" name="email" value={customer?.email} />
      <Field label="Phone" name="phone" value={customer?.phone} />
      <Field label="Next invoice #" name="next_invoice_number" value={String(customer?.next_invoice_number ?? 1)} />
      <label className="block">
        <span className="eyebrow mb-1 block text-xs text-cream/70">Address (as on invoices)</span>
        <textarea name="address" rows={3} defaultValue={customer?.address ?? ""} className="pod-input py-2 text-sm" />
      </label>
      <label className="block">
        <span className="eyebrow mb-1 block text-xs text-cream/70">Notes</span>
        <textarea name="notes" rows={3} defaultValue={customer?.notes ?? ""} placeholder="Optional" className="pod-input py-2 text-sm" />
      </label>
      <label className="flex items-center gap-3 font-sans text-sm sm:col-span-2">
        <input type="checkbox" name="invoice_postage" defaultChecked={customer?.invoice_postage} className="size-4 accent-[#8a5226]" />
        Add a blank Postage line to their invoices, to fill in each time
      </label>
      <label className="flex items-center gap-3 font-sans text-sm sm:col-span-2">
        <input type="checkbox" name="invoice_variety" defaultChecked={customer?.invoice_variety} className="size-4 accent-[#8a5226]" />
        Show bars on their invoices as a variety, e.g. “30 x 50g Small Bar Variety” (the order still lists each flavour, for stock)
      </label>
    </div>
  );
}

function Field({ label, name, value, required }: { label: string; name: string; value?: string | null; required?: boolean }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1 block text-xs text-cream/70">{label}</span>
      <input name={name} required={required} defaultValue={value ?? ""} className="pod-input py-2 text-sm" />
    </label>
  );
}
