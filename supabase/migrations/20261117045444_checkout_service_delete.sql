-- create-checkout removes a checkout when Stripe couldn't open a payment page for it.
grant delete on public.checkouts to service_role;
