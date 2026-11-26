-- Purchase-time terms are captured by the database, including all order entry paths.
-- Legacy order rows remain NULL: do not manufacture historical terms.
alter table public.order_items add column if not exists product_terms jsonb;
create or replace function public.capture_product_terms() returns trigger language plpgsql set search_path=public as $$
declare p public.products; s jsonb;
begin
  if TG_OP = 'UPDATE' then
    if new.product_terms is distinct from old.product_terms then raise exception 'Purchase terms are immutable'; end if;
    return new;
  end if;
  select * into p from public.products where id = new.product_id;
  if found then
    s := coalesce(p.specifications,'{}'::jsonb);
    new.product_terms := jsonb_build_object('capturedAt',now(),'condition',s->>'__condition','warranty',p.warranty_text,'returnable',coalesce((s->>'__returnable')::boolean,true),'fragile',coalesce((s->>'__fragile')::boolean,false),'shipsSeparately',coalesce((s->>'__shipsSeparately')::boolean,false),'shippingClass',s->>'__shippingClass','weightOz',s->>'__shippingWeightOz','lengthIn',s->>'__shippingLengthIn','widthIn',s->>'__shippingWidthIn','heightIn',s->>'__shippingHeightIn');
  end if;
  return new;
end $$;
drop trigger if exists capture_product_terms on public.order_items;
create trigger capture_product_terms before insert or update on public.order_items for each row execute function public.capture_product_terms();

create or replace function public.track_first_publication() returns trigger language plpgsql set search_path=public as $$
begin
  if TG_OP='UPDATE' and nullif(old.specifications->>'__firstPublishedAt','') is not null then
    new.specifications := coalesce(new.specifications,'{}'::jsonb) || jsonb_build_object('__firstPublishedAt',old.specifications->>'__firstPublishedAt');
  elsif new.status='published' then
    new.specifications := coalesce(new.specifications,'{}'::jsonb) || jsonb_build_object('__firstPublishedAt',now()::text);
  else
    new.specifications := coalesce(new.specifications,'{}'::jsonb) - '__firstPublishedAt';
  end if;
  return new;
end $$;
drop trigger if exists track_first_publication on public.products;
create trigger track_first_publication before insert or update on public.products for each row execute function public.track_first_publication();
-- Existing published rows have no known publication history: retain createdAt fallback.
-- Existing duplicate spotlight flags are resolved deterministically before uniqueness enforcement.
update public.products set primary_product=false where primary_product=true and id <> (select id from public.products where primary_product=true order by sort_order,id limit 1);
create unique index if not exists products_single_primary on public.products ((primary_product)) where primary_product=true;
