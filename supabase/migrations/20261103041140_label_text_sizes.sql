-- Per-label text sizes as percentages of the standard layout, e.g. {"ingredients": 110}. Missing parts are 100%.
alter table public.labels add column text_sizes jsonb not null default '{}';
