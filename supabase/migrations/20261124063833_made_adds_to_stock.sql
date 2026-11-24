-- What's noted as made in Orders › To make is added to stock (and taken back out if lowered). `added`
-- is how much of the note is in stock: notes from before this have none. These replace pod_week_made
-- and pod_set_week_made.
alter table public.week_made add column added integer not null default 0;

-- A week's notes. What's needed in all = ordered - in stock + added + need_offset.
create function public.pod_made(week date)
returns table (stock_item_id uuid, quantity integer, added integer, need_offset integer)
language sql
stable
set search_path = ''
as $$
  select m.stock_item_id, m.quantity, m.added,
    case
      when not s.tracks_stock then coalesce((
        select sum(ol.quantity)::integer from public.order_lines ol join public.orders o on o.id = ol.order_id
        where ol.stock_item_id = m.stock_item_id and o.status = 'sent' and o.sent_at > m.made_at
      ), 0)
      -- A stock take since has put right any stock that was below zero.
      when exists (
        select 1 from public.stock_movements v
        where v.stock_item_id = m.stock_item_id and v.reason = 'stock_take' and v.created_at > m.made_at
      ) then 0
      else least(m.stock_before, 0)
    end
  from public.week_made m
  join public.stock_items s on s.id = m.stock_item_id
  where m.week_start = pod_made.week and m.quantity > 0
    -- A note that was never added to stock stops counting once those bars are counted in.
    and not (m.added < m.quantity and exists (
      select 1 from public.stock_movements v
      where v.stock_item_id = m.stock_item_id and v.reason in ('stock_take', 'made') and v.created_at > m.made_at
    ));
$$;

-- Notes how many of an item have been made so far in a week, and moves its stock to match; 0 clears it.
create function public.pod_set_made(week date, item uuid, made integer)
returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.stock_items;
  m public.week_made;
  current boolean;
  delta integer;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  if pod_set_made.made is null or pod_set_made.made < 0 then raise exception 'Use whole numbers, e.g. 16.'; end if;
  select * into s from public.stock_items si where si.id = pod_set_made.item for update;
  if not found then raise exception 'That flavour no longer exists.'; end if;
  select * into m from public.week_made w where w.week_start = pod_set_made.week and w.stock_item_id = pod_set_made.item for update;
  current := exists (select 1 from public.pod_made(pod_set_made.week) x where x.stock_item_id = pod_set_made.item);
  delta := case when s.tracks_stock then pod_set_made.made - coalesce(m.added, 0) else 0 end;

  if pod_set_made.made = 0 then
    delete from public.week_made w where w.week_start = pod_set_made.week and w.stock_item_id = pod_set_made.item;
  else
    insert into public.week_made as w (week_start, stock_item_id, quantity, added, stock_before, made_at)
    values (pod_set_made.week, s.id, pod_set_made.made, case when s.tracks_stock then pod_set_made.made else 0 end, s.quantity, now())
    on conflict (week_start, stock_item_id) do update
      set quantity = excluded.quantity,
          added = excluded.added,
          -- Correcting a note that still counts keeps when it began.
          stock_before = case when current then w.stock_before else excluded.stock_before end,
          made_at = case when current then w.made_at else excluded.made_at end;
  end if;

  if delta <> 0 then
    update public.stock_items si set quantity = si.quantity + delta where si.id = s.id;
    insert into public.stock_movements (stock_item_id, change, reason) values (s.id, delta, 'made');
  end if;
end;
$$;

revoke execute on function public.pod_made(date), public.pod_set_made(date, uuid, integer) from public, anon;
grant execute on function public.pod_made(date), public.pod_set_made(date, uuid, integer) to authenticated;
