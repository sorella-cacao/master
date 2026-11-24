-- An invoice's number as typed when it has letters, e.g. "RR01"; `number` still counts them up.
alter table public.invoices add column number_label text;

-- A customer's next invoice carries on from their last one's letters: "RR01" is followed by "RR02".
create function private.carry_invoice_letters()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  last_label text;
  parts text[];
begin
  if new.customer_id is null or new.number_label is not null then return new; end if;
  select i.number_label into last_label from public.invoices i
  where i.customer_id = new.customer_id order by i.number desc, i.created_at desc limit 1;
  parts := regexp_match(last_label, '^(.*\D|)(\d+)(\D*)$');
  if parts is not null then
    new.number_label := parts[1] || lpad(new.number::text, greatest(length(parts[2]), length(new.number::text)), '0') || parts[3];
  end if;
  return new;
end;
$$;
create trigger carry_invoice_letters before insert on public.invoices
  for each row execute function private.carry_invoice_letters();
