-- Codes can have full stops in them.
alter table public.discount_codes drop constraint discount_codes_code_check;
alter table public.discount_codes add constraint discount_codes_code_check check (code ~ '^[A-Z0-9][A-Z0-9.-]{3,29}$');
