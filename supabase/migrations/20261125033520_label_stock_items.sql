-- Which flavour each label is for, so what's made can fill in how many labels to print. A label for a
-- local fruit that isn't in stock yet (e.g. Plum) is found by its name once it is.
alter table public.labels add column stock_item_id uuid unique references public.stock_items (id) on delete set null;

update public.labels l set stock_item_id = s.id
from (values
  ('large', '75% Dark', '75% Dark', null),
  ('large', '75% Dark & Local Blood Orange', 'Blood Orange', '75% Dark & Local Fruit'),
  ('large', '75% Dark & Local Figs', 'Fig', '75% Dark & Local Fruit'),
  ('large', '75% Native Salt & Pepper', '75% Dark Native Salt & Pepper', null),
  ('large', '75% Smokey Chilli', '75% Smokey Chilli', null),
  ('large', '84% Dark', '84% Dark', null),
  ('large', 'Goat Milk', 'Goats Milk', null),
  ('large', 'Roasted Hazelnuts Gianduja & Salt', 'Local Roasted Hazelnut Gianduja & Salt', null),
  ('large', 'White Choc & Local Peaches', 'White Choc w/ Local Peaches', null),
  ('small', '75% Dark', '75% Dark', null),
  ('small', '75% Dark & Local Fig', 'Fig', '75% Dark & Local Fruit'),
  ('small', '75% Dark & Local Mandarin', 'Citrus', '75% Dark & Local Fruit'),
  ('small', '75% Native Salt & Pepper', '75% Dark Native Salt & Pepper', null),
  ('small', '75% Smokey Chilli', '75% Smokey Chilli', null),
  ('small', '84% Dark', '84% Dark', null),
  ('small', 'Goat Milk', '60% Goats Milk', null),
  ('small', 'Roasted Hazelnuts Gianduja & Salt', 'Local Roasted Hazelnut Gianduja', null),
  ('small', 'White Choc & Local Peaches', 'White Choc & Local Peaches', null)
) as m (size, label, item, parent)
join public.products p on p.title = case m.size when 'large' then 'Large Bar' else 'Small Bar' end
join public.stock_items s on s.product_id = p.id and s.name = m.item
left join public.stock_items par on par.id = s.parent_id
where l.size = m.size and l.name = m.label and par.name is not distinct from m.parent;
