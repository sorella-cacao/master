-- Codes typed into the cart that make postage free. Each paid order with a code is one use of it.
create table public.discount_codes (
  code text primary key check (code ~ '^[A-Z0-9][A-Z0-9-]{3,29}$'),
  -- How many orders can use it; empty for any number.
  max_uses integer check (max_uses > 0),
  expires_on date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.discount_codes enable row level security;
create policy "Admins manage discount codes" on public.discount_codes
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
grant select, insert, update, delete on public.discount_codes to authenticated, service_role;

alter table public.checkouts add column discount_code text;
create index checkouts_discount_code_idx on public.checkouts (discount_code) where discount_code is not null;

-- Whether a code can be used now. Anyone can ask about a code they have, but can't list them.
create function public.check_discount_code(code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.discount_codes d
    where d.code = upper(trim(check_discount_code.code))
      and d.is_active
      and (d.expires_on is null or d.expires_on >= (now() at time zone 'Australia/Sydney')::date)
      and (d.max_uses is null or d.max_uses > (
        select count(*) from public.checkouts c where c.discount_code = d.code and c.status = 'paid'
      ))
  );
$$;
revoke execute on function public.check_discount_code(text) from public;
grant execute on function public.check_discount_code(text) to anon, authenticated, service_role;

-- The order's note says when a code was used.
create or replace function public.record_web_order(
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
    'Free postage with code ' || c.discount_code,
    (select 'Personalised labels: ' || string_agg('“' || (f ->> 'label') || '”', ', ') from jsonb_array_elements(c.label_fees) f
      having count(*) > 0),
    (select 'Workshop: ' || string_agg((i ->> 'quantity') || ' × ' || (i ->> 'title') || ' (' || (i ->> 'variant') || ')', '; ')
      from jsonb_array_elements(c.items) i where (i ->> 'workshop')::boolean having count(*) > 0)
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
