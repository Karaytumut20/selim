-- Only service_role may mutate checkout intents, quotes and inspections.
create table if not exists public.checkout_intents (
 user_id text not null, intent_key text not null, request_hash text not null,
 state text not null default 'processing' check(state in ('processing','complete')),
 response_body jsonb, response_status integer, created_at timestamptz not null default now(),
 primary key(user_id,intent_key)
);
alter table public.checkout_intents enable row level security;
revoke all on public.checkout_intents from anon,authenticated;
grant all on public.checkout_intents to service_role;
create or replace function public.claim_checkout_intent(p_user text,p_key text,p_hash text) returns jsonb language plpgsql set search_path=public as $$
declare r public.checkout_intents; inserted integer;
begin
 insert into public.checkout_intents(user_id,intent_key,request_hash) values(p_user,p_key,p_hash) on conflict do nothing;
 get diagnostics inserted=row_count;
 select * into r from public.checkout_intents where user_id=p_user and intent_key=p_key for update;
 if r.request_hash<>p_hash then raise exception 'Checkout intent was already used with different details'; end if;
 return jsonb_build_object('claimed',inserted=1,'state',r.state,'body',r.response_body,'status',r.response_status);
end $$;
revoke all on function public.claim_checkout_intent(text,text,text) from public,anon,authenticated;
grant execute on function public.claim_checkout_intent(text,text,text) to service_role;

create or replace function public.guard_order_consistency() returns trigger language plpgsql set search_path=public as $$
begin
 if old.status in ('cancelled','refunded') and new.status not in (old.status,'refunded','inventory_exception') then raise exception 'Closed orders cannot be reopened'; end if;
 if new.status='refunded' and (new.payment_status<>'refunded' or coalesce(new.refund_amount,0)<coalesce(new.total,0)) then raise exception 'A confirmed full refund is required'; end if;
 if new.status in ('ready_to_ship','processing','shipped','delivered','completed') and (new.payment_status not in ('paid','partially_refunded') or new.inventory_status<>'reserved') then raise exception 'Payment and reserved stock are required for fulfillment'; end if;
 if new.status='cancelled' and new.payment_status in ('paid','partially_refunded') then raise exception 'Refund payment before cancellation'; end if;
 if old.status='completed' and new.status not in ('completed','refunded') then raise exception 'Completed orders cannot be reopened'; end if;
 return new;
end $$;
drop trigger if exists guard_order_consistency on public.orders;
create trigger guard_order_consistency before update on public.orders for each row execute function public.guard_order_consistency();

-- Each physical returned unit is inspected and stocked at most once.
create table if not exists public.return_inspections (
 id text primary key, return_id text not null references public.return_requests(id),
 order_item_id text not null references public.order_items(id), quantity integer not null check(quantity>0),
 disposition text not null check(disposition in ('restock','damaged','discard')), notes text not null,
 actor text not null, created_at timestamptz not null default now()
);
alter table public.return_inspections enable row level security;
revoke all on public.return_inspections from anon,authenticated;
grant all on public.return_inspections to service_role;
create or replace function public.inspect_return(p_id text,p_return text,p_item text,p_qty integer,p_disposition text,p_notes text,p_actor text) returns boolean language plpgsql set search_path=public as $$
declare rr public.return_requests; oi public.order_items; done integer; p public.products;
begin
 perform pg_advisory_xact_lock(hashtextextended('store-catalog',0));
 if exists(select 1 from public.return_inspections where id=p_id) then
   if not exists(select 1 from public.return_inspections where id=p_id and return_id=p_return and order_item_id=p_item and quantity=p_qty and disposition=p_disposition) then raise exception 'Inspection key conflict'; end if;
   return false;
 end if;
 select * into rr from public.return_requests where id=p_return for update;
 if rr.id is null or rr.kind<>'return' or rr.status not in ('received','refunded') then raise exception 'Receive the physical return before inspection'; end if;
 select * into oi from public.order_items where id=p_item and order_id=rr.order_id for update;
 if oi.id is null then raise exception 'Return item not found'; end if;
 select coalesce(sum(quantity),0) into done from public.return_inspections where order_item_id=p_item;
 if p_qty<1 or p_qty+done>oi.quantity then raise exception 'Inspected quantity exceeds purchased units'; end if;
 if p_disposition='restock' then
  select * into p from public.products where id=oi.product_id for update;
  if p.id is null or p.specifications->>'__stockQuantity' is null then raise exception 'Product inventory is missing'; end if;
  update public.products set specifications=jsonb_set(specifications,'{__stockQuantity}',to_jsonb(((specifications->>'__stockQuantity')::integer+p_qty)::text),true) where id=p.id;
 end if;
 insert into public.return_inspections(id,return_id,order_item_id,quantity,disposition,notes,actor) values(p_id,p_return,p_item,p_qty,p_disposition,left(p_notes,2000),p_actor);
 return true;
