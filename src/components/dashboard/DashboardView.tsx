import React from 'react';
import {
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Share2,
  Copy,
  Users,
  History,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Sparkles,
  CalendarCheck,
  Check,
  User,
} from 'lucide-react';
import { Week, Employee, Shift, ScheduleAuditLog, CurrentUser, DAYS_OF_WEEK, DayOfWeek } from '../../types';
import { analyzeWeekCoverage } from '../../utils/coverageEngine';
import { calculateEmployeeWeeklyStats, formatDateSpanish, formatDateTimeSpanish, formatHoursDecimal, formatShiftsForDay } from '../../utils/timeCalculations';

interface DashboardViewProps {
  currentWeek: Week;
  employees: Employee[];
  shifts: Shift[];
  auditLogs: ScheduleAuditLog[];
  currentUser: CurrentUser;
  onNavigateToTab: (tab: 'schedule' | 'coverage' | 'history' | 'employees') => void;
  onOpenWhatsAppShare: () => void;
  onCopyPreviousWeek: () => void;
  hasPreviousWeek: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentWeek,
  employees,
  shifts,
  auditLogs,
  currentUser,
  onNavigateToTab,
  onOpenWhatsAppShare,
  onCopyPreviousWeek,
  hasPreviousWeek,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const { stats } = analyzeWeekCoverage(shifts, employees);

  // Identify employee object matching currentUser
  const myEmployeeRecord = employees.find(
    e => e.id === currentUser.id || e.name.toLowerCase() === currentUser.name.toLowerCase()
  );

  // Current day of week (mon, tue, etc.)
  const todayDayMap: Record<number, DayOfWeek> = {
    0: 'sun',
    1: 'mon',
    2: 'tue',
    3: 'wed',
    4: 'thu',
    5: 'fri',
    6: 'sat',
  };
  const todayDow = todayDayMap[new Date().getDay()] || 'mon';
  const todayInfo = DAYS_OF_WEEK.find(d => d.id === todayDow) || DAYS_OF_WEEK[0];

  // If user is employee, compute their stats
  const myStats = myEmployeeRecord
    ? calculateEmployeeWeeklyStats(myEmployeeRecord, shifts, false)
    : null;

  // Compute stats for all active employees
  let totalHours = 0;
  const activeEmployees = employees.filter(e => e.active !== false);
  activeEmployees.forEach(emp => {
    const s = calculateEmployeeWeeklyStats(emp, shifts, isAdmin);
    totalHours += s.totalHours;
  });

  // Shifts of today for all employees
  const todayShifts = shifts.filter(s => s.dayOfWeek === todayDow);

