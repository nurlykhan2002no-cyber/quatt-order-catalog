begin;

-- Reuse the existing article column. Empty articles remain allowed.
create unique index if not exists catalog_products_article_unique
on public.products (lower(btrim(article)))
where article is not null and btrim(article) <> '';

create table if not exists public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  address text not null default '',
  contact text not null default '',
  created_at timestamptz not null default now()
);
create unique index if not exists catalog_suppliers_name_unique
on public.suppliers (lower(btrim(name)));
alter table public.suppliers enable row level security;

-- Exactly the same editor check already used by the private products table.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='suppliers' and policyname='catalog_suppliers_edit') then
    create policy catalog_suppliers_edit on public.suppliers
    for all to authenticated
    using (public.can_catalog_edit())
    with check (public.can_catalog_edit());
  end if;
end $$;
grant select, insert, update on public.suppliers to authenticated;
revoke all on public.suppliers from anon;

commit;
