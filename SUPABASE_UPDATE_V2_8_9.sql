-- Sequential articles. Existing nonempty articles are preserved.
begin;
create sequence if not exists public.catalog_article_seq;
select pg_catalog.setval('public.catalog_article_seq', greatest(
  (select last_value from public.catalog_article_seq),
  coalesce((select max(substring(article from '^QUATT-([0-9]{1,15})$')::bigint) from public.products), 0)
), (select is_called from public.catalog_article_seq) or exists (select 1 from public.products where article ~ '^QUATT-[0-9]{1,15}$'));
create or replace function public.assign_catalog_article()
returns trigger language plpgsql security definer set search_path = '' as $$
declare candidate text;
begin
  perform pg_catalog.pg_advisory_xact_lock(288289001);
  if new.article is null or pg_catalog.btrim(new.article) = '' then
    loop
      candidate := pg_catalog.nextval('public.catalog_article_seq'::regclass)::text;
      candidate := 'QUATT-' || pg_catalog.lpad(candidate, greatest(6, pg_catalog.length(candidate)), '0');
      exit when not exists (select 1 from public.products p where pg_catalog.lower(p.article) = pg_catalog.lower(candidate));
    end loop;
    new.article := candidate;
  else
    new.article := pg_catalog.btrim(new.article);
    if exists (select 1 from public.products p where p.id <> new.id and pg_catalog.lower(p.article) = pg_catalog.lower(new.article)) then
      raise exception 'Артикул уже занят: %', new.article using errcode = '23505';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.assign_catalog_article() from public;
drop trigger if exists catalog_article_auto on public.products;
create trigger catalog_article_auto before insert or update of article on public.products
for each row execute function public.assign_catalog_article();
commit;
