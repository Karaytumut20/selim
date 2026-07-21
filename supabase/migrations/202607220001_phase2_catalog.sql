create table if not exists public.products (
  id text primary key,
  slug text not null unique,
  name text not null,
  part_number text not null,
  manufacturer_or_family text not null default '',
  category text not null,
  short_description text not null default '',
  long_description text not null default '',
  repair_supported boolean not null default true,
  typical_faults text[] not null default '{}',
  repair_capabilities text[] not null default '{}',
  lead_time_text text not null default 'Turnaround confirmed after evaluation',
  warranty_text text not null default 'Warranty options available',
  image_url text not null default '',
  gallery text[] not null default '{}',
  specifications jsonb not null default '{}'::jsonb,
  related_product_ids text[] not null default '{}',
  featured boolean not null default false,
  primary_product boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_sort_idx
  on public.products (status, sort_order, created_at);

create index if not exists products_category_idx
  on public.products (category);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.products enable row level security;

drop policy if exists "Published products are publicly readable" on public.products;
create policy "Published products are publicly readable"
on public.products
for select
to anon, authenticated
using (status = 'published');

revoke all on table public.products from anon, authenticated;
grant select on table public.products to anon, authenticated;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'product-images',
  'product-images',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Product mutations and Storage writes are intentionally not granted to
-- browser roles. The authenticated admin API performs those operations with
-- the server-only service role after verifying the Sites user allowlist.
