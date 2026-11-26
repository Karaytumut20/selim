begin;

-- External sales only deduct sellable stock, which already excludes website holds.
create table public.external_sales (
  id uuid primary key,
  product_id text not null references public.products(id),
  quantity integer not null check (quantity > 0),
  channel text not null check (channel in ('ebay', 'other')),
  actor text not null,
  created_at timestamptz not null default now()
);
create table public.marketplace_tasks (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references public.orders(id),
  product_id text not null references public.products(id),
  quantity integer not null check (quantity > 0),
  listing_url text,
  state text not null default 'pending' check (state in ('pending', 'completed')),
  completed_by text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_id, product_id)
);
alter table public.external_sales enable row level security;
alter table public.marketplace_tasks enable row level security;
revoke all on public.external_sales, public.marketplace_tasks from public, anon, authenticated;
grant all on public.external_sales, public.marketplace_tasks to service_role;

create function public.record_external_sale(p_id uuid, p_product_id text, p_quantity integer, p_channel text, p_expected_updated_at timestamptz, p_actor text)
returns jsonb language plpgsql security invoker set search_path=public as $$
declare p public.products; sale public.external_sales; available integer; result jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('store-catalog', 0));
  select * into sale from public.external_sales where id=p_id;
  if found then
    if sale.product_id<>p_product_id or sale.quantity<>p_quantity or sale.channel<>p_channel then
      raise exception 'This sale reference was already used for a different sale';
    end if;
    select * into p from public.products where id=p_product_id;
    return to_jsonb(p);
  end if;
  if p_quantity is null or p_quantity<1 or p_channel is null or p_channel not in ('ebay','other') then raise exception 'Enter a valid sold quantity and channel'; end if;
  select * into p from public.products where id=p_product_id for update;
  if not found then raise exception 'Product not found'; end if;
  if p_expected_updated_at is null or p.updated_at is distinct from p_expected_updated_at then raise exception 'CATALOG_CHANGED: refresh the product before recording a sale'; end if;
  if p.specifications->>'__stockQuantity' is null then raise exception 'Set the available stock before recording a sale'; end if;
  available := (p.specifications->>'__stockQuantity')::integer;
  if available < p_quantity then raise exception 'Not enough sellable stock. Check website orders and payment holds before recording this sale'; end if;
  p.specifications := p.specifications || jsonb_build_object('__stockQuantity',(available-p_quantity)::text,'__stockReviewedAt',now()::text);
  result := public.apply_catalog_changes(
    jsonb_build_array(jsonb_build_object('id',p.id,'expected_updated_at',p_expected_updated_at,'row',to_jsonb(p))),
    jsonb_build_object('id',p_id::text,'kind','external_sale','actor',coalesce(nullif(p_actor,''),'Administrator'),'summary',jsonb_build_object('productId',p.id,'quantity',p_quantity,'channel',p_channel)),null);
  insert into public.external_sales(id,product_id,quantity,channel,actor) values(p_id,p.id,p_quantity,p_channel,coalesce(nullif(p_actor,''),'Administrator'));
  return result->0;
end $$;

-- Queue a human action in the same transaction as payment confirmation.
create function public.queue_marketplace_tasks() returns trigger language plpgsql security invoker set search_path=public as $$
begin
  if new.payment_status<>'paid' then return new; end if;
  if tg_op='UPDATE' and old.payment_status='paid' then return new; end if;
  insert into public.marketplace_tasks(order_id,product_id,quantity,listing_url)
    select new.id,p.id,sum(i.quantity)::integer,
      coalesce(nullif(p.specifications->>'__ebayListingUrl',''),
        case when jsonb_array_length(coalesce((p.specifications->>'__sourceListings')::jsonb,'[]'::jsonb))=1
        and ((p.specifications->>'__sourceListings')::jsonb->0->>'itemId') ~ '^[0-9]{9,15}$'
        then 'https://www.ebay.com/itm/'||((p.specifications->>'__sourceListings')::jsonb->0->>'itemId') end)
    from public.order_items i join public.products p on p.id=i.product_id
    where i.order_id=new.id and (
      p.specifications->>'__listedOnEbay'='true' or nullif(p.specifications->>'__ebayListingUrl','') is not null
      or jsonb_array_length(coalesce((p.specifications->>'__sourceListings')::jsonb,'[]'::jsonb))>0)
    group by p.id
    on conflict(order_id,product_id) do nothing;
  return new;
end $$;
create trigger queue_marketplace_tasks after insert or update of payment_status on public.orders for each row execute function public.queue_marketplace_tasks();
revoke all on function public.record_external_sale(uuid,text,integer,text,timestamptz,text),public.queue_marketplace_tasks() from public,anon,authenticated;
grant execute on function public.record_external_sale(uuid,text,integer,text,timestamptz,text),public.queue_marketplace_tasks() to service_role;

create or replace view public.storefront_products with (security_barrier=true) as
select id,slug,name,part_number,manufacturer_or_family,category,short_description,long_description,
  repair_supported,typical_faults,repair_capabilities,lead_time_text,warranty_text,image_url,gallery,
  specifications - array['__unitCost','__sourceListings','__externalSource','__ebayItemId','__ebaySku','__ebayListingUrl','__ebayLastSyncedAt','__listedOnEbay','eBay item number'] as specifications,
  related_product_ids,featured,primary_product,status,sort_order,created_at,updated_at
from public.products where status='published';
commit;
