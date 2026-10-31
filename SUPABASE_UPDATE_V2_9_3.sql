-- Keep precise per-metre / per-kg rates. Line and order totals remain money (2 decimals).
begin;
alter table public.order_items alter column unit_price type numeric(20,6)
  using unit_price::numeric(20,6);
notify pgrst, 'reload schema';
commit;
