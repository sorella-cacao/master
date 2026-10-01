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

All customer-facing wording is copied verbatim from the original
Squarespace site. Page copy lives in `src/data/site.ts` and products and
workshops in `src/data/catalog.ts`. Pages read data only through the
functions in `src/data/index.ts`, so the source can move to Supabase later
without changing the pages. Old Squarespace URLs redirect to the new ones
(see `next.config.ts`).
