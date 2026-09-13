-- ==============================================================================
-- FARMACIA Y PERFUMERÍA MONDINO - CONFIGURACIÓN DE POLÍTICAS RLS (SUPABASE)
-- ==============================================================================
-- Tablas cubiertas:
--   1. profiles
--   2. employees
--   3. shifts
--   4. change_history
--   (Incluye además: weeks y hourly_rates para seguridad integral)
--
-- Reglas aplicadas:
--   - Rol 'admin': Control total (SELECT, INSERT, UPDATE, DELETE).
--   - Rol 'employee': Solo lectura (SELECT) restringida estrictamente a sus
--     respectivos recursos (su propio perfil, su ficha de empleado, sus turnos
--     y su historial de cambios). Sin permisos de escritura/edición.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PASO 1: HABILITAR ROW LEVEL SECURITY (RLS) EN TODAS LAS TABLAS
-- ------------------------------------------------------------------------------
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.change_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.weeks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.hourly_rates ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- PASO 2: FUNCIONES AUXILIARES DE SEGURIDAD (SECURITY DEFINER)
-- Evitan bucles de recursión infinita en RLS al verificar roles desde public.profiles
-- ------------------------------------------------------------------------------

-- Función para verificar si el usuario autenticado tiene rol 'admin'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND LOWER(role) = 'admin'
  );
$$;

-- Función para obtener el employee_id asociado al usuario autenticado actual
CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT employee_id
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Otorgar permisos de ejecución a usuarios autenticados
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_current_employee_id() TO authenticated;

-- ------------------------------------------------------------------------------
-- PASO 3: LIMPIAR POLÍTICAS PREVIAS (Para ejecuciones repetidas y limpias)
-- ------------------------------------------------------------------------------

-- profiles
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_delete_policy" ON public.profiles;

-- employees
DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_admin_insert_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_admin_update_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_admin_delete_policy" ON public.employees;

-- shifts
DROP POLICY IF EXISTS "shifts_select_policy" ON public.shifts;
DROP POLICY IF EXISTS "shifts_admin_insert_policy" ON public.shifts;
DROP POLICY IF EXISTS "shifts_admin_update_policy" ON public.shifts;
DROP POLICY IF EXISTS "shifts_admin_delete_policy" ON public.shifts;

-- change_history
DROP POLICY IF EXISTS "change_history_select_policy" ON public.change_history;
DROP POLICY IF EXISTS "change_history_admin_insert_policy" ON public.change_history;
DROP POLICY IF EXISTS "change_history_admin_update_policy" ON public.change_history;
DROP POLICY IF EXISTS "change_history_admin_delete_policy" ON public.change_history;

-- weeks
DROP POLICY IF EXISTS "weeks_select_policy" ON public.weeks;
DROP POLICY IF EXISTS "weeks_admin_insert_policy" ON public.weeks;
DROP POLICY IF EXISTS "weeks_admin_update_policy" ON public.weeks;
DROP POLICY IF EXISTS "weeks_admin_delete_policy" ON public.weeks;

-- hourly_rates
DROP POLICY IF EXISTS "hourly_rates_admin_all" ON public.hourly_rates;

-- ==============================================================================
-- POLÍTICAS: TABLA `profiles`
-- ==============================================================================
-- SELECT: Administradores pueden ver todos los perfiles.
--         Los empleados solo pueden ver su propio perfil (id = auth.uid()).
CREATE POLICY "profiles_select_policy"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.is_admin() OR id = auth.uid()
);

-- INSERT: Solo administradores pueden crear perfiles
CREATE POLICY "profiles_admin_insert_policy"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);

-- UPDATE: Solo administradores pueden modificar perfiles (incluyendo roles)
CREATE POLICY "profiles_admin_update_policy"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

-- DELETE: Solo administradores pueden eliminar perfiles
CREATE POLICY "profiles_admin_delete_policy"
ON public.profiles
FOR DELETE
TO authenticated
USING (
  public.is_admin()
);

-- ==============================================================================
-- POLÍTICAS: TABLA `employees`
-- ==============================================================================
-- SELECT: Administradores pueden consultar todos los empleados.
--         Los empleados solo pueden consultar su propio registro (su id o su email).
CREATE POLICY "employees_select_policy"
ON public.employees
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR id = public.get_current_employee_id()
  OR LOWER(email) = LOWER(auth.jwt() ->> 'email')
);

