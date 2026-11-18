-- A line under a product's heading on its page, e.g. for the Christmas bundle.
alter table public.products add column subheading text not null default '';
update public.products set subheading = 'Gift loved ones an ethical present this Christmas with our Christmas flavoured chocolates!'
where slug = 'christmas-bundle';
