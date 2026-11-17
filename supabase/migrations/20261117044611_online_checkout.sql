-- Paying on the website with Stripe Checkout.
--
-- The cart's Checkout button calls the create-checkout Edge Function, which prices the cart from the
-- catalogue, saves it as a checkout and opens a Stripe payment page. When Stripe says it's paid, the
-- stripe-webhook Edge Function turns the checkout into an order in the Pod (kind 'web'), with the
-- customer's details in web_orders. Both functions use the service role; nothing here is public
-- except the delivery choices shown in the cart.

-- Delivery choices offered in the cart, edited in the Pod.
create table public.delivery_options (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name <> ''),
  description text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  -- Free when the products in the cart come to this much or more.
  free_over numeric(10, 2) check (free_over > 0),
  -- Posted or delivered (Stripe asks for an address), rather than picked up.
  needs_address boolean not null default true,
  position integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.delivery_options
  for each row execute function private.set_updated_at();
alter table public.delivery_options enable row level security;
create policy "Anyone can see active delivery options" on public.delivery_options
  for select to anon, authenticated using (is_active or (select private.is_admin()));
create policy "Admins manage delivery options" on public.delivery_options
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
grant select on public.delivery_options to anon;
grant select, insert, update, delete on public.delivery_options to authenticated;
insert into public.delivery_options (name, description, price, free_over, needs_address, position) values
  ('Post (Australia-wide)', 'Free on orders of $150 or more.', 16, 150, true, 0),
  ('Pick up in Lawson', 'We’ll be in touch to arrange a time.', 0, null, false, 1);

-- A cart sent to Stripe, priced from the catalogue. items: [{title, variant, quantity, unit_price,
-- label, stock_item_id}] (stock_item_id is null for workshop tickets); label_fees: [{label, amount}];
-- delivery: {name, price, needs_address} or null when nothing is posted.
create table public.checkouts (
  id uuid primary key default gen_random_uuid(),
  items jsonb not null,
  label_fees jsonb not null default '[]',
  delivery jsonb,
  total numeric(10, 2) not null check (total > 0),
  stripe_session_id text unique,
  status text not null default 'open' check (status in ('open', 'paid', 'expired')),
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.checkouts
  for each row execute function private.set_updated_at();
alter table public.checkouts enable row level security;
create policy "Admins see checkouts" on public.checkouts
  for select to authenticated using ((select private.is_admin()));
grant select on public.checkouts to authenticated;

alter table public.orders drop constraint orders_kind_check;
alter table public.orders add constraint orders_kind_check
  check (kind in ('order', 'spontaneous', 'gift', 'personal', 'staff', 'market', 'web'));

-- Who bought a website order and how it gets to them.
create table public.web_orders (
  order_id uuid primary key references public.orders (id) on delete cascade,
  checkout_id uuid not null unique references public.checkouts (id),
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  delivery text not null default '',
  delivery_price numeric(10, 2) not null default 0,
  total numeric(10, 2) not null,
  -- Everything bought, as on the checkout, including personalised labels and workshop tickets.
  items jsonb not null,
  label_fees jsonb not null default '[]',
  paid_at timestamptz not null default now()
);
alter table public.web_orders enable row level security;
create policy "Admins see web orders" on public.web_orders
  for select to authenticated using ((select private.is_admin()));
grant select on public.web_orders to authenticated;

-- Turns a paid checkout into an order to make (stock comes off when it's marked Sent, as for every
-- order). Safe to call twice for the same checkout: Stripe can send the same event more than once.
create function public.record_web_order(
  checkout_id uuid, name text, email text, phone text, address text, total numeric
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  c public.checkouts;
  saved_id uuid;
  note text;
begin
  select * into c from public.checkouts where id = record_web_order.checkout_id for update;
  if not found then raise exception 'No checkout %', record_web_order.checkout_id; end if;
  if c.order_id is not null then return c.order_id; end if;

  note := concat_ws(E'\n',
    'Paid online' || coalesce(' · ' || (c.delivery ->> 'name'), ''),
    (select 'Personalised labels: ' || string_agg('“' || (f ->> 'label') || '”', ', ') from jsonb_array_elements(c.label_fees) f
      having count(*) > 0),
    (select 'Workshop: ' || string_agg((i ->> 'quantity') || ' × ' || (i ->> 'title') || ' (' || (i ->> 'variant') || ')', '; ')
      from jsonb_array_elements(c.items) i where i ->> 'stock_item_id' is null having count(*) > 0)
  );

  insert into public.orders (customer, kind, status, note)
  values (coalesce(nullif(trim(record_web_order.name), ''), 'Website customer'), 'web', 'to_make', note)
  returning id into saved_id;

  -- One line per stock item (the same bar with two different labels is one line for stock).
  insert into public.order_lines (order_id, stock_item_id, quantity, unit_price)
  select saved_id, (i ->> 'stock_item_id')::uuid, sum((i ->> 'quantity')::integer), max((i ->> 'unit_price')::numeric)
  from jsonb_array_elements(c.items) i
  where i ->> 'stock_item_id' is not null
  group by i ->> 'stock_item_id';

  insert into public.web_orders (order_id, checkout_id, name, email, phone, address, delivery, delivery_price, total, items, label_fees)
  values (
    saved_id, c.id, coalesce(trim(record_web_order.name), ''), coalesce(trim(record_web_order.email), ''),
    coalesce(trim(record_web_order.phone), ''), coalesce(trim(record_web_order.address), ''),
    coalesce(c.delivery ->> 'name', ''), coalesce((c.delivery ->> 'price')::numeric, 0),
    record_web_order.total, c.items, c.label_fees
  );

  update public.checkouts set status = 'paid', order_id = saved_id where id = c.id;
  return saved_id;
end;
$$;
revoke execute on function public.record_web_order from public, anon, authenticated;
grant execute on function public.record_web_order to service_role;
