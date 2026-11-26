begin;
create or replace function public.apply_store_test_tracking(p_event text,p_tracker text,p_status text)
returns text language plpgsql security invoker set search_path=public as $$
declare
  parcel public.order_shipments;
  target_order public.orders;
  total_units integer;
  delivered_units integer;
begin
  if p_status not in ('pre_transit','in_transit','out_for_delivery','available_for_pickup','delivered') then return 'ignored'; end if;
  if exists(select 1 from tracking_events where id=p_event and status='succeeded') then return 'duplicate'; end if;
  select * into parcel from order_shipments
    where provider='easypost' and raw_payload->>'testMode'='true' and raw_payload->>'trackerId'=p_tracker
    and status not in ('voided','superseded');
  if not found then return 'unlinked'; end if;
  select * into target_order from orders where id=parcel.order_id for update;
  if target_order.order_number not like 'QA-%' or target_order.payment_status not in ('paid','partially_refunded')
    or target_order.inventory_status<>'reserved' or target_order.status in ('cancelled','refunded','completed')
    then return 'ignored'; end if;
  insert into tracking_events (id,type,status) values (p_event,'tracker.updated','succeeded') on conflict do nothing;
  if not found then return 'duplicate'; end if;

  update order_shipments set status=p_status,updated_at=now() where id=parcel.id and status not in ('voided','superseded')
    and case p_status when 'pre_transit' then 1 when 'in_transit' then 2 when 'out_for_delivery' then 3
      when 'available_for_pickup' then 3 when 'delivered' then 4 end
      > case status when 'pre_transit' then 1 when 'in_transit' then 2 when 'out_for_delivery' then 3
      when 'available_for_pickup' then 3 when 'delivered' then 4 else 0 end;

  select coalesce(sum(quantity),0) into total_units from order_items where order_id=target_order.id;
  select count(distinct raw_payload->>'shipmentSlot') into delivered_units from order_shipments
    where order_id=target_order.id and raw_payload->>'testMode'='true' and status='delivered';
  if total_units>0 and delivered_units>=total_units then
    update orders set shipping_status='delivered',status='delivered',updated_at=now() where id=target_order.id and status<>'delivered';
  elsif p_status<>'pre_transit' and target_order.shipping_status<>'delivered' then
    update orders set shipping_status='shipped',status='shipped',updated_at=now() where id=target_order.id and status<>'shipped';
  end if;
  return 'updated';
end; $$;
revoke all on function public.apply_store_test_tracking(text,text,text) from public,anon,authenticated;
grant execute on function public.apply_store_test_tracking(text,text,text) to service_role;
commit;
