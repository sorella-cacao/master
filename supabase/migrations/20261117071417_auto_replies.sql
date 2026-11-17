-- Automatic emails, written in the Pod (Replies) and sent from chocolate@sorellacacao.com.au through
-- Fastmail by Edge Functions: when a website order is paid (order received, workshop booking), when
-- a website order is marked Sent (posted) or Packed (ready to pick up), and in answer to the
-- website's contact form. Placeholders in braces, e.g. {first_name}, are filled in when sent.

create table public.email_templates (
  key text primary key check (key in ('order_received', 'workshop_booking', 'order_posted', 'order_ready', 'contact_reply')),
  name text not null,
  -- When it's sent, shown in the Pod.
  sent_when text not null,
  subject text not null check (subject <> ''),
  body text not null check (body <> ''),
  enabled boolean not null default true,
  position integer not null default 0,
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.email_templates
  for each row execute function private.set_updated_at();
alter table public.email_templates enable row level security;
create policy "Admins manage email templates" on public.email_templates
  for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
grant select, update on public.email_templates to authenticated;
grant select on public.email_templates to service_role;

insert into public.email_templates (key, name, sent_when, subject, body, position) values
  ('order_received', 'Order received', 'As soon as a website order is paid (chocolate and cacao).',
   'Thank you for your order – Sorella Cacao',
   E'Hi {first_name},\n\nThank you for supporting ethical chocolate, it means a lot to us! We''ve got your order:\n\n{items}\n\nTotal paid: {total}\n{delivery}\n\nWe''ll be in touch as soon as it''s on its way.\n\nWarmly,\nSarah\nSorella Cacao', 0),
  ('workshop_booking', 'Workshop booking', 'As soon as workshop tickets are paid on the website.',
   'You''re booked in! – Sorella Cacao',
   E'Hi {first_name},\n\nThank you for booking:\n\n{workshops}\n\nWe can''t wait to make chocolate with you. We''ll send you the details closer to the day, and if you have any questions just reply to this email.\n\nWarmly,\nSarah\nSorella Cacao', 1),
  ('order_posted', 'Order posted', 'When you mark a posted website order Sent in the Pod.',
   'Your chocolate is on its way!',
   E'Hi {first_name},\n\nGood news, your order is in the post and on its way to:\n\n{address}\n\n{items}\n\nWe hope you enjoy every piece.\n\nWarmly,\nSarah\nSorella Cacao', 2),
  ('order_ready', 'Ready to pick up', 'When you mark a pick-up website order Packed in the Pod.',
   'Your order is ready to pick up',
   E'Hi {first_name},\n\nYour order is packed and ready to pick up in Lawson:\n\n{items}\n\nJust reply to this email to arrange a time that suits you.\n\nWarmly,\nSarah\nSorella Cacao', 3),
  ('contact_reply', 'Contact form reply', 'Straight away, to anyone who sends a message through the website.',
   'Thanks for getting in touch – Sorella Cacao',
   E'Hi {first_name},\n\nThank you for your message! We''ve received it and will get back to you as soon as we can.\n\nWarmly,\nSarah\nSorella Cacao', 4);

-- So each website order gets each email once, however many times Stripe or the Pod asks.
alter table public.web_orders
  add column received_emailed_at timestamptz,
  add column update_emailed_at timestamptz;
grant update (received_emailed_at, update_emailed_at) on public.web_orders to service_role;

-- Messages sent through the website's contact form (also emailed to the business).
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  -- For limiting how many messages one sender can send.
  sender_ip text not null default '',
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
create policy "Admins see contact messages" on public.contact_messages
  for select to authenticated using ((select private.is_admin()));
create policy "Admins delete contact messages" on public.contact_messages
  for delete to authenticated using ((select private.is_admin()));
grant select, delete on public.contact_messages to authenticated;
grant select, insert on public.contact_messages to service_role;

-- Every automatic email, sent or not, for the Pod's record.
create table public.sent_emails (
  id bigint generated always as identity primary key,
  template text not null,
  to_email text not null,
  subject text not null,
  order_id uuid references public.orders (id) on delete set null,
  -- Why it couldn't be sent, if it wasn't.
  error text,
  created_at timestamptz not null default now()
);
alter table public.sent_emails enable row level security;
create policy "Admins see sent emails" on public.sent_emails
  for select to authenticated using ((select private.is_admin()));
grant select on public.sent_emails to authenticated;
grant select, insert on public.sent_emails to service_role;
grant select on public.orders, public.checkouts to service_role;
