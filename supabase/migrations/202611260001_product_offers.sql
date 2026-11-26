begin;

create table public.product_offers (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  customer_email text not null,
  product_id text not null,
  product_slug text not null,
  product_name text not null,
  amount_cents integer not null check (amount_cents between 1 and 100000000),
  currency text not null default 'USD' check (currency = 'USD'),
  note text not null default '' check (char_length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending','reviewed','declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
alter table public.product_offers enable row level security;
revoke all on public.product_offers from public, anon, authenticated;
grant select, insert, update on public.product_offers to service_role;

create unique index product_offers_one_pending on public.product_offers (customer_id, product_id)
  where status='pending';
create index product_offers_customer_history on public.product_offers (customer_id, created_at desc);
create index product_offers_admin_queue on public.product_offers (status, created_at desc);

create function public.submit_product_offer(p_customer uuid, p_email text, p_slug text, p_amount integer, p_note text)
returns text language plpgsql security invoker set search_path = public as $$
declare
  product public.products;
  offer_id uuid;
begin
  if p_customer is null or p_email is null or char_length(p_email) not between 3 and 254
    or p_amount is null or p_amount not between 1 and 100000000
    or p_note is null or char_length(p_note) > 1000 then
    return 'invalid';
  end if;
  if not public.consume_request_limit('offer:' || p_customer::text, 10, 3600) then
    return 'rate_limited';
  end if;
  select * into product from public.products
    where slug=p_slug and status='published' and repair_supported
      and coalesce(specifications->>'__currency','USD')='USD'
    for share;
  if not found then return 'product_unavailable'; end if;

  insert into public.product_offers
    (customer_id,customer_email,product_id,product_slug,product_name,amount_cents,note)
  values (p_customer,lower(p_email),product.id,product.slug,product.name,p_amount,p_note)
  on conflict (customer_id,product_id) where status='pending' do nothing
  returning id into offer_id;

  if offer_id is null then return 'pending_exists'; end if;
  return 'submitted';
end;
$$;
revoke all on function public.submit_product_offer(uuid,text,text,integer,text) from public, anon, authenticated;
grant execute on function public.submit_product_offer(uuid,text,text,integer,text) to service_role;

commit;
