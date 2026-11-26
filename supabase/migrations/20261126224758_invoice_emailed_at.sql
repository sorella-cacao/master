-- When "Email invoice" last made the invoice's email: until then it opens under its order on Orders.
alter table public.invoices add column emailed_at timestamptz;
-- Invoices made before this were already dealt with.
update public.invoices set emailed_at = created_at where emailed_at is null;
