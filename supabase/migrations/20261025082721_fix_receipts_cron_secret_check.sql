-- vault.decrypted_secrets has its own "secret" column, which shadowed the parameter.
create or replace function public.receipts_cron_secret_matches(secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets s
    where s.name = 'receipts_cron_secret' and s.decrypted_secret = $1
  );
$$;
revoke execute on function public.receipts_cron_secret_matches(text) from public, anon, authenticated;
grant execute on function public.receipts_cron_secret_matches(text) to service_role;
