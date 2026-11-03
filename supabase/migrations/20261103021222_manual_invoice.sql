-- An invoice that isn't for an order (e.g. a workshop), so it never touches stock. Someone not yet
-- a customer is added as one, so their invoices are numbered like everyone else's.
create function public.pod_create_manual_invoice(customer text, description text, quantity numeric, unit_price numeric)
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

  insert into public.invoices (number, customer_id, bill_to, issued_on, due_on, seller)
  values (
    next_number,
    c.id,
    concat_ws(E'\n', c.name, nullif(trim(c.address), '')),
    (now() at time zone 'Australia/Sydney')::date,
    (now() at time zone 'Australia/Sydney')::date + s.payment_terms_days,
    jsonb_build_object(
      'business_name', s.business_name, 'address', s.address, 'email', s.email, 'phone', s.phone,
      'abn', s.abn, 'payable_to', s.payable_to, 'bank_account_name', s.bank_account_name,
      'bank_bsb', s.bank_bsb, 'bank_account_number', s.bank_account_number
    )
  )
  returning id into saved_id;
  update public.customers cu set next_invoice_number = next_number + 1 where cu.id = c.id;

  insert into public.invoice_lines (invoice_id, position, description, quantity, unit_price)
  values (saved_id, 0, trim(pod_create_manual_invoice.description), coalesce(pod_create_manual_invoice.quantity, 1), pod_create_manual_invoice.unit_price);

  return saved_id;
end;
$$;

revoke execute on function public.pod_create_manual_invoice(text, text, numeric, numeric) from public, anon;
grant execute on function public.pod_create_manual_invoice(text, text, numeric, numeric) to authenticated;
