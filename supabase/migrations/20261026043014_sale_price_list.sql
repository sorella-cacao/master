-- Spontaneous buys can be charged at wholesale or retail (website) prices; markets are always retail.
drop function public.pod_record_sale(text, text, text, jsonb);

create function public.pod_record_sale(kind text, customer text, note text, lines jsonb, price_list text)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved_id uuid;
  retail boolean;
  l record;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  if pod_record_sale.kind not in ('spontaneous', 'market') then raise exception 'Unknown kind of sale.'; end if;
  if pod_record_sale.price_list not in ('wholesale', 'retail') then raise exception 'Choose wholesale or retail.'; end if;
  retail := pod_record_sale.kind = 'market' or pod_record_sale.price_list = 'retail';

  insert into public.orders (kind, customer, note, status, sent_at)
  values (
    pod_record_sale.kind,
    coalesce(nullif(trim(pod_record_sale.customer), ''), case when pod_record_sale.kind = 'market' then 'Market' else 'Spontaneous buy' end),
    nullif(trim(pod_record_sale.note), ''),
    'sent',
    now()
  )
  returning id into saved_id;

  -- One-off flavours have no website price, so they use wholesale either way.
  insert into public.order_lines (order_id, stock_item_id, quantity, unit_price)
  select saved_id, s.id, w.quantity,
    case when retail then coalesce(v.price, s.wholesale_price) else s.wholesale_price end
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

revoke execute on function public.pod_record_sale(text, text, text, jsonb, text) from public, anon;
grant execute on function public.pod_record_sale(text, text, text, jsonb, text) to authenticated;
