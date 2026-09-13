import React, { useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Grid3X3, List } from 'lucide-react';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const WEEKDAYS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const WEEKDAYS_FULL = ['lunes','martes','miércoles','jueves','viernes','sábado','domingo'];

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

function MonthMini({ year, month }: { year: number; month: number }) {
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
          return <span key={i} className={`h-5 flex items-center justify-center rounded-md text-[9px] ${inMonth ? 'text-slate-300' : 'text-slate-700'} ${isToday ? 'bg-teal-600 text-white font-black' : ''}`}>{d.getDate()}</span>;
        })}
      </div>
    </div>
  );
}

export const CalendarView: React.FC = () => {
  const today = new Date();
  const [view, setView] = useState<'month' | 'year'>('month');
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);

  const cells = useMemo(() => monthCells(year, month), [year, month]);
  const changeMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };
  const selectDate = (d: Date) => { setSelectedDate(d); setYear(d.getFullYear()); setMonth(d.getMonth()); setView('month'); };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2"><CalendarDays className="w-5 h-5 text-teal-400" /> Calendario</h1>
          <p className="text-xs text-slate-400 mt-1">Calendario mensual y anual. Cada día muestra su número y fecha completa.</p>
        </div>
        <div className="flex items-center gap-1 rounded-xl bg-slate-900 border border-slate-800 p-1">
          <button onClick={() => setView('month')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${view === 'month' ? 'bg-teal-700 text-white' : 'text-slate-400 hover:text-white'}`}><List className="w-3.5 h-3.5" /> Mensual</button>
          <button onClick={() => setView('year')} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${view === 'year' ? 'bg-teal-700 text-white' : 'text-slate-400 hover:text-white'}`}><Grid3X3 className="w-3.5 h-3.5" /> Anual</button>
        </div>
      </div>

      {view === 'month' ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900 shadow-md overflow-hidden">
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
              const selected = iso(d) === iso(selectedDate);
              return <button key={i} onClick={() => selectDate(d)} className={`min-h-16 sm:min-h-20 rounded-xl border text-left p-2 transition ${inMonth ? 'bg-slate-950/40 border-slate-800 hover:border-teal-700' : 'bg-slate-950/10 border-transparent text-slate-700'} ${selected ? 'ring-1 ring-teal-500 border-teal-700' : ''}`}><span className={`text-sm font-black ${inMonth ? 'text-white' : 'text-slate-700'} ${isToday ? 'inline-flex w-7 h-7 items-center justify-center rounded-full bg-teal-600' : ''}`}>{d.getDate()}</span><span className={`hidden sm:block text-[10px] mt-2 ${inMonth ? 'text-slate-500' : 'text-slate-800'}`}>{formatDayLong(d)}</span></button>;
            })}
          </div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3 rounded-2xl bg-slate-900 border border-slate-800 p-3"><button onClick={() => setYear(y => y-1)} className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"><ChevronLeft className="w-4 h-4" /></button><span className="text-lg font-black text-white">{year}</span><button onClick={() => setYear(y => y+1)} className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"><ChevronRight className="w-4 h-4" /></button></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">{MONTHS.map((_, i) => <button key={i} onClick={() => { setMonth(i); setView('month'); }} className="text-left"><MonthMini year={year} month={i} /></button>)}</div>
        </div>
      )}
    </div>
  );
};
