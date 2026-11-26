-- "Email shipping" on website orders and spontaneous buys: the carrier and tracking number are emailed
-- to the customer (Pod › Replies) and kept on the order.
alter table public.orders
  add column ship_email text,
  add column ship_carrier text,
  add column ship_tracking text,
  add column ship_emailed_at timestamptz;

alter table public.email_templates drop constraint email_templates_key_check;
alter table public.email_templates add constraint email_templates_key_check
  check (key in ('order_received', 'workshop_booking', 'order_posted', 'order_shipped', 'order_ready', 'contact_reply'));

update public.email_templates set position = position + 1 where position >= 3;
insert into public.email_templates (key, name, sent_when, subject, body, position) values
  ('order_shipped', 'Shipping & tracking', 'When you press “Email shipping” on a website order or spontaneous buy, with its carrier and tracking number.',
   'Your chocolate is on its way!',
   E'Hi {first_name},\n\nGood news, your chocolate is on its way with {carrier}!\n\nTracking number: {tracking_number}\nTrack it here: {tracking_link}\n\n{items}\n\nWe hope you enjoy every piece.\n\nWarmly,\nSarah\nSorella Cacao', 3);
