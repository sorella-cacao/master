# Sorella Cacao

The new Sorella Cacao online store, replacing the Squarespace site at
sorellacacao.com.au.

Built with Next.js (App Router), TypeScript and Tailwind CSS, deployed on
Vercel.

## Development

```bash
npm install
npm run dev    # http://localhost:3000
npm run lint
npm run build
```

## Content

Products and workshops live in Supabase (project "sorella", Sydney) and are
edited at `/admin`. Pages read them only through the functions in
`src/data/index.ts`; shop pages are pre-built and refreshed whenever the admin
saves, plus hourly. Page copy lives in `src/data/site.ts`. Old Squarespace URLs
redirect to the new ones (see `next.config.ts`).

Copy `.env.local` settings from the Supabase dashboard (Project Settings → API):

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```
