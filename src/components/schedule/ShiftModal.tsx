import React, { useState, useEffect, useRef } from 'react';
import { X, Clock, Plus, Trash2, AlertTriangle, Check, ShieldAlert } from 'lucide-react';
import { Shift, Employee, DayOfWeek, DAYS_OF_WEEK, CurrentUser, ShiftStatus } from '../../types';
import { validateShiftTimes, checkShiftsOverlap } from '../../utils/timeCalculations';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  dayOfWeek: DayOfWeek;
  weekId: string;
  existingShifts: Shift[];
  currentUser: CurrentUser;
  onSaveDayShifts: (
    newShifts: { startTime: string; endTime: string; status: ShiftStatus }[]
  ) => Promise<void>;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  employee,
  dayOfWeek,
  existingShifts,
  currentUser,
  onSaveDayShifts,
}) => {
  const dayInfo = DAYS_OF_WEEK.find(d => d.id === dayOfWeek) || DAYS_OF_WEEK[0];
  const isSunday = dayOfWeek === 'sun';

  // Mode: 'normal' | 'franco' | 'vacaciones' | 'licencia' | 'enfermedad'
  const [statusMode, setStatusMode] = useState<ShiftStatus>('normal');
  const [shiftItems, setShiftItems] = useState<{ id: string; startTime: string; endTime: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Tracks which "cell" (employee + day) the form was last initialized for.
  // Background refreshes (10s polling, tab focus, realtime sync) create a brand
  // new `existingShifts` array reference on every parent re-render even when
  // nothing actually changed. Without this guard, that re-render would re-run
  // the initialization below and silently wipe out whatever the admin was
  // mid-way through typing, falling back to the default preset — which is the
  // "se me vuelve a un horario random" bug. We only want to (re)initialize the
  // form when the modal newly opens or when it's pointed at a different cell,
  // never just because the data reference changed underneath an open modal.
  const initializedForRef = useRef<string | null>(null);
  const cellKey = `${employee.id}::${dayOfWeek}`;

  useEffect(() => {
    if (!isOpen) {
      initializedForRef.current = null;
      return;
    }
    if (initializedForRef.current === cellKey) return;
    initializedForRef.current = cellKey;

    setErrorMessage(null);

    // Analyze existing shifts
    const francoShift = existingShifts.find(s => s.status === 'franco');
    const specialShift = existingShifts.find(s => s.status !== 'normal' && s.status !== 'franco');

    if (francoShift) {
      setStatusMode('franco');
      setShiftItems([]);
    } else if (specialShift) {
      setStatusMode(specialShift.status);
      setShiftItems([]);
    } else {
      setStatusMode('normal');
      const normalShifts = existingShifts.filter(s => s.status === 'normal');
      if (normalShifts.length > 0) {
        setShiftItems(
          normalShifts.map(s => ({
            id: s.id,
            startTime: s.startTime,
            endTime: s.endTime,
          }))
        );
      } else {
        // Default shift suggestion
        if (isSunday) {
          setShiftItems([{ id: 'new-1', startTime: '10:00', endTime: '14:00' }]);
        } else {
          setShiftItems([{ id: 'new-1', startTime: '09:00', endTime: '17:00' }]);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, cellKey]);

  if (!isOpen) return null;

  const isAdmin = currentUser.role === 'admin';

  const handleAddSecondShift = () => {
    if (shiftItems.length >= 2) return;
    if (isSunday) {
      setShiftItems(prev => [...prev, { id: `new-${Date.now()}`, startTime: '17:00', endTime: '22:00' }]);
    } else {
      setShiftItems(prev => [...prev, { id: `new-${Date.now()}`, startTime: '17:00', endTime: '21:00' }]);
    }
  };

  const handleRemoveShiftItem = (index: number) => {
    setShiftItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpdateShiftTime = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setShiftItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const applyPreset = (start: string, end: string) => {
    setStatusMode('normal');
    setShiftItems([{ id: 'preset-1', startTime: start, endTime: end }]);
  };

  const applySundaySplitPreset = () => {
    setStatusMode('normal');
    setShiftItems([
      { id: 'sun-1', startTime: '10:00', endTime: '14:00' },
      { id: 'sun-2', startTime: '17:00', endTime: '22:00' },
    ]);
  };

  const handleSave = async () => {
    setErrorMessage(null);

    if (!isAdmin) {
      setErrorMessage('Solo los administradores pueden modificar los horarios.');
      return;
    }

    if (statusMode !== 'normal') {
      setSaving(true);
      try {
        await onSaveDayShifts([{ startTime: '00:00', endTime: '00:00', status: statusMode }]);
        onClose();
      } catch (err: any) {
        setErrorMessage(err.message || 'Error al guardar el estado.');
      } finally {
        setSaving(false);
      }
      return;
    }

    // Validation for normal shifts
    if (shiftItems.length === 0) {
      setErrorMessage('Agregue al menos un turno o seleccione "Franco".');
      return;
    }

    for (const item of shiftItems) {
      const validation = validateShiftTimes(item.startTime, item.endTime);
      if (!validation.valid) {
        setErrorMessage(validation.error || 'Horario inválido.');
        return;
      }
    }

    // Check mutual overlap if 2 shifts
    if (shiftItems.length === 2) {
      if (checkShiftsOverlap(shiftItems[0], shiftItems[1])) {
        setErrorMessage('Los dos turnos se superponen entre sí.');
        return;
      }
    }

    setSaving(true);
    try {
      await onSaveDayShifts(
        shiftItems.map(item => ({
          startTime: item.startTime,
          endTime: item.endTime,
          status: 'normal',
        }))
      );
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al guardar los turnos.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAll = async () => {
    if (!isAdmin) return;
    setSaving(true);
    try {
      await onSaveDayShifts([]);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al eliminar el turno.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="modal-shift-editor"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-3 sm:p-5 overflow-y-auto animate-in fade-in"
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-base shadow"
              style={{ backgroundColor: employee.avatarColor || '#0d9488' }}
            >
              {employee.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{employee.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {dayInfo.name}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Horario de atención: {dayInfo.isSunday ? '10-14 y 17-22' : '09:00 a 23:00'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Admin Permission check banner */}
        {!isAdmin && (
          <div className="p-4 bg-amber-950/40 border-b border-amber-900/60 flex items-start gap-2.5 text-xs text-amber-300">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-200">Modo de solo lectura</p>
              <p>Tu rol de empleado te permite consultar el horario, pero solo los administradores (Fernando o Yanina) pueden realizar modificaciones.</p>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Status Mode Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Estado del día
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {[
                { id: 'normal', label: 'Con Turno' },
                { id: 'franco', label: 'Franco' },
                { id: 'vacaciones', label: 'Vacaciones' },
                { id: 'licencia', label: 'Licencia' },
                { id: 'enfermedad', label: 'Enfermedad' },
              ].map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  disabled={!isAdmin}
                  onClick={() => setStatusMode(opt.id as ShiftStatus)}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl border transition text-center ${
                    statusMode === opt.id
                      ? opt.id === 'franco'
                        ? 'bg-slate-700 text-white border-slate-500 shadow-sm'
                        : opt.id === 'normal'
                        ? 'bg-teal-600 text-white border-teal-500 shadow-sm'
                        : 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700/60'
                  } ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Normal Shift Form */}
          {statusMode === 'normal' ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Horarios ({shiftItems.length} {shiftItems.length === 1 ? 'turno' : 'turnos'})
                </label>
                {isAdmin && shiftItems.length < 2 && (
                  <button
                    type="button"
                    onClick={handleAddSecondShift}
                    className="flex items-center gap-1 text-xs font-semibold text-teal-400 hover:text-teal-300 p-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Agregar 2° turno (cortado)</span>
                  </button>
                )}
              </div>

              {shiftItems.map((item, index) => (
                <div
                  key={item.id || index}
                  className="flex items-center gap-2 p-3 rounded-xl bg-slate-800/90 border border-slate-700"
                >
                  <span className="text-xs font-bold text-teal-400 px-2 py-1 rounded-md bg-teal-950/80 border border-teal-800/50">
                    T{index + 1}
                  </span>

                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-[10px] text-slate-400 font-medium mb-1">Inicio</span>
                      <input
                        type="time"
                        value={item.startTime}
                        disabled={!isAdmin}
                        onChange={e => handleUpdateShiftTime(index, 'startTime', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-400 font-medium mb-1">Fin</span>
                      <input
                        type="time"
                        value={item.endTime}
                        disabled={!isAdmin}
                        onChange={e => handleUpdateShiftTime(index, 'endTime', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-white font-mono focus:border-teal-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {isAdmin && shiftItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveShiftItem(index)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition"
                      title="Eliminar este turno"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {/* Quick Presets for Admins */}
              {isAdmin && (
                <div className="pt-2">
                  <span className="block text-[11px] text-slate-400 font-medium mb-1.5">Plantillas rápidas:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {!isSunday ? (
                      <>
                        <button
                          type="button"
                          onClick={() => applyPreset('09:00', '17:00')}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 font-mono"
                        >
                          09:00 - 17:00 (Mañana)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('14:00', '23:00')}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 font-mono"
                        >
                          14:00 - 23:00 (Tarde)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('10:00', '18:00')}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 font-mono"
                        >
                          10:00 - 18:00
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('10:00', '19:00')}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 font-mono"
                        >
                          10:00 - 19:00
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('15:00', '23:00')}
                          className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 border border-slate-700 font-mono"
                        >
                          15:00 - 23:00
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => applyPreset('10:00', '14:00')}
                          className="px-2 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 text-[11px] text-amber-200 border border-amber-800/80 font-mono"
                        >
                          10:00 - 14:00 (Dom Mañana)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyPreset('17:00', '22:00')}
                          className="px-2 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900 text-[11px] text-amber-200 border border-amber-800/80 font-mono"
                        >
                          17:00 - 22:00 (Dom Tarde)
                        </button>
                        <button
                          type="button"
                          onClick={applySundaySplitPreset}
                          className="px-2 py-1 rounded-lg bg-teal-950 hover:bg-teal-900 text-[11px] text-teal-200 border border-teal-800 font-mono font-semibold"
                        >
                          10-14 y 17-22 (Doble Turno)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 rounded-xl bg-slate-800/60 border border-slate-700 text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-slate-700 text-slate-300">
                <Clock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-white capitalize">{statusMode}</h4>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {statusMode === 'franco'
                  ? 'El empleado tendrá su día libre programado. No contabiliza horas de trabajo.'
                  : `El día se registrará como ${statusMode}.`}
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 text-xs text-red-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
          <div>
            {isAdmin && existingShifts.length > 0 && (
              <button
                type="button"
                onClick={handleDeleteAll}
                disabled={saving}
                className="text-xs text-red-400 hover:text-red-300 font-medium transition"
              >
                Limpiar día
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition"
            >
              Cerrar
            </button>
            {isAdmin && (
              <button
                type="button"
                id="btn-save-shift"
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-95 transition shadow disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{saving ? 'Guardando...' : 'Guardar horario'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
