# Supabase

The shop's database lives in the Supabase project **sorella** (Sydney).

- `migrations/` — every change made to the database, in order (already applied).
  Product and workshop data was copied in from the old `src/data/catalog.ts`
  and is now edited in the Pod (`/pod`).
- `functions/sync-receipts/` — files receipts that chocolate@sorellacacao.com.au
  emails to itself (see the comment at the top of `index.ts`). Runs weekly via
  pg_cron and from the Pod's "Check now" button. Needs the `FASTMAIL_API_TOKEN`
  Edge Function secret (a read-only Fastmail API token).
