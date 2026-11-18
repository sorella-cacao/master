-- Labels now come from Canva: each is a front (logo) PDF and/or a back (ingredients) PDF kept in
-- Sorella › Labels › Canva on the Mac. The Pod stamps the best before date and batch number onto the
-- back where they sit in the Canva design (`stamps`). The old editable contents are no longer used,
-- so they get defaults; labels without a Canva file (front or back) aren't shown.
alter table public.labels
  add column front_file text not null default '',
  add column back_file text not null default '',
  -- [{kind: "date" | "batch", text, box: [x, y, width, height], x, y, size, angle}], in PDF points from the bottom left.
  add column stamps jsonb not null default '[]',
  alter column batch_code set default '',
  alter column ingredients set default '',
  alter column servings_per_package set default '',
  alter column nutrition set default '{}';
