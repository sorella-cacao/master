-- The "Made" boxes on Orders › To make are notes of what's made so far: they no longer add to stock.
-- Stock goes up only through Stock › "Add what I made this week" (pod_add_made), and once that's added
-- the note stops counting (see pod_made). Notes that already added to stock keep what they added.
create or replace function public.pod_set_made(week date, item uuid, made integer)
returns void
language plpgsql
set search_path = ''
as $$
declare
  s public.stock_items;
  current boolean;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  if pod_set_made.made is null or pod_set_made.made < 0 then raise exception 'Use whole numbers, e.g. 16.'; end if;
  select * into s from public.stock_items si where si.id = pod_set_made.item;
  if not found then raise exception 'That flavour no longer exists.'; end if;
  current := exists (select 1 from public.pod_made(pod_set_made.week) x where x.stock_item_id = pod_set_made.item);

  if pod_set_made.made = 0 then
    delete from public.week_made w where w.week_start = pod_set_made.week and w.stock_item_id = pod_set_made.item;
  else
    insert into public.week_made as w (week_start, stock_item_id, quantity, added, stock_before, made_at)
    values (pod_set_made.week, s.id, pod_set_made.made, 0, s.quantity, now())
    on conflict (week_start, stock_item_id) do update
      set quantity = excluded.quantity,
          -- A note that still counts keeps what it added before this change, and when it began.
          added = case when current then w.added else 0 end,
          stock_before = case when current then w.stock_before else excluded.stock_before end,
          made_at = case when current then w.made_at else excluded.made_at end;
  end if;
end;
$$;
