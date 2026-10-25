-- Make Data API access opt-in: new tables and functions are not exposed until granted.
alter default privileges for role postgres in schema public
  revoke select, insert, update, delete on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke usage, select on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke execute on functions from public;

-- Helpers live outside the exposed schema so they can't be called over the API.
create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- People allowed into /admin. Added by the owner (dashboard or SQL), never through the API.
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke execute on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Shop products (bars, pure cacao, ...).
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  legacy_url_id text unique,
  title text not null,
  image text not null,
  option_name text not null,
  subscription_discount numeric(4, 3) check (subscription_discount > 0 and subscription_discount < 1),
  subscription_interval text,
  label_size text check (label_size in ('large', 'small')),
  label_default_flavour text,
  ingredients_note text,
  description jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((subscription_discount is null) = (subscription_interval is null))
);

-- A product's options: flavours for the bars, sizes for pure cacao.
create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  label text not null,
  price numeric(10, 2) not null check (price >= 0),
  sold_out boolean not null default false,
  ingredients text,
  label_image text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, label)
);

create table public.workshops (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  legacy_url_id text unique,
  title text not null,
  event_date date,
  images text[] not null default '{}',
  sold_out boolean not null default false,
  option_name text not null,
  description jsonb not null default '[]'::jsonb,
  position integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ticket types for a workshop (adult, child, ...).
create table public.workshop_variants (
  id uuid primary key default gen_random_uuid(),
  workshop_id uuid not null references public.workshops (id) on delete cascade,
  label text not null,
  price numeric(10, 2) not null check (price >= 0),
  sold_out boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workshop_id, label)
);

create trigger set_updated_at before update on public.products
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.product_variants
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.workshops
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.workshop_variants
  for each row execute function private.set_updated_at();

-- Row level security: everyone reads what's published; only admins change anything.
alter table public.admins enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.workshops enable row level security;
alter table public.workshop_variants enable row level security;

create policy "Admins can see the admin list" on public.admins
  for select to authenticated using ((select private.is_admin()));

create policy "Published products are public" on public.products
  for select to anon, authenticated using (is_published or (select private.is_admin()));
create policy "Admins can add products" on public.products
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can edit products" on public.products
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete products" on public.products
  for delete to authenticated using ((select private.is_admin()));

create policy "Options of published products are public" on public.product_variants
  for select to anon, authenticated using (
    exists (select 1 from public.products p where p.id = product_id and p.is_published)
    or (select private.is_admin())
  );
create policy "Admins can add product options" on public.product_variants
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can edit product options" on public.product_variants
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete product options" on public.product_variants
  for delete to authenticated using ((select private.is_admin()));

create policy "Published workshops are public" on public.workshops
  for select to anon, authenticated using (is_published or (select private.is_admin()));
create policy "Admins can add workshops" on public.workshops
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can edit workshops" on public.workshops
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete workshops" on public.workshops
  for delete to authenticated using ((select private.is_admin()));

create policy "Tickets of published workshops are public" on public.workshop_variants
  for select to anon, authenticated using (
    exists (select 1 from public.workshops w where w.id = workshop_id and w.is_published)
    or (select private.is_admin())
  );
create policy "Admins can add workshop tickets" on public.workshop_variants
  for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can edit workshop tickets" on public.workshop_variants
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete workshop tickets" on public.workshop_variants
  for delete to authenticated using ((select private.is_admin()));

-- Data API grants (RLS above still decides which rows).
grant select on public.products, public.product_variants, public.workshops, public.workshop_variants to anon;
grant select, insert, update, delete on public.products, public.product_variants, public.workshops, public.workshop_variants to authenticated;
grant select on public.admins to authenticated;
grant select, insert, update, delete on public.admins, public.products, public.product_variants, public.workshops, public.workshop_variants to service_role;
