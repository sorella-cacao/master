-- Council customers get invoices in the council's own layout ("01CULTURAL"-style numbers, short
-- product names, 30-day terms). Payment terms can now differ per customer.
alter table public.customers
  add column invoice_layout text not null default 'standard' check (invoice_layout in ('standard', 'council')),
  add column invoice_number_suffix text,
  add column payment_terms_days integer check (payment_terms_days >= 0);
alter table public.invoices
  add column layout text not null default 'standard' check (layout in ('standard', 'council')),
  add column number_suffix text;
alter table public.invoice_settings
  add column owner_name text not null default '',
  add column street_address text not null default '',
  add column bank_name text not null default '';
-- A short name for council invoices, e.g. "Hazelnut" for "Local Roasted Hazelnut Gianduja & Salt".
alter table public.stock_items add column invoice_name text;
update public.stock_items set invoice_name = 'Hazelnut' where name ilike '%hazelnut gianduja%';
update public.stock_items set invoice_name = 'Native Salt & Pepper' where name ilike '%native salt%';
update public.stock_items set invoice_name = 'White Choc Peach' where name ilike 'white choc%peach%';
update public.stock_items set invoice_name = 'Smokey Chilli' where name ilike '%smokey chilli%';
update public.stock_items set invoice_name = 'Local Fruit' where name = '75% Dark & Local Fruit';

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

  insert into public.invoices (number, order_id, customer_id, bill_to, issued_on, due_on, seller, layout, number_suffix)
  values (
    next_number,
    o.id,
    o.customer_id,
    -- Council invoices are addressed exactly as their address reads.
    case when c.invoice_layout = 'council' and nullif(trim(c.address), '') is not null then trim(c.address)
      else concat_ws(E'\n', coalesce(c.name, o.customer), nullif(trim(c.address), '')) end,
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
        -- Council invoices use short names, e.g. "108g Hazelnut Bar", "50g Local Fruit (mandarin) Bar".
        when c.invoice_layout = 'council' and p.slug in ('large-bar', 'small-bar') then
          case p.slug when 'large-bar' then '108g ' else '50g ' end
          || coalesce(case when si.parent_id is not null then 'Local Fruit (' || lower(si.name) || ')' end, si.invoice_name, si.name) || ' Bar'
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

create or replace function public.pod_create_manual_invoice(customer text, description text, quantity numeric, unit_price numeric)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  saved_id uuid;
  next_number integer;
  s public.invoice_settings;
  c public.customers;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  if coalesce(trim(pod_create_manual_invoice.customer), '') = '' then raise exception 'Enter who the invoice is for.'; end if;
  if coalesce(trim(pod_create_manual_invoice.description), '') = '' then raise exception 'Enter what it''s for, e.g. Chocolate making workshop.'; end if;

  -- Locking the settings row makes invoices get numbered one at a time.
  select * into s from public.invoice_settings where id for update;
  select * into c from public.customers cu where lower(cu.name) = lower(trim(pod_create_manual_invoice.customer));
  if not found then
    insert into public.customers (name) values (trim(pod_create_manual_invoice.customer)) returning * into c;
  end if;

  next_number := greatest(
    coalesce((select max(i.number) from public.invoices i where i.customer_id = c.id), 0) + 1,
    c.next_invoice_number
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

  insert into public.invoice_lines (invoice_id, position, description, quantity, unit_price)
  values (saved_id, 0, trim(pod_create_manual_invoice.description), coalesce(pod_create_manual_invoice.quantity, 1), pod_create_manual_invoice.unit_price);

  return saved_id;
end;
$$;


