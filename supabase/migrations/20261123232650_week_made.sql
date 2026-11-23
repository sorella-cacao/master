-- What's been ticked off as made in a week's "To make" list in Pod › Orders (a checklist only:
-- stock isn't changed).
create table public.week_made (
  week_start date not null,
  stock_item_id uuid not null references public.stock_items (id) on delete cascade,
  made_at timestamptz not null default now(),
  primary key (week_start, stock_item_id)
);
create index week_made_stock_item_id_idx on public.week_made (stock_item_id);
alter table public.week_made enable row level security;
create policy "Admins manage week made" on public.week_made
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
grant select, insert, update, delete on public.week_made to authenticated, service_role;
