-- Label layouts: how far each part of a label is moved from its standard place, and its width, text
-- size and font, e.g. {"ingredients": {"x": 1.5, "y": -0.5, "width": 110, "size": 105, "font": "garamond"}}
-- (x and y in mm; width and size in %). Each size has a layout shared by its labels; a label can have its own.
-- Text sizes move into the layout (none had been set yet); the old text_sizes column goes once the Pod no longer reads it.
create table public.label_layouts (
  size text primary key check (size in ('small', 'large')),
  layout jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.label_layouts
  for each row execute function private.set_updated_at();
alter table public.label_layouts enable row level security;
create policy "Admins manage label layouts" on public.label_layouts
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
grant select, insert, update on public.label_layouts to authenticated;
insert into public.label_layouts (size) values ('small'), ('large');

-- Null means the label uses its size's layout.
alter table public.labels add column layout jsonb;
