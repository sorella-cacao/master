-- Wholesale customers with their own prices, and invoices made from orders. Private to admins.
-- Business and bank details live in invoice_settings (entered in the Pod), never in this repo.

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name <> ''),
  contact text,
  email text,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index customers_name_key on public.customers (lower(name));

-- A customer's price for an item; items without one use the standard wholesale price.
create table public.customer_prices (
  customer_id uuid not null references public.customers (id) on delete cascade,
  stock_item_id uuid not null references public.stock_items (id) on delete cascade,
  price numeric(10, 2) not null check (price >= 0),
  primary key (customer_id, stock_item_id)
);
create index customer_prices_stock_item_id_idx on public.customer_prices (stock_item_id);

alter table public.orders add column customer_id uuid references public.customers (id) on delete set null;
create index orders_customer_id_idx on public.orders (customer_id);

-- What goes on every invoice, and the next invoice number. One row.
create table public.invoice_settings (
  id boolean primary key default true check (id),
  business_name text not null default '',
  address text not null default '',
  email text not null default '',
  phone text not null default '',
  abn text not null default '',
  payable_to text not null default '',
  bank_account_name text not null default '',
  bank_bsb text not null default '',
  bank_account_number text not null default '',
  payment_terms_days integer not null default 7 check (payment_terms_days >= 0),
  next_number integer not null default 1 check (next_number > 0),
  updated_at timestamptz not null default now()
);
insert into public.invoice_settings default values;

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  number integer not null unique check (number > 0),
  order_id uuid unique references public.orders (id) on delete set null,
  customer_id uuid references public.customers (id) on delete set null,
  bill_to text not null default '',
  issued_on date not null,
  due_on date not null,
  notes text,
  paid_on date,
  -- The business and bank details as they were when the invoice was made.
  seller jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index invoices_customer_id_idx on public.invoices (customer_id);

create table public.invoice_lines (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  position integer not null default 0,
  description text not null default '',
  quantity numeric(10, 2) not null default 1,
  unit_price numeric(10, 2) not null default 0
);
create index invoice_lines_invoice_id_idx on public.invoice_lines (invoice_id);

create trigger set_updated_at before update on public.customers
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.invoice_settings
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.invoices
  for each row execute function private.set_updated_at();

alter table public.customers enable row level security;
alter table public.customer_prices enable row level security;
alter table public.invoice_settings enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;

create policy "Admins manage customers" on public.customers
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage customer prices" on public.customer_prices
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage invoice settings" on public.invoice_settings
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage invoices" on public.invoices
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage invoice lines" on public.invoice_lines
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

grant select, insert, update, delete on public.customers, public.customer_prices, public.invoices, public.invoice_lines to authenticated;
grant select, update on public.invoice_settings to authenticated;
grant select, insert, update, delete on public.customers, public.customer_prices, public.invoice_settings, public.invoices, public.invoice_lines to service_role;

