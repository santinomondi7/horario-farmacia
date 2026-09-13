import React, { useState } from 'react';
import {
  Users,
  DollarSign,
  Clock,
  ShieldAlert,
  Edit2,
  Check,
  X,
  AlertCircle,
  TrendingUp,
  UserPlus,
  Trash2,
  Power,
  Shield,
  UserCheck,
} from 'lucide-react';
import { Employee, CurrentUser, Shift, Week, UserRole } from '../../types';
import { calculateEmployeeWeeklyStats, formatCurrencyARS } from '../../utils/timeCalculations';

interface EmployeesManagementViewProps {
  employees: Employee[];
  currentUser: CurrentUser;
  shifts: Shift[];
  currentWeek: Week;
  onUpdateEmployee: (updated: Employee) => Promise<boolean>;
  onAddEmployee?: (employee: Omit<Employee, 'id'>) => Promise<Employee | null>;
  onDeleteEmployee?: (employeeId: string) => Promise<boolean>;
}

const PRESET_COLORS = [
  '#059669', // Emerald
  '#0d9488', // Teal
  '#0284c7', // Sky
  '#2563eb', // Blue
  '#7c3aed', // Violet
  '#db2777', // Pink
  '#ea580c', // Orange
  '#ca8a04', // Yellow-gold
];

