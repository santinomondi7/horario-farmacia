import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Share2,
  Plus,
  Calendar,
  Clock,
  AlertCircle,
  LayoutGrid,
  CalendarDays,
  User,
  CheckCircle2,
} from 'lucide-react';
import { Week, Employee, Shift, DayOfWeek, DAYS_OF_WEEK, CurrentUser, ShiftStatus } from '../../types';
import { formatShiftsForDay, calculateEmployeeWeeklyStats, formatHoursDecimal, formatDateSpanish } from '../../utils/timeCalculations';
import { ShiftModal } from './ShiftModal';

interface WeeklyScheduleTableProps {
  currentWeek: Week;
  weeks: Week[];
  employees: Employee[];
  shifts: Shift[];
  currentUser: CurrentUser;
  onSelectWeek: (weekId: string) => void;
  onCopyPreviousWeek: () => void;
  onOpenWhatsAppShare: () => void;
  onSaveDayShifts: (
    employeeId: string,
    dayOfWeek: DayOfWeek,
    newShifts: { startTime: string; endTime: string; status: ShiftStatus }[]
  ) => Promise<void>;
  hasPreviousWeek: boolean;
}

export const WeeklyScheduleTable: React.FC<WeeklyScheduleTableProps> = ({
  currentWeek,
  weeks,
  employees,
  shifts,
  currentUser,
  onSelectWeek,
  onCopyPreviousWeek,
  onOpenWhatsAppShare,
  onSaveDayShifts,
  hasPreviousWeek,
}) => {
  const [selectedCell, setSelectedCell] = useState<{
    employee: Employee;
    dayOfWeek: DayOfWeek;
  } | null>(null);

  // View Mode: 'table' (full grid) or 'day' (card-based view per day, optimal for mobile)
  const [viewMode, setViewMode] = useState<'table' | 'day'>('table');
  const [selectedDayTab, setSelectedDayTab] = useState<DayOfWeek>('mon');
  const [filterEmployeeId, setFilterEmployeeId] = useState<string>('all');
  const [showCopyConfirm, setShowCopyConfirm] = useState<boolean>(false);

  const isAdmin = currentUser.role === 'admin';

  // Navigate weeks
  const sortedWeeks = [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const currentWeekIndex = sortedWeeks.findIndex(w => w.id === currentWeek.id);
  const previousWeekObj = currentWeekIndex > 0 ? sortedWeeks[currentWeekIndex - 1] : null;

  const handlePrevWeek = () => {
    if (currentWeekIndex > 0) {
      onSelectWeek(sortedWeeks[currentWeekIndex - 1].id);
    }
  };

  const handleNextWeek = () => {
    if (currentWeekIndex < sortedWeeks.length - 1) {
      onSelectWeek(sortedWeeks[currentWeekIndex + 1].id);
    }
  };

  const activeEmployees = employees.filter(e => e.active !== false);
  const filteredEmployees =
    filterEmployeeId === 'all'
      ? activeEmployees
      : activeEmployees.filter(e => e.id === filterEmployeeId);

  // Selected cell shift list
  const selectedCellShifts = selectedCell
    ? shifts.filter(
        s => s.employeeId === selectedCell.employee.id && s.dayOfWeek === selectedCell.dayOfWeek
      )
    : [];

  const handleExecuteCopy = () => {
    setShowCopyConfirm(false);
    onCopyPreviousWeek();
  };

  const currentDayInfo = DAYS_OF_WEEK.find(d => d.id === selectedDayTab) || DAYS_OF_WEEK[0];
  const getDateForDay = (dayId: DayOfWeek) => {
    const dayIndex = DAYS_OF_WEEK.findIndex(d => d.id === dayId);
    const d = new Date(`${currentWeek.startDate}T12:00:00`);
    d.setDate(d.getDate() + dayIndex);
    return d;
  };

  const formatDayWithNumber = (dayId: DayOfWeek) => {
    const d = getDateForDay(dayId);
    return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
  };


  return (
    <div id="weekly-schedule-table-container" className="space-y-4">
      {/* Week Navigator & Action Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-sm">
        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            disabled={currentWeekIndex <= 0}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 transition"
            title="Semana anterior"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Semana {currentWeek.weekNumber}</h2>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {currentWeek.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {formatDateSpanish(currentWeek.startDate)} al {formatDateSpanish(currentWeek.endDate)}
              </p>
            </div>
          </div>

          <button
            onClick={handleNextWeek}
            disabled={currentWeekIndex >= sortedWeeks.length - 1}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-slate-200 transition"
            title="Semana siguiente"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          <select
            value={currentWeek.id}
            onChange={(e) => onSelectWeek(e.target.value)}
            className="max-w-[260px] bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
            title="Seleccionar cualquier semana del calendario"
          >
            {sortedWeeks.map((week) => (
              <option key={week.id} value={week.id}>
                Semana {week.weekNumber} · {formatDateSpanish(week.startDate)} - {formatDateSpanish(week.endDate)}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Switcher */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'table'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Tabla</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('day')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'day'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Por Día</span>
            </button>
          </div>

          {/* Employee Filter */}
          <select
            value={filterEmployeeId}
            onChange={e => setFilterEmployeeId(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-teal-500"
          >
            <option value="all">Todos ({activeEmployees.length})</option>
            {activeEmployees.map(e => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          {/* Copy Week Button (Admin Only) */}
          {isAdmin && (
            <button
              id="btn-copy-previous-week"
              onClick={() => setShowCopyConfirm(true)}
              disabled={!hasPreviousWeek}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-semibold active:scale-95 transition disabled:opacity-40"
              title="Copiar turnos desde la semana anterior"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar anterior</span>
            </button>
          )}

          {/* WhatsApp Share Button */}
          <button
            id="btn-share-whatsapp"
            onClick={onOpenWhatsAppShare}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm active:scale-95 transition"
            title="Generar imagen para el grupo Horarios Mondino"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Compartir WhatsApp</span>
            <span className="sm:hidden">WhatsApp</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: DAY CARD VIEW (Optimized for Mobile) */}
      {viewMode === 'day' && (
        <div className="space-y-3">
          {/* Day Pills Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {DAYS_OF_WEEK.map(day => {
              const isSelected = selectedDayTab === day.id;
              const isSun = day.id === 'sun';

              return (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => setSelectedDayTab(day.id)}
                  className={`flex-1 min-w-[70px] py-2 px-3 rounded-xl text-center text-xs font-bold transition border ${
                    isSelected
                      ? isSun
                        ? 'bg-amber-600 text-white border-amber-500 shadow-md'
                        : 'bg-teal-600 text-white border-teal-500 shadow-md'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  <span className="block text-[11px] uppercase opacity-80">{day.name.slice(0, 3)} {getDateForDay(day.id).getDate()}</span>
                  <span className="text-[10px] opacity-70 font-mono">
                    {day.id === 'sun' ? '10-22' : '09-23'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Current Day Header Card */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-white capitalize">{currentDayInfo.name} {formatDayWithNumber(selectedDayTab)}</span>
              <span className="text-xs text-slate-400 font-mono">
                {currentDayInfo.isSunday ? 'Horario especial: 10:00 - 14:00 y 17:00 - 22:00' : '09:00 a 23:00 hs'}
              </span>
            </div>
            {isAdmin && (
              <span className="text-[11px] text-teal-400 font-medium">
                Toca una tarjeta para editar
              </span>
            )}
          </div>

          {/* Cards for each employee on this day */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredEmployees.map(emp => {
              const dayShifts = shifts.filter(
                s => s.employeeId === emp.id && s.dayOfWeek === selectedDayTab
              );
              const shiftText = formatShiftsForDay(dayShifts);
              const isFranco = shiftText === 'Franco';
              const isSinTurno = shiftText === 'Sin turno';
              const isSplit = shiftText.includes('/');

              return (
                <div
                  key={emp.id}
                  onClick={() => {
                    if (isAdmin) {
                      setSelectedCell({ employee: emp, dayOfWeek: selectedDayTab });
                    }
                  }}
                  className={`p-4 rounded-2xl border transition relative ${
                    isAdmin ? 'cursor-pointer hover:border-teal-500/70 hover:bg-slate-800/80 active:scale-[0.99]' : ''
                  } ${
                    isFranco
                      ? 'bg-slate-900/60 border-slate-800'
                      : isSinTurno
                      ? 'bg-slate-900/40 border-slate-800/60 opacity-60'
                      : 'bg-teal-950/20 border-teal-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs"
                        style={{ backgroundColor: emp.avatarColor || '#0d9488' }}
                      >
                        {emp.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{emp.name}</span>
                          {emp.role === 'admin' && (
                            <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-teal-950 text-teal-300 border border-teal-800 font-semibold">
                              Admin
                            </span>
                          )}
                        </h4>
                        <span className="text-[11px] text-slate-400">
                          Meta: {emp.targetWeeklyHours}h
                        </span>
                      </div>
                    </div>

                    {/* Shift badge */}
                    <div>
                      {isFranco ? (
                        <span className="px-3 py-1 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700">
                          Franco
                        </span>
                      ) : isSinTurno ? (
                        <span className="text-xs text-slate-500 font-mono">
                          {isAdmin ? '+ Asignar' : 'Sin turno'}
                        </span>
                      ) : isSplit ? (
                        <div className="flex flex-col gap-1 items-end">
                          {shiftText.split('/').map((part, pIdx) => (
                            <span
                              key={pIdx}
                              className="px-2.5 py-0.5 rounded-lg bg-teal-900/90 text-teal-200 font-mono font-semibold text-xs border border-teal-700/70"
                            >
                              {part.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="px-3 py-1 rounded-xl bg-teal-900/80 text-teal-100 font-mono font-bold text-xs border border-teal-700/80">
                          {shiftText}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW MODE 2: FULL TABLE MATRIX */}
      {viewMode === 'table' && (
        <div className="space-y-2">
          {/* Helper instruction banner */}
          <div className="flex items-center justify-between text-xs text-slate-400 px-1">
            <span className="hidden sm:inline">
              {isAdmin
                ? '💡 Haz clic en cualquier celda para modificar o agregar turnos.'
                : '👁️ Consulta los horarios semanales de todo el equipo.'}
            </span>
            <span className="sm:hidden text-teal-400/80">
              👉 Desliza horizontalmente para ver todos los días
            </span>
            <span className="text-[11px] text-slate-400">
              Atención: Lun-Sáb 09-23h • Dom 10-14 y 17-22h
            </span>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 text-xs">
                    {/* Fixed column for Employee */}
                    <th className="sticky left-0 z-20 bg-slate-950/95 backdrop-blur-xs py-3.5 px-4 font-bold uppercase tracking-wider w-44 border-r border-slate-800">
                      Empleado
                    </th>

                    {/* Day Columns */}
                    {DAYS_OF_WEEK.map(day => (
                      <th
                        key={day.id}
                        className={`py-3.5 px-3 font-bold uppercase tracking-wider text-center border-r border-slate-800/80 ${
                          day.id === 'sun' ? 'text-amber-400 bg-amber-950/20' : 'text-slate-300'
                        }`}
                      >
                        <div className="flex flex-col items-center">
                          <span>{day.name} {getDateForDay(day.id).getDate()}</span>
                          <span className="text-[10px] font-normal text-slate-400 lowercase">
                            {day.id === 'sun' ? '10-14 y 17-22' : '09:00 - 23:00'}
                          </span>
                        </div>
                      </th>
                    ))}

                    {/* Total Hours Column */}
                    <th className="py-3.5 px-3 font-bold uppercase tracking-wider text-center text-teal-400 w-28 bg-slate-950/60">
                      Total Horas
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/70 text-xs">
                  {filteredEmployees.map((emp, rIdx) => {
                    const stats = calculateEmployeeWeeklyStats(emp, shifts, isAdmin);

                    return (
                      <tr
                        key={emp.id}
                        className={`hover:bg-slate-800/40 transition ${
                          rIdx % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900/90'
                        }`}
                      >
                        {/* Sticky Employee Column */}
                        <td className="sticky left-0 z-10 bg-slate-900/95 backdrop-blur-xs py-3 px-4 border-r border-slate-800">
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs shadow-xs"
                              style={{ backgroundColor: emp.avatarColor || '#0d9488' }}
                            >
                              {emp.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                <span>{emp.name}</span>
                                {emp.role === 'admin' && (
                                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-teal-950 text-teal-300 border border-teal-800">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400 font-mono">
                                Meta: {emp.targetWeeklyHours}h
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Day Cells */}
                        {DAYS_OF_WEEK.map(day => {
                          const dayShifts = shifts.filter(
                            s => s.employeeId === emp.id && s.dayOfWeek === day.id
                          );
                          const shiftText = formatShiftsForDay(dayShifts);
                          const isFranco = shiftText === 'Franco';
                          const isSinTurno = shiftText === 'Sin turno';
                          const isSplit = shiftText.includes('/');

                          return (
                            <td
                              key={day.id}
                              onClick={() => {
                                if (isAdmin) {
                                  setSelectedCell({ employee: emp, dayOfWeek: day.id });
                                }
                              }}
                              className={`p-2 text-center border-r border-slate-800/60 align-middle ${
                                isAdmin ? 'cursor-pointer hover:bg-slate-800/80 group transition' : ''
                              } ${day.id === 'sun' ? 'bg-amber-950/10' : ''}`}
                            >
                              {isFranco ? (
                                <div className="inline-block px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 font-semibold text-xs border border-slate-700 shadow-2xs group-hover:border-slate-500 transition">
                                  Franco
                                </div>
                              ) : isSinTurno ? (
                                <div className="inline-flex items-center justify-center w-full py-1.5 text-slate-400 font-mono text-xs group-hover:text-teal-400">
                                  {isAdmin ? (
                                    <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[11px] text-teal-400">
                                      <Plus className="w-3 h-3" /> Turno
                                    </span>
                                  ) : (
                                    '—'
                                  )}
                                </div>
                              ) : isSplit ? (
                                <div className="inline-flex flex-col gap-1 items-center">
                                  {shiftText.split('/').map((part, pIdx) => (
                                    <span
                                      key={pIdx}
                                      className="px-2 py-0.5 rounded-md bg-teal-950/90 text-teal-200 font-mono font-medium text-[11px] border border-teal-800/70 shadow-2xs"
                                    >
                                      {part.trim()}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <div className="inline-block px-2.5 py-1.5 rounded-lg bg-teal-900/60 text-teal-100 font-mono font-semibold text-xs border border-teal-700/60 shadow-2xs group-hover:border-teal-500 transition">
                                  {shiftText}
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Total Hours */}
                        <td className="p-3 text-center bg-slate-950/40">
                          <div className="font-bold text-white font-mono text-sm">
                            {stats.totalHours} h
                          </div>
                          {stats.overtimeHours > 0 && (
                            <span className="inline-block text-[10px] font-mono text-amber-400 font-semibold px-1.5 rounded bg-amber-950/80 border border-amber-800/60">
                              +{stats.overtimeHours}h extra
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Copying Previous Week */}
      {showCopyConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-teal-400">
              <div className="w-10 h-10 rounded-xl bg-teal-950 border border-teal-800 flex items-center justify-center">
                <Copy className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white">
                ¿Copiar semana anterior?
              </h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Esta acción copiará toda la distribución de turnos de la{' '}
              <strong className="text-teal-300 font-mono">
                Semana {previousWeekObj?.weekNumber || 'anterior'} ({previousWeekObj?.id})
              </strong>{' '}
              a la semana actual ({currentWeek.id}). Los turnos existentes en la semana actual serán reemplazados.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowCopyConfirm(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleExecuteCopy}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition shadow"
              >
                Confirmar y Copiar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for editing shift */}
      {selectedCell && (
        <ShiftModal
          isOpen={Boolean(selectedCell)}
          onClose={() => setSelectedCell(null)}
          employee={selectedCell.employee}
          dayOfWeek={selectedCell.dayOfWeek}
          weekId={currentWeek.id}
          existingShifts={selectedCellShifts}
          currentUser={currentUser}
          onSaveDayShifts={async newShifts => {
            await onSaveDayShifts(selectedCell.employee.id, selectedCell.dayOfWeek, newShifts);
          }}
        />
      )}
    </div>
  );
};
