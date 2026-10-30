-- Some customers (e.g. Blue Mountains Food Co-Op) order "a variety"; their invoices combine the bars per
-- size even though the order lists the exact flavours made, for stock.
alter table public.customers add column invoice_variety boolean not null default false;
update public.customers set invoice_variety = true where name = 'Blue Mountains Food Co-Op';

create or replace function public.pod_create_invoice(order_id uuid)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  existing uuid;
  saved_id uuid;
  next_number integer;
  o record;
  s public.invoice_settings;
  c public.customers;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;

  select i.id into existing from public.invoices i where i.order_id = pod_create_invoice.order_id;
  if found then return existing; end if;

  select * into o from public.orders where id = pod_create_invoice.order_id;
  if not found then raise exception 'That order no longer exists.'; end if;
  -- Locking the settings row makes invoices get numbered one at a time.
  select * into s from public.invoice_settings where id for update;
  if o.customer_id is not null then
    select * into c from public.customers where id = o.customer_id;
  end if;

  next_number := greatest(
    coalesce((select max(i.number) from public.invoices i where i.customer_id is not distinct from o.customer_id), 0) + 1,
    coalesce(c.next_invoice_number, 1)
  );

  insert into public.invoices (number, order_id, customer_id, bill_to, issued_on, due_on, seller)
  values (
    next_number,
    o.id,
    o.customer_id,
    concat_ws(E'\n', coalesce(c.name, o.customer), nullif(trim(c.address), '')),
    (now() at time zone 'Australia/Sydney')::date,
    (now() at time zone 'Australia/Sydney')::date + s.payment_terms_days,
    jsonb_build_object(
      'business_name', s.business_name, 'address', s.address, 'email', s.email, 'phone', s.phone,
      'abn', s.abn, 'payable_to', s.payable_to, 'bank_account_name', s.bank_account_name,
      'bank_bsb', s.bank_bsb, 'bank_account_number', s.bank_account_number
    )
  )
  returning id into saved_id;
  if o.customer_id is not null then
    update public.customers set next_invoice_number = next_number + 1 where id = o.customer_id;
  end if;

  -- Described the way the invoices already read, e.g. "108g Goats Milk", "50g 75% Dark", "250g Pure Cacao";
  -- a Local Fruit bar names its fruit, e.g. "108g 75% Dark & Local Fig". Customers who order a
  -- variety see their bars combined per size, e.g. "50g Small Bar Variety".
  insert into public.invoice_lines (invoice_id, position, description, quantity, unit_price)
  select saved_id, (row_number() over (order by min(x.product_position), min(x.item_position)) - 1)::integer,
    x.description, sum(x.quantity), x.unit_price
  from (
    select p.position as product_position, si.position as item_position, ol.quantity, ol.unit_price,
      case
        when coalesce(c.invoice_variety, false) and p.slug = 'large-bar' then '108g Large Bar Variety'
        when coalesce(c.invoice_variety, false) and p.slug = 'small-bar' then '50g Small Bar Variety'
        when p.slug = 'large-bar' then '108g ' || coalesce(replace(par.name, 'Fruit', si.name), si.name)
        when p.slug = 'small-bar' then '50g ' || coalesce(replace(par.name, 'Fruit', si.name), si.name)
        else si.name || ' ' || p.title
      end as description
    from public.order_lines ol
    join public.stock_items si on si.id = ol.stock_item_id
    join public.products p on p.id = si.product_id
    left join public.stock_items par on par.id = si.parent_id
    where ol.order_id = o.id
  ) x
  group by x.description, x.unit_price;

  if coalesce(c.invoice_postage, false) then
    insert into public.invoice_lines (invoice_id, position, description, quantity, unit_price)
    values (saved_id, (select count(*) from public.invoice_lines l where l.invoice_id = saved_id), 'Postage', 1, null);
  end if;

  return saved_id;
end;
$$;
