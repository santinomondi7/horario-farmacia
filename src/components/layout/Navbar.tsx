import React, { useState } from 'react';
import {
  Calendar,
  Shield,
  User,
  Users,
  History,
  AlertTriangle,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  Check,
} from 'lucide-react';
import { CurrentUser, Employee } from '../../types';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface NavbarProps {
  currentTab: 'dashboard' | 'schedule' | 'calendar' | 'coverage' | 'history' | 'employees';
  onSelectTab: (tab: 'dashboard' | 'schedule' | 'calendar' | 'coverage' | 'history' | 'employees') => void;
  currentUser: CurrentUser;
  employees: Employee[];
  onLogout: () => void;
  coverageDeficienciesCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  currentUser,
  employees,
  onLogout,
  coverageDeficienciesCount,
}) => {
  const isAdmin = currentUser.role === 'admin';
  const currentEmp = employees.find(e => e.name === currentUser.name || e.id === currentUser.id);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16 gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => onSelectTab('dashboard')}
            className="flex items-center gap-2.5 cursor-pointer select-none group"
          >
            <div className="w-10 h-10 rounded-xl bg-white p-0.5 shadow-md shadow-teal-950 border border-teal-500/30 overflow-hidden shrink-0">
              <img
                src="/logo.png"
                alt="Logo Mondino Farmacia y Perfumería"
                className="w-full h-full object-contain rounded-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white group-hover:text-teal-300 transition flex items-center gap-1.5">
                Mondino
                <span className="hidden md:inline text-xs font-medium px-2 py-0.5 rounded-full bg-teal-950 text-teal-300 border border-teal-800/80">
                  Farmacia y Perfumería
                </span>
              </span>
              <span className="md:hidden block text-[10px] text-slate-400 -mt-0.5">
                Farmacia y Perfumería
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              currentTab === 'dashboard'
                ? 'bg-slate-800 text-teal-300 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => onSelectTab('schedule')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              currentTab === 'schedule'
                ? 'bg-slate-800 text-teal-300 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Horarios</span>
          </button>

          <button
            onClick={() => onSelectTab('calendar')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              currentTab === 'calendar' ? 'bg-slate-800 text-teal-300 shadow-xs' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Calendario</span>
          </button>

          <button
            onClick={() => onSelectTab('coverage')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 relative ${
              currentTab === 'coverage'
                ? 'bg-slate-800 text-teal-300 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Cobertura</span>
            {coverageDeficienciesCount > 0 && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[10px]">
                {coverageDeficienciesCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('history')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              currentTab === 'history'
                ? 'bg-slate-800 text-teal-300 shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Historial</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => onSelectTab('employees')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                currentTab === 'employees'
                  ? 'bg-slate-800 text-teal-300 shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Personal & Sueldos</span>
            </button>
          )}
        </nav>

        {/* Right Action Area */}
        <div className="flex items-center gap-2">
          <PWAInstallButton compact />

          {/* Authenticated User Badge */}
          <div className="flex items-center gap-2 py-1.5 px-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 text-xs">
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
              style={{
                backgroundColor: currentEmp?.avatarColor || (isAdmin ? '#059669' : '#2563eb'),
              }}
            >
              {currentUser.name.slice(0, 2).toUpperCase()}
            </div>

            <div className="text-left hidden sm:block leading-tight">
              <span className="font-semibold text-white block text-xs">{currentUser.name}</span>
              <span className="text-[10px] text-teal-400 uppercase font-mono">
                {currentUser.role === 'admin' ? 'Administrador' : 'Empleado'}
              </span>
            </div>
          </div>

          {/* Cerrar Sesión Button */}
          <button
            onClick={onLogout}
            id="navbar-logout-btn"
            title="Cerrar sesión"
            className="flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-slate-900 hover:bg-red-950/60 border border-slate-800 hover:border-red-800/80 text-slate-300 hover:text-red-300 transition text-xs font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar sesión</span>
          </button>
        </div>
      </div>
    </header>
  );
};
