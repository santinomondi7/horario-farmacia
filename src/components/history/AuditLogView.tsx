import React, { useState } from 'react';
import { History, Search, Filter, Calendar, User, ArrowRight, ShieldCheck } from 'lucide-react';
import { ScheduleAuditLog, Employee, Week, DAYS_OF_WEEK } from '../../types';
import { formatDateTimeSpanish } from '../../utils/timeCalculations';

interface AuditLogViewProps {
  logs: ScheduleAuditLog[];
  employees: Employee[];
  weeks: Week[];
  currentWeekId: string;
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({
  logs,
  employees,
  weeks,
  currentWeekId,
}) => {
  const [selectedWeekFilter, setSelectedWeekFilter] = useState<string>('all');
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredLogs = logs.filter(log => {
    if (selectedWeekFilter !== 'all' && log.weekId !== selectedWeekFilter) return false;
    if (selectedEmployeeFilter !== 'all' && log.employeeId !== selectedEmployeeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchEmp = log.employeeName.toLowerCase().includes(q);
      const matchBy = log.changedByName.toLowerCase().includes(q);
      const matchPrev = log.previousValue.toLowerCase().includes(q);
      const matchNew = log.newValue.toLowerCase().includes(q);
      if (!matchEmp && !matchBy && !matchPrev && !matchNew) return false;
    }
    return true;
  });

  return (
    <div id="audit-log-view" className="space-y-4">
      {/* Header & Explanation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600/20 text-teal-400 flex items-center justify-center border border-teal-500/30">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Historial de Cambios</h3>
            <p className="text-xs text-slate-400">
              Registro inmutable de todas las modificaciones de horarios y turnos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-300 self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Auditoría protegida contra edición</span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por empleado o turno..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 focus:outline-none focus:border-teal-500"
          />
        </div>

        {/* Week Filter */}
        <div>
          <select
            value={selectedWeekFilter}
            onChange={e => setSelectedWeekFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="all">Todas las semanas</option>
            {weeks.map(w => (
              <option key={w.id} value={w.id}>
                Semana {w.weekNumber} ({w.id})
              </option>
            ))}
          </select>
        </div>

        {/* Employee Filter */}
        <div>
          <select
            value={selectedEmployeeFilter}
            onChange={e => setSelectedEmployeeFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="all">Todos los empleados</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-2.5">
        {filteredLogs.length > 0 ? (
          filteredLogs.map(log => {
            const dayName = DAYS_OF_WEEK.find(d => d.id === log.dayOfWeek)?.name || log.dayOfWeek;

            return (
              <div
                key={log.id}
                className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-2.5"
              >
                {/* Header row: who changed what */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">
                      {log.changedByName}
                    </span>
                    <span className="text-slate-400 text-xs">modificó el horario de</span>
                    <span className="font-bold text-teal-300 text-sm">
                      {log.employeeName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-sans font-medium">
                      {dayName}
                    </span>
                    <span>{formatDateTimeSpanish(log.timestamp)}</span>
                  </div>
                </div>

                {/* Before and After details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Antes:
                    </span>
                    <div className="font-mono text-slate-300 font-medium">
                      {log.previousValue}
                    </div>
                  </div>

                  <div className="p-2.5 rounded-lg bg-teal-950/40 border border-teal-800/50 space-y-1">
                    <span className="text-[10px] uppercase font-bold text-teal-400 tracking-wider">
                      Después:
                    </span>
                    <div className="font-mono text-teal-200 font-semibold">
                      {log.newValue}
                    </div>
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <span>Semana afectada: <strong className="text-slate-300 font-mono">{log.weekId}</strong></span>
                  <span>Modificado por: <strong className="text-slate-300">{log.changedByName}</strong></span>
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-xl text-slate-400 text-sm">
            No se encontraron modificaciones con los filtros seleccionados.
          </div>
        )}
      </div>
    </div>
  );
};
