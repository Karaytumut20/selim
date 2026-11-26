-- Reserve inventory before opening Stripe, then finalize or release exactly once.
alter table public.orders add column if not exists checkout_expires_at timestamptz;
alter table public.orders add column if not exists shipping_quote jsonb;
create unique index if not exists order_shipments_provider_id_unique on public.order_shipments(provider,provider_shipment_id);

create or replace function public.claim_store_stripe_event(p_id text,p_type text)
returns text language plpgsql security invoker set search_path=public as $$
declare e public.stripe_events;
begin
  insert into public.stripe_events(id,type,status,processed_at) values(p_id,p_type,'pending',now()) on conflict do nothing;
  select * into e from public.stripe_events where id=p_id for update;
  if e.status='succeeded' then return 'complete'; end if;
  if e.status='processing' and e.processed_at > now()-interval '5 minutes' then return 'busy'; end if;
  update public.stripe_events set status='processing',type=p_type,error_message=null,processed_at=now() where id=p_id;
  return 'claimed';
end; $$;
revoke all on function public.claim_store_stripe_event(text,text) from public,anon,authenticated;
grant execute on function public.claim_store_stripe_event(text,text) to service_role;

create or replace function public.store_launch_state()
returns jsonb language sql security invoker set search_path=public as $$
  select jsonb_build_object('schemaVersion','checkout-holds-v1',
    'publishedProducts',(select count(*) from public.products where status='published'),
    'missingPackages',(select count(*) from public.products where status='published' and (
      coalesce(specifications->>'__shippingWeightOz','')='' or coalesce(specifications->>'__shippingLengthIn','')='' or coalesce(specifications->>'__shippingWidthIn','')='' or coalesce(specifications->>'__shippingHeightIn','')='')),
    'expiredHolds',(select count(*) from public.orders where inventory_status='held' and checkout_expires_at < now()));
$$;
revoke all on function public.store_launch_state() from public,anon,authenticated;
grant execute on function public.store_launch_state() to service_role;
create index if not exists orders_checkout_hold_idx on public.orders(checkout_expires_at) where inventory_status='held';

create or replace function public.hold_store_inventory(p_order_id text,p_expires_at timestamptz)
returns void language plpgsql security invoker set search_path=public as $$
declare o public.orders; p public.products; line record; available integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('store-catalog',0));
  select * into o from public.orders where id=p_order_id for update;
  if o.id is null then raise exception 'Order not found'; end if;
  if o.inventory_status='held' then return; end if;
  if o.inventory_status <> 'pending' or o.status <> 'awaiting_payment' or o.payment_status <> 'pending' or o.payment_method <> 'stripe' then raise exception 'Order cannot start checkout'; end if;
  if p_expires_at < now()+interval '29 minutes' or p_expires_at > now()+interval '1 hour' then raise exception 'Invalid checkout expiry'; end if;
  if not exists(select 1 from public.order_items where order_id=p_order_id) then raise exception 'Order has no items'; end if;
  for line in select product_id,sum(quantity)::integer as quantity from public.order_items where order_id=p_order_id group by product_id order by product_id loop
    select * into p from public.products where id=line.product_id for update;
    if p.id is null or p.status <> 'published' then raise exception 'Product is no longer available'; end if;
    if coalesce(p.specifications->>'__currency','USD') <> 'USD' or o.currency <> 'USD' then raise exception 'USD prices are required'; end if;
    if (p.specifications->>'__price')::numeric <= 0 or p.specifications->>'__price' is null or exists(select 1 from public.order_items where order_id=p_order_id and product_id=p.id and unit_price is distinct from (p.specifications->>'__price')::numeric) then raise exception 'Product price changed. Review your cart again'; end if;
    available := (p.specifications->>'__stockQuantity')::integer;
    if available is null or line.quantity < 1 or available < line.quantity then raise exception 'Insufficient stock for %',p.name; end if;
    update public.products set specifications=jsonb_set(specifications,'{__stockQuantity}',to_jsonb((available-line.quantity)::text),true) where id=p.id;
    insert into public.inventory_reservations(order_id,product_id,quantity) values(p_order_id,p.id,line.quantity);
  end loop;
  update public.orders set inventory_status='held',inventory_reserved_at=now(),checkout_expires_at=p_expires_at,updated_at=now() where id=p_order_id;
end; $$;

create or replace function public.attach_checkout_session(p_order_id text,p_session_id text)
returns void language plpgsql security invoker set search_path=public as $$
declare o public.orders;
begin
  perform pg_advisory_xact_lock(hashtextextended('store-catalog',0));
  select * into o from public.orders where id=p_order_id for update;
  if o.id is null or o.payment_method <> 'stripe' or o.inventory_status not in ('held','reserved') then raise exception 'Checkout is no longer active'; end if;
  if o.stripe_checkout_session_id is not null and o.stripe_checkout_session_id <> p_session_id then raise exception 'Checkout session mismatch'; end if;
  update public.orders set stripe_checkout_session_id=p_session_id,updated_at=now() where id=p_order_id;
