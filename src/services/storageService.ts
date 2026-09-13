import { Employee, Shift, Week, ScheduleAuditLog, CurrentUser, DayOfWeek } from '../types';
import { INITIAL_EMPLOYEES, getCurrentWeekInfo, getWeekInfoForDate, getWeeksUntilEndOfYear, generateInitialShifts, INITIAL_AUDIT_LOGS } from '../constants/pharmacy';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient';
import { validateShiftTimes, checkShiftsOverlap, formatShiftsForDay } from '../utils/timeCalculations';

const STORAGE_KEYS = {
  EMPLOYEES: 'mondino_employees_v1',
  WEEKS: 'mondino_weeks_v1',
  SHIFTS: 'mondino_shifts_v1',
  AUDIT_LOGS: 'mondino_audit_logs_v1',
};

// Initialize fallback storage data
export function initializeStorage() {
  if (typeof window === 'undefined') return;

  const currentWeek = getCurrentWeekInfo();
  const prevDate = new Date(Date.now() - 7 * 86400000);
  const nextDate = new Date(Date.now() + 7 * 86400000);
  const prevWeek = getCurrentWeekInfo(prevDate);
  const nextWeek = getCurrentWeekInfo(nextDate);
  nextWeek.status = 'draft';

  if (!localStorage.getItem(STORAGE_KEYS.EMPLOYEES)) {
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
  }

  if (!localStorage.getItem(STORAGE_KEYS.WEEKS)) {
    localStorage.setItem(STORAGE_KEYS.WEEKS, JSON.stringify([prevWeek, currentWeek, nextWeek]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.SHIFTS)) {
    const prevShifts = generateInitialShifts(prevWeek.id);
    const currentShifts = generateInitialShifts(currentWeek.id);
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify([...prevShifts, ...currentShifts]));
  }

  if (!localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS)) {
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
  }
}

export interface AdminChangeEventDetail {
  actorName: string;
  action: string;
  employeeName?: string;
  weekId?: string;
  dayOfWeek?: string;
  newValue?: string;
  timestamp: string;
}

export function notifyAdminChange(detail: AdminChangeEventDetail) {
  if (typeof window === 'undefined') return;

  // 1. Cross-tab BroadcastChannel for same browser instances (same device only)
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const bc = new BroadcastChannel('mondino_sync_channel');
      bc.postMessage(detail);
      bc.close();
    }
  } catch (e) {
    // ignore
  }

  // 2. Storage event trigger for other windows (same device only)
  try {
    localStorage.setItem('mondino_last_admin_change', JSON.stringify({ ...detail, nonce: Math.random() }));
  } catch (e) {
    // ignore
  }

  // 3. Cross-device: actually emit the Supabase Realtime broadcast that App.tsx
  // listens for on the 'admin_schedule_change' event. Previously nothing ever
  // called .send() on this channel, so devices other than the one making the
  // change never got the 🔔 toast — they only picked up the change silently on
  // the next poll/focus refresh, with no notification shown.
  try {
    const supabase = getSupabaseClient();
    if (supabase && isSupabaseConfigured()) {
      // Must match the channel topic name App.tsx subscribes to below
      // ('mondino_realtime_sync') — broadcasts are scoped per channel topic,
      // not global, so sending on a different topic would never be received.
      const channel = supabase.channel('mondino_realtime_sync');
      channel.subscribe((status: string) => {
        if (status === 'SUBSCRIBED') {
          channel.send({
            type: 'broadcast',
            event: 'admin_schedule_change',
            payload: detail,
          });
          // Give the send a moment to flush before tearing the channel down.
          setTimeout(() => {
            try {
              supabase.removeChannel(channel);
            } catch (e) {
              // ignore
            }
          }, 1500);
        }
      });
    }
  } catch (e) {
    // ignore
  }
}

// Ensure storage initialized
initializeStorage();

