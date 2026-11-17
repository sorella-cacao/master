-- The checkout and webhook Edge Functions work as the service role (default privileges are revoked here).
grant select on public.delivery_options to service_role;
grant select, insert, update on public.checkouts to service_role;
grant select, insert on public.web_orders to service_role;
