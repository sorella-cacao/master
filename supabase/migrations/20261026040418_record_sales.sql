-- Sales with no order beforehand: spontaneous buys and market days. They're kept as orders
-- (so they show in order history) that are sent straight away, taking their items off stock.
alter table public.orders
  add column kind text not null default 'order' check (kind in ('order', 'spontaneous', 'market'));

-- Record a sale: lines are [{"stock_item_id": "...", "quantity": 2}, ...]; the same item may appear twice.
-- Spontaneous buys use the wholesale price; market sales use the website price where there is one.
create function public.pod_record_sale(kind text, customer text, note text, lines jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved_id uuid;
  l record;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  if pod_record_sale.kind not in ('spontaneous', 'market') then raise exception 'Unknown kind of sale.'; end if;

  insert into public.orders (kind, customer, note, status, sent_at)
  values (
    pod_record_sale.kind,
    coalesce(nullif(trim(pod_record_sale.customer), ''), case when pod_record_sale.kind = 'market' then 'Market' else 'Spontaneous buy' end),
    nullif(trim(pod_record_sale.note), ''),
    'sent',
    now()
  )
  returning id into saved_id;

  insert into public.order_lines (order_id, stock_item_id, quantity, unit_price)
  select saved_id, s.id, w.quantity,
    case when pod_record_sale.kind = 'market' then coalesce(v.price, s.wholesale_price) else s.wholesale_price end
  from (
    select (e->>'stock_item_id')::uuid as stock_item_id, sum((e->>'quantity')::integer) as quantity
    from jsonb_array_elements(pod_record_sale.lines) e
    where (e->>'quantity')::integer > 0
    group by 1
  ) w
  join public.stock_items s on s.id = w.stock_item_id
  left join public.product_variants v on v.id = s.variant_id;

  if not exists (select 1 from public.order_lines ol where ol.order_id = saved_id) then
    raise exception 'Add at least one item.';
  end if;

  for l in select ol.stock_item_id, ol.quantity from public.order_lines ol where ol.order_id = saved_id loop
    update public.stock_items set quantity = quantity - l.quantity where id = l.stock_item_id;
    insert into public.stock_movements (stock_item_id, change, reason, order_id)
    values (l.stock_item_id, -l.quantity, 'order_sent', saved_id);
  end loop;
  return saved_id;
end;
$$;

-- Undo a sale entered by mistake: its items go back into stock and it's removed from history.
create function public.pod_undo_sale(order_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  l record;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  perform 1 from public.orders o where o.id = pod_undo_sale.order_id and o.kind <> 'order' for update;
  if not found then raise exception 'That sale no longer exists.'; end if;

  for l in select ol.stock_item_id, ol.quantity from public.order_lines ol where ol.order_id = pod_undo_sale.order_id loop
    update public.stock_items set quantity = quantity + l.quantity where id = l.stock_item_id;
    insert into public.stock_movements (stock_item_id, change, reason, order_id)
    values (l.stock_item_id, l.quantity, 'order_unsent', pod_undo_sale.order_id);
  end loop;
  delete from public.orders o where o.id = pod_undo_sale.order_id;
end;
$$;

revoke execute on function public.pod_record_sale(text, text, text, jsonb), public.pod_undo_sale(uuid) from public, anon;
grant execute on function public.pod_record_sale(text, text, text, jsonb), public.pod_undo_sale(uuid) to authenticated;