-- Orders link to a customer by name, and new lines use that customer's prices.
create or replace function public.pod_save_order(order_id uuid, customer text, needed_by date, note text, lines jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved_id uuid := pod_save_order.order_id;
  current_status text;
  found_customer uuid;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  if coalesce(trim(pod_save_order.customer), '') = '' then raise exception 'Enter who the order is for.'; end if;

  select c.id into found_customer from public.customers c where lower(c.name) = lower(trim(pod_save_order.customer));

  if saved_id is null then
    insert into public.orders (customer, customer_id, needed_by, note)
    values (trim(pod_save_order.customer), found_customer, pod_save_order.needed_by, nullif(trim(pod_save_order.note), ''))
    returning id into saved_id;
  else
    select o.status into current_status from public.orders o where o.id = saved_id for update;
    if not found then raise exception 'That order no longer exists.'; end if;
    if current_status = 'sent' then raise exception 'Move the order back to Packed before changing it.'; end if;
    update public.orders o
      set customer = trim(pod_save_order.customer),
          customer_id = found_customer,
          needed_by = pod_save_order.needed_by,
          note = nullif(trim(pod_save_order.note), '')
      where o.id = saved_id;
  end if;

  delete from public.order_lines l
  where l.order_id = saved_id
    and l.stock_item_id not in (
      select (e->>'stock_item_id')::uuid from jsonb_array_elements(pod_save_order.lines) e
      where (e->>'quantity')::integer > 0
    );

  insert into public.order_lines (order_id, stock_item_id, quantity, unit_price)
  select saved_id, s.id, (e->>'quantity')::integer, coalesce(cp.price, s.wholesale_price)
  from jsonb_array_elements(pod_save_order.lines) e
  join public.stock_items s on s.id = (e->>'stock_item_id')::uuid
  left join public.customer_prices cp on cp.customer_id = found_customer and cp.stock_item_id = s.id
  where (e->>'quantity')::integer > 0
  on conflict on constraint order_lines_order_id_stock_item_id_key
    do update set quantity = excluded.quantity;

  if not exists (select 1 from public.order_lines l where l.order_id = saved_id) then
    raise exception 'Add at least one item to the order.';
  end if;
  return saved_id;
end;
$$;

-- Make an order's invoice (or return the one it already has), numbered from the settings.
create function public.pod_create_invoice(order_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  existing uuid;
  saved_id uuid;
  o record;
  s public.invoice_settings;
  c public.customers;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;

  select i.id into existing from public.invoices i where i.order_id = pod_create_invoice.order_id;
  if found then return existing; end if;

  select * into o from public.orders where id = pod_create_invoice.order_id;
  if not found then raise exception 'That order no longer exists.'; end if;
  select * into s from public.invoice_settings where id for update;
  if o.customer_id is not null then
    select * into c from public.customers where id = o.customer_id;
  end if;

  insert into public.invoices (number, order_id, customer_id, bill_to, issued_on, due_on, seller)
  values (
    s.next_number,
    o.id,
    o.customer_id,
    concat_ws(E'\n', coalesce(c.name, o.customer), nullif(trim(c.address), '')),
    (now() at time zone 'Australia/Sydney')::date,
    (now() at time zone 'Australia/Sydney')::date + s.payment_terms_days,
    jsonb_build_object(
      'business_name', s.business_name, 'address', s.address, 'email', s.email, 'phone', s.phone,
      'abn', s.abn, 'payable_to', s.payable_to, 'bank_account_name', s.bank_account_name,
      'bank_bsb', s.bank_bsb, 'bank_account_number', s.bank_account_number
    )
  )
  returning id into saved_id;
  update public.invoice_settings set next_number = s.next_number + 1 where id;

  -- Described the way the invoices already read, e.g. "108g Goats Milk", "50g 75% Dark", "250g Pure Cacao".
  insert into public.invoice_lines (invoice_id, position, description, quantity, unit_price)
  select saved_id,
    row_number() over (order by p.position, si.position) - 1,
    case p.slug
      when 'large-bar' then '108g ' || si.name
      when 'small-bar' then '50g ' || si.name
      else si.name || ' ' || p.title
    end,
    ol.quantity,
    ol.unit_price
  from public.order_lines ol
  join public.stock_items si on si.id = ol.stock_item_id
  join public.products p on p.id = si.product_id
  where ol.order_id = o.id;

  return saved_id;
end;
$$;

-- Save an edited invoice: its details and the full list of lines, in order.
create function public.pod_save_invoice(invoice_id uuid, number integer, issued_on date, due_on date, bill_to text, notes text, lines jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  if exists (select 1 from public.invoices i where i.number = pod_save_invoice.number and i.id <> pod_save_invoice.invoice_id) then
    raise exception 'Another invoice already has that number.';
  end if;

  update public.invoices i
    set number = pod_save_invoice.number,
        issued_on = pod_save_invoice.issued_on,
        due_on = pod_save_invoice.due_on,
        bill_to = trim(pod_save_invoice.bill_to),
        notes = nullif(trim(pod_save_invoice.notes), '')
    where i.id = pod_save_invoice.invoice_id;
  if not found then raise exception 'That invoice no longer exists.'; end if;

  delete from public.invoice_lines l where l.invoice_id = pod_save_invoice.invoice_id;
  insert into public.invoice_lines (invoice_id, position, description, quantity, unit_price)
  select pod_save_invoice.invoice_id, (e.ord - 1)::integer, trim(e.value->>'description'),
    (e.value->>'quantity')::numeric, (e.value->>'unit_price')::numeric
  from jsonb_array_elements(pod_save_invoice.lines) with ordinality as e(value, ord);
end;
$$;

revoke execute on function public.pod_create_invoice(uuid),
  public.pod_save_invoice(uuid, integer, date, date, text, text, jsonb) from public, anon;
grant execute on function public.pod_create_invoice(uuid),
  public.pod_save_invoice(uuid, integer, date, date, text, text, jsonb) to authenticated;
