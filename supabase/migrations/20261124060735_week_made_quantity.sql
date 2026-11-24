-- The "To make" checklist notes how many of each have been made so far (stock still isn't changed).
-- A note stops counting once those bars are in stock: after a stock take or "made" for that item.
alter table public.week_made
  add column quantity integer not null default 0 check (quantity >= 0),
  -- The item's stock when the note began, so sending an order meanwhile doesn't upset the sums.
  add column stock_before integer not null default 0;

-- The notes that still count. What's needed in all = ordered - in stock + need_offset.
create function public.pod_week_made(week date)
returns table (stock_item_id uuid, quantity integer, need_offset integer)
language sql
stable
set search_path = ''
as $$
  select m.stock_item_id, m.quantity,
    case when s.tracks_stock then least(m.stock_before, 0)
    else coalesce((
      select sum(ol.quantity)::integer from public.order_lines ol join public.orders o on o.id = ol.order_id
      where ol.stock_item_id = m.stock_item_id and o.status = 'sent' and o.sent_at > m.made_at
    ), 0) end
  from public.week_made m
  join public.stock_items s on s.id = m.stock_item_id
  where m.week_start = pod_week_made.week and m.quantity > 0
    and not exists (
      select 1 from public.stock_movements v
      where v.stock_item_id = m.stock_item_id and v.reason in ('stock_take', 'made') and v.created_at > m.made_at
    );
$$;

-- Notes how many of an item have been made so far in a week; 0 clears it.
create function public.pod_set_week_made(week date, item uuid, made integer)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  if pod_set_week_made.made is null or pod_set_week_made.made < 0 then raise exception 'Use whole numbers, e.g. 16.'; end if;
  if pod_set_week_made.made = 0 then
    delete from public.week_made m where m.week_start = pod_set_week_made.week and m.stock_item_id = pod_set_week_made.item;
    return;
  end if;
  -- Correcting a note that still counts keeps when it began.
  update public.week_made m set quantity = pod_set_week_made.made
  where m.week_start = pod_set_week_made.week and m.stock_item_id = pod_set_week_made.item
    and exists (select 1 from public.pod_week_made(pod_set_week_made.week) w where w.stock_item_id = m.stock_item_id);
  if found then return; end if;
  insert into public.week_made as m (week_start, stock_item_id, quantity, stock_before, made_at)
  select pod_set_week_made.week, s.id, pod_set_week_made.made, s.quantity, now()
  from public.stock_items s where s.id = pod_set_week_made.item
  on conflict (week_start, stock_item_id) do update
    set quantity = excluded.quantity, stock_before = excluded.stock_before, made_at = excluded.made_at;
end;
$$;

revoke execute on function public.pod_week_made(date), public.pod_set_week_made(date, uuid, integer) from public, anon;
grant execute on function public.pod_week_made(date), public.pod_set_week_made(date, uuid, integer) to authenticated;
