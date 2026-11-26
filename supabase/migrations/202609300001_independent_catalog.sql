-- Independent US catalog: atomic admin writes, source identity, and local stock.
-- Apply after the existing catalog and commerce migrations.
create table if not exists public.catalog_batches (
  id text primary key,
  kind text not null,
  actor text not null,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create table if not exists public.catalog_changes (
  id bigint generated always as identity primary key,
  batch_id text not null references public.catalog_batches(id),
  product_id text not null,
  before_row jsonb,
  after_row jsonb
);
create table if not exists public.product_import_sources (
  account_id text not null,
  item_id text not null,
  variation_key text not null default '',
  product_id text not null references public.products(id) on delete cascade,
  primary key (account_id, item_id, variation_key)
);
create index if not exists product_import_sources_product_idx on public.product_import_sources(product_id);
create table if not exists public.inventory_reservations (
  order_id text not null references public.orders(id),
  product_id text not null references public.products(id),
  quantity integer not null check (quantity > 0),
  reserved_at timestamptz not null default now(),
  released_at timestamptz,
  primary key (order_id, product_id)
);

create table if not exists public.catalog_state (id integer primary key check (id=1), revision bigint not null default 0);
insert into public.catalog_state(id) values(1) on conflict do nothing;
alter table public.catalog_state enable row level security;
revoke all on public.catalog_state from public,anon,authenticated;
grant all on public.catalog_state to service_role;
create or replace function public.lock_catalog_write() returns trigger language plpgsql security definer set search_path=public as $$
begin perform pg_advisory_xact_lock(hashtextextended('store-catalog',0)); return null; end; $$;
create or replace function public.bump_catalog_revision() returns trigger language plpgsql security definer set search_path=public as $$
begin update public.catalog_state set revision=revision+1 where id=1; return null; end; $$;
drop trigger if exists products_lock_write on public.products;
create trigger products_lock_write before insert or update or delete on public.products for each statement execute function public.lock_catalog_write();
drop trigger if exists products_bump_revision on public.products;
create trigger products_bump_revision after insert or update or delete on public.products for each statement execute function public.bump_catalog_revision();
create or replace function public.catalog_snapshot() returns jsonb language sql security invoker set search_path=public as $$
  select jsonb_build_object('revision',(select revision from public.catalog_state where id=1),'products',coalesce((select jsonb_agg(p order by p.id) from public.products p),'[]'::jsonb));
$$;
revoke all on function public.lock_catalog_write(),public.bump_catalog_revision(),public.catalog_snapshot() from public,anon,authenticated;
grant execute on function public.catalog_snapshot() to service_role;

-- One transaction for the whole reviewed batch. Shares a lock with checkout,
-- preventing a stock reservation being overwritten by an old import preview.
create or replace function public.apply_catalog_changes(p_changes jsonb, p_batch jsonb, p_expected_revision bigint default null)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  change jsonb;
  previous public.products;
  saved public.products;
  source jsonb;
  result jsonb := '[]'::jsonb;
  source_owner text;
  source_array jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('store-catalog', 0));
  if p_expected_revision is not null and p_expected_revision <> (select revision from public.catalog_state where id=1) then raise exception 'CATALOG_CHANGED'; end if;
  if jsonb_array_length(p_changes) > 15000 then raise exception 'Too many catalog changes'; end if;
  if exists (select 1 from public.catalog_batches where id = p_batch->>'id') then
    raise exception 'This batch has already been applied';
  end if;
  insert into public.catalog_batches(id, kind, actor, summary)
  values (p_batch->>'id', p_batch->>'kind', p_batch->>'actor', p_batch->'summary');
  for change in select value from jsonb_array_elements(p_changes) loop
    previous := null;
    select * into previous from public.products where id = change->>'id' for update;
    if previous.id is not null then
      if change->>'expected_updated_at' is null or previous.updated_at is distinct from (change->>'expected_updated_at')::timestamptz then
        raise exception 'CATALOG_CHANGED: %', change->>'id';
      end if;
    elsif change->>'expected_updated_at' is not null then
      raise exception 'CATALOG_CHANGED: %', change->>'id';
    end if;
    if coalesce((change->>'delete')::boolean, false) then
      delete from public.products where id = change->>'id';
      insert into public.catalog_changes(batch_id,product_id,before_row) values (p_batch->>'id',change->>'id',to_jsonb(previous));
      continue;
    end if;
    saved := jsonb_populate_record(null::public.products, (change->'row') || jsonb_build_object(
      'id',change->>'id','created_at',coalesce(previous.created_at,now()),'updated_at',now()));
    if previous.id is null then
      insert into public.products select saved.* returning * into saved;
    else
      update public.products set
        slug=saved.slug, name=saved.name, part_number=saved.part_number,
        manufacturer_or_family=saved.manufacturer_or_family, category=saved.category,
        short_description=saved.short_description, long_description=saved.long_description,
        repair_supported=saved.repair_supported, typical_faults=saved.typical_faults,
        repair_capabilities=saved.repair_capabilities, lead_time_text=saved.lead_time_text,
        warranty_text=saved.warranty_text, image_url=saved.image_url, gallery=saved.gallery,
        specifications=saved.specifications, related_product_ids=saved.related_product_ids,
        featured=saved.featured, primary_product=saved.primary_product,
        status=saved.status, sort_order=saved.sort_order
      where id=saved.id returning * into saved;
    end if;
    delete from public.product_import_sources where product_id = saved.id;
    source_array := coalesce((saved.specifications->>'__sourceListings')::jsonb, '[]'::jsonb);
    for source in select value from jsonb_array_elements(source_array) loop
      select product_id into source_owner from public.product_import_sources
        where account_id=source->>'account' and item_id=source->>'itemId' and variation_key=coalesce(source->>'variation','');
      if source_owner is not null and source_owner <> saved.id then raise exception 'Source listing already belongs to another product'; end if;
      insert into public.product_import_sources(account_id,item_id,variation_key,product_id)
      values(source->>'account',source->>'itemId',coalesce(source->>'variation',''),saved.id)
      on conflict do nothing;
    end loop;
    insert into public.catalog_changes(batch_id,product_id,before_row,after_row)
      values(p_batch->>'id',saved.id,case when previous.id is null then null else to_jsonb(previous) end,to_jsonb(saved));
    result := result || jsonb_build_array(to_jsonb(saved));
  end loop;
  return result;
