-- Hosted projects may create public tables without default service-role grants.
grant select, insert, update, delete on table public.products to service_role;
