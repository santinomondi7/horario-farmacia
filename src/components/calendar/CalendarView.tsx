import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Users, ArrowRight, CalendarRange } from 'lucide-react';
import { Employee, Shift, Week, CurrentUser, DAYS_OF_WEEK } from '../../types';
import { formatShiftsForDay, formatDateSpanish } from '../../utils/timeCalculations';

interface CalendarViewProps { weeks: Week[]; employees: Employee[]; shifts: Shift[]; currentUser: CurrentUser; onSelectWeek: (weekId: string) => void; onGoToSchedule: () => void; }
const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const WEEKDAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const dateKey = (date: Date) => date.toISOString().slice(0, 10);
const mondayIndex = (date: Date) => { const d = date.getDay(); return d === 0 ? 6 : d - 1; };

export const CalendarView: React.FC<CalendarViewProps> = ({ weeks, employees, shifts, onSelectWeek, onGoToSchedule }) => {
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear] = useState(today.getFullYear());
  const [mode, setMode] = useState<'month' | 'year'>('month');
  const [selectedDate, setSelectedDate] = useState(dateKey(today));
  const activeEmployees = employees.filter(e => e.active !== false);

  const shiftByDate = useMemo(() => {
    const map = new Map<string, Shift[]>();
    for (const week of weeks) {
      const weekShifts = shifts.filter(s => s.weekId === week.id);
      for (const shift of weekShifts) {
        const monday = new Date(`${week.startDate}T12:00:00`);
        const day = DAYS_OF_WEEK.findIndex(d => d.id === shift.dayOfWeek);
        const d = new Date(monday);
        d.setDate(monday.getDate() + day);
        const key = dateKey(d);
        map.set(key, [...(map.get(key) || []), shift]);
      }
    }
    return map;
  }, [weeks, shifts]);

  const selectedWeek = weeks.find(w => selectedDate >= w.startDate && selectedDate <= w.endDate);
  const storedWeek = selectedWeek;
  const selectedShifts = shiftByDate.get(selectedDate) || [];

  const cells = useMemo(() => {
    const first = new Date(year, month, 1, 12);
    const days = new Date(year, month + 1, 0, 12).getDate();
    const result: (Date | null)[] = Array(mondayIndex(first)).fill(null);
    for (let i = 1; i <= days; i++) result.push(new Date(year, month, i, 12));
    while (result.length % 7) result.push(null);
    return result;
  }, [year, month]);

  const changeMonth = (delta: number) => { const d = new Date(year, month + delta, 1, 12); setYear(d.getFullYear()); setMonth(d.getMonth()); };
  const selectDate = (date: Date) => {
    const key = dateKey(date);
    setSelectedDate(key);
    const week = weeks.find(w => key >= w.startDate && key <= w.endDate);
    if (week) onSelectWeek(week.id);
  };

  const renderDay = (date: Date) => {
    const key = dateKey(date); const dayShifts = shiftByDate.get(key) || [];
    const isToday = key === dateKey(today); const isSelected = key === selectedDate;
    const employeesWithShift = new Set(dayShifts.filter(s => s.status === 'normal').map(s => s.employeeId)).size;
    return <button key={key} onClick={() => selectDate(date)} className={`min-h-[92px] sm:min-h-[112px] p-2 text-left border rounded-xl transition ${isSelected ? 'border-teal-500 bg-teal-950/30' : 'border-slate-800 bg-slate-900/70 hover:border-slate-700'} ${isToday ? 'ring-1 ring-teal-400/60' : ''}`}>
      <div className="flex items-center justify-between"><span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isToday ? 'bg-teal-600 text-white' : 'text-slate-200 bg-slate-800'}`}>{date.getDate()}</span>{dayShifts.length > 0 && <span className="text-[10px] text-teal-300 font-semibold">{employeesWithShift} pers.</span>}</div>
      <div className="mt-2 space-y-1">{activeEmployees.slice(0, 3).map(emp => { const ss = dayShifts.filter(s => s.employeeId === emp.id); if (!ss.length) return null; return <div key={emp.id} className="text-[10px] truncate text-slate-300"><span className="font-semibold">{emp.name}:</span> {formatShiftsForDay(ss)}</div>; })}{dayShifts.length > 0 && dayShifts.filter(s => !activeEmployees.some(e => e.id === s.employeeId)).length > 0 && <div className="text-[10px] text-slate-500">+ más...</div>}</div>
    </button>;
  };

  return <div className="space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl">
      <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-teal-600/20 text-teal-400 flex items-center justify-center border border-teal-500/30"><CalendarDays className="w-5 h-5" /></div><div><h2 className="text-base font-bold text-white">Calendario de horarios</h2><p className="text-xs text-slate-400">Los turnos son los mismos registros que aparecen en Horarios.</p></div></div>
      <div className="flex flex-wrap gap-2"><div className="flex bg-slate-950 border border-slate-800 rounded-xl p-1"><button onClick={() => setMode('month')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${mode === 'month' ? 'bg-teal-600 text-white' : 'text-slate-400'}`}>Mensual</button><button onClick={() => setMode('year')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${mode === 'year' ? 'bg-teal-600 text-white' : 'text-slate-400'}`}>Anual</button></div><button onClick={onGoToSchedule} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-teal-300 text-xs font-semibold">Ver Horarios <ArrowRight className="w-3.5 h-3.5" /></button></div>
    </div>
    {mode === 'month' ? <>
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-3"><button onClick={() => changeMonth(-1)} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700"><ChevronLeft className="w-5 h-5" /></button><div className="text-center"><h3 className="text-lg font-bold text-white">{MONTHS[month]} {year}</h3><p className="text-[11px] text-slate-500">Elegí un día para abrir su semana</p></div><button onClick={() => changeMonth(1)} className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700"><ChevronRight className="w-5 h-5" /></button></div>
      <div className="grid grid-cols-7 gap-1.5">{WEEKDAYS.map(d => <div key={d} className="text-center text-[10px] uppercase font-bold text-slate-500 py-2">{d}</div>)}{cells.map((d, i) => d ? renderDay(d) : <div key={`empty-${i}`} className="min-h-[92px] sm:min-h-[112px] rounded-xl border border-transparent" />)}</div>
    </> : <div className="space-y-3"><div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-3"><button onClick={() => setYear(y => y - 1)} className="p-2 rounded-xl bg-slate-800"><ChevronLeft className="w-5 h-5" /></button><h3 className="text-lg font-bold text-white">{year}</h3><button onClick={() => setYear(y => y + 1)} className="p-2 rounded-xl bg-slate-800"><ChevronRight className="w-5 h-5" /></button></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">{MONTHS.map((name, m) => { const days = new Date(year, m + 1, 0).getDate(); const count = Array.from({ length: days }, (_, i) => shiftByDate.get(dateKey(new Date(year, m, i + 1, 12)))?.length || 0).reduce((a,b)=>a+b,0); return <button key={name} onClick={() => { setMonth(m); setMode('month'); }} className="text-left bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 transition"><div className="flex justify-between"><h3 className="font-bold text-white">{name}</h3><CalendarRange className="w-4 h-4 text-teal-400" /></div><p className="text-xs text-slate-500 mt-2">{days} días · {count} registros de turnos</p></button>; })}</div></div>}
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4"><div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3"><div><h3 className="font-bold text-white">{formatDateSpanish(selectedDate)}</h3><p className="text-xs text-slate-500">{storedWeek ? `Semana ${storedWeek.weekNumber} · ${storedWeek.id}` : 'Semana no creada todavía'}</p></div><button disabled={!storedWeek} onClick={() => { if (storedWeek) { onSelectWeek(storedWeek.id); onGoToSchedule(); } }} className="text-xs font-semibold text-teal-300 flex items-center gap-1">Abrir esta semana <ArrowRight className="w-3.5 h-3.5" /></button></div>{selectedShifts.length === 0 ? <p className="text-sm text-slate-500 py-3">No hay turnos cargados para este día.</p> : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">{activeEmployees.map(emp => { const ss=selectedShifts.filter(s=>s.employeeId===emp.id); if(!ss.length) return null; return <div key={emp.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3"><div className="flex items-center gap-2"><Users className="w-4 h-4 text-teal-400"/><span className="text-xs font-bold text-white">{emp.name}</span></div><div className="mt-1 text-xs text-slate-300"><Clock className="inline w-3.5 h-3.5 mr-1 text-slate-500"/>{formatShiftsForDay(ss)}</div></div>; })}</div>}</div>
  </div>;
};
