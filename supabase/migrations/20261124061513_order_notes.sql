-- Notes about orders as a tick list in Pod › Orders. A note shows from the week it's written until the
-- week it's ticked off, so anything not done carries on to the next week. (Replaces week_notes.)
create table public.order_notes (
  id uuid primary key default gen_random_uuid(),
  note text not null check (trim(note) <> ''),
  week_start date not null,
  done_week date,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.order_notes enable row level security;
create policy "Admins manage order notes" on public.order_notes
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
grant select, insert, update, delete on public.order_notes to authenticated, service_role;
