-- Mondino: estado de pago semanal por empleado
-- Ejecutar una sola vez en Supabase SQL Editor.

create table if not exists public.weekly_payments (
  week_id text not null references public.weeks(id) on delete cascade,
  employee_id text not null references public.employees(id) on delete cascade,
  paid boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (week_id, employee_id)
);

create index if not exists weekly_payments_week_id_idx on public.weekly_payments(week_id);
create index if not exists weekly_payments_employee_id_idx on public.weekly_payments(employee_id);

alter table public.weekly_payments enable row level security;

-- La app valida que el usuario sea administrador antes de permitir cambios.
-- Estas políticas permiten que usuarios autenticados lean/escriban los estados.
create policy "weekly_payments_authenticated_select"
on public.weekly_payments for select
to authenticated using (true);

create policy "weekly_payments_authenticated_insert"
on public.weekly_payments for insert
to authenticated with check (true);

create policy "weekly_payments_authenticated_update"
on public.weekly_payments for update
to authenticated using (true) with check (true);
