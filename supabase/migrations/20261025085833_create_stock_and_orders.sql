-- Stock levels and wholesale orders, managed in the Pod. Private to admins.

-- Something that's made and counted: a website flavour/size, or an extra flavour added in the Pod.
create table public.stock_items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete restrict,
  variant_id uuid unique references public.product_variants (id) on delete set null,
  name text not null,
  wholesale_price numeric(10, 2) not null default 0 check (wholesale_price >= 0),
  quantity integer not null default 0,
  is_extra boolean not null default false,
  is_active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, name)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  customer text not null check (customer <> ''),
  needed_by date,
  status text not null default 'to_make' check (status in ('to_make', 'packed', 'sent')),
  note text,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  stock_item_id uuid not null references public.stock_items (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null check (unit_price >= 0),
  unique (order_id, stock_item_id)
);
create index order_lines_stock_item_id_idx on public.order_lines (stock_item_id);

-- Every change to a stock level, and why.
create table public.stock_movements (
  id bigint generated always as identity primary key,
  stock_item_id uuid not null references public.stock_items (id) on delete cascade,
  change integer not null,
  reason text not null check (reason in ('stock_take', 'made', 'order_sent', 'order_unsent')),
  order_id uuid references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);
create index stock_movements_stock_item_id_idx on public.stock_movements (stock_item_id);
create index stock_movements_order_id_idx on public.stock_movements (order_id);

create trigger set_updated_at before update on public.stock_items
  for each row execute function private.set_updated_at();
create trigger set_updated_at before update on public.orders
  for each row execute function private.set_updated_at();

alter table public.stock_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.stock_movements enable row level security;

create policy "Admins manage stock items" on public.stock_items
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage orders" on public.orders
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins manage order lines" on public.order_lines
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins see stock history" on public.stock_movements
  for select to authenticated using ((select private.is_admin()));
create policy "Admins record stock history" on public.stock_movements
  for insert to authenticated with check ((select private.is_admin()));

grant select, insert, update, delete on public.stock_items, public.orders, public.order_lines to authenticated;
grant select, insert on public.stock_movements to authenticated;
grant select, insert, update, delete on public.stock_items, public.orders, public.order_lines, public.stock_movements to service_role;

-- Keep a stock item for every website flavour/size, following renames.
create function private.sync_stock_item()
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
    update public.stock_items set name = new.label where variant_id = new.id;
  end if;
  return new;
end;
$$;

create trigger sync_stock_item after insert or update of label on public.product_variants
  for each row execute function private.sync_stock_item();

-- Start with the website's flavours and sizes, at the September 2026 wholesale prices.
insert into public.stock_items (product_id, variant_id, name, wholesale_price, position)
select p.id, v.id, v.label,
  case
    when p.slug = 'large-bar' then 9.50
    when p.slug = 'small-bar' then 5.50
    when p.slug = 'pure-cacao' and v.label = '250g' then 23.80
    when p.slug = 'pure-cacao' and v.label = '500g' then 40.80
    when p.slug = 'pure-cacao' and v.label = '1kg' then 68.00
    else round(v.price * 0.6, 2)
  end,
  v.position
from public.product_variants v
join public.products p on p.id = v.product_id;

-- Stock changes happen only through these functions, so counts and history stay in step.

