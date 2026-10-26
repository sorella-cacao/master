-- Invoice numbers count up per customer (each shop's invoices run 001, 002, …), not across the business.
alter table public.invoices drop constraint invoices_number_key;
alter table public.invoices add constraint invoices_customer_number_key unique nulls not distinct (customer_id, number);

alter table public.customers add column next_invoice_number integer not null default 1 check (next_invoice_number > 0);
update public.customers c
  set next_invoice_number = coalesce((select max(i.number) + 1 from public.invoices i where i.customer_id = c.id), 1);
alter table public.invoice_settings drop column next_number;

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

  -- Described the way the invoices already read, e.g. "108g Goats Milk", "50g 75% Dark", "250g Pure Cacao".
  insert into public.invoice_lines (invoice_id, position, description, quantity, unit_price)
  select saved_id,
    row_number() over (order by p.position, si.position) - 1,
    case p.slug
      when 'large-bar' then '108g ' || si.name
      when 'small-bar' then '50g ' || si.name
      else si.name || ' ' || p.title
    end,
    ol.quantity,
    ol.unit_price
  from public.order_lines ol
  join public.stock_items si on si.id = ol.stock_item_id
  join public.products p on p.id = si.product_id
  where ol.order_id = o.id;

  if coalesce(c.invoice_postage, false) then
    insert into public.invoice_lines (invoice_id, position, description, quantity, unit_price)
    values (saved_id, (select count(*) from public.invoice_lines l where l.invoice_id = saved_id), 'Postage', 1, null);
  end if;

  return saved_id;
end;
$$;

create or replace function public.pod_save_invoice(invoice_id uuid, number integer, issued_on date, due_on date, bill_to text, notes text, lines jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  if exists (
    select 1 from public.invoices i
    join public.invoices this on this.id = pod_save_invoice.invoice_id
    where i.number = pod_save_invoice.number and i.id <> this.id and i.customer_id is not distinct from this.customer_id
  ) then
    raise exception 'This customer already has an invoice with that number.';
  end if;

  update public.invoices i
    set number = pod_save_invoice.number,
        issued_on = pod_save_invoice.issued_on,
        due_on = pod_save_invoice.due_on,
        bill_to = trim(pod_save_invoice.bill_to),
        notes = nullif(trim(pod_save_invoice.notes), '')
    where i.id = pod_save_invoice.invoice_id;
  if not found then raise exception 'That invoice no longer exists.'; end if;

  delete from public.invoice_lines l where l.invoice_id = pod_save_invoice.invoice_id;
  insert into public.invoice_lines (invoice_id, position, description, quantity, unit_price)
  select pod_save_invoice.invoice_id, (e.ord - 1)::integer, trim(e.value->>'description'),
    (e.value->>'quantity')::numeric, (e.value->>'unit_price')::numeric
  from jsonb_array_elements(pod_save_invoice.lines) with ordinality as e(value, ord);
end;
$$;