end;
$$;

create or replace function public.reserve_store_inventory(p_order_id text)
returns void language plpgsql security invoker set search_path = public as $$
declare
  current_order public.orders;
  line record;
  current_product public.products;
  available integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('store-catalog', 0));
  select * into current_order from public.orders where id=p_order_id for update;
  if current_order.id is null then raise exception 'Order not found'; end if;
  if current_order.payment_status <> 'paid' or current_order.status in ('cancelled','refunded') then raise exception 'Only paid, active orders can reserve stock'; end if;
  if current_order.inventory_status = 'reserved' then return; end if;
  if current_order.inventory_status = 'released' then raise exception 'Stock was released for this order'; end if;
  if current_order.risk_status in ('review','blocked') then raise exception 'Resolve the payment review before reserving stock'; end if;
  if not exists (select 1 from public.order_items where order_id=p_order_id) then raise exception 'Order has no items'; end if;
  for line in select product_id,sum(quantity)::integer as quantity from public.order_items where order_id=p_order_id group by product_id order by product_id loop
    select * into current_product from public.products where id=line.product_id for update;
    if current_product.id is null then raise exception 'Product % no longer exists', line.product_id; end if;
    available := (current_product.specifications->>'__stockQuantity')::integer;
    if available is null then raise exception 'Set the inventory quantity for %', current_product.name; end if;
    if available < line.quantity then raise exception 'Insufficient stock for %: % available', current_product.name, available; end if;
    if line.quantity < 1 then raise exception 'Invalid order quantity'; end if;
    update public.products set specifications=jsonb_set(specifications,'{__stockQuantity}',to_jsonb((available-line.quantity)::text),true) where id=line.product_id;
    insert into public.inventory_reservations(order_id,product_id,quantity) values(p_order_id,line.product_id,line.quantity);
  end loop;
  update public.orders set inventory_status='reserved',inventory_reserved_at=now(),status=case
    when status in ('processing','shipped','delivered','completed') then status
    when shipping_status='ready' then 'ready_to_ship' else 'paid' end where id=p_order_id;
