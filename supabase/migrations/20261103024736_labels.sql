-- Ingredient labels made in the Pod (a trial of two to start). Each label is one flavour in one size;
-- its batch number is the 4 digits typed in each time, the year, then batch_code, e.g. 2610 26 84.
create table public.labels (
  id uuid primary key default gen_random_uuid(),
  size text not null check (size in ('small', 'large')),
  name text not null,
  batch_code text not null,
  -- "Cacao beans (84%)**, rapadura sugar(16%)*", printed after an underlined "Ingredients:".
  ingredients text not null,
  ingredient_notes text not null default '*Organic Ingredients **Ethically farmed',
  -- Words printed bold after "May contain:", e.g. "Milk & nuts".
  may_contain text not null default '',
  servings_per_package text not null,
  serving_size text not null default '20g',
  -- Nutrition panel rows as printed, per serving and per 100 g, e.g. {"energy": ["503 kJ", "2516 kJ"], ...}.
  nutrition jsonb not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (size, name)
);

create trigger set_updated_at before update on public.labels
  for each row execute function private.set_updated_at();

alter table public.labels enable row level security;
create policy "Admins manage labels" on public.labels
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
grant select, insert, update, delete on public.labels to authenticated;

insert into public.labels (size, name, batch_code, ingredients, ingredient_notes, may_contain, servings_per_package, nutrition, position) values
  ('small', '84% Dark', '84', 'Cacao beans (84%)**, rapadura sugar(16%)*', '*Organic Ingredients **Ethically farmed', 'Nuts & dairy', '2.5',
   '{"energy": ["503 kJ", "2516 kJ"], "protein": ["1.7 g", "8.4 g"], "fat": ["9 g", "44.8 g"], "saturated": ["5 g", "25.1 g"],
     "carbohydrate": ["6.3 g", "31.3 g"], "sugars": ["2.7 g", "13.6 g"], "sodium": ["0 mg", "2 mg"]}', 1),
  ('large', '75% Dark', '75', 'Roasted Cacao beans (75%)**, rapadura sugar (25%)*', '*Organic Ingredients **ethically farmed', 'Milk & nuts', '5.4',
   '{"energy": ["481 kJ", "2405 kJ"], "protein": ["1.5 g", "7.5 g"], "fat": ["8 g", "40.1 g"], "saturated": ["4.5 g", "22.4 g"],
     "carbohydrate": ["7.5 g", "37.7 g"], "sugars": ["4.2 g", "21.2 g"], "sodium": ["1 mg", "3 mg"]}', 0);
