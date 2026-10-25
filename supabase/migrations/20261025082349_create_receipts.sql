-- Receipts emailed from chocolate@ to itself, filed for tax time.
create table public.receipts (
  id uuid primary key default gen_random_uuid(),
  email_id text not null unique,
  subject text not null default '',
  sender text,
  received_at timestamptz not null,
  -- Saved files: [{ "name": ..., "path": ..., "type": ..., "size": ... }]
  files jsonb not null default '[]'::jsonb,
  amount numeric(10, 2) check (amount >= 0),
  gst numeric(10, 2) check (gst >= 0),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index receipts_received_at_idx on public.receipts (received_at desc);

create trigger set_updated_at before update on public.receipts
  for each row execute function private.set_updated_at();

alter table public.receipts enable row level security;

-- Only admins see or change receipts; new ones are added by the sync-receipts function (secret key).
create policy "Admins can see receipts" on public.receipts
  for select to authenticated using ((select private.is_admin()));
create policy "Admins can edit receipts" on public.receipts
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete receipts" on public.receipts
  for delete to authenticated using ((select private.is_admin()));

grant select, update, delete on public.receipts to authenticated;
grant select, insert, update, delete on public.receipts to service_role;

-- Private file storage for receipt attachments and saved emails (20 MB per file).
insert into storage.buckets (id, name, public, file_size_limit)
values ('receipts', 'receipts', false, 20971520)
on conflict (id) do nothing;

create policy "Admins can read receipt files" on storage.objects
  for select to authenticated using (bucket_id = 'receipts' and (select private.is_admin()));
create policy "Admins can delete receipt files" on storage.objects
  for delete to authenticated using (bucket_id = 'receipts' and (select private.is_admin()));

-- Shared secret for the weekly check, generated here so it never leaves the database.
select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'receipts_cron_secret',
  'Lets the weekly cron job call the sync-receipts function'
);

-- Lets the function check the cron secret; callable only with the secret key.
create function public.receipts_cron_secret_matches(secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from vault.decrypted_secrets
    where name = 'receipts_cron_secret' and decrypted_secret = secret
  );
$$;
revoke execute on function public.receipts_cron_secret_matches(text) from public, anon, authenticated;
grant execute on function public.receipts_cron_secret_matches(text) to service_role;
