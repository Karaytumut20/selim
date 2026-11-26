begin;
alter table public.orders add column submitted_at timestamptz;
update public.orders set submitted_at=created_at;
create table public.notification_outbox (
 id uuid primary key default gen_random_uuid(), event_key text not null unique,
 recipient text not null, topic text not null, payload jsonb not null,
 state text not null default 'pending' check(state in ('pending','sending','accepted','failed')),
 attempts integer not null default 0, next_attempt_at timestamptz not null default now(),
 lease_until timestamptz, last_error text, accepted_at timestamptz, created_at timestamptz not null default now()
);
alter table public.notification_outbox enable row level security;
revoke all on public.notification_outbox from anon,authenticated;
grant all on public.notification_outbox to service_role;
create function public.enqueue_order_notification() returns trigger language plpgsql set search_path=public as $$
declare topic text;
begin
 if new.submitted_at is null then return new; end if;
 if tg_op='INSERT' or (tg_op='UPDATE' and old.submitted_at is null) then topic='received';
 elsif new.payment_status<>old.payment_status and new.payment_status in ('refunded','partially_refunded') then topic=new.payment_status;
 elsif new.status<>old.status and new.status in ('paid','processing','shipped','delivered','cancelled') then topic=new.status;
 elsif new.shipping_status<>old.shipping_status and new.shipping_status in ('label_created','shipped','delivered') then topic=new.shipping_status;
 end if;
 if topic is not null then
 insert into public.notification_outbox(event_key,recipient,topic,payload)
 values('order:'||new.id||':'||topic,new.customer_email,'order.'||topic,jsonb_build_object('orderNumber',new.order_number,'status',new.status,'trackingNumber',new.tracking_number)) on conflict(event_key) do nothing;
 end if;
 return new;
end $$;
create trigger enqueue_order_notification after insert or update on public.orders for each row execute function public.enqueue_order_notification();
create function public.enqueue_request_notification() returns trigger language plpgsql set search_path=public as $$
declare number text;
begin
 if tg_op='UPDATE' and new.status=old.status then return new; end if;
 select order_number into number from public.orders where id=new.order_id;
 insert into public.notification_outbox(event_key,recipient,topic,payload)
 values('request:'||new.id||':'||new.status,new.customer_email,'request.'||new.status,jsonb_build_object('orderNumber',number,'kind',new.kind,'status',new.status)) on conflict(event_key) do nothing;
 return new;
end $$;
create trigger enqueue_request_notification after insert or update on public.return_requests for each row execute function public.enqueue_request_notification();
create function public.claim_notifications(p_limit integer default 5) returns setof public.notification_outbox language sql security invoker set search_path=public as $$
 update public.notification_outbox set state='sending',attempts=attempts+1,lease_until=now()+interval '2 minutes'
 where id in(select id from public.notification_outbox where state in ('pending','failed','sending') and next_attempt_at<=now() and (lease_until is null or lease_until<now()) and attempts<5 and created_at>now()-interval '23 hours' order by created_at for update skip locked limit least(greatest(p_limit,1),10)) returning *;
$$;
revoke all on function public.enqueue_order_notification(),public.enqueue_request_notification(),public.claim_notifications(integer) from public,anon,authenticated;
grant execute on function public.claim_notifications(integer) to service_role;
commit;
