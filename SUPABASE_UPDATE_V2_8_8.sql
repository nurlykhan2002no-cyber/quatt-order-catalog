-- Private costs for size variants. Public get_public_products() must continue
-- to return only the public variants JSON, never this column.
alter table public.products add column if not exists variant_costs jsonb not null default '{}'::jsonb;
