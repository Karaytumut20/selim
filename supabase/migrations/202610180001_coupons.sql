begin;
create table public.store_coupons (
 id uuid primary key default gen_random_uuid(), code text not null unique check (code ~ '^[A-Z0-9_-]{3,32}$'),
 kind text not null check (kind in ('percent','fixed')), amount numeric(12,2) not null check(amount>0),
 minimum_subtotal numeric(12,2) not null default 0 check(minimum_subtotal>=0),
 expires_at timestamptz, max_uses integer check(max_uses>0), per_customer_limit integer not null default 1 check(per_customer_limit>0),
 active boolean not null default true, created_at timestamptz not null default now(),
 check(kind<>'percent' or amount<=99)
);
alter table public.orders add column coupon_code text;
alter table public.orders add column discount_amount numeric(12,2) not null default 0 check(discount_amount>=0);
create table public.coupon_redemptions (
 order_id text primary key references public.orders(id) on delete cascade,
 coupon_id uuid not null references public.store_coupons(id), customer_email text not null,
 state text not null default 'reserved' check(state in ('reserved','used','released')),
 created_at timestamptz not null default now()
);
create index coupon_redemptions_usage on public.coupon_redemptions(coupon_id,state,customer_email);
alter table public.store_coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
revoke all on public.store_coupons,public.coupon_redemptions from anon,authenticated;
grant all on public.store_coupons,public.coupon_redemptions to service_role;

create function public.quote_store_coupon(p_code text,p_subtotal numeric,p_email text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare c public.store_coupons; discount numeric;
begin
 select * into c from public.store_coupons where code=upper(trim(p_code));
 if c.id is null or not c.active or (c.expires_at is not null and c.expires_at<=now()) then raise exception 'This discount code is unavailable.'; end if;
 if p_subtotal is null or p_subtotal < c.minimum_subtotal then raise exception 'The order does not meet the coupon minimum.'; end if;
 if c.max_uses is not null and (select count(*) from public.coupon_redemptions where coupon_id=c.id and state<>'released')>=c.max_uses then raise exception 'This discount code has reached its usage limit.'; end if;
 if (select count(*) from public.coupon_redemptions where coupon_id=c.id and state<>'released' and customer_email=lower(p_email))>=c.per_customer_limit then raise exception 'This discount code has already been used by this customer.'; end if;
 discount=case when c.kind='percent' then round(p_subtotal*c.amount/100,2) else c.amount end;
 if p_subtotal-discount<0.50 then raise exception 'The discounted product total must be at least $0.50.'; end if;
 return jsonb_build_object('code',c.code,'discountAmount',discount,'subtotal',p_subtotal,'total',p_subtotal-discount);
end $$;
create function public.apply_store_coupon(p_order_id text,p_code text) returns jsonb
language plpgsql security invoker set search_path=public as $$
declare o public.orders; c public.store_coupons; q jsonb;
begin
 select * into o from public.orders where id=p_order_id for update;
 if o.id is null then raise exception 'Order not found.'; end if;
 if o.coupon_code is not null then
   if o.coupon_code<>upper(trim(p_code)) then raise exception 'A different coupon is already attached.'; end if;
   return jsonb_build_object('code',o.coupon_code,'discountAmount',o.discount_amount,'subtotal',o.subtotal,'total',o.subtotal-o.discount_amount);
 end if;
 if o.status not in ('awaiting_payment','pending_review') or o.payment_status not in ('pending','unpaid') or o.inventory_status<>'pending' or o.stripe_checkout_session_id is not null or o.requires_quote or o.currency<>'USD' then raise exception 'This order cannot accept a coupon.'; end if;
 select * into c from public.store_coupons where code=upper(trim(p_code)) for update;
 q=public.quote_store_coupon(p_code,o.subtotal,o.customer_email);
 insert into public.coupon_redemptions(order_id,coupon_id,customer_email) values(o.id,c.id,lower(o.customer_email));
 update public.orders set coupon_code=c.code,discount_amount=(q->>'discountAmount')::numeric,total=o.subtotal-(q->>'discountAmount')::numeric+coalesce(o.shipping_rate_amount,0) where id=o.id;
 return q;
end $$;
create function public.sync_coupon_redemption() returns trigger language plpgsql set search_path=public as $$
begin
 update public.coupon_redemptions set state=case when state='used' or new.payment_status in ('paid','refunded','partially_refunded') then 'used' when new.status='cancelled' and new.inventory_status<>'held' then 'released' else state end where order_id=new.id;
 return new;
end $$;
create trigger sync_coupon_redemption after update of payment_status,status,inventory_status on public.orders for each row execute function public.sync_coupon_redemption();
revoke all on function public.quote_store_coupon(text,numeric,text),public.apply_store_coupon(text,text),public.sync_coupon_redemption() from public,anon,authenticated;
grant execute on function public.quote_store_coupon(text,numeric,text),public.apply_store_coupon(text,text) to service_role;
create or replace function public.settle_checkout_payment(p_order_id text,p_session_id text,p_payment_intent text,p_customer text,p_total numeric,p_tax numeric,p_shipping numeric,p_currency text)
returns boolean language plpgsql security invoker set search_path=public as $$
declare o public.orders;
begin
  perform pg_advisory_xact_lock(hashtextextended('store-catalog',0));
  select * into o from public.orders where id=p_order_id for update;
  if o.id is null or o.payment_method <> 'stripe' then raise exception 'Stripe order not found'; end if;
  if o.stripe_checkout_session_id is not null and o.stripe_checkout_session_id <> p_session_id then raise exception 'Checkout session mismatch'; end if;
  if upper(p_currency) <> o.currency or p_total is null or p_total <> round(o.subtotal-o.discount_amount,2)+coalesce(p_shipping,0)+coalesce(p_tax,0) or coalesce(p_shipping,0) <> coalesce(o.shipping_rate_amount,0) then raise exception 'Payment amount or currency mismatch'; end if;
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
commit;
