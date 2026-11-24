-- Sale or return: some shops take stock now and pay later for what they've sold. Their orders come off
-- stock when sent, as usual; what's sold is then marked on each order, and invoiced all together.
alter table public.customers add column sale_or_return boolean not null default false;

-- What a shop has sold from an order's line: waiting to be invoiced until it has an invoice. Deleting
-- the invoice puts it back to waiting.
create table public.consignment_sales (
  id uuid primary key default gen_random_uuid(),
  order_line_id uuid not null references public.order_lines (id) on delete cascade,
  quantity integer not null check (quantity > 0),
  invoice_id uuid references public.invoices (id) on delete set null,
  created_at timestamptz not null default now()
);
create index consignment_sales_order_line_id_idx on public.consignment_sales (order_line_id);
create index consignment_sales_invoice_id_idx on public.consignment_sales (invoice_id);
alter table public.consignment_sales enable row level security;
create policy "Admins manage consignment sales" on public.consignment_sales
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
grant select, insert, update, delete on public.consignment_sales to authenticated, service_role;

-- Marks how many of an order's line have sold since the last invoice (0 clears it).
create function public.pod_set_sold(line uuid, sold integer)
returns void
language plpgsql
set search_path = ''
as $$
declare
  l record;
  available integer;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  if pod_set_sold.sold is null or pod_set_sold.sold < 0 then raise exception 'Use whole numbers, e.g. 3.'; end if;
  select ol.id, ol.quantity, o.status, c.sale_or_return,
    exists (select 1 from public.invoices i where i.order_id = o.id) as invoiced
    into l
  from public.order_lines ol join public.orders o on o.id = ol.order_id left join public.customers c on c.id = o.customer_id
  where ol.id = pod_set_sold.line for update of ol;
  if not found then raise exception 'That order no longer exists.'; end if;
  if l.status <> 'sent' then raise exception 'Mark the order as sent first.'; end if;
  if not coalesce(l.sale_or_return, false) or l.invoiced then raise exception 'That order isn’t sale or return.'; end if;

  available := l.quantity - coalesce((select sum(s.quantity) from public.consignment_sales s where s.order_line_id = l.id and s.invoice_id is not null), 0);
  if pod_set_sold.sold > available then raise exception 'They only have % of those left from this order.', available; end if;
  delete from public.consignment_sales s where s.order_line_id = l.id and s.invoice_id is null;
  if pod_set_sold.sold > 0 then
    insert into public.consignment_sales (order_line_id, quantity) values (l.id, pod_set_sold.sold);
  end if;
end;
$$;

