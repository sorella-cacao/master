-- Allow half grams (a small Native Salt & Pepper bar uses 49.5g of 75% Dark).
alter table public.stock_items
  alter column chocolate_grams type numeric(6, 1);

-- Small 75% Dark Native Salt & Pepper: made and ordered wholesale, not (yet) sold on the website.
insert into public.stock_items (product_id, name, wholesale_price, is_extra, position, chocolate_grams, base_chocolate)
select p.id, '75% Dark Native Salt & Pepper', 5.50, true,
  (select coalesce(max(s.position), -1) + 1 from public.stock_items s where s.product_id = p.id),
  49.5, '75% Dark'
from public.products p
where p.slug = 'small-bar'
on conflict (product_id, name) do nothing;