-- NOTA: Si en el futuro deseas que los empleados puedan ver la lista de nombres
-- de sus compañeros en el calendario general, puedes sustituir la política anterior por:
-- USING ( active = true OR public.is_admin() );

-- INSERT: Solo administradores pueden dar de alta empleados
CREATE POLICY "employees_admin_insert_policy"
ON public.employees
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);

-- UPDATE: Solo administradores pueden editar datos de empleados
CREATE POLICY "employees_admin_update_policy"
ON public.employees
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

-- DELETE: Solo administradores pueden eliminar empleados
CREATE POLICY "employees_admin_delete_policy"
ON public.employees
FOR DELETE
TO authenticated
USING (
  public.is_admin()
);

-- ==============================================================================
-- POLÍTICAS: TABLA `shifts`
-- ==============================================================================
-- SELECT: Administradores pueden ver todos los turnos.
--         Los empleados solo pueden ver sus propios turnos asignados.
CREATE POLICY "shifts_select_policy"
ON public.shifts
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR employee_id = public.get_current_employee_id()
);

-- INSERT: Solo administradores pueden crear y programar turnos
CREATE POLICY "shifts_admin_insert_policy"
ON public.shifts
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);

-- UPDATE: Solo administradores pueden editar turnos existentes
CREATE POLICY "shifts_admin_update_policy"
ON public.shifts
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

-- DELETE: Solo administradores pueden eliminar turnos
CREATE POLICY "shifts_admin_delete_policy"
ON public.shifts
FOR DELETE
TO authenticated
USING (
  public.is_admin()
);

-- ==============================================================================
-- POLÍTICAS: TABLA `change_history` (Auditoría de Cambios)
-- ==============================================================================
-- SELECT: Administradores pueden auditar todos los cambios.
--         Los empleados solo pueden ver los cambios correspondientes a sus turnos.
CREATE POLICY "change_history_select_policy"
ON public.change_history
FOR SELECT
TO authenticated
USING (
  public.is_admin()
  OR employee_id = public.get_current_employee_id()
);

-- INSERT: Solo administradores (quienes ejecutan cambios) pueden registrar auditoría
CREATE POLICY "change_history_admin_insert_policy"
ON public.change_history
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_admin()
);

-- UPDATE: Nadie debe editar el historial de auditoría (inalterable). Solo admin si es estrictamente necesario.
CREATE POLICY "change_history_admin_update_policy"
ON public.change_history
FOR UPDATE
TO authenticated
USING (
  public.is_admin()
)
WITH CHECK (
  public.is_admin()
);

-- DELETE: Solo administradores pueden purgar registros antiguos si lo requieren
CREATE POLICY "change_history_admin_delete_policy"
ON public.change_history
FOR DELETE
TO authenticated
USING (
  public.is_admin()
);

-- ==============================================================================
-- POLÍTICAS ADICIONALES RECOMENDADAS (Semanas y Tarifas)
-- ==============================================================================

-- weeks: Todos los usuarios autenticados pueden consultar las semanas de trabajo,
-- pero solo los administradores pueden crear o modificar semanas (copiar semana, etc.).
CREATE POLICY "weeks_select_policy"
ON public.weeks
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "weeks_admin_insert_policy"
ON public.weeks
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin());

CREATE POLICY "weeks_admin_update_policy"
ON public.weeks
FOR UPDATE
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "weeks_admin_delete_policy"
ON public.weeks
FOR DELETE
TO authenticated
USING (public.is_admin());

-- hourly_rates: Confidencialidad estricta. Solo los administradores pueden
-- consultar, insertar o actualizar los valores hora.
CREATE POLICY "hourly_rates_admin_all"
ON public.hourly_rates
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- ------------------------------------------------------------------------------
-- PASO 4: ÍNDICES RECOMENDADOS PARA MÁXIMA PERFORMANCE CON RLS
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_shifts_employee_id ON public.shifts(employee_id);
CREATE INDEX IF NOT EXISTS idx_shifts_week_id ON public.shifts(week_id);
CREATE INDEX IF NOT EXISTS idx_change_history_employee_id ON public.change_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_change_history_week_id ON public.change_history(week_id);
