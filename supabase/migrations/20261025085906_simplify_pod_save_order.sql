-- Update an order's lines in two plain steps: drop removed items, then add or update the rest.
-- Lines already on the order keep their price; new lines use the current wholesale price.
create or replace function public.pod_save_order(order_id uuid, customer text, needed_by date, note text, lines jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved_id uuid := pod_save_order.order_id;
  current_status text;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  if coalesce(trim(pod_save_order.customer), '') = '' then raise exception 'Enter who the order is for.'; end if;

  if saved_id is null then
    insert into public.orders (customer, needed_by, note)
    values (trim(pod_save_order.customer), pod_save_order.needed_by, nullif(trim(pod_save_order.note), ''))
    returning id into saved_id;
  else
    select o.status into current_status from public.orders o where o.id = saved_id for update;
    if not found then raise exception 'That order no longer exists.'; end if;
    if current_status = 'sent' then raise exception 'Move the order back to Packed before changing it.'; end if;
    update public.orders o
      set customer = trim(pod_save_order.customer),
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
  select saved_id, s.id, (e->>'quantity')::integer, s.wholesale_price
  from jsonb_array_elements(pod_save_order.lines) e
  join public.stock_items s on s.id = (e->>'stock_item_id')::uuid
  where (e->>'quantity')::integer > 0
  on conflict on constraint order_lines_order_id_stock_item_id_key
    do update set quantity = excluded.quantity;

  if not exists (select 1 from public.order_lines l where l.order_id = saved_id) then
    raise exception 'Add at least one item to the order.';
  end if;
  return saved_id;
end;
$$;

revoke execute on function public.pod_save_order(uuid, text, date, text, jsonb) from public, anon;
grant execute on function public.pod_save_order(uuid, text, date, text, jsonb) to authenticated;
