-- ============================================================
-- QUATT CATALOG V2 — SUPABASE SETUP / MIGRATION
-- Run this once in Supabase -> SQL Editor
-- ============================================================

create extension if not exists "pgcrypto";

-- Existing base tables (safe if already created)
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer default 0,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category_id uuid references public.categories(id) on delete set null,
  brand text,
  article text,
  cost numeric(12,2) default 0,
  markup numeric(8,2) default 0,
  price numeric(12,2) default 0,
  delivery text,
  specs text,
  keywords text,
  supplier text,
  supplier_address text,
  supplier_contact text,
  notes text,
  checked_date date,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_path text not null,
  sort_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.app_settings (
  key text primary key,
  value text not null
);

create table if not exists public.staff_roles (
  email text primary key,
  role text not null check (role in ('admin','seller')),
  created_at timestamptz default now()
);

-- Owner of this catalog
insert into public.app_settings(key,value)
values ('owner_email','guw.taurus@gmail.com')
on conflict (key) do update set value = excluded.value;

-- Updated-at trigger
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at
before update on public.products
for each row execute function public.update_updated_at();

-- Current role: owner / admin / seller / guest
create or replace function public.catalog_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.jwt() ->> 'email' is null then 'guest'
    when lower(auth.jwt() ->> 'email') =
         lower(coalesce((select value from public.app_settings where key='owner_email'),''))
      then 'owner'
    else coalesce(
      (select role from public.staff_roles where lower(email)=lower(auth.jwt() ->> 'email')),
      'seller'
    )
  end
$$;

create or replace function public.is_catalog_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.catalog_role() in ('owner','admin')
$$;

create or replace function public.is_catalog_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.catalog_role() = 'owner'
$$;

-- Safe public product feed: no cost / supplier / contacts / notes
create or replace function public.get_public_products()
returns table (
  id uuid,
  name text,
  category_id uuid,
  brand text,
  article text,
  price numeric,
  delivery text,
  specs text,
  keywords text,
  checked_date date,
  active boolean,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id,p.name,p.category_id,p.brand,p.article,p.price,p.delivery,
         p.specs,p.keywords,p.checked_date,p.active,p.created_at,p.updated_at
  from public.products p
  where p.active = true
  order by p.created_at desc
$$;

grant execute on function public.catalog_role() to anon, authenticated;
grant execute on function public.is_catalog_admin() to anon, authenticated;
grant execute on function public.is_catalog_owner() to anon, authenticated;
grant execute on function public.get_public_products() to anon, authenticated;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.staff_roles enable row level security;
alter table public.app_settings enable row level security;

-- Drop policies from the first prototype / reruns
drop policy if exists "Public read categories" on public.categories;
drop policy if exists "Public read products" on public.products;
drop policy if exists "Public read product images" on public.product_images;
drop policy if exists "Authenticated manage categories" on public.categories;
drop policy if exists "Authenticated manage products" on public.products;
drop policy if exists "Authenticated manage product images" on public.product_images;

drop policy if exists "catalog_categories_read" on public.categories;
drop policy if exists "catalog_categories_write" on public.categories;
drop policy if exists "catalog_products_admin_read" on public.products;
drop policy if exists "catalog_products_admin_insert" on public.products;
drop policy if exists "catalog_products_admin_update" on public.products;
drop policy if exists "catalog_products_admin_delete" on public.products;
drop policy if exists "catalog_images_read" on public.product_images;
drop policy if exists "catalog_images_write" on public.product_images;
drop policy if exists "catalog_staff_owner" on public.staff_roles;
drop policy if exists "catalog_settings_owner_read" on public.app_settings;

create policy "catalog_categories_read"
on public.categories for select
to anon, authenticated
using (active = true or public.is_catalog_admin());

create policy "catalog_categories_write"
on public.categories for all
to authenticated
using (public.is_catalog_admin())
with check (public.is_catalog_admin());

-- Important: no anonymous SELECT on the products table.
-- Public visitors use get_public_products(), which excludes private columns.
create policy "catalog_products_admin_read"
on public.products for select
to authenticated
using (public.is_catalog_admin());

create policy "catalog_products_admin_insert"
on public.products for insert
to authenticated
with check (public.is_catalog_admin());

create policy "catalog_products_admin_update"
on public.products for update
to authenticated
using (public.is_catalog_admin())
with check (public.is_catalog_admin());

create policy "catalog_products_admin_delete"
on public.products for delete
to authenticated
using (public.is_catalog_admin());

create policy "catalog_images_read"
on public.product_images for select
to anon, authenticated
using (true);

create policy "catalog_images_write"
on public.product_images for all
to authenticated
using (public.is_catalog_admin())
with check (public.is_catalog_admin());

create policy "catalog_staff_owner"
on public.staff_roles for all
to authenticated
using (public.is_catalog_owner())
with check (public.is_catalog_owner());

create policy "catalog_settings_owner_read"
on public.app_settings for select
to authenticated
using (public.is_catalog_owner());

grant select on public.categories to anon, authenticated;
grant select on public.product_images to anon, authenticated;
grant select,insert,update,delete on public.products to authenticated;
grant select,insert,update,delete on public.categories to authenticated;
grant select,insert,update,delete on public.product_images to authenticated;
grant select,insert,update,delete on public.staff_roles to authenticated;
grant select on public.app_settings to authenticated;

-- Storage bucket should already exist. This also creates it if needed.
insert into storage.buckets(id,name,public)
values ('product-images','product-images',true)
on conflict (id) do update set public = true;

drop policy if exists "Public read product images storage" on storage.objects;
drop policy if exists "Authenticated upload product images" on storage.objects;
drop policy if exists "Authenticated update product images" on storage.objects;
drop policy if exists "Authenticated delete product images" on storage.objects;
drop policy if exists "catalog_storage_public_read" on storage.objects;
drop policy if exists "catalog_storage_admin_insert" on storage.objects;
drop policy if exists "catalog_storage_admin_update" on storage.objects;
drop policy if exists "catalog_storage_admin_delete" on storage.objects;

create policy "catalog_storage_public_read"
on storage.objects for select
to public
using (bucket_id = 'product-images');

create policy "catalog_storage_admin_insert"
on storage.objects for insert
to authenticated
with check (bucket_id='product-images' and public.is_catalog_admin());

create policy "catalog_storage_admin_update"
on storage.objects for update
to authenticated
using (bucket_id='product-images' and public.is_catalog_admin())
with check (bucket_id='product-images' and public.is_catalog_admin());

create policy "catalog_storage_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id='product-images' and public.is_catalog_admin());

-- Starter categories (no products are inserted)
insert into public.categories(name,sort_order)
values
('Унитазы',10),('Раковины',20),('Тумбы с раковиной',30),('Ванны',40),
('Душевые кабины',50),('Душевые системы',60),('Смесители',70),
('Зеркала',80),('Полотенцесушители',90),('Инсталляции',100),
('Мойки',110),('Аксессуары',120),('Водонагреватели',130)
on conflict (name) do nothing;
