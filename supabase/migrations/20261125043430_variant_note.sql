-- A small line under a flavour on the shop, e.g. which fruit is in season.
alter table public.product_variants add column note text;

-- Renaming a flavour on the website renames its stock item only while they still share a name, so
-- "75% Dark & Local Fruit" in stock can have a different name on the website.
create or replace function private.sync_stock_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.stock_items (product_id, variant_id, name, wholesale_price, position)
    values (
      new.product_id,
      new.id,
      new.label,
      coalesce(
        (select s.wholesale_price from public.stock_items s
         where s.product_id = new.product_id and not s.is_extra
         order by s.position limit 1),
        round(new.price * 0.6, 2)
      ),
      new.position
    )
    on conflict (product_id, name) do update
      set variant_id = excluded.variant_id, is_extra = false, is_active = true;
  elsif new.label is distinct from old.label then
    update public.stock_items set name = new.label where variant_id = new.id and name = old.label;
  end if;
  return new;
end;
$$;
