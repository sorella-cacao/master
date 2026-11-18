-- Seasonal products and the home page promotion (first used for the Christmas bundle).
--
-- products.available_until: the last day a product can be ordered (Sydney time); after it the product
-- leaves the shop and checkout refuses it. site_promo: the strip across the top of every page and the
-- banner on the home page, for one product, shown while it's switched on and the product can be ordered.

alter table public.products add column available_until date;

create table public.site_promo (
  id boolean primary key default true check (id),
  enabled boolean not null default false,
  product_id uuid references public.products (id) on delete set null,
  strip_text text not null default '',
  banner_title text not null default '',
  banner_text text not null default '',
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.site_promo
  for each row execute function private.set_updated_at();
alter table public.site_promo enable row level security;
create policy "Anyone can see the promotion" on public.site_promo for select to anon, authenticated using (true);
create policy "Admins change the promotion" on public.site_promo
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
grant select on public.site_promo to anon, authenticated;
grant update on public.site_promo to authenticated;

with bundle as (
  -- Hidden until the website is ready to show it.
  insert into public.products (slug, title, image, option_name, ingredients_note, description, position, is_published)
  values (
    'christmas-bundle',
    'Christmas Bundle',
    '/images/small-bar.webp',
    'Bundle',
    null,
    jsonb_build_array(
      jsonb_build_object('p', 'Three small Christmas chocolates, handmade in the Blue Mountains. Wrapped and ready to give.'),
      jsonb_build_object('p', 'Spiced Milk Chocolate: Roasted cacao (60%)**, cacao butter*, rapadura sugar (25%)*, nutmeg*, cinnamon*, ginger*'),
      jsonb_build_object('p', '75% Dark & Roasted Almonds: Roasted cacao (75%)**, rapadura sugar (25%), roasted almonds*'),
      jsonb_build_object('p', '75% Dark & Tart Cherry: Roasted cacao (75%)**, rapadura sugar (25%), tart cherries (no sugar added)*'),
      jsonb_build_object('p', '*Certified organic ingredients **Ethically sourced')
    ),
    -1,
    false
  )
  returning id
)
insert into public.product_variants (product_id, label, price, position)
select id, '3 small Christmas bars', 24, 0 from bundle;

insert into public.site_promo (enabled, product_id, strip_text, banner_title, banner_text)
select true, id, 'Christmas bundle · 3 bars for $24', 'A Christmas Bundle',
  'Three small Christmas chocolates, handmade in the Blue Mountains. Wrapped and ready to give.'
from public.products where slug = 'christmas-bundle';
