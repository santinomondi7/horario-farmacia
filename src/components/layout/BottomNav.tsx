import React from 'react';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  AlertTriangle,
  History,
  Users,
} from 'lucide-react';
import { CurrentUser } from '../../types';

interface BottomNavProps {
  currentTab: 'dashboard' | 'schedule' | 'coverage' | 'history' | 'calendar' | 'employees';
  onSelectTab: (tab: 'dashboard' | 'schedule' | 'coverage' | 'history' | 'calendar' | 'employees') => void;
  currentUser: CurrentUser;
  coverageDeficienciesCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  coverageDeficienciesCount,
}) => {
  const isAdmin = currentUser.role === 'admin';

  return (
    <div
      id="mobile-bottom-nav"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 pb-safe"
    >
      <div className="flex items-center justify-around h-16 px-1">
        {/* Dashboard */}
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            currentTab === 'dashboard' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-1">Inicio</span>
        </button>

        {/* Schedule */}
        <button
          onClick={() => onSelectTab('schedule')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            currentTab === 'schedule' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] mt-1">Horarios</span>
        </button>

        {/* Calendar */}
        <button
          onClick={() => onSelectTab('calendar')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            currentTab === 'calendar' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CalendarDays className="w-5 h-5" />
          <span className="text-[10px] mt-1">Calendario</span>
        </button>

        {/* Coverage */}
        <button
          onClick={() => onSelectTab('coverage')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition relative ${
            currentTab === 'coverage' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="relative">
            <AlertTriangle className="w-5 h-5" />
            {coverageDeficienciesCount > 0 && (
              <span className="absolute -top-1 -right-2 flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px]">
                {coverageDeficienciesCount}
              </span>
            )}
          </div>
          <span className="text-[10px] mt-1">Cobertura</span>
        </button>

        {/* History */}
        <button
          onClick={() => onSelectTab('history')}
          className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
            currentTab === 'history' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <History className="w-5 h-5" />
          <span className="text-[10px] mt-1">Cambios</span>
        </button>

        {/* Employees & Payroll (Admin only) */}
        {isAdmin && (
          <button
            onClick={() => onSelectTab('employees')}
            className={`flex flex-col items-center justify-center flex-1 py-1 transition ${
              currentTab === 'employees' ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] mt-1">Personal</span>
          </button>
        )}
      </div>
    </div>
  );
};
