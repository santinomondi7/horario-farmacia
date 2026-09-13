import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/layout/Navbar';
import { BottomNav } from './components/layout/BottomNav';
import { DashboardView } from './components/dashboard/DashboardView';
import { WeeklyScheduleTable } from './components/schedule/WeeklyScheduleTable';
import { CoverageTimelineView } from './components/coverage/CoverageTimelineView';
import { AuditLogView } from './components/history/AuditLogView';
import { EmployeesManagementView } from './components/employees/EmployeesManagementView';
import { CalendarView } from './components/calendar/CalendarView';
import { WhatsAppExportModal } from './components/whatsapp/WhatsAppExportModal';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { LoginScreen } from './components/auth/LoginScreen';
import { StorageService } from './services/storageService';
import { AuthService, AuthSessionData } from './services/authService';
import { getSupabaseClient, isSupabaseConfigured } from './services/supabaseClient';
import { getCurrentWeekInfo } from './constants/pharmacy';
import { CurrentUser, Employee, Week, Shift, ScheduleAuditLog, DayOfWeek, ShiftStatus, WeeklyPayment } from './types';
import { analyzeWeekCoverage } from './utils/coverageEngine';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export default function App() {
  // Authentication State
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [authSession, setAuthSession] = useState<AuthSessionData | null>(null);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);

  // Navigation
  const [currentTab, setCurrentTab] = useState<'dashboard' | 'schedule' | 'coverage' | 'history' | 'calendar' | 'employees'>('dashboard');

  // Application Data States
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [currentWeekId, setCurrentWeekId] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [auditLogs, setAuditLogs] = useState<ScheduleAuditLog[]>([]);
  const [weeklyPayments, setWeeklyPayments] = useState<WeeklyPayment[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // Modals & Feedback
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Check initial Supabase Auth session on app startup
  useEffect(() => {
    let mounted = true;
    async function verifyInitialSession() {
      try {
        const session = await AuthService.checkCurrentSession();
        if (mounted && session) {
          setAuthSession(session);
          setCurrentUser(session.user);
        }
      } catch (err) {
        console.warn('Initial session verification error:', err);
      } finally {
        if (mounted) {
          setCheckingAuth(false);
        }
      }
    }

    verifyInitialSession();

    return () => {
      mounted = false;
    };
  }, []);

  // Listen to Supabase Auth state changes (token refresh, sign out, etc.)
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setAuthSession(null);
        setCurrentUser(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        const freshSession = await AuthService.checkCurrentSession();
        if (freshSession) {
          setAuthSession(freshSession);
          setCurrentUser(freshSession.user);
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Handle successful login
  const handleLoginSuccess = (sessionData: AuthSessionData) => {
    setAuthSession(sessionData);
    setCurrentUser(sessionData.user);
    showToast(
      `¡Bienvenido/a, ${sessionData.user.name}! (${sessionData.user.role === 'admin' ? 'Administrador' : 'Empleado'})`
    );
  };

  // Handle sign out
  const handleLogout = async () => {
    try {
      await AuthService.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
    setAuthSession(null);
    setCurrentUser(null);
    setCurrentTab('dashboard');
    showToast('Has cerrado sesión correctamente.', 'info');
  };

  // Load all core data whenever currentUser changes
  const loadData = useCallback(async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      // 1. Fetch weeks
      const loadedWeeks = await StorageService.getWeeks();
      setWeeks(loadedWeeks);

      // Determine initial active week
      const currentIsoWeek = getCurrentWeekInfo();
      let activeWeekId = currentWeekId;
      if (!activeWeekId || !loadedWeeks.some(w => w.id === activeWeekId)) {
        const found = loadedWeeks.find(w => w.id === currentIsoWeek.id);
        activeWeekId = found ? found.id : loadedWeeks[0]?.id || currentIsoWeek.id;
        setCurrentWeekId(activeWeekId);
      }

      // 2. Fetch employees (role-based: hourly rates only for admin)
      const loadedEmployees = await StorageService.getEmployees(currentUser.role);
      setEmployees(loadedEmployees);

      // 3. Fetch shifts for the active week
      const loadedShifts = await StorageService.getShifts(activeWeekId);
      setShifts(loadedShifts);

      // 4. Fetch audit logs (change_history table)
      const loadedLogs = await StorageService.getAuditLogs();
      setAuditLogs(loadedLogs);

      // 5. Fetch weekly payment status for admins
      if (currentUser.role === 'admin') {
        const loadedPayments = await StorageService.getWeeklyPayments(activeWeekId);
        setWeeklyPayments(loadedPayments);
      } else {
        setWeeklyPayments([]);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      showToast('Error al cargar datos desde el almacenamiento.', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentUser, currentWeekId]);

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser, loadData]);

  // Real-time synchronization for all users whenever an administrator modifies shifts
  useEffect(() => {
    if (!currentUser || !currentWeekId) return;

    let mounted = true;

    // Helper to refresh shifts and audit logs
    const handleRemoteAdminUpdate = async (notificationText?: string, actorName?: string) => {
      if (!mounted) return;
      try {
        const [updatedShifts, updatedLogs, updatedEmployees] = await Promise.all([
          StorageService.getShifts(currentWeekId),
          StorageService.getAuditLogs(),
          StorageService.getEmployees(currentUser.role),
        ]);
        if (mounted) {
          setShifts(updatedShifts);
          setAuditLogs(updatedLogs);
          setEmployees(updatedEmployees);
          // Only show notification if actor is NOT the current logged-in user
          if (notificationText && actorName !== currentUser.name) {
            showToast(notificationText, 'info');
          }
        }
      } catch (err) {
        console.warn('Real-time sync refresh error:', err);
      }
    };

    // 1. Cross-tab BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        bc = new BroadcastChannel('mondino_sync_channel');
        bc.onmessage = (event) => {
          const detail = event.data;
          const actor = detail?.actorName || 'Administración';
          handleRemoteAdminUpdate(`🔔 ${actor} actualizó los horarios`, actor);
        };
      }
    } catch (e) {
      // ignore
    }

    // 2. Storage event listener (multi-window / multi-tab fallback)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'mondino_last_admin_change' || e.key === 'mondino_shifts_v1') {
        try {
          const detail = e.newValue ? JSON.parse(e.newValue) : null;
          const actor = detail?.actorName || 'Administrador';
          handleRemoteAdminUpdate(`🔔 ${actor} actualizó los horarios`, actor);
        } catch {
          handleRemoteAdminUpdate('🔔 Horarios actualizados');
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // 3. Supabase Realtime Channel
    const client = getSupabaseClient();
    let supabaseChannel: any = null;
    if (isSupabaseConfigured() && client) {
      try {
        supabaseChannel = client
          .channel('mondino_realtime_sync')
          .on('broadcast', { event: 'admin_schedule_change' }, (payload: any) => {
            const detail = payload?.payload;
            const actor = detail?.actorName || 'Administración';
            handleRemoteAdminUpdate(`🔔 ${actor} actualizó los horarios`, actor);
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'shifts' }, () => {
            handleRemoteAdminUpdate('🔔 Horarios sincronizados en tiempo real');
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'change_history' }, () => {
            handleRemoteAdminUpdate('🔔 Nuevo cambio de horario registrado');
          })
          .subscribe();
      } catch (err) {
        console.warn('Supabase realtime channel subscription error:', err);
      }
    }

    // 4. Background refresh when tab is visible or regains focus
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleRemoteAdminUpdate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);

    // 5. Polling fallback every 10 seconds for seamless sync
    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        handleRemoteAdminUpdate();
      }
    }, 10000);

    return () => {
      mounted = false;
      if (bc) bc.close();
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      clearInterval(pollInterval);
      if (supabaseChannel && client) {
        client.removeChannel(supabaseChannel);
      }
    };
  }, [currentUser, currentWeekId]);

  // When changing selected week, reload shifts
  const handleSelectWeek = async (weekId: string) => {
    setCurrentWeekId(weekId);
    try {
      const loadedShifts = await StorageService.getShifts(weekId);
      setShifts(loadedShifts);
      if (currentUser?.role === 'admin') {
        const loadedPayments = await StorageService.getWeeklyPayments(weekId);
        setWeeklyPayments(loadedPayments);
      }
    } catch (err) {
      console.error('Error loading week shifts:', err);
    }
  };

  // Get current week object
  const currentWeek = weeks.find(w => w.id === currentWeekId) || getCurrentWeekInfo();

  // Check if a previous week exists to copy from
  const sortedWeeks = [...weeks].sort((a, b) => a.startDate.localeCompare(b.startDate));
  const currentWeekIndex = sortedWeeks.findIndex(w => w.id === currentWeekId);
  const previousWeek = currentWeekIndex > 0 ? sortedWeeks[currentWeekIndex - 1] : null;

  // Save changes for an employee day shifts (Admin only)
  const handleSaveDayShifts = async (
    employeeId: string,
    dayOfWeek: DayOfWeek,
    newShifts: { startTime: string; endTime: string; status: ShiftStatus }[]
  ) => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Solo administradores pueden modificar turnos.', 'error');
      return;
    }

    const emp = employees.find(e => e.id === employeeId);
    const empName = emp ? emp.name : 'Empleado';

    try {
      await StorageService.setDayShifts(
        currentWeek.id,
        employeeId,
        dayOfWeek,
        newShifts,
        currentUser,
        empName
      );

      // Refresh shifts and logs
      const updatedShifts = await StorageService.getShifts(currentWeek.id);
      setShifts(updatedShifts);
      const updatedLogs = await StorageService.getAuditLogs();
      setAuditLogs(updatedLogs);

      showToast(`Horario de ${empName} actualizado con éxito.`);
    } catch (err: any) {
      console.error('Save shifts error:', err);
      showToast(err.message || 'Error al guardar los turnos.', 'error');
      throw err;
    }
  };

  // Copy previous week (Admin only)
  const handleCopyPreviousWeek = async () => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Solo administradores pueden copiar semanas.', 'error');
      return;
    }

    if (!previousWeek) {
      showToast('No existe una semana previa para copiar.', 'error');
      return;
    }

    try {
      const count = await StorageService.copyWeek(previousWeek.id, currentWeek, currentUser);

      // Refresh data
      const updatedShifts = await StorageService.getShifts(currentWeek.id);
      setShifts(updatedShifts);
      const updatedLogs = await StorageService.getAuditLogs();
      setAuditLogs(updatedLogs);

      showToast(`Se copiaron ${count} turnos desde la semana ${previousWeek.id} con éxito.`);
    } catch (err: any) {
      console.error('Copy week error:', err);
      showToast(err.message || 'Error al copiar la semana previa.', 'error');
    }
  };

  const handleToggleWeeklyPayment = async (employeeId: string, paid: boolean): Promise<void> => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Solo administradores pueden modificar pagos.', 'error');
      return;
    }
    const emp = employees.find(e => e.id === employeeId);
    try {
      await StorageService.setWeeklyPayment(currentWeek.id, employeeId, paid, currentUser, emp?.name || 'Empleado');
      const refreshed = await StorageService.getWeeklyPayments(currentWeek.id);
      setWeeklyPayments(refreshed);
      showToast(`${emp?.name || 'Empleado'}: ${paid ? 'pago marcado como realizado.' : 'pago marcado como pendiente.'}`);
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar el pago.', 'error');
      throw err;
    }
  };

  // Update employee hourly rate or target hours (Admin only)
  const handleUpdateEmployee = async (updated: Employee): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Solo administradores pueden modificar empleados.', 'error');
      return false;
    }

    try {
      await StorageService.updateEmployee(updated, currentUser);
      const refreshed = await StorageService.getEmployees(currentUser.role);
      setEmployees(refreshed);
      showToast(`Datos de ${updated.name} actualizados.`);
      return true;
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar empleado.', 'error');
      return false;
    }
  };

  // Add new employee (Admin only)
  const handleAddEmployee = async (newEmpData: Omit<Employee, 'id'>): Promise<Employee | null> => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Solo administradores pueden agregar empleados.', 'error');
      return null;
    }

    try {
      const created = await StorageService.addEmployee(newEmpData, currentUser);
      const refreshed = await StorageService.getEmployees(currentUser.role);
      setEmployees(refreshed);
      showToast(`Empleado ${created.name} agregado con éxito.`);
      return created;
    } catch (err: any) {
      showToast(err.message || 'Error al agregar empleado.', 'error');
      throw err;
    }
  };

  // Delete employee (Admin only)
  const handleDeleteEmployee = async (employeeId: string): Promise<boolean> => {
    if (!currentUser || currentUser.role !== 'admin') {
      showToast('Solo administradores pueden eliminar empleados.', 'error');
      return false;
    }

    try {
      await StorageService.deleteEmployee(employeeId, currentUser);
      const refreshed = await StorageService.getEmployees(currentUser.role);
      setEmployees(refreshed);
      showToast('Empleado eliminado con éxito.');
      return true;
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar empleado.', 'error');
      throw err;
    }
  };

  // 1. If currently checking Supabase session on startup, show loading state
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-3">
        <div className="w-9 h-9 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-slate-400">
          Verificando sesión en Mondino Farmacia...
        </p>
      </div>
    );
  }

  // 2. Strict closed access: If not authenticated, show ONLY the Login Screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  // Coverage statistics
  const coverageAnalysis = analyzeWeekCoverage(shifts, employees);
  const deficiencyCount = coverageAnalysis.stats.totalDeficiencies;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans pb-20 md:pb-6 selection:bg-teal-600 selection:text-white">
      {/* Top Navbar with active authenticated user and Cerrar Sesión button */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentUser={currentUser}
        employees={employees}
        onLogout={handleLogout}
        coverageDeficienciesCount={deficiencyCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3 text-slate-400">
            <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Cargando Mondino Farmacia y Perfumería...</p>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                currentWeek={currentWeek}
                employees={employees}
                shifts={shifts}
                auditLogs={auditLogs}
                currentUser={currentUser}
                onNavigateToTab={setCurrentTab}
                onOpenWhatsAppShare={() => setIsWhatsAppModalOpen(true)}
                onCopyPreviousWeek={handleCopyPreviousWeek}
                hasPreviousWeek={Boolean(previousWeek)}
              />
            )}

            {currentTab === 'schedule' && (
              <WeeklyScheduleTable
                currentWeek={currentWeek}
                weeks={weeks}
                employees={employees}
                shifts={shifts}
                currentUser={currentUser}
                onSelectWeek={handleSelectWeek}
                onCopyPreviousWeek={handleCopyPreviousWeek}
                onOpenWhatsAppShare={() => setIsWhatsAppModalOpen(true)}
                onSaveDayShifts={handleSaveDayShifts}
                hasPreviousWeek={Boolean(previousWeek)}
              />
            )}

            {currentTab === 'calendar' && <CalendarView />}

            {currentTab === 'coverage' && (
              <CoverageTimelineView
                shifts={shifts}
                employees={employees}
                selectedWeekId={currentWeek.id}
              />
            )}

            {currentTab === 'history' && (
              <AuditLogView
                logs={auditLogs}
                employees={employees}
                weeks={weeks}
                currentWeekId={currentWeek.id}
              />
            )}

            {currentTab === 'employees' && currentUser.role === 'admin' && (
              <EmployeesManagementView
                employees={employees}
                currentUser={currentUser}
                shifts={shifts}
                currentWeek={currentWeek}
                onUpdateEmployee={handleUpdateEmployee}
                onAddEmployee={handleAddEmployee}
                onDeleteEmployee={handleDeleteEmployee}
                weeklyPayments={weeklyPayments}
                onToggleWeeklyPayment={handleToggleWeeklyPayment}
              />
            )}
          </>
        )}
      </main>

      {/* Floating Feedback Toast Notification */}
      {toastMessage && (
        <div
          id="app-toast-message"
          className={`fixed top-20 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-2xl border text-xs font-semibold backdrop-blur-md animate-in slide-in-from-top-4 duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-red-950/95 text-red-100 border-red-800'
              : toastMessage.type === 'info'
              ? 'bg-slate-900/95 text-teal-300 border-teal-500/50'
              : 'bg-emerald-950/95 text-emerald-100 border-emerald-800'
          }`}
        >
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* WhatsApp Image & Share Modal */}
      {isWhatsAppModalOpen && (
        <WhatsAppExportModal
          isOpen={isWhatsAppModalOpen}
          onClose={() => setIsWhatsAppModalOpen(false)}
          week={currentWeek}
          employees={employees}
          shifts={shifts}
        />
      )}

      {/* Offline Status Badge for PWA */}
      <OfflineIndicator />

      {/* Ergonomic Mobile Bottom Nav Bar */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        currentUser={currentUser}
        coverageDeficienciesCount={deficiencyCount}
      />
    </div>
  );
}
