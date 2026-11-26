-- Coordinate recoverable image removal with catalog writes, so a save cannot
-- attach an asset between the reference check and the storage move.
create or replace function public.begin_media_quarantine(p_path text) returns boolean language plpgsql set search_path=public as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('store-catalog',0));
 if p_path !~ '^catalog/[a-zA-Z0-9._-]+$' then raise exception 'Invalid media path'; end if;
 if exists(select 1 from public.products p where right(split_part(p.image_url,'?',1),length(p_path)+1)='/'||p_path or exists(select 1 from unnest(p.gallery) u where right(split_part(u,'?',1),length(p_path)+1)='/'||p_path)) then raise exception 'This image is used by a product';end if;
 insert into public.media_assets(path,original_path,quarantined,quarantined_at) values(p_path,p_path,true,now()) on conflict(path) do update set original_path=p_path,quarantined=true,quarantined_at=now();
 return true;
end $$;
revoke all on function public.begin_media_quarantine(text) from public,anon,authenticated;
grant execute on function public.begin_media_quarantine(text) to service_role;
create or replace function public.guard_product_media() returns trigger language plpgsql set search_path=public as $$
begin
 if exists(select 1 from public.media_assets m where m.quarantined and (right(split_part(new.image_url,'?',1),length(m.original_path)+1)='/'||m.original_path or exists(select 1 from unnest(new.gallery) u where right(split_part(u,'?',1),length(m.original_path)+1)='/'||m.original_path))) then raise exception 'An image in this product has been quarantined. Restore it or choose another photo.';end if;
 return new;
end $$;
drop trigger if exists guard_product_media on public.products;
create trigger guard_product_media before insert or update on public.products for each row execute function public.guard_product_media();