end $$;
revoke all on function public.inspect_return(text,text,text,integer,text,text,text) from public,anon,authenticated;
grant execute on function public.inspect_return(text,text,text,integer,text,text,text) to service_role;

create table if not exists public.request_limits (key text primary key, window_start timestamptz not null, count integer not null default 0);
alter table public.request_limits enable row level security;
revoke all on public.request_limits from anon,authenticated;
grant all on public.request_limits to service_role;
create or replace function public.consume_request_limit(p_key text,p_limit integer,p_seconds integer) returns boolean language plpgsql set search_path=public as $$
declare n integer;
begin
 insert into public.request_limits(key,window_start,count) values(p_key,now(),1) on conflict(key) do update set
 count=case when request_limits.window_start<now()-make_interval(secs=>p_seconds) then 1 else request_limits.count+1 end,
 window_start=case when request_limits.window_start<now()-make_interval(secs=>p_seconds) then now() else request_limits.window_start end returning count into n;
 return n<=p_limit;
end $$;
revoke all on function public.consume_request_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_request_limit(text,integer,integer) to service_role;

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
    if p.id is null or p.status <> 'published' or p.repair_supported is not true then raise exception 'Product is no longer available'; end if;
    if coalesce(p.specifications->>'__currency','USD') <> 'USD' or o.currency <> 'USD' then raise exception 'USD prices are required'; end if;
    if (p.specifications->>'__price')::numeric <= 0 or p.specifications->>'__price' is null or exists(select 1 from public.order_items where order_id=p_order_id and product_id=p.id and unit_price is distinct from (p.specifications->>'__price')::numeric) then raise exception 'Product price changed. Review your cart again'; end if;
    available := (p.specifications->>'__stockQuantity')::integer;
    if available is null or line.quantity < 1 or available < line.quantity then raise exception 'Insufficient stock for %',p.name; end if;
    update public.products set specifications=jsonb_set(specifications,'{__stockQuantity}',to_jsonb((available-line.quantity)::text),true) where id=p.id;
    insert into public.inventory_reservations(order_id,product_id,quantity) values(p_order_id,p.id,line.quantity);
  end loop;
  update public.orders set inventory_status='held',inventory_reserved_at=now(),checkout_expires_at=p_expires_at,updated_at=now() where id=p_order_id;
end; $$;

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
    if current_product.id is null or current_product.status<>'published' or current_product.repair_supported is not true then raise exception 'Product % no longer exists', line.product_id; end if;
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

