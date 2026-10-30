-- "75% Dark & Local Fruit" is made with whichever local fruit is in season. Each fruit gets its
-- own stock item underneath it (parent_id), created the first time an order names that fruit.
alter table public.stock_items
  add column parent_id uuid references public.stock_items (id) on delete cascade,
  add column has_varieties boolean not null default false;
create index stock_items_parent_id_idx on public.stock_items (parent_id);

update public.stock_items s
  set name = '75% Dark & Local Fruit', has_varieties = true
  where s.name = '75% Dark & Local Mandarins';

-- Lines are [{"stock_item_id": "...", "quantity": 2}] or, for a fruit, [{"parent_id": "...", "fruit": "Fig", "quantity": 3}].
create or replace function public.pod_save_order(order_id uuid, customer text, needed_by date, note text, lines jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved_id uuid := pod_save_order.order_id;
  current_status text;
  found_customer uuid;
  resolved jsonb := '[]'::jsonb;
  e jsonb;
  parent public.stock_items;
  fruit_id uuid;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  if coalesce(trim(pod_save_order.customer), '') = '' then raise exception 'Enter who the order is for.'; end if;

  select c.id into found_customer from public.customers c where lower(c.name) = lower(trim(pod_save_order.customer));

  -- Turn named fruits into their own stock items, adding any fruit not seen before.
  for e in select value from jsonb_array_elements(pod_save_order.lines) loop
    if e ? 'fruit' then
      if coalesce(trim(e->>'fruit'), '') = '' or coalesce((e->>'quantity')::integer, 0) <= 0 then continue; end if;
      select * into parent from public.stock_items s where s.id = (e->>'parent_id')::uuid;
      if not found then raise exception 'That flavour no longer exists.'; end if;
      select s.id into fruit_id from public.stock_items s
        where s.parent_id = parent.id and lower(s.name) = lower(trim(e->>'fruit'));
      if not found then
        insert into public.stock_items (product_id, name, wholesale_price, is_extra, position, chocolate_grams, base_chocolate, parent_id)
        values (parent.product_id, initcap(trim(e->>'fruit')), parent.wholesale_price, true, parent.position,
          parent.chocolate_grams, parent.base_chocolate, parent.id)
        returning id into fruit_id;
      end if;
      resolved := resolved || jsonb_build_array(jsonb_build_object('stock_item_id', fruit_id, 'quantity', (e->>'quantity')::integer));
    else
      resolved := resolved || jsonb_build_array(e);
    end if;
  end loop;

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
      select (r->>'stock_item_id')::uuid from jsonb_array_elements(resolved) r
      where (r->>'quantity')::integer > 0
    );

  -- A fruit uses the customer's price for it, else their price for Local Fruit, else wholesale.
  insert into public.order_lines (order_id, stock_item_id, quantity, unit_price)
  select saved_id, s.id, w.quantity, coalesce(cp.price, pp.price, s.wholesale_price)
  from (
    select (r->>'stock_item_id')::uuid as stock_item_id, sum((r->>'quantity')::integer)::integer as quantity
    from jsonb_array_elements(resolved) r
    where (r->>'quantity')::integer > 0
    group by 1
  ) w
  join public.stock_items s on s.id = w.stock_item_id
  left join public.customer_prices cp on cp.customer_id = found_customer and cp.stock_item_id = s.id
  left join public.customer_prices pp on pp.customer_id = found_customer and pp.stock_item_id = s.parent_id
  on conflict on constraint order_lines_order_id_stock_item_id_key
    do update set quantity = excluded.quantity;

  if not exists (select 1 from public.order_lines l where l.order_id = saved_id) then
    raise exception 'Add at least one item to the order.';
  end if;
  return saved_id;
end;
$$;
