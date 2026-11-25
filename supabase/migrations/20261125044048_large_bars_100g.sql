-- Large bars are 100g: new invoices say "100g …" (earlier invoices keep what they said).
do $$
declare
  f text;
begin
  foreach f in array array['public.pod_create_invoice(uuid)', 'public.pod_invoice_sold(uuid)'] loop
    execute replace(pg_get_functiondef(f::regprocedure), '108g', '100g');
  end loop;
end;
$$;
