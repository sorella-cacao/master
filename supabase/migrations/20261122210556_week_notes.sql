-- Notes about a week's orders, shown with that week's making plan in Pod › Orders.
create table public.week_notes (
  week_start date primary key,
  note text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.week_notes enable row level security;
create policy "Admins manage week notes" on public.week_notes
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
grant select, insert, update, delete on public.week_notes to authenticated, service_role;