export const StorageService = {
  // Reset all local cache data
  resetToDefaults(): void {
    const currentWeek = getCurrentWeekInfo();
    const initialShifts = generateInitialShifts(currentWeek.id);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(INITIAL_EMPLOYEES));
    localStorage.setItem(STORAGE_KEYS.WEEKS, JSON.stringify([currentWeek]));
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(initialShifts));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(INITIAL_AUDIT_LOGS));
  },

  // -------------------------------------------------------------
  // EMPLOYEES & HOURLY RATES
  // -------------------------------------------------------------
  async getEmployees(userRole: 'admin' | 'employee'): Promise<Employee[]> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .order('name', { ascending: true });

        if (!error && Array.isArray(data) && data.length > 0) {
          // If admin, fetch from hourly_rates table
          const ratesMap: Record<string, number> = {};
          if (userRole === 'admin') {
            try {
              const { data: ratesData } = await supabase.from('hourly_rates').select('*');
              if (ratesData) {
                ratesData.forEach((r: any) => {
                  const empId = r.employee_id || r.id;
                  const rateVal = r.rate ?? r.hourly_rate ?? r.amount;
                  if (empId && rateVal !== undefined) {
                    ratesMap[empId] = Number(rateVal);
                  }
                });
              }
            } catch (rateErr) {
              console.warn('hourly_rates table read warning:', rateErr);
            }
          }

          const parsedList: Employee[] = data.map((e: any) => {
            const emp: Employee = {
              id: String(e.id),
              name: e.name,
              role: (e.role === 'admin' ? 'admin' : 'employee'),
              targetWeeklyHours: Number(e.target_weekly_hours ?? e.targetWeeklyHours ?? 40),
              active: e.active !== false,
              avatarColor: e.avatar_color ?? e.avatarColor ?? '#0d9488',
              email: e.email,
              phone: e.phone,
            };

            // Role-based rule: only admins receive hourly rates
            if (userRole === 'admin') {
              if (ratesMap[emp.id] !== undefined) {
                emp.hourlyRate = ratesMap[emp.id];
              } else if (e.hourly_rate !== undefined) {
                emp.hourlyRate = Number(e.hourly_rate);
              }
            }

            return emp;
          });

          // Update local cache
          localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(parsedList));
          return parsedList;
        }
      } catch (err) {
        console.warn('Supabase getEmployees failed, using cache:', err);
      }
    }

    // Fallback to cache
    const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    const employees: Employee[] = raw ? JSON.parse(raw) : INITIAL_EMPLOYEES;

    if (userRole !== 'admin') {
      return employees.map(e => {
        const { hourlyRate, ...rest } = e;
        return rest as Employee;
      });
    }

    return employees;
  },

  async addEmployee(employee: Omit<Employee, 'id'>, actor: CurrentUser): Promise<Employee> {
    if (actor.role !== 'admin') {
      throw new Error('Permiso denegado: solo administradores pueden agregar empleados.');
    }

    const newId = `emp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const fullEmployee: Employee = {
      ...employee,
      id: newId,
      active: true,
    };

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { error: insertError } = await supabase.from('employees').insert({
        id: fullEmployee.id,
        name: fullEmployee.name.trim(),
        role: fullEmployee.role,
        target_weekly_hours: fullEmployee.targetWeeklyHours,
        active: fullEmployee.active,
        email: fullEmployee.email?.trim() || null,
        phone: fullEmployee.phone?.trim() || null,
      });

      if (insertError) {
        console.error('Supabase addEmployee error:', insertError);
        throw new Error(`Error al guardar empleado en Supabase: ${insertError.message}`);
      }

      // If hourlyRate is provided and user is admin, store in hourly_rates
      if (fullEmployee.hourlyRate !== undefined && fullEmployee.hourlyRate > 0) {
        const { error: rateInsertError } = await supabase.from('hourly_rates').insert({
          employee_id: fullEmployee.id,
          rate: fullEmployee.hourlyRate,
          updated_at: new Date().toISOString(),
        });
        if (rateInsertError) {
          console.error('hourly_rates insert error:', rateInsertError);
          throw new Error(
            `El empleado se creó, pero el precio por hora NO se guardó: ${rateInsertError.message}`
          );
        }
      }
    }

    // Update local cache
    const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    const employees: Employee[] = raw ? JSON.parse(raw) : INITIAL_EMPLOYEES;
    employees.push(fullEmployee);
    localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));

    notifyAdminChange({
      actorName: actor.name,
      action: `Empleado agregado: ${fullEmployee.name}`,
      employeeName: fullEmployee.name,
      timestamp: new Date().toISOString(),
    });

    await this.recordAuditLog({
      weekId: getCurrentWeekInfo().id,
      employeeId: fullEmployee.id,
      employeeName: fullEmployee.name,
      dayOfWeek: 'mon',
      previousValue: 'No registrado',
      newValue: `Empleado dado de alta (${fullEmployee.role})`,
      changedBy: actor.id,
      changedByName: actor.name,
    });

    return fullEmployee;
  },

  async updateEmployee(employee: Employee, actor: CurrentUser): Promise<boolean> {
    if (actor.role !== 'admin') {
      throw new Error('Permiso denegado: solo administradores pueden modificar empleados.');
    }

    // IMPORTANT: the Supabase employees table in this installation does not
    // contain all optional profile columns (such as email/avatar_color).
    // This action is intentionally limited to the hourly rate, so it never
    // writes profile fields to employees.
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase && employee.hourlyRate !== undefined) {
      const now = new Date().toISOString();

      const { data: existingRate, error: lookupError } = await supabase
        .from('hourly_rates')
        .select('id')
        .eq('employee_id', employee.id)
        .limit(1)
        .maybeSingle();

      if (lookupError) {
        console.error('hourly_rates lookup error:', lookupError);
        throw new Error(`No se pudo consultar el precio por hora: ${lookupError.message}`);
      }

      if (existingRate?.id) {
        const { error } = await supabase
          .from('hourly_rates')
          .update({ rate: employee.hourlyRate, updated_at: now })
          .eq('id', existingRate.id);
        if (error) {
          console.error('hourly_rates update error:', error);
          throw new Error(`No se pudo guardar el precio por hora: ${error.message}`);
        }
      } else {
        const { error } = await supabase.from('hourly_rates').insert({
          employee_id: employee.id,
          rate: employee.hourlyRate,
          updated_at: now,
        });
        if (error) {
          console.error('hourly_rates insert error:', error);
          throw new Error(`No se pudo guardar el precio por hora: ${error.message}`);
        }
      }
    }

    // Keep the local cache in sync. No employee profile fields are sent to Supabase.
    const raw = localStorage.getItem(STORAGE_KEYS.EMPLOYEES);
    const employees: Employee[] = raw ? JSON.parse(raw) : INITIAL_EMPLOYEES;
    const index = employees.findIndex(e => String(e.id) === String(employee.id));
    if (index >= 0) {
      employees[index] = { ...employees[index], hourlyRate: employee.hourlyRate };
      localStorage.setItem(STORAGE_KEYS.EMPLOYEES, JSON.stringify(employees));
    }

    notifyAdminChange({
      actorName: actor.name,
      action: `Precio por hora actualizado: ${employee.name}`,
      employeeName: employee.name,
      newValue: employee.hourlyRate !== undefined ? `${employee.hourlyRate}` : undefined,
      timestamp: new Date().toISOString(),
    });

    return true;
  },

  // -------------------------------------------------------------
  // WEEKS
  // -------------------------------------------------------------
  async getWeeks(): Promise<Week[]> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('weeks')
          .select('*')
          .order('start_date', { ascending: false });

        if (!error && Array.isArray(data) && data.length > 0) {
          const parsed = data.map((w: any) => ({
            id: w.id,
            year: w.year,
            weekNumber: w.week_number ?? w.weekNumber,
            startDate: w.start_date ?? w.startDate,
            endDate: w.end_date ?? w.endDate,
            status: w.status,
            copiedFromWeekId: w.copied_from_week_id ?? w.copiedFromWeekId,
            updatedAt: w.updated_at ?? w.updatedAt,
          }));
          localStorage.setItem(STORAGE_KEYS.WEEKS, JSON.stringify(parsed));
          return parsed;
        }
      } catch (err) {
        console.warn('Supabase fetch weeks error:', err);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.WEEKS);
    if (raw) {
      return JSON.parse(raw);
    }
    const current = getCurrentWeekInfo();
    localStorage.setItem(STORAGE_KEYS.WEEKS, JSON.stringify([current]));
    return [current];
  },

  // Ensure every week from the current week through December 31 exists.
  // This removes the old two-week limitation and gives the calendar and Horarios
  // exactly the same persistent Week records to work with.
  async ensureWeeksThroughEndOfYear(actor?: CurrentUser): Promise<Week[]> {
    const isAdmin = actor?.role === 'admin';
    const existing = await this.getWeeks();
    const generated = getWeeksUntilEndOfYear(new Date());
    const byId = new Map(existing.map(w => [w.id, w]));

    for (const generatedWeek of generated) {
      if (!byId.has(generatedWeek.id)) {
        const week = {
          ...generatedWeek,
          status: generatedWeek.id === getCurrentWeekInfo().id ? 'published' : 'draft',
        } as Week;
        // Admins create the future planning horizon. In local-only mode we can
        // still create it so the app remains usable without Supabase.
        if (isAdmin || !isSupabaseConfigured()) {
          await this.saveWeek(week);
          byId.set(week.id, week);
        }
      }
    }

    return [...byId.values()].sort((a, b) => a.startDate.localeCompare(b.startDate));
  },

  async getShiftsForWeeks(weekIds: string[]): Promise<Shift[]> {
    const uniqueIds = [...new Set(weekIds)].filter(Boolean);
    if (uniqueIds.length === 0) return [];

    // Supabase .in() avoids one request per week and keeps the calendar synced.
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase.from('shifts').select('*').in('week_id', uniqueIds);
        if (!error && Array.isArray(data)) {
          const parsed = data.map((s: any) => ({
            id: String(s.id), employeeId: String(s.employee_id), weekId: String(s.week_id),
            dayOfWeek: s.day_of_week as DayOfWeek, startTime: s.start_time, endTime: s.end_time,
            status: s.status, note: s.note, createdAt: s.created_at, updatedAt: s.updated_at,
          }));
          const raw = localStorage.getItem(STORAGE_KEYS.SHIFTS);
          let allShifts: Shift[] = raw ? JSON.parse(raw) : [];
          allShifts = allShifts.filter(s => !uniqueIds.includes(s.weekId)).concat(parsed);
          localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(allShifts));
          return parsed;
        }
      } catch (err) {
        console.warn('Supabase getShiftsForWeeks error, using cache:', err);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.SHIFTS);
    const shifts: Shift[] = raw ? JSON.parse(raw) : [];
    return shifts.filter(s => uniqueIds.includes(s.weekId));
  },

  async saveWeek(week: Week): Promise<void> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.from('weeks').upsert({
        id: week.id,
        year: week.year,
        week_number: week.weekNumber,
        start_date: week.startDate,
        end_date: week.endDate,
        status: week.status,
        copied_from_week_id: week.copiedFromWeekId,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        console.error('Supabase saveWeek error:', error);
        throw new Error(`No se pudo guardar la semana en Supabase: ${error.message}`);
      }
    }

    // Update local cache
    const raw = localStorage.getItem(STORAGE_KEYS.WEEKS);
    let weeks: Week[] = raw ? JSON.parse(raw) : [];
    const idx = weeks.findIndex(w => w.id === week.id);
    if (idx >= 0) {
      weeks[idx] = week;
    } else {
      weeks.push(week);
    }
    localStorage.setItem(STORAGE_KEYS.WEEKS, JSON.stringify(weeks));
  },

  // -------------------------------------------------------------
  // SHIFTS
  // -------------------------------------------------------------
  async getShifts(weekId: string): Promise<Shift[]> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .eq('week_id', weekId);

        if (!error && Array.isArray(data)) {
          const parsed = data.map((s: any) => ({
            id: String(s.id),
            employeeId: String(s.employee_id),
            weekId: String(s.week_id),
            dayOfWeek: s.day_of_week as DayOfWeek,
            startTime: s.start_time,
            endTime: s.end_time,
            status: s.status,
            note: s.note,
            createdAt: s.created_at,
            updatedAt: s.updated_at,
          }));

          // Merge into local cache for this week
          const raw = localStorage.getItem(STORAGE_KEYS.SHIFTS);
          let allShifts: Shift[] = raw ? JSON.parse(raw) : [];
          allShifts = allShifts.filter(s => s.weekId !== weekId).concat(parsed);
          localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(allShifts));

          return parsed;
        }
      } catch (err) {
        console.warn('Supabase getShifts error, using cache:', err);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.SHIFTS);
    const shifts: Shift[] = raw ? JSON.parse(raw) : [];
    return shifts.filter(s => s.weekId === weekId);
  },

  async setDayShifts(
    weekId: string,
    employeeId: string,
    dayOfWeek: DayOfWeek,
    newShifts: { startTime: string; endTime: string; status: Shift['status'] }[],
    actor: CurrentUser,
    employeeName: string
  ): Promise<void> {
    if (actor.role !== 'admin') {
      throw new Error('Solo administradores pueden modificar turnos.');
    }

    // Conflict & validation check on new shifts
    for (const item of newShifts) {
      if (item.status === 'normal') {
        const validation = validateShiftTimes(item.startTime, item.endTime);
        if (!validation.valid) {
          throw new Error(validation.error || 'Horario de turno inválido');
        }
      }
    }

    if (newShifts.length > 1) {
      const shiftA = { ...newShifts[0], id: 'a', employeeId, weekId, dayOfWeek };
      const shiftB = { ...newShifts[1], id: 'b', employeeId, weekId, dayOfWeek };
      if (shiftA.status === 'normal' && shiftB.status === 'normal' && checkShiftsOverlap(shiftA as any, shiftB as any)) {
        throw new Error(`Los turnos se superponen entre sí (${shiftA.startTime}-${shiftA.endTime} y ${shiftB.startTime}-${shiftB.endTime}).`);
      }
    }

    // Previous shifts to compute audit
    const raw = localStorage.getItem(STORAGE_KEYS.SHIFTS);
    let allShifts: Shift[] = raw ? JSON.parse(raw) : [];

    const previousDayShifts = allShifts.filter(
      s => s.weekId === weekId && s.employeeId === employeeId && s.dayOfWeek === dayOfWeek
    );
    const previousValue = formatShiftsForDay(previousDayShifts);

    const now = new Date().toISOString();
    const createdShifts: Shift[] = newShifts.map((s, idx) => ({
      id: crypto.randomUUID(),      employeeId,
      weekId,
      dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      createdAt: now,
      updatedAt: now,
    }));

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      // 1. Delete existing shifts in Supabase for that employee and day
      const { error: deleteError } = await supabase
        .from('shifts')
        .delete()
        .match({ week_id: weekId, employee_id: employeeId, day_of_week: dayOfWeek });

      if (deleteError) {
        console.error('Supabase setDayShifts delete error:', deleteError);
        throw new Error(`Error al eliminar turno previo en Supabase: ${deleteError.message}`);
      }

      // 2. Insert new shifts in Supabase
      if (createdShifts.length > 0) {
        const { error: insertError } = await supabase.from('shifts').insert(
          createdShifts.map(s => ({
            id: s.id,
            employee_id: s.employeeId,
            week_id: s.weekId,
            day_of_week: s.dayOfWeek,
            start_time: s.startTime,
            end_time: s.endTime,
            status: s.status,
            created_at: s.createdAt,
            updated_at: s.updatedAt,
          }))
        );

        if (insertError) {
          console.error('Supabase setDayShifts insert error:', insertError);
          throw new Error(`Error al guardar turno en Supabase: ${insertError.message}`);
        }
      }
    }

    // 3. Update local cache ONLY AFTER Supabase succeeds (or if Supabase not configured)
    allShifts = allShifts.filter(
      s => !(s.weekId === weekId && s.employeeId === employeeId && s.dayOfWeek === dayOfWeek)
    );
    allShifts.push(...createdShifts);
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(allShifts));

    const newValue = formatShiftsForDay(createdShifts);

    if (previousValue !== newValue) {
      await this.recordAuditLog({
        weekId,
        employeeId,
        employeeName,
        dayOfWeek,
        previousValue,
        newValue,
        changedBy: actor.id,
        changedByName: actor.name,
      });
    }

    notifyAdminChange({
      actorName: actor.name,
      action: `Horario actualizado para ${employeeName}`,
      employeeName,
      weekId,
      dayOfWeek,
      newValue,
      timestamp: now,
    });
  },

  async deleteShift(shiftId: string, actor: CurrentUser, employeeName: string): Promise<void> {
    if (actor.role !== 'admin') {
      throw new Error('Solo administradores pueden eliminar turnos.');
    }

    const raw = localStorage.getItem(STORAGE_KEYS.SHIFTS);
    let shifts: Shift[] = raw ? JSON.parse(raw) : [];

    const targetShift = shifts.find(s => s.id === shiftId);
    if (!targetShift) return;

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      const { error: delError } = await supabase.from('shifts').delete().eq('id', shiftId);
      if (delError) {
        console.error('Supabase deleteShift error:', delError);
        throw new Error(`Error al eliminar turno en Supabase: ${delError.message}`);
      }
    }

    const dayShifts = shifts.filter(
      s => s.weekId === targetShift.weekId && s.employeeId === targetShift.employeeId && s.dayOfWeek === targetShift.dayOfWeek
    );
    const previousValue = formatShiftsForDay(dayShifts);

    shifts = shifts.filter(s => s.id !== shiftId);
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(shifts));

    const updatedDayShifts = shifts.filter(
      s => s.weekId === targetShift.weekId && s.employeeId === targetShift.employeeId && s.dayOfWeek === targetShift.dayOfWeek
    );
    const newValue = formatShiftsForDay(updatedDayShifts);

    await this.recordAuditLog({
      weekId: targetShift.weekId,
      employeeId: targetShift.employeeId,
      employeeName,
      dayOfWeek: targetShift.dayOfWeek,
      previousValue,
      newValue,
      changedBy: actor.id,
      changedByName: actor.name,
    });

    notifyAdminChange({
      actorName: actor.name,
      action: `Turno eliminado para ${employeeName}`,
      employeeName,
      weekId: targetShift.weekId,
      dayOfWeek: targetShift.dayOfWeek,
      newValue,
      timestamp: new Date().toISOString(),
    });
  },

  // Copy previous week into target week
  async copyWeek(sourceWeekId: string, targetWeek: Week, actor: CurrentUser): Promise<number> {
    if (actor.role !== 'admin') {
      throw new Error('Solo administradores pueden copiar semanas.');
    }

    // Retrieve source shifts
    const sourceShifts = await this.getShifts(sourceWeekId);
    if (sourceShifts.length === 0) {
      throw new Error(`La semana de origen (${sourceWeekId}) no contiene ningún turno para copiar.`);
    }

    const now = new Date().toISOString();
    const clonedShifts: Shift[] = sourceShifts.map((s, idx) => ({
      id: crypto.randomUUID(),
      employeeId: s.employeeId,
      weekId: targetWeek.id,
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      note: s.note,
      createdAt: now,
      updatedAt: now,
    }));

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      // 1. Clean existing shifts in target week in Supabase
      const { error: delError } = await supabase.from('shifts').delete().eq('week_id', targetWeek.id);
      if (delError) {
        throw new Error(`Error al limpiar semana en Supabase: ${delError.message}`);
      }

      // 2. Insert cloned shifts in Supabase
      const { error: insError } = await supabase.from('shifts').insert(
        clonedShifts.map(s => ({
          id: s.id,
          employee_id: s.employeeId,
          week_id: s.weekId,
          day_of_week: s.dayOfWeek,
          start_time: s.startTime,
          end_time: s.endTime,
          status: s.status,
          created_at: s.createdAt,
          updated_at: s.updatedAt,
        }))
      );

      if (insError) {
        throw new Error(`Error al guardar turnos copiados en Supabase: ${insError.message}`);
      }
    }

    // 3. Save target week metadata
    await this.saveWeek({
      ...targetWeek,
      copiedFromWeekId: sourceWeekId,
      updatedAt: now,
    });

    // 4. Update local cache
    const rawShifts = localStorage.getItem(STORAGE_KEYS.SHIFTS);
    let allShifts: Shift[] = rawShifts ? JSON.parse(rawShifts) : [];
    allShifts = allShifts.filter(s => s.weekId !== targetWeek.id);
    allShifts.push(...clonedShifts);
    localStorage.setItem(STORAGE_KEYS.SHIFTS, JSON.stringify(allShifts));

    await this.recordAuditLog({
      weekId: targetWeek.id,
      employeeId: 'all',
      employeeName: 'Todos los empleados',
      dayOfWeek: 'mon',
      previousValue: 'Semana sin programar',
      newValue: `Copiada desde semana anterior (${sourceWeekId}) con ${clonedShifts.length} turnos`,
      changedBy: actor.id,
      changedByName: actor.name,
    });

    notifyAdminChange({
      actorName: actor.name,
      action: `Semana ${sourceWeekId} copiada a ${targetWeek.id}`,
      weekId: targetWeek.id,
      newValue: `${clonedShifts.length} turnos copiados`,
      timestamp: now,
    });

    return clonedShifts.length;
  },

  // -------------------------------------------------------------
  // AUDIT LOGS (change_history)
  // -------------------------------------------------------------
  async getAuditLogs(weekId?: string): Promise<ScheduleAuditLog[]> {
    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        let query = supabase.from('change_history').select('*');
        if (weekId) {
          query = query.eq('week_id', weekId);
        }
        const { data, error } = await query.order('created_at', { ascending: false }).limit(100);

        if (!error && Array.isArray(data)) {
          const parsed = data.map((l: any) => ({
            id: String(l.id),
            weekId: l.week_id,
            employeeId: l.employee_id,
            employeeName: l.employee_name,
            dayOfWeek: l.day_of_week as DayOfWeek,
            previousValue: l.previous_value,
            newValue: l.new_value,
            changedBy: l.changed_by,
            changedByName: l.changed_by_name,
            timestamp: l.created_at || l.timestamp,
          }));
          localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(parsed));
          return parsed;
        }
      } catch (err) {
        console.warn('Supabase fetch change_history error:', err);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    const logs: ScheduleAuditLog[] = raw ? JSON.parse(raw) : INITIAL_AUDIT_LOGS;
    if (weekId) {
      return logs.filter(l => l.weekId === weekId);
    }
    return logs;
  },

  async recordAuditLog(log: Omit<ScheduleAuditLog, 'id' | 'timestamp'>): Promise<void> {
    const nowIso = new Date().toISOString();
    const newLog: ScheduleAuditLog = {
      ...log,
      id: crypto.randomUUID(),
    };

    const supabase = getSupabaseClient();
    if (isSupabaseConfigured() && supabase) {
      try {
        await supabase.from('change_history').insert({
          id: newLog.id,
          week_id: newLog.weekId,
          employee_id: newLog.employeeId,
          employee_name: newLog.employeeName,
          day_of_week: newLog.dayOfWeek,
          previous_value: newLog.previousValue,
          new_value: newLog.newValue,
          changed_by: newLog.changedBy,
          changed_by_name: newLog.changedByName,
          created_at: nowIso,
        });
      } catch (err) {
        console.warn('Supabase recordAuditLog error:', err);
      }
    }

    const raw = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    const logs: ScheduleAuditLog[] = raw ? JSON.parse(raw) : [];
    const updatedLogs = [newLog, ...logs].slice(0, 200);
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updatedLogs));
  },
};