export const EmployeesManagementView: React.FC<EmployeesManagementViewProps> = ({
  employees,
  currentUser,
  shifts,
  currentWeek,
  onUpdateEmployee,
  onAddEmployee,
  onDeleteEmployee,
}) => {
  const isAdmin = currentUser.role === 'admin';

  // State for editing an existing employee
  const [editingEmp, setEditingEmp] = useState<Employee | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editEmail, setEditEmail] = useState<string>('');
  const [editRole, setEditRole] = useState<UserRole>('employee');
  const [editRate, setEditRate] = useState<number>(0);
  const [editHours, setEditHours] = useState<number>(40);
  const [editColor, setEditColor] = useState<string>('#0d9488');
  const [editActive, setEditActive] = useState<boolean>(true);

  // State for adding a new employee
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newName, setNewName] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newRole, setNewRole] = useState<UserRole>('employee');
  const [newRate, setNewRate] = useState<number>(4800);
  const [newHours, setNewHours] = useState<number>(40);
  const [newColor, setNewColor] = useState<string>('#0d9488');

  // Deletion confirm modal
  const [empToDelete, setEmpToDelete] = useState<Employee | null>(null);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div id="employees-access-denied" className="p-8 max-w-lg mx-auto text-center space-y-4 bg-slate-900 border border-slate-800 rounded-2xl">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-950/80 border border-amber-800 text-amber-400 flex items-center justify-center">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-bold text-white">Acceso Restringido</h3>
        <p className="text-sm text-slate-400 leading-relaxed">
          Los precios por hora, liquidaciones y gestión de personal son información reservada exclusivamente para administradores.
        </p>
      </div>
    );
  }

  const handleStartEdit = (emp: Employee) => {
    setEditingEmp(emp);
    setEditName(emp.name);
    setEditEmail(emp.email || '');
    setEditRole(emp.role);
    setEditRate(emp.hourlyRate || 0);
    setEditHours(emp.targetWeeklyHours || 40);
    setEditColor(emp.avatarColor || '#0d9488');
    setEditActive(emp.active !== false);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSaveEdit = async () => {
    if (!editingEmp) return;
    if (!editName.trim()) {
      setErrorMsg('El nombre no puede estar vacío.');
      return;
    }
    if (editRate < 0 || editHours < 0) {
      setErrorMsg('Los valores de precio u horas no pueden ser negativos.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      await onUpdateEmployee({
        ...editingEmp,
        name: editName.trim(),
        email: editEmail.trim() || undefined,
        role: editRole,
        hourlyRate: editRate,
        targetWeeklyHours: editHours,
        avatarColor: editColor,
        active: editActive,
      });
      setEditingEmp(null);
      setSuccessMsg(`Empleado ${editName.trim()} actualizado correctamente.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar empleado.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (emp: Employee) => {
    setSaving(true);
    try {
      await onUpdateEmployee({
        ...emp,
        active: !emp.active,
      });
      setSuccessMsg(`Estado de ${emp.name} cambiado a ${!emp.active ? 'Activo' : 'Inactivo'}.`);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al cambiar estado.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setErrorMsg('El nombre es obligatorio.');
      return;
    }
    if (newRate < 0 || newHours < 0) {
      setErrorMsg('Los valores no pueden ser negativos.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    try {
      if (onAddEmployee) {
        await onAddEmployee({
          name: newName.trim(),
          email: newEmail.trim() || undefined,
          role: newRole,
          hourlyRate: newRate,
          targetWeeklyHours: newHours,
          avatarColor: newColor,
          active: true,
        });
      }
      setShowAddModal(false);
      setNewName('');
      setNewEmail('');
      setNewRate(4800);
      setNewHours(40);
      setSuccessMsg(`Empleado ${newName.trim()} agregado con éxito a la farmacia.`);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al agregar el empleado.');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!empToDelete) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      if (onDeleteEmployee) {
        await onDeleteEmployee(empToDelete.id);
      }
      setSuccessMsg(`Empleado ${empToDelete.name} eliminado.`);
      setEmpToDelete(null);
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al eliminar empleado.');
    } finally {
      setSaving(false);
    }
  };

  // Compute total payroll for current week
  let totalWeekHours = 0;
  let totalWeekPay = 0;
  let totalOvertimeHours = 0;

  const statsList = employees.map(emp => {
    const stats = calculateEmployeeWeeklyStats(emp, shifts, true);
    if (emp.active !== false) {
      totalWeekHours += stats.totalHours;
      totalWeekPay += stats.totalPay || 0;
      totalOvertimeHours += stats.overtimeHours;
    }
    return { emp, stats };
  });

  return (
    <div id="employees-management-view" className="space-y-5">
      {/* Header & Payroll Summary Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Payroll */}
        <div className="p-5 rounded-2xl bg-teal-950/40 border border-teal-800/60 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-600/30 text-teal-400 flex items-center justify-center border border-teal-500/40">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wider text-teal-300/80 font-semibold">
              Presupuesto Semanal Estimado
            </span>
            <span className="text-2xl font-black text-white font-mono">
              {formatCurrencyARS(totalWeekPay)}
            </span>
            <span className="block text-[11px] text-teal-400 mt-0.5">
              Semana {currentWeek.weekNumber} ({currentWeek.id})
            </span>
          </div>
        </div>

        {/* Total Hours */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center border border-slate-700">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wider text-slate-400 font-semibold">
              Total Horas Trabajadas
            </span>
            <span className="text-2xl font-black text-white font-mono">
              {totalWeekHours.toFixed(1)} h
            </span>
            <span className="block text-[11px] text-slate-400 mt-0.5">
              {employees.filter(e => e.active !== false).length} empleados activos
            </span>
          </div>
        </div>

        {/* Overtime */}
        <div className="p-5 rounded-2xl bg-amber-950/30 border border-amber-800/60 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-600/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <span className="block text-xs uppercase tracking-wider text-amber-300/80 font-semibold">
              Horas Extra Totales
            </span>
            <span className="text-2xl font-black text-white font-mono">
              {totalOvertimeHours.toFixed(1)} h
            </span>
            <span className="block text-[11px] text-amber-400 mt-0.5">
              Superan la meta semanal configurada
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-200 flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Employees Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-sm">
        <div className="px-5 py-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>Personal de Farmacia Mondino</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {employees.length} integrantes
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Administración de personal, roles, precios por hora y estado de actividad.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition shadow"
          >
            <UserPlus className="w-4 h-4" />
            <span>Agregar Empleado</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 text-xs uppercase tracking-wider">
                <th className="py-3 px-4 font-bold">Empleado</th>
                <th className="py-3 px-4 font-bold">Rol</th>
                <th className="py-3 px-4 font-bold">Precio / Hora</th>
                <th className="py-3 px-4 font-bold">Horas Semanales</th>
                <th className="py-3 px-4 font-bold text-right">Liquidación Estimada</th>
                <th className="py-3 px-4 font-bold text-center">Estado</th>
                <th className="py-3 px-4 font-bold text-center w-28">Acciones</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800 text-xs">
              {statsList.map(({ emp, stats }) => {
                const isInactive = emp.active === false;

                return (
                  <tr
                    key={emp.id}
                    className={`hover:bg-slate-800/40 transition ${isInactive ? 'opacity-50 bg-slate-950/40' : ''}`}
                  >
                    {/* Employee Name & Email */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shadow-xs shrink-0"
                          style={{ backgroundColor: emp.avatarColor || '#0d9488' }}
                        >
                          {emp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm flex items-center gap-2">
                            <span>{emp.name}</span>
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {emp.email || `${emp.name.toLowerCase()}@mondino.com`}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${
                          emp.role === 'admin'
                            ? 'bg-teal-950/80 text-teal-300 border-teal-800'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {emp.role === 'admin' ? <Shield className="w-3 h-3" /> : <UserCheck className="w-3 h-3" />}
                        <span>{emp.role === 'admin' ? 'Admin' : 'Empleado'}</span>
                      </span>
                    </td>

                    {/* Hourly Rate */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200 text-sm">
                      {formatCurrencyARS(emp.hourlyRate)} / h
                    </td>

                    {/* Target and Real Hours */}
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-mono font-bold text-white text-sm">
                          {stats.totalHours} h
                        </span>
                        <span className="text-[11px] text-slate-400 ml-1 font-mono">
                          (meta: {emp.targetWeeklyHours}h)
                        </span>
                      </div>
                    </td>

                    {/* Estimated Pay */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-mono font-bold text-teal-300 text-sm">
                        {formatCurrencyARS(stats.totalPay)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {stats.regularHours}h reg
                        {stats.overtimeHours > 0 && ` + ${stats.overtimeHours}h extra`}
                      </div>
                    </td>

                    {/* Active Toggle */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(emp)}
                        disabled={saving}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition border ${
                          !isInactive
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                            : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        <span>{!isInactive ? 'Activo' : 'Inactivo'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleStartEdit(emp)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                          title="Editar datos del empleado"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setEmpToDelete(emp)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-900/60 text-slate-400 hover:text-red-300 transition"
                          title="Eliminar empleado"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Editar Empleado */}
      {editingEmp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-teal-400" />
                <span>Editar Empleado: {editingEmp.name}</span>
              </h3>
              <button
                onClick={() => setEditingEmp(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nombre</label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Correo electrónico</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="ej: usuario@mondino.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Rol</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-sm"
                  >
                    <option value="employee">Empleado</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Precio por Hora ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={editRate}
                    onChange={e => setEditRate(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Horas Semanales Meta</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={editHours}
                    onChange={e => setEditHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Color de Avatar</label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setEditColor(c)}
                        className={`w-6 h-6 rounded-full border transition ${
                          editColor === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editActive}
                    onChange={e => setEditActive(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-700 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-slate-300 font-medium">Empleado Activo (aparece en horarios)</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingEmp(null)}
                className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar Nuevo Empleado */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-teal-400" />
                <span>Alta de Nuevo Personal</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEmployee} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Nombre completo *</label>
                <input
                  type="text"
                  placeholder="ej: Lucía Gómez"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Correo electrónico</label>
                <input
                  type="email"
                  placeholder="ej: lucia@mondino.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Rol</label>
                  <select
                    value={newRole}
                    onChange={e => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-teal-500 text-sm"
                  >
                    <option value="employee">Empleado</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Precio por Hora ($)</label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={newRate}
                    onChange={e => setNewRate(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Horas Semanales Meta</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={newHours}
                    onChange={e => setNewHours(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-teal-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1">Color distintivo</label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewColor(c)}
                        className={`w-6 h-6 rounded-full border transition ${
                          newColor === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{saving ? 'Guardando...' : 'Crear Empleado'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmar Eliminación */}
      {empToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-red-900/60 rounded-2xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center gap-2.5 text-red-400 font-bold">
              <Trash2 className="w-5 h-5 shrink-0" />
              <span>¿Eliminar a {empToDelete.name}?</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Esta acción eliminará al empleado de la nómina y de la base de datos de Supabase.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEmpToDelete(null)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={saving}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition disabled:opacity-50"
              >
                {saving ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
