-- Preserve existing item quantities and CHECK (quantity > 0), while allowing
-- metered variants such as 2.5 m. Whole-item UI still requires integers.
begin;
alter table public.order_items alter column quantity type numeric(14,3)
  using quantity::numeric(14,3);
notify pgrst, 'reload schema';
commit;
