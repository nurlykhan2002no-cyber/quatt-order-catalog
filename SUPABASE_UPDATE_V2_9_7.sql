begin;
alter table public.products add column if not exists name_kk text;
-- Compose only the existing public projection with the translated name.
-- Private procurement fields must never be added to this result.
create or replace function public.get_public_products_i18n()
returns setof jsonb language sql stable security definer set search_path=public as $$
  select to_jsonb(p)||jsonb_build_object('name_kk',q.name_kk)
  from public.get_public_products() p join public.products q on q.id=p.id;
$$;
grant execute on function public.get_public_products_i18n() to anon,authenticated;
update public.products set name_kk=case
  when lower(trim(name))='трубы стальные водогазопроводные' then 'Болат су-газ құбырлары'
  when lower(trim(name))='металлический круг' then 'Болат дөңгелек'
  when lower(trim(name))='арматура а500с' then 'А500С арматурасы'
  when name like 'Унитаз %' then substring(name from 8)||' унитазы'
  else name_kk end
where nullif(trim(name_kk),'') is null and (lower(trim(name)) in ('трубы стальные водогазопроводные','металлический круг','арматура а500с') or name like 'Унитаз %');
notify pgrst,'reload schema';
commit;