create table if not exists public.order_shipping_quotes (
 id text primary key, order_id text not null references public.orders(id), shipping_amount numeric(12,2) not null check(shipping_amount>=0),
 service text not null, packing_notes text not null, packing_reviewed boolean not null,
 state text not null default 'offered' check(state in ('offered','accepted','superseded')),
 expires_at timestamptz not null, accepted_at timestamptz, actor text not null, created_at timestamptz not null default now()
);
alter table public.order_shipping_quotes enable row level security;
revoke all on public.order_shipping_quotes from anon,authenticated;
grant all on public.order_shipping_quotes to service_role;
create or replace function public.offer_shipping_quote(p_id text,p_order text,p_amount numeric,p_service text,p_notes text,p_actor text) returns void language plpgsql set search_path=public as $$
declare o public.orders;
begin
 select * into o from public.orders where id=p_order for update;
 if o.id is null or o.payment_method<>'invoice' or o.payment_status<>'unpaid' or o.status not in ('pending_review','awaiting_payment') or o.inventory_status<>'pending' then raise exception 'Only active unpaid invoices can receive a quote'; end if;
 if p_amount<0 or p_amount<>round(p_amount,2) or length(trim(p_service))<2 or length(trim(p_notes))<5 then raise exception 'Enter an exact shipping amount, service and reviewed packing notes'; end if;
 if o.subtotal is null then raise exception 'Confirm product prices before offering a shipping quote'; end if;
 update public.order_shipping_quotes set state='superseded' where order_id=p_order and state='offered';
 insert into public.order_shipping_quotes(id,order_id,shipping_amount,service,packing_notes,packing_reviewed,expires_at,actor) values(p_id,p_order,p_amount,p_service,p_notes,true,now()+interval '24 hours',p_actor);
end $$;
create or replace function public.accept_shipping_quote(p_quote text,p_email text) returns jsonb language plpgsql set search_path=public as $$
declare q public.order_shipping_quotes; o public.orders;
begin
 select * into q from public.order_shipping_quotes where id=p_quote for update;
 select * into o from public.orders where id=q.order_id for update;
 if q.id is null or lower(o.customer_email)<>lower(p_email) then raise exception 'Quote not found'; end if;
 if q.state<>'offered' or q.expires_at<now() or o.payment_status<>'unpaid' or o.payment_method<>'invoice' or o.status not in ('pending_review','awaiting_payment') or o.inventory_status<>'pending' then raise exception 'Quote is no longer available'; end if;
 update public.order_shipping_quotes set state='accepted',accepted_at=now() where id=q.id;
 update public.orders set payment_method='stripe',payment_status='pending',status='awaiting_payment',shipping_rate_amount=q.shipping_amount,shipping_method=q.service,shipping_quote=jsonb_build_object('id',q.id,'shipmentId','','carrier','Reviewed quote','service',q.service,'amount',q.shipping_amount,'currency',o.currency,'deliveryDays',null,'manualReviewed',true),total=round(o.subtotal-o.discount_amount+q.shipping_amount,2),tax_amount=0,updated_at=now() where id=o.id;
 return to_jsonb(q);
end $$;
revoke all on function public.offer_shipping_quote(text,text,numeric,text,text,text),public.accept_shipping_quote(text,text) from public,anon,authenticated;
grant execute on function public.offer_shipping_quote(text,text,numeric,text,text,text),public.accept_shipping_quote(text,text) to service_role;

create table if not exists public.tracking_events(id text primary key,type text not null,status text not null default 'pending',error_message text,processed_at timestamptz not null default now());
alter table public.tracking_events enable row level security;
revoke all on public.tracking_events from anon,authenticated;
grant all on public.tracking_events to service_role;
create or replace function public.claim_tracking_event(p_id text,p_type text)
returns text language plpgsql security invoker set search_path=public as $$
declare e public.tracking_events;
begin
  insert into public.tracking_events(id,type,status,processed_at) values(p_id,p_type,'pending',now()) on conflict do nothing;
  select * into e from public.tracking_events where id=p_id for update;
  if e.status='succeeded' then return 'complete'; end if;
  if e.status='processing' and e.processed_at > now()-interval '5 minutes' then return 'busy'; end if;
  update public.tracking_events set status='processing',type=p_type,error_message=null,processed_at=now() where id=p_id;
  return 'claimed';
