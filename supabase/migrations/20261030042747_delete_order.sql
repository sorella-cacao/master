-- Delete an order at any stage. If it was sent, its items go back into stock first.
-- Any invoice made for it stays in the invoice records.
create function public.pod_delete_order(order_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  current_status text;
  l record;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  select o.status into current_status from public.orders o where o.id = pod_delete_order.order_id for update;
  if not found then raise exception 'That order no longer exists.'; end if;

  if current_status = 'sent' then
    for l in select ol.stock_item_id, ol.quantity from public.order_lines ol where ol.order_id = pod_delete_order.order_id loop
      update public.stock_items set quantity = quantity + l.quantity where id = l.stock_item_id;
      insert into public.stock_movements (stock_item_id, change, reason, order_id)
      values (l.stock_item_id, l.quantity, 'order_unsent', pod_delete_order.order_id);
    end loop;
  end if;
  delete from public.orders o where o.id = pod_delete_order.order_id;
end;
$$;

revoke execute on function public.pod_delete_order(uuid) from public, anon;
grant execute on function public.pod_delete_order(uuid) to authenticated;