-- Makes one invoice for everything a sale-or-return customer has sold that isn't invoiced yet.
create function public.pod_invoice_sold(customer uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved_id uuid;
  next_number integer;
  sale_ids uuid[];
  s public.invoice_settings;
  c public.customers;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  select * into s from public.invoice_settings where id for update;
  select * into c from public.customers cu where cu.id = pod_invoice_sold.customer and cu.sale_or_return;
  if not found then raise exception 'That customer isn’t sale or return.'; end if;

  select array_agg(x.id) into sale_ids from (
    select cs.id from public.consignment_sales cs
    join public.order_lines ol on ol.id = cs.order_line_id join public.orders o on o.id = ol.order_id
    where o.customer_id = c.id and cs.invoice_id is null for update of cs
  ) x;
  if sale_ids is null then raise exception 'Tick what they’ve sold first.'; end if;

  next_number := greatest(
    coalesce((select max(i.number) from public.invoices i where i.customer_id = c.id), 0) + 1,
    coalesce(c.next_invoice_number, 1)
  );
  insert into public.invoices (number, customer_id, bill_to, issued_on, due_on, seller, layout, number_suffix)
  values (
    next_number,
    c.id,
    case when c.invoice_layout = 'council' and nullif(trim(c.address), '') is not null then trim(c.address)
      else concat_ws(E'\n', c.name, nullif(trim(c.address), '')) end,
    (now() at time zone 'Australia/Sydney')::date,
    (now() at time zone 'Australia/Sydney')::date + coalesce(c.payment_terms_days, s.payment_terms_days),
    jsonb_build_object(
      'business_name', s.business_name, 'address', s.address, 'email', s.email, 'phone', s.phone,
      'abn', s.abn, 'payable_to', s.payable_to, 'bank_account_name', s.bank_account_name,
      'bank_bsb', s.bank_bsb, 'bank_account_number', s.bank_account_number,
      'owner_name', s.owner_name, 'street_address', s.street_address, 'bank_name', s.bank_name
    ),
    coalesce(c.invoice_layout, 'standard'),
    c.invoice_number_suffix
  )
  returning id into saved_id;
  update public.customers cu set next_invoice_number = next_number + 1 where cu.id = c.id;

  -- Described as on other invoices (see pod_create_invoice).
  insert into public.invoice_lines (invoice_id, position, description, quantity, unit_price)
  select saved_id, (row_number() over (order by min(x.product_position), min(x.item_position)) - 1)::integer,
    x.description, sum(x.quantity), x.unit_price
  from (
    select p.position as product_position, si.position as item_position, cs.quantity, ol.unit_price,
      case
        when coalesce(c.invoice_variety, false) and p.slug = 'large-bar' then '108g Large Bar Variety'
        when coalesce(c.invoice_variety, false) and p.slug = 'small-bar' then '50g Small Bar Variety'
        when c.invoice_layout = 'council' and p.slug in ('large-bar', 'small-bar') then
          case p.slug when 'large-bar' then '108g ' else '50g ' end
          || coalesce(case when si.parent_id is not null then 'Local Fruit (' || lower(si.name) || ')' end, si.invoice_name, si.name) || ' Bar'
        when p.slug = 'large-bar' then '108g ' || coalesce(replace(par.name, 'Fruit', si.name), si.name)
        when p.slug = 'small-bar' then '50g ' || coalesce(replace(par.name, 'Fruit', si.name), si.name)
        else si.name || ' ' || p.title
      end as description
    from public.consignment_sales cs
    join public.order_lines ol on ol.id = cs.order_line_id
    join public.stock_items si on si.id = ol.stock_item_id
    join public.products p on p.id = si.product_id
    left join public.stock_items par on par.id = si.parent_id
    where cs.id = any (sale_ids)
  ) x
  group by x.description, x.unit_price;

  if coalesce(c.invoice_postage, false) then
    insert into public.invoice_lines (invoice_id, position, description, quantity, unit_price)
    values (saved_id, (select count(*) from public.invoice_lines l where l.invoice_id = saved_id), 'Postage', 1, null);
  end if;
  update public.consignment_sales cs set invoice_id = saved_id where cs.id = any (sale_ids);
  return saved_id;
end;
$$;

-- An order with sales marked can't be un-sent or deleted (its whole quantity would go back into stock),
-- nor invoiced in full.
create function private.guard_consignment_order()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.consignment_sales cs join public.order_lines ol on ol.id = cs.order_line_id where ol.order_id = old.id
  ) then
    raise exception 'Some of this order is marked as sold, so it can’t be un-sent or deleted. Untick what’s sold first.';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;
create trigger guard_consignment_unsend before update of status on public.orders
  for each row when (old.status = 'sent' and new.status <> 'sent') execute function private.guard_consignment_order();
create trigger guard_consignment_delete before delete on public.orders
  for each row execute function private.guard_consignment_order();

create function private.guard_consignment_invoice()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.orders o left join public.customers c on c.id = o.customer_id
    where o.id = new.order_id and (coalesce(c.sale_or_return, false) or exists (
      select 1 from public.consignment_sales cs join public.order_lines ol on ol.id = cs.order_line_id where ol.order_id = o.id
    ))
  ) then
    raise exception 'This customer pays for what they sell. Tick what’s sold on their order to invoice it.';
  end if;
  return new;
end;
$$;
create trigger guard_consignment_invoice before insert on public.invoices
  for each row when (new.order_id is not null) execute function private.guard_consignment_invoice();

revoke execute on function public.pod_set_sold(uuid, integer), public.pod_invoice_sold(uuid) from public, anon;
grant execute on function public.pod_set_sold(uuid, integer), public.pod_invoice_sold(uuid) to authenticated;
