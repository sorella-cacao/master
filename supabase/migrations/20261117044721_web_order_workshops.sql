-- Workshop tickets are marked as such on checkouts (rather than told apart by having no stock item).
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
