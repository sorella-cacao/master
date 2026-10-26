-- How much base chocolate goes into one of each item, for the weekly "kg to make".
-- Null grams means the size's usual weight (Large bar 100g, Small bar 50g, Pure Cacao by its size).
alter table public.stock_items
  add column chocolate_grams integer check (chocolate_grams > 0),
  add column base_chocolate text;

comment on column public.stock_items.chocolate_grams is 'Grams of base chocolate per item; null = the size''s usual weight';
comment on column public.stock_items.base_chocolate is 'The chocolate this flavour is made from (e.g. 75% Dark), totalled together in the weekly plan';

update public.stock_items s
set chocolate_grams = v.grams, base_chocolate = '75% Dark'
from public.products p,
  (values
    ('large-bar', '75% Dark', 100),
    ('large-bar', '75% Dark Native Salt & Pepper', 99),
    ('large-bar', '75% Dark & Local Mandarins', 90),
    ('small-bar', '75% Dark', 50),
    ('small-bar', '75% Dark & Local Mandarins', 45)
  ) as v(slug, name, grams)
where p.id = s.product_id and p.slug = v.slug and s.name = v.name;
