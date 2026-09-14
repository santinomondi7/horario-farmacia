import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Grid3X3, List, ArrowRight, Lock } from 'lucide-react';
import { Week, Employee, Shift, DayOfWeek, CurrentUser } from '../../types';
import { formatShiftsForDay } from '../../utils/timeCalculations';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const WEEKDAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const WEEKDAYS_FULL = ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];
const DAY_ID_BY_MONDAY_INDEX: DayOfWeek[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const mondayIndex = (d: Date) => (d.getDay() + 6) % 7;

function formatDayLong(d: Date) {
  return `${WEEKDAYS_FULL[mondayIndex(d)]} ${d.getDate()} de ${MONTHS[d.getMonth()].toLowerCase()}`;
}

function monthCells(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(year, month, 1 - mondayIndex(first));
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

// Find, among the weeks loaded/created in the app, the one that contains a given date.
function findWeekForDate(weeks: Week[], date: Date): Week | undefined {
  const dateIso = iso(date);
  return weeks.find(w => dateIso >= w.startDate && dateIso <= w.endDate);
}

interface CalendarViewProps {
  weeks: Week[];
  shifts: Shift[]; // shifts loaded for `currentWeek` only
  currentWeek: Week;
  employees: Employee[];
  currentUser: CurrentUser;
  onSelectDate: (date: Date) => void;
}

function MonthMini({
  year,
  month,
  weeks,
}: {
  year: number;
  month: number;
  weeks: Week[];
}) {
  const cells = monthCells(year, month);
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
      <h3 className="text-sm font-bold text-white mb-2">{MONTHS[month]}</h3>
      <div className="grid grid-cols-7 gap-1 text-[9px] text-slate-500 mb-1">
        {WEEKDAYS.map(d => <span key={d} className="text-center font-bold">{d[0]}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const inMonth = d.getMonth() === month;
          const isToday = iso(d) === iso(new Date());
          const week = inMonth ? findWeekForDate(weeks, d) : undefined;
          return (
            <span
              key={i}
              className={`relative h-5 flex items-center justify-center rounded-md text-[9px] ${inMonth ? 'text-slate-300' : 'text-slate-700'} ${isToday ? 'bg-teal-600 text-white font-black' : ''}`}
            >
              {d.getDate()}
              {week && !isToday && (
                <span
                  className={`absolute bottom-0 w-1 h-1 rounded-full ${
                    week.status === 'published' ? 'bg-teal-500' : 'bg-amber-500'
                  }`}
                />
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  weeks,
  shifts,
  currentWeek,
  employees,
  currentUser,
  onSelectDate,
}) => {
  const today = new Date();
  const [view, setView] = useState<'month' | 'year'>('month');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);

  const isAdmin = currentUser.role === 'admin';
  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const changeMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };
  const selectDate = (d: Date) => { setSelectedDate(d); setYear(d.getFullYear()); setMonth(d.getMonth()); setView('month'); };

  const selectedDateIso = iso(selectedDate);
  const weekForSelectedDate = findWeekForDate(weeks, selectedDate);
  const selectedDateIsInCurrentWeek = weekForSelectedDate?.id === currentWeek.id;

  // Employees working on the selected day, only computed when we already have
  // that week's shifts loaded (i.e. the selected date falls in currentWeek).
  const dayShiftSummary = useMemo(() => {
    if (!selectedDateIsInCurrentWeek) return [];
    const dayId = DAY_ID_BY_MONDAY_INDEX[mondayIndex(selectedDate)];
    return employees
      .filter(e => e.active !== false)
      .map(emp => {
        const dayShifts = shifts.filter(s => s.employeeId === emp.id && s.dayOfWeek === dayId);
        return { employee: emp, label: formatShiftsForDay(dayShifts) };
      })
      .filter(row => row.label !== 'Sin turno');
  }, [selectedDateIsInCurrentWeek, selectedDate, employees, shifts]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2"><CalendarDays className="w-5 h-5 text-teal-400" /> Calendario</h1>
          <p className="text-xs text-slate-400 mt-1">
            Sincronizado con Horarios: los puntos marcan semanas ya cargadas
            (<span className="text-teal-400 font-semibold">verde = publicada</span>,{' '}
            <span className="text-amber-400 font-semibold">ámbar = borrador</span>). Elegí un día para ver o cargar su semana.
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-slate-900 border border-slate-800 p-1">
          <button onClick={() => setView('month')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${view === 'month' ? 'bg-teal-700 text-white' : 'text-slate-400 hover:text-white'}`}><List className="w-3.5 h-3.5" /> Mensual</button>
          <button onClick={() => setView('year')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${view === 'year' ? 'bg-teal-700 text-white' : 'text-slate-400 hover:text-white'}`}><Grid3X3 className="w-3.5 h-3.5" /> Anual</button>
        </div>
      </div>

      {view === 'month' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 shadow-md overflow-hidden">
            <div className="px-4 py-4 border-b border-slate-800 flex items-center justify-between">
              <button onClick={() => changeMonth(-1)} className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
              <div className="text-center"><div className="text-lg font-black text-white">{MONTHS[month]} {year}</div><div className="text-[11px] text-teal-400">{formatDayLong(selectedDate)}</div></div>
              <button onClick={() => changeMonth(1)} className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"><ChevronRight className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-7 border-b border-slate-800 bg-slate-950/70">
              {WEEKDAYS.map(d => <div key={d} className="py-2 text-center text-[10px] font-black uppercase tracking-wider text-slate-500">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 p-2 sm:p-3 gap-1.5 sm:gap-2">
              {cells.map((d, i) => {
                const inMonth = d.getMonth() === month;
                const isToday = iso(d) === iso(today);
                const selected = iso(d) === selectedDateIso;
                const week = findWeekForDate(weeks, d);
                return (
                  <button
                    key={i}
                    onClick={() => selectDate(d)}
                    className={`min-h-16 sm:min-h-20 rounded-xl border text-left p-2 transition relative ${inMonth ? 'bg-slate-950/40 border-slate-800 hover:border-teal-700' : 'bg-slate-950/10 border-transparent text-slate-700'} ${selected ? 'ring-1 ring-teal-500 border-teal-700' : ''}`}
                  >
                    <span className={`text-sm font-black ${inMonth ? 'text-white' : 'text-slate-700'} ${isToday ? 'inline-flex w-7 h-7 items-center justify-center rounded-full bg-teal-600' : ''}`}>{d.getDate()}</span>
                    <span className={`hidden sm:block text-[10px] mt-2 ${inMonth ? 'text-slate-500' : 'text-slate-800'}`}>{formatDayLong(d)}</span>
                    {inMonth && week && (
                      <span
                        className={`absolute top-2 right-2 w-2 h-2 rounded-full ${
                          week.status === 'published' ? 'bg-teal-500' : 'bg-amber-500'
                        }`}
                        title={week.status === 'published' ? 'Semana publicada' : 'Semana en borrador'}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected day detail / bridge to Horarios */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4 space-y-3 h-fit">
            <h3 className="text-sm font-bold text-white capitalize">{formatDayLong(selectedDate)}</h3>

            {weekForSelectedDate ? (
              <>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">Semana</span>
                  <span className="font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700">{weekForSelectedDate.id}</span>
                  <span
                    className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      weekForSelectedDate.status === 'published'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {weekForSelectedDate.status === 'published' ? 'Publicada' : 'Borrador'}
                  </span>
                </div>

                {selectedDateIsInCurrentWeek ? (
                  dayShiftSummary.length > 0 ? (
                    <ul className="space-y-1.5">
                      {dayShiftSummary.map(({ employee, label }) => (
                        <li key={employee.id} className="flex items-center justify-between text-xs bg-slate-950/50 rounded-lg px-2.5 py-1.5 border border-slate-800">
                          <span className="flex items-center gap-2 text-slate-200 font-semibold">
                            <span className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] text-white" style={{ backgroundColor: employee.avatarColor || '#0d9488' }}>
                              {employee.name.slice(0, 2).toUpperCase()}
                            </span>
                            {employee.name}
                          </span>
                          <span className="font-mono text-teal-300">{label}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500">Nadie tiene turno cargado este día (o todos están de franco).</p>
                  )
                ) : (
                  <p className="text-xs text-slate-500">Esta fecha pertenece a otra semana ya cargada. Entrá a Horarios para ver el detalle día por día.</p>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-500">
                Todavía no hay horarios cargados para esta semana.
                {!isAdmin && ' Un administrador tiene que cargarla primero.'}
              </p>
            )}

            <button
              onClick={() => onSelectDate(selectedDate)}
              disabled={!weekForSelectedDate && !isAdmin}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-bold transition"
            >
              {weekForSelectedDate ? (
                <>Ver horarios de esta semana <ArrowRight className="w-3.5 h-3.5" /></>
              ) : isAdmin ? (
                <>Cargar horarios de esta semana <ArrowRight className="w-3.5 h-3.5" /></>
              ) : (
                <><Lock className="w-3.5 h-3.5" /> Semana no cargada</>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3 rounded-2xl bg-slate-900 border border-slate-800 p-3"><button onClick={() => setYear(y => y-1)} className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"><ChevronLeft className="w-4 h-4" /></button><span className="text-lg font-black text-white">{year}</span><button onClick={() => setYear(y => y+1)} className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"><ChevronRight className="w-4 h-4" /></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">{MONTHS.map((_, i) => <button key={i} onClick={() => { setMonth(i); setView('month'); }} className="text-left"><MonthMini year={year} month={i} weeks={weeks} /></button>)}</div>
        </div>
      )}
    </div>
  );
};
