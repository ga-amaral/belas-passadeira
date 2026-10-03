begin;

update public.orders
set status = 'entrada'
where status = 'recebido';

update public.orders
set status = 'concluido'
where status = 'concluído';

do $$
declare
  invalid_statuses text;
begin
  select string_agg(status, ', ' order by status)
    into invalid_statuses
  from (
    select distinct status
    from public.orders
    where status is null
       or status not in ('entrada', 'molho_secagem', 'secar', 'passar', 'concluido')
  ) invalid;

  if invalid_statuses is not null then
    raise exception 'orders.status contém valores não mapeados: %', invalid_statuses;
  end if;
end $$;

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.orders'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%status%'
  loop
    execute format('alter table public.orders drop constraint %I', constraint_row.conname);
  end loop;
end $$;

alter table public.orders
  add constraint orders_status_check
  check (status in ('entrada', 'molho_secagem', 'secar', 'passar', 'concluido'));

alter table public.orders
  alter column status set default 'entrada';

commit;
