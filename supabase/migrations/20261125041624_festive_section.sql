-- A subtitle some flavours and labels are listed under, e.g. "Festive".
alter table public.stock_items add column section text;
alter table public.labels add column section text;

-- The Christmas bars, in both sizes.
insert into public.stock_items (product_id, name, wholesale_price, position, base_chocolate, section)
select p.id, f.name, case p.slug when 'large-bar' then 9.50 else 5.50 end, f.position, '75% Dark', 'Festive'
from public.products p, (values ('Sweet & Nutty', 100), ('Naughty & Spiced', 101)) as f (name, position)
where p.slug in ('large-bar', 'small-bar');

insert into public.labels (size, name, position, front_file, back_file, section, stock_item_id, stamps)
select v.size, v.name, v.position, v.front, v.back, 'Festive', s.id, v.stamps::jsonb
from (values
  ('large', 'Sweet & Nutty', 100, 'Large Logo Christmas- Sweet & Nutty.pdf', 'Large Ingredients Christmas- Sweet & Nutty.pdf',
   '[{"kind": "date", "text": "Best Before 28/10/2027 ", "box": [111.99, 10.21, 49.7, 6.93], "x": 112.59, "y": 12.04, "size": 4.21, "angle": 0}, {"kind": "batch", "text": "Batch # 261026S&N", "box": [4.12, 71.94, 41.4, 6.91], "x": 4.72, "y": 73.77, "size": 4.19, "angle": 0}]'),
  ('large', 'Naughty & Spiced', 101, 'Large Logo Christmas- Naughty & Spiced.pdf', 'Large Ingredients Christmas- Naughty & Spiced.pdf',
   '[{"kind": "date", "text": "Best Before 28/10/2027 ", "box": [110.87, 14.44, 52.71, 7.29], "x": 111.47, "y": 16.35, "size": 4.47, "angle": 0}, {"kind": "batch", "text": "Batch # 261026N&S", "box": [7.3, 69.57, 41.4, 6.91], "x": 7.9, "y": 71.39, "size": 4.19, "angle": 0}]'),
  ('small', 'Sweet & Nutty', 100, 'Small Logo Christmas- Sweet & Nutty.pdf', 'Small Ingredients Christmas- Sweet & Nutty.pdf',
   '[{"kind": "date", "text": "Best Before 28/10/2027 ", "box": [131.4, 7.74, 6.69, 47.63], "x": 136.3, "y": 8.34, "size": 4.03, "angle": 90}, {"kind": "batch", "text": "Batch # 261026S&N", "box": [21.8, 57.9, 6.1, 35.74], "x": 26.25, "y": 58.5, "size": 3.6, "angle": 90}]'),
  ('small', 'Naughty & Spiced', 101, 'Small Logo Christmas- Naughty & Spiced.pdf', 'Small Ingredients Christmas- Naughty & Spiced.pdf',
   '[{"kind": "date", "text": "Best Before 28/10/2027 ", "box": [135.27, 9.92, 6.1, 42.68], "x": 139.72, "y": 10.52, "size": 3.6, "angle": 90}, {"kind": "batch", "text": "Batch # 261026N&S", "box": [26.47, 57.39, 6.31, 37.18], "x": 31.08, "y": 57.99, "size": 3.75, "angle": 90}]')
) as v (size, name, position, front, back, stamps)
join public.products p on p.slug = v.size || '-bar'
join public.stock_items s on s.product_id = p.id and s.name = v.name and s.section = 'Festive';
