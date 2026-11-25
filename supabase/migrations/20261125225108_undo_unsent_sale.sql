-- Undoing an odd buy puts its items back into stock only if they'd come off (it was sent).
create or replace function public.pod_undo_sale(order_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  l record;
  was_sent boolean;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  select o.status = 'sent' into was_sent from public.orders o where o.id = pod_undo_sale.order_id and o.kind <> 'order' for update;
  if not found then raise exception 'That sale no longer exists.'; end if;

  if was_sent then
    for l in select ol.stock_item_id, ol.quantity from public.order_lines ol where ol.order_id = pod_undo_sale.order_id loop
      update public.stock_items set quantity = quantity + l.quantity where id = l.stock_item_id;
      insert into public.stock_movements (stock_item_id, change, reason, order_id)
      values (l.stock_item_id, l.quantity, 'order_unsent', pod_undo_sale.order_id);
    end loop;
  end if;
  delete from public.orders o where o.id = pod_undo_sale.order_id;
end;
$$;
