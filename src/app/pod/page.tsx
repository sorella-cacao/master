import Link from "next/link";
import { blocksToText } from "@/lib/content";
import type { ContentBlock } from "@/data/types";
import {
  addTicket,
  addVariant,
  deleteTicket,
  deleteVariant,
  deleteWorkshop,
  duplicateWorkshop,
  saveDeliveryOption,
  savePromo,
  saveProduct,
  saveTicket,
  saveVariant,
  saveWorkshop,
} from "./actions";
import { PodForm } from "./pod-form";
import { PodNav } from "./pod-nav";
import { logOut } from "./login/actions";
import { getSession } from "./session";

const byPosition = <T extends { position: number }>(rows: T[]) => [...rows].sort((a, b) => a.position - b.position);

export default async function PodPage() {
  const { supabase, email, isAdmin } = await getSession();

  if (!isAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="font-script text-6xl text-gold">The Pod</h1>
        <p className="mt-6 text-xl">
          {email ?? "This account"} doesn’t have access to the Pod yet.
        </p>
        <SignOut />
      </div>
    );
  }

  const [products, workshops, delivery, promo] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, slug, title, description, is_published, available_until, subheading, option_name, ingredients_note, options:product_variants(id, label, price, sold_out, ingredients, position)",
      )
      .order("position"),
    supabase
      .from("workshops")
      .select(
        "id, slug, title, event_date, sold_out, is_published, description, option_name, tickets:workshop_variants(id, label, price, sold_out, position)",
      )
      .order("event_date", { ascending: false, nullsFirst: true })
      .order("position"),
    supabase.from("delivery_options").select("id, name, description, price, free_over, is_active").order("position"),
    supabase.from("site_promo").select("enabled, product_id, strip_text, banner_title, banner_text").maybeSingle(),
  ]);
  if (products.error) throw products.error;
  if (workshops.error) throw workshops.error;
  if (delivery.error) throw delivery.error;
  if (promo.error) throw promo.error;

  return (
    <div className="space-y-16">
      <header className="space-y-6">
        <div>
          <h1 className="font-script text-6xl text-gold sm:text-7xl">The Pod</h1>
          <p className="mt-2 text-cream/70">
            Changes appear on the website as soon as you save. Signed in as {email}.
          </p>
        </div>
        <PodNav current="/pod" />
      </header>

      {promo.data && (
        <section aria-labelledby="promo-heading" className="space-y-8">
          <h2 id="promo-heading" className="text-4xl">
            Promotion
          </h2>
          <p className="text-cream/70">
            A red strip across the top of every page and a banner on the home page, for one product. It hides itself once
            the product’s last day to order has passed, or while the product isn’t shown on the website.
          </p>
          <article className="rounded-2xl border border-white/10 bg-cacao-950/40 p-6 sm:p-8">
            <PodForm action={savePromo} submitLabel="Save promotion">
              <div className="space-y-4">
                <Field label="Product">
                  <select name="product_id" defaultValue={promo.data.product_id ?? ""} className="pod-input">
                    <option value="">None</option>
                    {products.data.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Strip across the top" hint="“· Order by …” is added when the product has a last day to order.">
                  <input name="strip_text" defaultValue={promo.data.strip_text} required className="pod-input" />
                </Field>
                <Field label="Banner heading">
                  <input name="banner_title" defaultValue={promo.data.banner_title} required className="pod-input" />
                </Field>
                <Field label="Banner words">
                  <textarea name="banner_text" defaultValue={promo.data.banner_text} rows={3} className="pod-input" />
                </Field>
                <Checkbox name="enabled" label="Show the promotion" defaultChecked={promo.data.enabled} />
              </div>
            </PodForm>
          </article>
        </section>
      )}

      <section aria-labelledby="delivery-heading" className="space-y-8">
        <h2 id="delivery-heading" className="text-4xl">
          Delivery
        </h2>
        <p className="text-cream/70">The choices customers see in their cart. Workshop tickets don’t need delivery.</p>
        {delivery.data.map((option) => (
          <article key={option.id} className="rounded-2xl border border-white/10 bg-cacao-950/40 p-6 sm:p-8">
            <PodForm action={saveDeliveryOption} submitLabel="Save">
              <input type="hidden" name="id" value={option.id} />
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[1fr_10rem_10rem]">
                  <Field label="Name">
                    <input name="name" defaultValue={option.name} required className="pod-input" />
                  </Field>
                  <Field label="Price ($)">
                    <input
                      type="number"
                      name="price"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      defaultValue={Number(option.price).toFixed(2)}
                      required
                      className="pod-input"
                    />
                  </Field>
                  <Field label="Free over ($)">
                    <input
                      type="number"
                      name="free_over"
                      min="0"
                      step="0.01"
                      inputMode="decimal"
                      defaultValue={option.free_over === null ? "" : Number(option.free_over).toFixed(2)}
                      placeholder="Never"
                      className="pod-input"
                    />
                  </Field>
                </div>
                <Field label="Note for customers">
                  <input name="description" defaultValue={option.description} className="pod-input" />
                </Field>
                <Checkbox name="is_active" label="Offer this at checkout" defaultChecked={option.is_active} />
              </div>
            </PodForm>
          </article>
        ))}
      </section>

      <section aria-labelledby="products-heading" className="space-y-8">
        <h2 id="products-heading" className="text-4xl">
          Products
        </h2>
        {products.data.map((product) => {
          const hasIngredients = !!product.ingredients_note;
          const optionName = product.option_name.toLowerCase();
          return (
            <article key={product.id} className="space-y-8 rounded-2xl border border-white/10 bg-cacao-950/40 p-6 sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <h3 className="text-3xl text-gold">{product.title}</h3>
                <ViewLink href={`/shop/${product.slug}`} />
              </div>

              <PodForm action={saveProduct} submitLabel="Save product">
                <input type="hidden" name="id" value={product.id} />
                <div className="space-y-4">
                  <Field label="Name">
                    <input name="title" defaultValue={product.title} required className="pod-input" />
                  </Field>
                  <Field label="Subheading" hint="A line under the name on its page. Optional.">
                    <input name="subheading" defaultValue={product.subheading} className="pod-input" />
                  </Field>
                  <Field label="Description" hint="Leave a blank line between paragraphs.">
                    <textarea
                      name="description"
                      defaultValue={blocksToText(product.description as ContentBlock[])}
                      rows={8}
                      className="pod-input"
                    />
                  </Field>
                  <Field label="Last day to order" hint="For seasonal products, e.g. the Christmas bundle. Leave empty to always sell it.">
                    <input type="date" name="available_until" defaultValue={product.available_until ?? ""} className="pod-input" />
                  </Field>
                  <Checkbox name="is_published" label="Show on the website" defaultChecked={product.is_published} />
                </div>
              </PodForm>

              <div className="space-y-4">
                <h4 className="eyebrow text-cream/70">{product.option_name}s</h4>
                {byPosition(product.options).map((option) => (
                  <div key={option.id} className="rounded-xl border border-white/10 p-4 sm:p-5">
                    <PodForm action={saveVariant} submitLabel="Save">
                      <input type="hidden" name="id" value={option.id} />
                      <OptionFields
                        optionName={optionName}
                        label={option.label}
                        price={option.price}
                        ingredients={hasIngredients ? (option.ingredients ?? "") : undefined}
                        soldOut={option.sold_out}
                      />
                    </PodForm>
                    <PodForm
                      action={deleteVariant}
                      submitLabel={`Delete ${optionName}`}
                      variant="quiet"
                      confirmMessage={`Delete “${option.label}” from ${product.title}? This can’t be undone.`}
                      className="-mt-1"
                    >
                      <input type="hidden" name="id" value={option.id} />
                    </PodForm>
                  </div>
                ))}

                <div className="rounded-xl border border-dashed border-white/20 p-4 sm:p-5">
                  <p className="eyebrow mb-4 text-cream/70">Add a {optionName}</p>
                  <PodForm action={addVariant} submitLabel={`Add ${optionName}`} resetOnSuccess>
                    <input type="hidden" name="product_id" value={product.id} />
                    <OptionFields optionName={optionName} ingredients={hasIngredients ? "" : undefined} />
                  </PodForm>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <section aria-labelledby="workshops-heading" className="space-y-8">
        <div>
          <h2 id="workshops-heading" className="text-4xl">
            Workshops
          </h2>
          <p className="mt-2 text-cream/70">
            To add a new date, copy a workshop, update it, then tick “Show on the website”.
          </p>
        </div>
        {workshops.data.map((workshop) => (
          <article key={workshop.id} className="space-y-8 rounded-2xl border border-white/10 bg-cacao-950/40 p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <h3 className="text-3xl text-gold">
                {workshop.title}
                {!workshop.is_published && <span className="eyebrow ml-3 align-middle text-cream/70">Hidden</span>}
              </h3>
              {workshop.is_published && <ViewLink href={`/workshops/${workshop.slug}`} />}
            </div>

            <PodForm action={saveWorkshop} submitLabel="Save workshop">
              <input type="hidden" name="id" value={workshop.id} />
              <div className="space-y-4">
                <Field label="Name">
                  <input name="title" defaultValue={workshop.title} required className="pod-input" />
                </Field>
                <Field label="Date">
                  <input type="date" name="event_date" defaultValue={workshop.event_date ?? ""} className="pod-input sm:max-w-xs" />
                </Field>
                <Field label="Description" hint="Leave a blank line between paragraphs. Start lines with “- ” for bullet points.">
                  <textarea
                    name="description"
                    defaultValue={blocksToText(workshop.description as ContentBlock[])}
                    rows={12}
                    className="pod-input"
                  />
                </Field>
                <div className="flex flex-wrap gap-x-8 gap-y-3">
                  <Checkbox name="sold_out" label="Sold out" defaultChecked={workshop.sold_out} />
                  <Checkbox name="is_published" label="Show on the website" defaultChecked={workshop.is_published} />
                </div>
              </div>
            </PodForm>

            <div className="space-y-4">
              <h4 className="eyebrow text-cream/70">{workshop.option_name}s</h4>
              {byPosition(workshop.tickets).map((ticket) => (
                <div key={ticket.id} className="rounded-xl border border-white/10 p-4 sm:p-5">
                  <PodForm action={saveTicket} submitLabel="Save">
                    <input type="hidden" name="id" value={ticket.id} />
                    <OptionFields optionName="ticket" label={ticket.label} price={ticket.price} soldOut={ticket.sold_out} />
                  </PodForm>
                  <PodForm
                    action={deleteTicket}
                    submitLabel="Delete ticket"
                    variant="quiet"
                    confirmMessage={`Delete the “${ticket.label}” ticket? This can’t be undone.`}
                    className="-mt-1"
                  >
                    <input type="hidden" name="id" value={ticket.id} />
                  </PodForm>
                </div>
              ))}
              <div className="rounded-xl border border-dashed border-white/20 p-4 sm:p-5">
                <p className="eyebrow mb-4 text-cream/70">Add a ticket</p>
                <PodForm action={addTicket} submitLabel="Add ticket" resetOnSuccess>
                  <input type="hidden" name="workshop_id" value={workshop.id} />
                  <OptionFields optionName="ticket" />
                </PodForm>
              </div>
            </div>

            <div className="flex flex-wrap gap-x-6 border-t border-white/10 pt-2">
              <PodForm action={duplicateWorkshop} submitLabel="Copy as a new workshop" variant="quiet">
                <input type="hidden" name="id" value={workshop.id} />
              </PodForm>
              <PodForm
                action={deleteWorkshop}
                submitLabel="Delete workshop"
                variant="quiet"
                confirmMessage={`Delete “${workshop.title}” and its tickets? This can’t be undone.`}
              >
                <input type="hidden" name="id" value={workshop.id} />
              </PodForm>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="eyebrow mb-2 block text-cream/70">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-base text-cream/70">{hint}</span>}
    </label>
  );
}

function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-3 font-sans text-base">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-5 w-5 accent-caramel" />
      {label}
    </label>
  );
}

/** Name, price, optional ingredients and sold-out, for a flavour, size or ticket. */
function OptionFields({
  optionName,
  label = "",
  price,
  ingredients,
  soldOut,
}: {
  optionName: string;
  label?: string;
  price?: number;
  /** Omit for options without ingredients (sizes, tickets). */
  ingredients?: string;
  soldOut?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <Field label={`${optionName[0].toUpperCase()}${optionName.slice(1)} name`}>
          <input name="label" defaultValue={label} required className="pod-input" />
        </Field>
        <Field label="Price ($)">
          <input
            type="number"
            name="price"
            min="0"
            step="0.01"
            inputMode="decimal"
            defaultValue={price?.toFixed(2) ?? ""}
            required
            className="pod-input"
          />
        </Field>
      </div>
      {ingredients !== undefined && (
        <Field label="Ingredients" hint="Use * for certified organic and ** for ethically sourced.">
          <textarea name="ingredients" defaultValue={ingredients} rows={2} className="pod-input" />
        </Field>
      )}
      {soldOut !== undefined && <Checkbox name="sold_out" label="Sold out" defaultChecked={soldOut} />}
    </div>
  );
}

function ViewLink({ href }: { href: string }) {
  return (
    <Link href={href} target="_blank" className="eyebrow text-cream/70 underline-offset-4 hover:text-gold hover:underline">
      View on website ↗
    </Link>
  );
}

function SignOut() {
  return (
    <form action={logOut} className="mt-6">
      <button type="submit" className="eyebrow rounded-full border border-white/20 px-4 py-2 text-cream/70 hover:border-gold hover:text-gold">
        Sign out
      </button>
    </form>
  );
}
