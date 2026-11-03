-- The front (logo) label printed alongside each ingredient label: a PDF in Sorella › Logos › Current Logos,
-- e.g. "75% Dark/Large Logo- 75% Dark (5).pdf". The print helper on the Mac prints them in pairs.
alter table public.labels add column logo_file text not null default '';
update public.labels set logo_file = '75% Dark/Large Logo- 75% Dark (5).pdf' where size = 'large' and name = '75% Dark';
update public.labels set logo_file = '84% Dark/Small Logo- 84%.pdf' where size = 'small' and name = '84% Dark';