end; $$;
revoke all on function public.claim_tracking_event(text,text) from public,anon,authenticated;
grant execute on function public.claim_tracking_event(text,text) to service_role;create table if not exists public.media_assets(path text primary key,original_path text,quarantined boolean not null default false,created_at timestamptz not null default now(),quarantined_at timestamptz);
alter table public.media_assets enable row level security;
revoke all on public.media_assets from anon,authenticated;
grant all on public.media_assets to service_role;

alter table public.orders add column if not exists policy_terms jsonb;
create or replace function public.guard_order_policy() returns trigger language plpgsql set search_path=public as $$
begin if new.policy_terms is distinct from old.policy_terms then raise exception 'Purchase policy snapshot is immutable'; end if;return new;end $$;
drop trigger if exists guard_order_policy on public.orders;
create trigger guard_order_policy before update on public.orders for each row execute function public.guard_order_policy();

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
    new.product_terms := jsonb_build_object('capturedAt',now(),'requiresInsurance',coalesce((s->>'__requiresInsurance')::boolean,false),'leadTime',p.lead_time_text,'condition',s->>'__condition','warranty',p.warranty_text,'returnable',coalesce((s->>'__returnable')::boolean,true),'fragile',coalesce((s->>'__fragile')::boolean,false),'shipsSeparately',coalesce((s->>'__shipsSeparately')::boolean,false),'shippingClass',s->>'__shippingClass','weightOz',s->>'__shippingWeightOz','lengthIn',s->>'__shippingLengthIn','widthIn',s->>'__shippingWidthIn','heightIn',s->>'__shippingHeightIn');
  end if;
  return new;
end $$;
create or replace function public.release_store_inventory(p_order_id text)
returns void language plpgsql security invoker set search_path = public as $$
declare current_order public.orders; line record; available integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('store-catalog', 0));
  select * into current_order from public.orders where id=p_order_id for update;
  if current_order.id is null then raise exception 'Order not found'; end if;
  if current_order.inventory_status='released' then return; end if;
  if current_order.status not in ('cancelled','refunded') or current_order.payment_status in ('paid','partially_refunded') or current_order.shipping_status in ('label_created','shipped','delivered','returned') then
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
alter table public.notification_outbox add column if not exists manual_retry_count integer not null default 0;
alter table public.notification_outbox add column if not exists retry_authorized_at timestamptz;
create or replace function public.claim_notifications(p_limit integer default 5) returns setof public.notification_outbox language plpgsql security invoker set search_path=public as $$
declare remaining integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('store-email-quota',0));
 select greatest(0,300-count(*))::integer into remaining from public.notification_outbox where (state='accepted' and accepted_at>=date_trunc('day',now())) or (state='sending' and lease_until>now());
 return query update public.notification_outbox set state='sending',attempts=attempts+1,lease_until=now()+interval '2 minutes'
 where id in(select id from public.notification_outbox where state in ('pending','failed','sending') and next_attempt_at<=now() and (lease_until is null or lease_until<now()) and attempts<5 and coalesce(retry_authorized_at,created_at)>now()-interval '23 hours' order by created_at for update skip locked limit least(greatest(p_limit,1),10,remaining)) returning *;
end $$;

alter table public.return_requests add column if not exists customer_notes text;
create or replace function public.notify_shipping_quote() returns trigger language plpgsql set search_path=public as $$
declare o public.orders;
begin select * into o from public.orders where id=new.order_id;
 insert into public.notification_outbox(event_key,recipient,topic,payload) values('quote:'||new.id,o.customer_email,'quote.offered',jsonb_build_object('orderId',o.id,'orderNumber',o.order_number)) on conflict(event_key) do nothing;return new;end $$;
drop trigger if exists notify_shipping_quote on public.order_shipping_quotes;
create trigger notify_shipping_quote after insert on public.order_shipping_quotes for each row execute function public.notify_shipping_quote();
-- One active label per purchased unit, including refund-pending labels until confirmed voided.
create unique index if not exists order_shipment_active_slot on public.order_shipments(order_id,(raw_payload->>'shipmentSlot')) where status not in ('voided','superseded') and raw_payload->>'shipmentSlot' is not null;