end;
$$;

-- Cancellation restock is explicit and idempotent. Shipped stock must go
-- through a physical return rather than being restored on a payment refund.
create or replace function public.release_store_inventory(p_order_id text)
returns void language plpgsql security invoker set search_path = public as $$
declare current_order public.orders; line record; available integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('store-catalog', 0));
  select * into current_order from public.orders where id=p_order_id for update;
  if current_order.id is null then raise exception 'Order not found'; end if;
  if current_order.inventory_status='released' then return; end if;
  if current_order.status <> 'cancelled' or current_order.shipping_status in ('label_created','shipped','delivered','returned') then
    raise exception 'Cancel the unshipped order and void its shipping label before releasing stock';
  end if;
  if exists (select 1 from public.order_shipments where order_id=p_order_id and status <> 'voided') then
    raise exception 'All shipping labels must be confirmed voided before releasing stock';
  end if;
  if current_order.inventory_status <> 'reserved' then return; end if;
  if not exists (select 1 from public.inventory_reservations where order_id=p_order_id) then
    raise exception 'This legacy reservation needs a manual stock review';
  end if;
  for line in select * from public.inventory_reservations where order_id=p_order_id and released_at is null order by product_id loop
    select (specifications->>'__stockQuantity')::integer into available from public.products where id=line.product_id for update;
    if available is null then raise exception 'Product inventory is missing'; end if;
    update public.products set specifications=jsonb_set(specifications,'{__stockQuantity}',to_jsonb((available+line.quantity)::text),true) where id=line.product_id;
    update public.inventory_reservations set released_at=now() where order_id=p_order_id and product_id=line.product_id;
  end loop;
  update public.orders set inventory_status='released',inventory_released_at=now() where id=p_order_id;
end;
$$;

alter table public.catalog_batches enable row level security;
alter table public.catalog_changes enable row level security;
alter table public.product_import_sources enable row level security;
alter table public.inventory_reservations enable row level security;
revoke all on public.catalog_batches,public.catalog_changes,public.product_import_sources,public.inventory_reservations from public,anon,authenticated;
revoke all on function public.apply_catalog_changes(jsonb,jsonb,bigint),public.reserve_store_inventory(text),public.release_store_inventory(text) from public,anon,authenticated;
grant all on public.catalog_batches,public.catalog_changes,public.product_import_sources,public.inventory_reservations to service_role;
grant usage,select on sequence public.catalog_changes_id_seq to service_role;
grant execute on function public.apply_catalog_changes(jsonb,jsonb,bigint),public.reserve_store_inventory(text),public.release_store_inventory(text) to service_role;

-- Keep supplier sources and private costs out of anonymous catalog reads.
-- The view owner can read products; the predicate exposes published rows only.
create or replace view public.storefront_products with (security_barrier=true) as
select id,slug,name,part_number,manufacturer_or_family,category,short_description,long_description,
  repair_supported,typical_faults,repair_capabilities,lead_time_text,warranty_text,image_url,gallery,
  specifications - array['__unitCost','__sourceListings','__externalSource','__ebayItemId','__ebaySku','__ebayListingUrl','__ebayLastSyncedAt','eBay item number'] as specifications,
  related_product_ids,featured,primary_product,status,sort_order,created_at,updated_at
from public.products where status='published';
revoke all on public.products from anon,authenticated;
grant select on public.storefront_products to anon,authenticated,service_role;