end; $$;

-- Only call after Stripe has confirmed expiration/cancellation, or after a
-- definite rejection before a session existed. Clock expiry alone is unsafe:
-- payment can complete just before expiry while its webhook is in transit.
create or replace function public.release_checkout_hold(p_order_id text,p_session_id text default null)
returns boolean language plpgsql security invoker set search_path=public as $$
declare o public.orders; line record; available integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('store-catalog',0));
  select * into o from public.orders where id=p_order_id for update;
  if o.id is null then raise exception 'Order not found'; end if;
  if o.stripe_checkout_session_id is not null and o.stripe_checkout_session_id is distinct from p_session_id then raise exception 'Checkout session mismatch'; end if;
  if o.payment_status='paid' or o.inventory_status <> 'held' then return false; end if;
  for line in select * from public.inventory_reservations where order_id=p_order_id and released_at is null order by product_id loop
    select (specifications->>'__stockQuantity')::integer into available from public.products where id=line.product_id for update;
    if available is null then raise exception 'Product inventory is missing'; end if;
    update public.products set specifications=jsonb_set(specifications,'{__stockQuantity}',to_jsonb((available+line.quantity)::text),true) where id=line.product_id;
    update public.inventory_reservations set released_at=now() where order_id=p_order_id and product_id=line.product_id;
  end loop;
  update public.orders set inventory_status='released',inventory_released_at=now(),status='cancelled',payment_status='failed',updated_at=now() where id=p_order_id;
  return true;
end; $$;

create or replace function public.settle_checkout_payment(p_order_id text,p_session_id text,p_payment_intent text,p_customer text,p_total numeric,p_tax numeric,p_shipping numeric,p_currency text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare o public.orders;
begin
  perform pg_advisory_xact_lock(hashtextextended('store-catalog',0));
  select * into o from public.orders where id=p_order_id for update;
  if o.id is null or o.payment_method <> 'stripe' then raise exception 'Stripe order not found'; end if;
  if o.stripe_checkout_session_id is not null and o.stripe_checkout_session_id <> p_session_id then raise exception 'Checkout session mismatch'; end if;
  if upper(p_currency) <> o.currency or p_total is null or p_total <> round(o.subtotal,2)+coalesce(p_shipping,0)+coalesce(p_tax,0) or coalesce(p_shipping,0) <> coalesce(o.shipping_rate_amount,0) then raise exception 'Payment amount or currency mismatch'; end if;
  if o.payment_status in ('paid','refunded','partially_refunded') then return false; end if;
  update public.orders set payment_status='paid',stripe_checkout_session_id=p_session_id,stripe_payment_intent_id=p_payment_intent,stripe_customer_id=p_customer,
    payment_received_at=now(),total=p_total,tax_amount=coalesce(p_tax,0),shipping_rate_amount=coalesce(p_shipping,0),updated_at=now(),
    status=case when o.inventory_status='held' and o.status not in ('cancelled','refunded') then 'paid' else 'inventory_exception' end where id=p_order_id;
  if o.inventory_status='held' and o.status not in ('cancelled','refunded') then
    -- The stock was already deducted when checkout started.
    update public.orders set inventory_status='reserved',status=case when risk_status in ('review','blocked') then 'pending_review' when shipping_status='ready' then 'ready_to_ship' else 'paid' end where id=p_order_id;
  else
    update public.orders set inventory_status='failed',internal_notes='Payment arrived without an active checkout stock hold. Review/refund before fulfillment.' where id=p_order_id;
  end if;
  return true;
end; $$;

revoke all on function public.hold_store_inventory(text,timestamptz),public.attach_checkout_session(text,text),public.release_checkout_hold(text,text),public.settle_checkout_payment(text,text,text,text,numeric,numeric,numeric,text) from public,anon,authenticated;
grant execute on function public.hold_store_inventory(text,timestamptz),public.attach_checkout_session(text,text),public.release_checkout_hold(text,text),public.settle_checkout_payment(text,text,text,text,numeric,numeric,numeric,text) to service_role;

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
  if current_order.risk_status in ('review','blocked') then raise exception 'Resolve the payment review before reserving stock'; end if;
  if current_order.inventory_status = 'held' then
    update public.orders set inventory_status='reserved',status=case when shipping_status='ready' then 'ready_to_ship' else 'paid' end where id=p_order_id;
    return;
  end if;
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
