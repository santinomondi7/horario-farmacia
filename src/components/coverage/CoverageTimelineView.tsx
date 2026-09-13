import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Users, Clock, Calendar, ChevronRight, ShieldAlert, Sparkles } from 'lucide-react';
import { Shift, Employee, DayOfWeek, DAYS_OF_WEEK } from '../../types';
import { analyzeWeekCoverage, analyzeDayCoverage } from '../../utils/coverageEngine';

interface CoverageTimelineViewProps {
  shifts: Shift[];
  employees: Employee[];
  selectedWeekId: string;
}

export const CoverageTimelineView: React.FC<CoverageTimelineViewProps> = ({
  shifts,
  employees,
  selectedWeekId,
}) => {
  const [activeDay, setActiveDay] = useState<DayOfWeek>('mon');

  const { days, stats } = analyzeWeekCoverage(shifts, employees);
  const currentDaySummary = days[activeDay] || analyzeDayCoverage('mon', shifts, employees);

  return (
    <div id="coverage-timeline-view" className="space-y-5">
      {/* Global Week Status Banner */}
      <div
        className={`p-5 rounded-2xl border transition-all shadow-sm ${
          stats.totalDeficiencies === 0
            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-100'
            : 'bg-amber-950/40 border-amber-800/80 text-amber-100'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`p-2.5 rounded-xl mt-0.5 ${
                stats.totalDeficiencies === 0
                  ? 'bg-emerald-800/60 text-emerald-300'
                  : 'bg-amber-800/60 text-amber-300'
              }`}
            >
              {stats.totalDeficiencies === 0 ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <AlertTriangle className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold">
                  {stats.totalDeficiencies === 0
                    ? 'Cobertura Semanal Completa'
                    : `${stats.totalDeficiencies} Alertas de Falta de Cobertura`}
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-900/60 border border-current">
                  {stats.coveragePercentage}% Cumplimiento
                </span>
              </div>
              <p className="text-xs opacity-80 mt-1">
                {stats.totalDeficiencies === 0
                  ? 'Todos los horarios de apertura y franjas pico cuentan con el personal obligatorio requerido.'
                  : `Se detectaron horarios con menos personal del mínimo exigido (2 empleados en 10-14 y 17-21; 1 empleado resto del horario).`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="text-right">
              <span className="block text-[11px] uppercase tracking-wider opacity-70">
                Franjas Analizadas
              </span>
              <span className="text-sm font-bold font-mono">Semana {selectedWeekId}</span>
            </div>
          </div>
        </div>

        {/* Critical Gaps List (if any) */}
        {stats.criticalGaps.length > 0 && (
          <div className="mt-4 pt-3 border-t border-amber-800/50 space-y-2">
            <span className="block text-xs font-bold uppercase tracking-wider text-amber-300">
              Detalle exacto de faltas de cobertura detectadas:
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {stats.criticalGaps.map((gap, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/80 border border-amber-800/60 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-amber-400">{gap.dayName}</span>
                    <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                      {gap.timeRange}
                    </span>
                  </div>
                  <div className="text-amber-200 font-medium">
                    ⚠️ {gap.reason}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Day Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {DAYS_OF_WEEK.map(day => {
          const summary = days[day.id];
          const hasIssues = summary && summary.deficiencyCount > 0;
          const isSelected = activeDay === day.id;

          return (
            <button
              key={day.id}
              onClick={() => setActiveDay(day.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs transition-all whitespace-nowrap active:scale-95 border ${
                isSelected
                  ? 'bg-teal-600 text-white border-teal-400 shadow-md shadow-teal-950/60'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <span>{day.name}</span>
              {hasIssues ? (
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-extrabold text-[10px]">
                  {summary.deficiencyCount}
                </span>
              ) : (
                <span className="text-emerald-400 text-xs">✓</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Day Coverage Breakdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Línea temporal: {currentDaySummary.day.name}</span>
              {currentDaySummary.isFullyCovered ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800">
                  Cobertura óptima ✓
                </span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800">
                  {currentDaySummary.deficiencyCount} deficiencias ⚠️
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              Horario de farmacia: {currentDaySummary.day.isSunday ? '10:00 a 14:00 y 17:00 a 22:00' : '09:00 a 23:00'}
            </p>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              Correcto
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
              Falta de cobertura
            </span>
          </div>
        </div>

        {/* Hourly Slot Cards */}
        <div className="space-y-2.5">
          {currentDaySummary.slots.map(slot => {
            const isDeficient = slot.isDeficient;
            const isTwoRequired = slot.requiredCount === 2;

            return (
              <div
                key={slot.slotId}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDeficient
                    ? 'bg-amber-950/30 border-amber-700/80 shadow-xs'
                    : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800'
                }`}
              >
                {/* Time & Requirement info */}
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                      isDeficient
                        ? 'bg-amber-900/60 text-amber-300 border border-amber-700'
                        : 'bg-slate-700/70 text-slate-200'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">
                        {slot.label}
                      </span>
                      {isTwoRequired && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/80">
                          Pico (Min 2)
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      Requerido: <strong>{slot.requiredCount} {slot.requiredCount === 1 ? 'empleado' : 'empleados'}</strong>
                    </span>
                  </div>
                </div>

                {/* Status & Available Employees */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Employee pills */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {slot.availableEmployees.length > 0 ? (
                      slot.availableEmployees.map(emp => (
                        <span
                          key={emp.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200"
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: emp.avatarColor }}
                          />
                          <strong className="text-white">{emp.name}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({emp.shiftSummary})
                          </span>
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-red-400 font-semibold bg-red-950/60 border border-red-800/80 px-2.5 py-1 rounded-lg">
                        Sin personal
                      </span>
                    )}
                  </div>

                  {/* Verdict Badge */}
                  <div className="shrink-0">
                    {isDeficient ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-900/60 border border-amber-600 text-amber-200 font-bold text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>
                          Falta {slot.shortageCount} {slot.shortageCount === 1 ? 'empleado' : 'empleados'} ({slot.availableEmployees.length}/{slot.requiredCount})
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950 border border-emerald-700 text-emerald-300 font-semibold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>
                          Cobertura correcta ({slot.availableEmployees.length}/{slot.requiredCount})
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
