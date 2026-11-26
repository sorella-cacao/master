import type { Metadata } from "next";
import { PodForm } from "../pod-form";
import { PodNav } from "../pod-nav";
import { PodPanel } from "../pod-panel";
import { getSession } from "../session";
import { deleteMessage, saveReply } from "./actions";
import { ReplyPreview } from "./preview";
import { ShipForm } from "./ship-form";
import { linesReceipt, webReceipt } from "../../../../supabase/functions/_shared/shipping";

export const metadata: Metadata = { title: "Replies" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { timeZone: "Australia/Sydney", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default async function RepliesPage(props: PageProps<"/pod/replies">) {
  const { supabase, email, isAdmin } = await getSession();
  if (!isAdmin) {
    return (
      <div className="max-w-xl">
        <h1 className="font-script text-6xl text-gold">The Pod</h1>
        <p className="mt-6 text-xl">{email ?? "This account"} doesn’t have access to the Pod yet.</p>
      </div>
    );
  }

  const [templates, messages, sent] = await Promise.all([
    supabase.from("email_templates").select("key, name, sent_when, subject, body, enabled").order("position"),
    supabase.from("contact_messages").select("id, name, email, message, created_at").order("created_at", { ascending: false }).limit(30),
    supabase.from("sent_emails").select("id, template, to_email, subject, error, created_at").order("created_at", { ascending: false }).limit(30),
  ]);
  if (templates.error) throw templates.error;
  if (messages.error) throw messages.error;
  if (sent.error) throw sent.error;
  const names = new Map(templates.data.map((t) => [t.key, t.name]));
  // "Email shipping" on Orders opens this page for that order.
  const { ship } = await props.searchParams;
  const shipping = typeof ship === "string" ? await shippingOrder(supabase, ship) : null;
  const shipTemplate = templates.data.find((t) => t.key === "order_shipped");

  return (
    <div className="space-y-6">
      <header className="space-y-6">
        <h1 className="font-script text-6xl text-gold sm:text-7xl">The Pod</h1>
        <PodNav current="/pod/replies" />
      </header>

      {shipping && shipTemplate && (
        <PodPanel open title={`Email shipping · ${shipping.customer}`} hint="Choose the carrier and type the tracking number. The email shows how it will look.">
          <ShipForm
            orderId={shipping.id}
            template={shipTemplate}
            defaults={shipping.defaults}
            receipt={shipping.receipt}
            address={shipping.address}
            emailedAt={shipping.emailedAt}
          />
        </PodPanel>
      )}
      {typeof ship === "string" && !shipping && <p className="text-gold">That order isn’t a website order or spontaneous buy, or it no longer exists.</p>}

      <div className="space-y-2">
        {templates.data.map((template) => (
          <PodPanel
            key={template.key}
            small
            title={`${template.name}${template.enabled ? "" : " · off"}`}
            hint={template.sent_when}
          >
            <PodForm action={saveReply} submitLabel="Save">
              <input type="hidden" name="key" value={template.key} />
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-4">
                  <label className="block">
                    <span className="eyebrow mb-1 block text-xs text-cream/70">Subject</span>
                    <input name="subject" defaultValue={template.subject} required className="pod-input py-2 text-sm" />
                  </label>
                  <label className="block">
                    <span className="eyebrow mb-1 block text-xs text-cream/70">Message</span>
                    <textarea name="body" defaultValue={template.body} required rows={14} className="pod-input py-2 font-sans text-sm" />
                  </label>
                  <label className="flex items-center gap-3 font-sans text-sm">
                    <input type="checkbox" name="enabled" defaultChecked={template.enabled} className="size-4 accent-[#8a5226]" />
                    Send this email
                  </label>
                </div>
                <ReplyPreview templateKey={template.key} subject={template.subject} body={template.body} />
              </div>
            </PodForm>
          </PodPanel>
        ))}
      </div>

      <PodPanel small title="Messages from the website" hint={`${messages.data.length ? `${messages.data.length} recent` : "None yet"} · also emailed to you`}>
        <div className="space-y-4">
          {messages.data.length === 0 && <p className="text-cream/70">Messages sent through the contact form will show here.</p>}
          {messages.data.map((m) => (
            <article key={m.id} className="rounded-xl border border-white/15 p-4 font-sans text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-base">
                  {m.name} ·{" "}
                  <a href={`mailto:${m.email}`} className="underline decoration-white/30 underline-offset-2 hover:text-gold">
                    {m.email}
                  </a>
                </p>
                <p className="text-cream/60">{when(m.created_at)}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-cream/85">{m.message}</p>
              <PodForm action={deleteMessage} submitLabel="Delete" variant="quiet" confirmMessage={`Delete the message from ${m.name}?`}>
                <input type="hidden" name="id" value={m.id} />
              </PodForm>
            </article>
          ))}
        </div>
      </PodPanel>

      <PodPanel small title="Emails sent" hint="The latest automatic emails, and any that couldn’t be sent.">
        {sent.data.length === 0 ? (
          <p className="text-cream/70">Nothing sent yet.</p>
        ) : (
          <ul className="divide-y divide-white/10 font-sans text-sm">
            {sent.data.map((s) => (
              <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
                <span>
                  {names.get(s.template) ?? s.template} → {s.to_email}
                  {s.error && <span className="block text-gold">Not sent: {s.error}</span>}
                </span>
                <span className="text-cream/60">{when(s.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </PodPanel>
    </div>
  );
}

type Db = Awaited<ReturnType<typeof getSession>>["supabase"];

/** A website order or spontaneous buy to email shipping for: who it's to, and its receipt. */
async function shippingOrder(supabase: Db, id: string) {
  const { data: order } = await supabase
    .from("orders")
    .select(
      "id, customer, kind, ship_email, ship_carrier, ship_tracking, ship_emailed_at, lines:order_lines(quantity, unit_price, item:stock_items(name, parent:stock_items!stock_items_parent_id_fkey(name), product:products(title))), web:web_orders(name, email, address, delivery, delivery_price, items, label_fees)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!order || (order.kind !== "web" && order.kind !== "spontaneous")) return null;
  const web = order.web as {
    name: string;
    email: string;
    address: string;
    delivery: string;
    delivery_price: number;
    items: { title: string; variant: string; quantity: number; unit_price: number; label: string | null; workshop: boolean }[];
    label_fees: { label: string; amount: number }[] | null;
  } | null;
  const receipt = web
    ? webReceipt(web)
    : linesReceipt(
        order.lines.map((l) => {
          // A fruit under Local Fruit is named like "75% Dark & Local Fig".
          const parent = [l.item?.parent].flat()[0];
          return {
          name: `${l.item?.product?.title ?? "Item"}, ${parent ? parent.name.replace("Fruit", l.item?.name ?? "") : (l.item?.name ?? "")}`,
          quantity: l.quantity,
          unit_price: l.unit_price,
          };
        }),
      );
  // A spontaneous buy without a name is called "Spontaneous buy": leave the name to be typed.
  const name = web?.name || (order.customer === "Spontaneous buy" ? "" : order.customer);
  return {
    id: order.id,
    customer: order.customer,
    receipt,
    address: web?.address ?? "",
    emailedAt: order.ship_emailed_at ? when(order.ship_emailed_at) : null,
    defaults: { name, email: order.ship_email ?? web?.email ?? (await knownEmail(supabase, order.id, name)), carrier: order.ship_carrier ?? "", tracking: order.ship_tracking ?? "" },
  };
}

/** An email already used for this person: on their customer details, or on another order's shipping email. */
async function knownEmail(supabase: Db, orderId: string, name: string) {
  if (!name) return "";
  const exact = name.replace(/[%_\\]/g, "\\$&"); // so "%" or "_" in a name aren't wildcards
  const [customer, earlier] = await Promise.all([
    supabase.from("customers").select("email").ilike("name", exact).not("email", "is", null).neq("email", "").limit(1).maybeSingle(),
    supabase
      .from("orders")
      .select("ship_email")
      .ilike("customer", exact)
      .neq("id", orderId)
      .not("ship_email", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);
  return customer.data?.email ?? earlier.data?.ship_email ?? "";
}
