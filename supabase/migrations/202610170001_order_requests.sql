-- Request review never performs a payment, refund, or inventory release.
begin;
alter table public.return_requests add column if not exists kind text not null default 'return';
alter table public.return_requests add constraint order_request_kind_check check (kind in ('return', 'cancellation'));
alter table public.return_requests add constraint order_request_status_check check (status in ('requested','approved','rejected','received','refunded','completed'));
create unique index order_request_one_open on public.return_requests(order_id) where status in ('requested','approved','received');

create or replace function public.validate_order_request() returns trigger language plpgsql set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = new.order_id for update;
  if not found or lower(o.customer_email) <> lower(new.customer_email) then raise exception 'Order not found.'; end if;
  if length(trim(new.reason)) < 1 or length(new.reason) > 120 or length(new.description) > 2000 then raise exception 'A valid reason and details are required.'; end if;
  if tg_op = 'INSERT' then
    if new.status <> 'requested' then raise exception 'New requests must await review.'; end if;
    if o.status in ('cancelled','refunded') or o.payment_status = 'refunded' then raise exception 'This order is closed.'; end if;
    if new.kind = 'cancellation' and (o.shipping_status in ('shipped','delivered','returned') or o.status in ('shipped','delivered','completed')) then raise exception 'This order has shipped. Submit a return request instead.'; end if;
    if new.kind = 'return' and not (o.shipping_status in ('shipped','delivered','returned') or o.status in ('shipped','delivered','completed')) then raise exception 'This order has not shipped. Submit a cancellation request instead.'; end if;
  else
    if new.order_id <> old.order_id or new.customer_email <> old.customer_email or new.kind <> old.kind then raise exception 'Request identity cannot change.'; end if;
    if new.status <> old.status and not (
      (old.status = 'requested' and new.status in ('approved','rejected')) or
      (old.status = 'approved' and new.status = 'rejected') or
      (old.status = 'approved' and new.kind = 'return' and new.status = 'received') or
      (old.status = 'approved' and new.kind = 'cancellation' and new.status = 'completed') or
      (old.status = 'received' and new.kind = 'return' and new.status in ('refunded','rejected'))
    ) then raise exception 'Invalid request status transition.'; end if;
    if new.kind = 'cancellation' and new.status = 'approved' and (o.shipping_status in ('shipped','delivered','returned') or o.status in ('shipped','delivered','completed')) then raise exception 'This order has shipped. Reject this cancellation and use a return request.'; end if;
    if new.status = 'refunded' and o.payment_status <> 'refunded' then raise exception 'Confirm the actual full payment refund before closing this return.'; end if;
    if new.status = 'completed' and (o.status not in ('cancelled','refunded') or o.payment_status in ('paid','partially_refunded') or o.inventory_status = 'held') then raise exception 'Cancel the order, reconcile payment and release any checkout hold before completing this request.'; end if;
  end if;
  new.updated_at = now();
  return new;
end $$;
create trigger validate_order_request before insert or update on public.return_requests for each row execute function public.validate_order_request();
revoke all on function public.validate_order_request() from public, anon, authenticated;
commit;
