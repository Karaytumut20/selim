begin;
create or replace function public.claim_store_test_notifications(p_email text,p_limit integer default 5)
returns setof public.notification_outbox language sql security invoker set search_path=public as $$
  update public.notification_outbox as outbox
  set state='sending',attempts=outbox.attempts+1,lease_until=now()+interval '2 minutes'
  where outbox.id in (
    select candidate.id from public.notification_outbox candidate
    where candidate.state='pending' and candidate.attempts=0 and candidate.next_attempt_at<=now()
      and candidate.created_at>now()-interval '1 day'
      and candidate.topic in ('order.received','order.paid','order.cancelled','order.refunded','order.partially_refunded','order.shipped','order.delivered')
      and lower(candidate.recipient)=lower(p_email) and candidate.payload->>'orderNumber' like 'QA-%'
    order by candidate.created_at for update skip locked limit least(greatest(p_limit,1),10)
  ) returning outbox.*;
$$;
revoke all on function public.claim_store_test_notifications(text,integer) from public,anon,authenticated;
grant execute on function public.claim_store_test_notifications(text,integer) to service_role;
commit;