-- Set exact counts: [{"id": "...", "quantity": 12}, ...]
create function public.pod_save_stock_take(counts jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  c record;
  old_quantity integer;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  for c in select (e->>'id')::uuid as id, (e->>'quantity')::integer as quantity from jsonb_array_elements(counts) e loop
    select quantity into old_quantity from public.stock_items where id = c.id for update;
    if not found then continue; end if;
    if c.quantity is distinct from old_quantity then
      update public.stock_items set quantity = c.quantity where id = c.id;
      insert into public.stock_movements (stock_item_id, change, reason) values (c.id, c.quantity - old_quantity, 'stock_take');
    end if;
  end loop;
end;
$$;

-- Add what was made: [{"id": "...", "quantity": 24}, ...]
create function public.pod_add_made(counts jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  c record;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  for c in select (e->>'id')::uuid as id, (e->>'quantity')::integer as quantity from jsonb_array_elements(counts) e loop
    if c.quantity is null or c.quantity <= 0 then continue; end if;
    update public.stock_items set quantity = quantity + c.quantity where id = c.id;
    if found then
      insert into public.stock_movements (stock_item_id, change, reason) values (c.id, c.quantity, 'made');
    end if;
  end loop;
end;
$$;

-- Create or update an order (first version; replaced by 20261025085906_simplify_pod_save_order).
create function public.pod_save_order(order_id uuid, customer text, needed_by date, note text, lines jsonb)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved_id uuid := order_id;
  current_status text;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  if coalesce(trim(customer), '') = '' then raise exception 'Enter who the order is for.'; end if;

  if saved_id is null then
    insert into public.orders (customer, needed_by, note)
    values (trim(customer), needed_by, nullif(trim(note), ''))
    returning id into saved_id;
  else
    select status into current_status from public.orders where id = saved_id for update;
    if not found then raise exception 'That order no longer exists.'; end if;
    if current_status = 'sent' then raise exception 'Move the order back to Packed before changing it.'; end if;
    update public.orders
      set customer = trim(pod_save_order.customer), needed_by = pod_save_order.needed_by, note = nullif(trim(pod_save_order.note), '')
      where id = saved_id;
  end if;

  with wanted as (
    select (e->>'stock_item_id')::uuid as stock_item_id, (e->>'quantity')::integer as quantity
    from jsonb_array_elements(lines) e
    where (e->>'quantity')::integer > 0
  ),
  priced as (
    select w.stock_item_id, w.quantity,
      coalesce(
        (select l.unit_price from public.order_lines l where l.order_id = saved_id and l.stock_item_id = w.stock_item_id),
        s.wholesale_price
      ) as unit_price
    from wanted w
    join public.stock_items s on s.id = w.stock_item_id
  ),
  removed as (
    delete from public.order_lines l where l.order_id = saved_id returning 1
  )
  insert into public.order_lines (order_id, stock_item_id, quantity, unit_price)
  select saved_id, p.stock_item_id, p.quantity, p.unit_price
  from priced p, (select count(*) from removed) r;

  if not exists (select 1 from public.order_lines l where l.order_id = saved_id) then
    raise exception 'Add at least one item to the order.';
  end if;
  return saved_id;
end;
$$;

-- Change an order's status; marking it sent takes its items out of stock, and un-sending puts them back.
create function public.pod_set_order_status(order_id uuid, status text)
returns void
language plpgsql
set search_path = ''
as $$
declare
  old_status text;
  l record;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  if status not in ('to_make', 'packed', 'sent') then raise exception 'Unknown status.'; end if;

  select o.status into old_status from public.orders o where o.id = order_id for update;
  if not found then raise exception 'That order no longer exists.'; end if;
  if old_status = status then return; end if;

  if status = 'sent' or old_status = 'sent' then
    for l in select ol.stock_item_id, ol.quantity from public.order_lines ol where ol.order_id = pod_set_order_status.order_id loop
      update public.stock_items
        set quantity = quantity + (case when status = 'sent' then -l.quantity else l.quantity end)
        where id = l.stock_item_id;
      insert into public.stock_movements (stock_item_id, change, reason, order_id)
      values (
        l.stock_item_id,
        case when status = 'sent' then -l.quantity else l.quantity end,
        case when status = 'sent' then 'order_sent' else 'order_unsent' end,
        pod_set_order_status.order_id
      );
    end loop;
  end if;

  update public.orders o
    set status = pod_set_order_status.status,
        sent_at = case when pod_set_order_status.status = 'sent' then now() else null end
    where o.id = pod_set_order_status.order_id;
end;
$$;

revoke execute on function public.pod_save_stock_take(jsonb), public.pod_add_made(jsonb),
  public.pod_save_order(uuid, text, date, text, jsonb), public.pod_set_order_status(uuid, text)
  from public, anon;
grant execute on function public.pod_save_stock_take(jsonb), public.pod_add_made(jsonb),
  public.pod_save_order(uuid, text, date, text, jsonb), public.pod_set_order_status(uuid, text)
  to authenticated;
