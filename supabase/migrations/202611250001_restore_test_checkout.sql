begin;
create or replace function public.create_store_order_with_items(p_order jsonb, p_items jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
  o public.orders;
  item public.order_items;
  items_total numeric;
begin
  o := jsonb_populate_record(null::public.orders,p_order);
  if jsonb_typeof(p_items) is distinct from 'array' or jsonb_array_length(p_items) not between 1 and 8 then
    raise exception 'Invalid order items';
  end if;
  if o.payment_method not in ('invoice','stripe') or o.currency <> 'USD' or o.subtotal is null or o.subtotal <= 0 then
    raise exception 'Invalid order totals';
  end if;

  insert into public.orders (id,order_number,customer_email,customer_name,phone,address_line_1,address_line_2,
    city,state,postal_code,country,payment_method,status,payment_status,currency,subtotal,total,
    shipping_method,shipping_rate_amount,shipping_quote,shipping_status,requires_quote,notes)
  values (o.id,o.order_number,o.customer_email,o.customer_name,o.phone,o.address_line_1,o.address_line_2,
    o.city,o.state,o.postal_code,o.country,o.payment_method,
    case when o.payment_method='stripe' then 'awaiting_payment' else 'pending_review' end,
    case when o.payment_method='stripe' then 'pending' else 'unpaid' end,
    o.currency,o.subtotal,o.total,o.shipping_method,o.shipping_rate_amount,o.shipping_quote,
    case when o.shipping_rate_amount is null then 'quote_required' else 'ready' end,
    o.shipping_rate_amount is null,o.notes);

  for item in select * from jsonb_populate_recordset(null::public.order_items,p_items) loop
    if item.unit_price is null or item.unit_price <= 0 or item.quantity not between 1 and 99 then
      raise exception 'Invalid item quantity or price';
    end if;
    insert into public.order_items
      (id,order_id,product_id,product_slug,product_name,product_code,unit_price,quantity,line_total)
    values (item.id,o.id,item.product_id,item.product_slug,item.product_name,item.product_code,
      item.unit_price,item.quantity,round(item.unit_price*item.quantity,2));
  end loop;

  select sum(line_total) into items_total from public.order_items where order_id=o.id;
  if items_total is distinct from o.subtotal or o.total is distinct from o.subtotal+coalesce(o.shipping_rate_amount,0) then
    raise exception 'Order subtotal or total mismatch';
  end if;
end; $$;
revoke all on function public.create_store_order_with_items(jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.create_store_order_with_items(jsonb,jsonb) to service_role;
commit;
