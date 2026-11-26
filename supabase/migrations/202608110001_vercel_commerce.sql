-- Vercel + Supabase commerce storage.
-- All application mutations go through the server-only Supabase client.

create table if not exists public.customer_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  phone text not null default '',
  company text not null default '',
  address_line_1 text not null default '',
  address_line_2 text not null default '',
  city text not null default '',
  state text not null default '',
  postal_code text not null default '',
  country text not null default 'United States',
  tags text not null default '',
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  order_number text not null unique,
  customer_email text not null,
  customer_name text not null,
  phone text not null,
  address_line_1 text not null,
  address_line_2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  country text not null,
  payment_method text not null,
  status text not null default 'pending_review',
  currency text not null default 'USD',
  subtotal numeric,
  total numeric,
  requires_quote boolean not null default false,
  notes text,
  payment_status text not null default 'unpaid',
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  stripe_customer_id text,
  payment_received_at timestamptz,
  shipping_status text not null default 'not_ready',
  shipping_provider text,
  shipping_method text,
  shipping_rate_amount numeric,
  shipping_cost numeric,
  shipment_id text,
  shipping_label_url text,
  tracking_number text,
  tracking_url text,
  tax_amount numeric not null default 0,
  refund_status text not null default 'none',
  refund_amount numeric not null default 0,
  inventory_status text not null default 'pending',
  inventory_reserved_at timestamptz,
  inventory_released_at timestamptz,
  internal_notes text,
  risk_status text not null default 'normal',
  risk_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_customer_email_idx on public.orders(customer_email);
create index if not exists orders_created_at_idx on public.orders(created_at desc);
create index if not exists orders_payment_intent_idx on public.orders(stripe_payment_intent_id);
create index if not exists orders_shipment_idx on public.orders(shipment_id);

create table if not exists public.order_items (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  product_id text not null,
  product_slug text not null,
  product_name text not null,
  product_code text not null,
  unit_price numeric,
  quantity integer not null check (quantity > 0),
  line_total numeric,
  unit_cost numeric,
  line_cost numeric
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);

create table if not exists public.order_shipments (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_shipment_id text,
  provider_rate_id text,
  carrier text,
  service text,
  rate_amount numeric,
  currency text not null default 'USD',
  status text not null default 'created',
  label_url text,
  tracking_number text,
  tracking_url text,
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists order_shipments_order_id_idx on public.order_shipments(order_id);
create index if not exists order_shipments_provider_id_idx on public.order_shipments(provider_shipment_id);

create table if not exists public.stripe_events (
  id text primary key,
  type text not null,
  status text not null default 'processing',
  error_message text,
  processed_at timestamptz not null default now()
);

create index if not exists stripe_events_type_idx on public.stripe_events(type);

create table if not exists public.return_requests (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  customer_email text not null,
  reason text not null,
  description text not null default '',
  status text not null default 'requested',
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists return_requests_order_id_idx on public.return_requests(order_id);
create index if not exists return_requests_status_idx on public.return_requests(status);

create table if not exists public.operations_events (
  id text primary key,
  type text not null,
  severity text not null default 'info',
  status text not null default 'open',
  reference_id text,
  message text not null,
  payload jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists operations_events_created_at_idx on public.operations_events(created_at desc);
create index if not exists operations_events_status_idx on public.operations_events(status);
create index if not exists operations_events_type_idx on public.operations_events(type);

create table if not exists public.ebay_sync_runs (
  id text primary key,
  trigger text not null,
  status text not null,
  imported_count integer not null default 0,
  updated_count integer not null default 0,
  hidden_count integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists ebay_sync_runs_started_at_idx on public.ebay_sync_runs(started_at desc);
create index if not exists ebay_sync_runs_status_idx on public.ebay_sync_runs(status);

create table if not exists public.ebay_sync_locks (
  id text primary key,
  expires_at timestamptz not null
);

create table if not exists public.ebay_stock_events (
  id text primary key,
  source text not null,
  reference_id text not null unique,
  order_id text,
  product_id text not null,
  ebay_item_id text not null,
  sku text not null,
  requested_quantity integer not null,
  resulting_quantity integer,
  status text not null,
  attempts integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists ebay_stock_events_status_idx on public.ebay_stock_events(status);
create index if not exists ebay_stock_events_order_id_idx on public.ebay_stock_events(order_id);

-- Atomic lock acquisition prevents two Vercel functions from updating the same
-- eBay listing at the same time.
create or replace function public.try_acquire_ebay_lock(
  p_id text,
  p_expires_at timestamptz,
  p_now timestamptz
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  changed integer;
begin
  insert into public.ebay_sync_locks (id, expires_at)
  values (p_id, p_expires_at)
  on conflict (id) do update
    set expires_at = excluded.expires_at
    where public.ebay_sync_locks.expires_at < p_now;
  get diagnostics changed = row_count;
  return changed > 0;
end;
$$;

create or replace function public.finish_ebay_stock_event(
  p_reference_id text,
  p_status text,
  p_quantity integer,
  p_error text,
  p_updated_at timestamptz
)
returns void
language sql
security definer
set search_path = public
as $$
  update public.ebay_stock_events
  set status = p_status,
      attempts = attempts + 1,
      resulting_quantity = p_quantity,
      error_message = p_error,
      updated_at = p_updated_at
  where reference_id = p_reference_id;
$$;

alter table public.customer_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_shipments enable row level security;
alter table public.stripe_events enable row level security;
alter table public.return_requests enable row level security;
alter table public.operations_events enable row level security;
alter table public.ebay_sync_runs enable row level security;
alter table public.ebay_sync_locks enable row level security;
alter table public.ebay_stock_events enable row level security;

revoke all on table public.customer_profiles from anon, authenticated;
revoke all on table public.orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.order_shipments from anon, authenticated;
revoke all on table public.stripe_events from anon, authenticated;
revoke all on table public.return_requests from anon, authenticated;
revoke all on table public.operations_events from anon, authenticated;
revoke all on table public.ebay_sync_runs from anon, authenticated;
revoke all on table public.ebay_sync_locks from anon, authenticated;
revoke all on table public.ebay_stock_events from anon, authenticated;

revoke all on function public.try_acquire_ebay_lock(text, timestamptz, timestamptz) from anon, authenticated;
revoke all on function public.finish_ebay_stock_event(text, text, integer, text, timestamptz) from anon, authenticated;