  return (
    <div id="dashboard-view" className="space-y-5">
      {/* Hero Welcome Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-teal-900 to-slate-900 border border-teal-700/40 p-6 sm:p-8 shadow-xl">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-500/40 text-xs font-semibold text-teal-200">
            <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span>Mondino Farmacia y Perfumería</span>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Hola, {currentUser.name}
            </h1>
            <p className="text-sm text-teal-100/90 font-medium">
              Semana {currentWeek.weekNumber}: {formatDateSpanish(currentWeek.startDate)} al{' '}
              {formatDateSpanish(currentWeek.endDate)}
            </p>
          </div>

          {/* Quick Flow Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              onClick={() => onNavigateToTab('schedule')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 active:scale-95 text-slate-950 font-bold text-xs shadow-lg shadow-teal-950/50 transition"
            >
              <Calendar className="w-4 h-4" />
              <span>Ver Horarios Completos</span>
            </button>

            {isAdmin && (
              <button
                onClick={onCopyPreviousWeek}
                disabled={!hasPreviousWeek}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-teal-200 border border-teal-500/40 font-semibold text-xs active:scale-95 transition disabled:opacity-40"
              >
                <Copy className="w-4 h-4" />
                <span>Copiar Semana Anterior</span>
              </button>
            )}

            <button
              onClick={onOpenWhatsAppShare}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow active:scale-95 transition"
            >
              <Share2 className="w-4 h-4" />
              <span>Compartir en WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Decorative background watermark */}
        <div className="absolute -right-8 -bottom-8 w-64 h-64 rounded-full bg-teal-500/10 blur-2xl pointer-events-none" />
      </div>

      {/* SPECIAL EMPLOYEE VIEW: PROMINENT PERSONAL SCHEDULE */}
      {!isAdmin && myEmployeeRecord && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow"
                style={{ backgroundColor: myEmployeeRecord.avatarColor || '#0d9488' }}
              >
                {myEmployeeRecord.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Tus Horarios Esta Semana</span>
                </h2>
                <p className="text-xs text-slate-400">
                  {myStats ? `${myStats.totalHours} horas asignadas (meta semanal: ${myEmployeeRecord.targetWeeklyHours}h)` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigateToTab('schedule')}
              className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              <span>Ver toda la farmacia</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Daily Shift Grid for the logged-in employee */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {DAYS_OF_WEEK.map(day => {
              const dayShifts = shifts.filter(
                s => s.employeeId === myEmployeeRecord.id && s.dayOfWeek === day.id
              );
              const shiftText = formatShiftsForDay(dayShifts);
              const isToday = day.id === todayDow;
              const isFranco = shiftText === 'Franco';
              const isSinTurno = shiftText === 'Sin turno';

              return (
                <div
                  key={day.id}
                  className={`p-3 rounded-2xl border text-center transition flex flex-col justify-between ${
                    isToday
                      ? 'bg-teal-950/40 border-teal-500 shadow-md ring-1 ring-teal-500/50'
                      : isFranco
                      ? 'bg-slate-950/60 border-slate-800'
                      : isSinTurno
                      ? 'bg-slate-950/30 border-slate-800/60 opacity-60'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="mb-2">
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-xs font-bold text-white uppercase">{day.name}</span>
                      {isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-pulse" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {isToday ? 'HOY' : day.id === 'sun' ? '10-22' : '09-23'}
                    </span>
                  </div>

                  <div>
                    {isFranco ? (
                      <span className="inline-block px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-semibold">
                        Franco
                      </span>
                    ) : isSinTurno ? (
                      <span className="text-xs text-slate-500 font-mono">—</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        {shiftText.split('/').map((part, pIdx) => (
                          <span
                            key={pIdx}
                            className="px-2 py-1 rounded-lg bg-teal-900/80 text-teal-100 font-mono font-bold text-xs border border-teal-700/80"
                          >
                            {part.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* QUIÉN TRABAJA HOY (FOR EVERYONE) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-bold text-white">
              Personal en Turno Hoy ({todayInfo.name})
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              {todayInfo.isSunday ? '10:00 - 14:00 y 17:00 - 22:00' : '09:00 a 23:00'}
            </span>
          </div>
          <button
            onClick={() => onNavigateToTab('schedule')}
            className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
          >
            <span>Ver semana</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeEmployees.map(emp => {
            const empTodayShifts = todayShifts.filter(s => s.employeeId === emp.id);
            const shiftText = formatShiftsForDay(empTodayShifts);
            const isFranco = shiftText === 'Franco';
            const isSinTurno = shiftText === 'Sin turno';
            const isMe = emp.id === currentUser.id || emp.name.toLowerCase() === currentUser.name.toLowerCase();

            return (
              <div
                key={emp.id}
                className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${
                  isMe ? 'bg-teal-950/20 border-teal-500/60' : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs"
                    style={{ backgroundColor: emp.avatarColor || '#0d9488' }}
                  >
                    {emp.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm flex items-center gap-1.5">
                      <span>{emp.name}</span>
                      {isMe && (
                        <span className="text-[9px] uppercase px-1 rounded bg-teal-600 text-white font-bold">
                          Tú
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {emp.role === 'admin' ? 'Administrador' : 'Empleado'}
                    </span>
                  </div>
                </div>

                <div>
                  {isFranco ? (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700">
                      Franco
                    </span>
                  ) : isSinTurno ? (
                    <span className="text-xs text-slate-500 font-mono">Sin turno</span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-teal-900/80 text-teal-100 font-mono font-bold text-xs border border-teal-700/80">
                      {shiftText}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Coverage Status */}
        <div
          onClick={() => onNavigateToTab('coverage')}
          className={`p-5 rounded-2xl border cursor-pointer hover:scale-[1.01] transition shadow-sm ${
            stats.totalDeficiencies === 0
              ? 'bg-slate-900 border-emerald-800/80'
              : 'bg-slate-900 border-amber-800/90'
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Control de Cobertura
            </span>
            <div
              className={`p-2 rounded-xl ${
                stats.totalDeficiencies === 0
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}
            >
              {stats.totalDeficiencies === 0 ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <AlertTriangle className="w-5 h-5" />
              )}
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {stats.totalDeficiencies === 0 ? '100% Cubierto' : `${stats.totalDeficiencies} Alertas`}
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span>{stats.totalDeficiencies === 0 ? 'Sin faltantes de personal' : 'Falta personal en franjas'}</span>
            <ArrowRight className="w-3 h-3 ml-auto text-teal-400" />
          </p>
        </div>

        {/* Total Working Hours */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Horas Semanales Totales
            </span>
            <div className="p-2 rounded-xl bg-slate-800 text-teal-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {totalHours.toFixed(1)} h
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Entre los {activeEmployees.length} empleados activos
          </p>
        </div>

        {/* Total Employees */}
        <div
          onClick={() => {
            if (isAdmin) onNavigateToTab('employees');
            else onNavigateToTab('schedule');
          }}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 cursor-pointer hover:scale-[1.01] transition shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Equipo Mondino
            </span>
            <div className="p-2 rounded-xl bg-slate-800 text-teal-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {employees.length} Integrantes
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>{activeEmployees.length} activos</span>
            <ArrowRight className="w-3 h-3 text-teal-400" />
          </p>
        </div>

        {/* Change History Count */}
        <div
          onClick={() => onNavigateToTab('history')}
          className="p-5 rounded-2xl bg-slate-900 border border-slate-800 cursor-pointer hover:scale-[1.01] transition shadow-sm"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Historial de Cambios
            </span>
            <div className="p-2 rounded-xl bg-slate-800 text-teal-400">
              <History className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-white font-mono">
            {auditLogs.length} Registros
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center justify-between">
            <span>Auditoría de horarios</span>
            <ArrowRight className="w-3 h-3 text-teal-400" />
          </p>
        </div>
      </div>

      {/* Two Column Layout: Hours per Employee & Live Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Hours per employee summary */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Horas Trabajadas por Empleado</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                  Semana {currentWeek.weekNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Cálculo de horas normales, extras y días francos
              </p>
            </div>
            <button
              onClick={() => onNavigateToTab('schedule')}
              className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              <span>Ver tabla completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {activeEmployees.map(emp => {
              const stats = calculateEmployeeWeeklyStats(emp, shifts, isAdmin);
              const progressPct = Math.min(100, Math.round((stats.totalHours / (stats.targetHours || 40)) * 100));

              return (
                <div
                  key={emp.id}
                  className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/60 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shrink-0"
                      style={{ backgroundColor: emp.avatarColor || '#0d9488' }}
                    >
                      {emp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm flex items-center gap-1.5">
                        <span>{emp.name}</span>
                        {emp.role === 'admin' && (
                          <span className="text-[9px] uppercase px-1 rounded bg-teal-950 text-teal-300 border border-teal-800">
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        Meta semanal: {stats.targetHours}h
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-white text-sm">
                      {stats.totalHours} h
                    </div>
                    {stats.overtimeHours > 0 ? (
                      <span className="text-[10px] text-amber-400 font-mono font-semibold">
                        +{stats.overtimeHours}h extra
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">
                        {progressPct}% de la meta
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coverage Alerts or Recent History */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h3 className="text-base font-bold text-white">Alertas de Cobertura</h3>
            <button
              onClick={() => onNavigateToTab('coverage')}
              className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
            >
              <span>Detalles</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {stats.criticalGaps.length > 0 ? (
            <div className="space-y-2.5">
              {stats.criticalGaps.slice(0, 4).map((gap, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/80 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between font-bold text-amber-300">
                    <span>{gap.dayName}</span>
                    <span className="font-mono">{gap.timeRange}</span>
                  </div>
                  <p className="text-amber-100/90">{gap.reason}</p>
                </div>
              ))}
              {stats.criticalGaps.length > 4 && (
                <p className="text-center text-xs text-amber-400 font-medium">
                  +{stats.criticalGaps.length - 4} alertas más en la vista de Cobertura
                </p>
              )}
            </div>
          ) : (
            <div className="p-6 text-center space-y-2 bg-emerald-950/30 border border-emerald-800/60 rounded-xl">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-white">Cobertura Óptima</h4>
              <p className="text-xs text-slate-300">
                La farmacia cumple todas las reglas de cobertura para los horarios de apertura y franjas pico (10-14 y 17-21).
              </p>
            </div>
          )}

          {/* Quick WhatsApp Share Card */}
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Share2 className="w-3.5 h-3.5 text-emerald-400" />
              Publicar Horarios
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Genera la imagen oficial de la semana y compártela directamente en el grupo <strong>Horarios Mondino</strong>.
            </p>
            <button
              onClick={onOpenWhatsAppShare}
              className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition"
            >
              Generar Imagen
            </button>
          </div>
        </div>
      </div>

      {/* Real-time Admin Changes Feed */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-teal-400" />
            <h3 className="text-base font-bold text-white">Últimos Cambios de Administradores</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-teal-950 border border-teal-800/60 text-teal-300 font-medium">
              En vivo
            </span>
          </div>
          <button
            onClick={() => onNavigateToTab('history')}
            className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center gap-1"
          >
            <span>Ver historial completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {auditLogs.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {auditLogs.slice(0, 3).map(log => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 hover:border-slate-700 transition space-y-2 text-xs"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-teal-300">{log.changedByName} (Admin)</span>
                  <span className="text-slate-400 font-mono text-[10px]">{formatDateTimeSpanish(log.timestamp)}</span>
                </div>
                <div className="text-slate-200">
                  Modificó a <strong className="text-white">{log.employeeName}</strong>
                </div>
                <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-[11px] font-mono">
                  <span className="text-slate-400">Nuevo: </span>
                  <span className="text-teal-200 font-semibold">{log.newValue}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/60 text-center text-xs text-slate-400">
            No se han registrado modificaciones recientes aún.
          </div>
        )}
      </div>
    </div>
  );
};
