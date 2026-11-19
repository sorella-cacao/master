-- Items the Pod lists on orders but doesn't count in stock, like the Christmas bundles: website
-- orders for them show as order lines, and sending or deleting an order leaves their stock alone.
alter table public.stock_items add column tracks_stock boolean not null default true;

create function private.keep_untracked_stock()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not new.tracks_stock then new.quantity := old.quantity; end if;
  return new;
end;
$$;
create trigger keep_untracked_stock before update of quantity on public.stock_items
  for each row execute function private.keep_untracked_stock();

create function private.skip_untracked_movements()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (select 1 from public.stock_items si where si.id = new.stock_item_id and not si.tracks_stock) then return null; end if;
  return new;
end;
$$;
create trigger skip_untracked_movements before insert on public.stock_movements
  for each row execute function private.skip_untracked_movements();

-- The Christmas bundles show on orders as small or large bundles, without counting stock.
update public.stock_items si
set tracks_stock = false,
    name = case when v.label like '2 large%' then 'Large Christmas bundle' else 'Small Christmas bundle' end
from public.product_variants v, public.products p
where v.id = si.variant_id and p.id = si.product_id and p.slug = 'christmas-bundle';
