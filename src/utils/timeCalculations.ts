import { Shift, Employee, EmployeeWeeklyStats, DayOfWeek, DAYS_OF_WEEK } from '../types';

export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr || !timeStr.includes(':')) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatHoursDecimal(hours: number): string {
  if (hours % 1 === 0) {
    return `${hours} h`;
  }
  const fullHours = Math.floor(hours);
  const minutes = Math.round((hours - fullHours) * 60);
  return `${fullHours}h ${minutes}m (${hours.toFixed(1)} h)`;
}

export function calculateShiftDurationHours(startTime: string, endTime: string): number {
  const start = timeStringToMinutes(startTime);
  const end = timeStringToMinutes(endTime);
  if (end <= start) return 0;
  return Number(((end - start) / 60).toFixed(2));
}

export function validateShiftTimes(startTime: string, endTime: string): { valid: boolean; error?: string } {
  if (!startTime || !endTime) {
    return { valid: false, error: 'Ambos horarios son requeridos' };
  }
  const start = timeStringToMinutes(startTime);
  const end = timeStringToMinutes(endTime);
  if (end <= start) {
    return { valid: false, error: 'La hora de finalización debe ser posterior a la de inicio' };
  }
  return { valid: true };
}

export function checkShiftsOverlap(shift1: { startTime: string; endTime: string }, shift2: { startTime: string; endTime: string }): boolean {
  const s1Start = timeStringToMinutes(shift1.startTime);
  const s1End = timeStringToMinutes(shift1.endTime);
  const s2Start = timeStringToMinutes(shift2.startTime);
  const s2End = timeStringToMinutes(shift2.endTime);

  return Math.max(s1Start, s2Start) < Math.min(s1End, s2End);
}

export function formatShiftsForDay(shifts: Shift[]): string {
  if (!shifts || shifts.length === 0) return 'Sin turno';
  
  const francoShift = shifts.find(s => s.status === 'franco');
  if (francoShift) return 'Franco';

  const licenciaShift = shifts.find(s => s.status === 'licencia' || s.status === 'vacaciones' || s.status === 'enfermedad');
  if (licenciaShift) {
    if (licenciaShift.status === 'vacaciones') return 'Vacaciones';
    if (licenciaShift.status === 'licencia') return 'Licencia';
    if (licenciaShift.status === 'enfermedad') return 'Enfermedad';
  }

  const normalShifts = shifts.filter(s => s.status === 'normal');
  if (normalShifts.length === 0) return 'Sin turno';

  // Sort by start time
  normalShifts.sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));

  return normalShifts
    .map(s => `${s.startTime.replace(':00', '')}-${s.endTime.replace(':00', '')}`)
    .join(' / ');
}

export function formatShiftsFullDisplay(shifts: Shift[]): string {
  if (!shifts || shifts.length === 0) return 'Sin turno programado';
  
  const francoShift = shifts.find(s => s.status === 'franco');
  if (francoShift) return 'Franco';

  const otherShift = shifts.find(s => s.status !== 'normal');
  if (otherShift) {
    const map: Record<string, string> = {
      vacaciones: 'Vacaciones',
      licencia: 'Licencia médica / especial',
      enfermedad: 'Licencia por enfermedad',
    };
    return map[otherShift.status] || otherShift.status;
  }

  const normalShifts = shifts.filter(s => s.status === 'normal');
  if (normalShifts.length === 0) return 'Sin turno';

  normalShifts.sort((a, b) => timeStringToMinutes(a.startTime) - timeStringToMinutes(b.startTime));
  return normalShifts.map(s => `${s.startTime} a ${s.endTime}`).join(' y ');
}

export function calculateEmployeeWeeklyStats(
  employee: Employee,
  shifts: Shift[],
  isUserAdmin: boolean = false
): EmployeeWeeklyStats {
  const shiftsByDay: Record<DayOfWeek, Shift[]> = {
    mon: [],
    tue: [],
    wed: [],
    thu: [],
    fri: [],
    sat: [],
    sun: [],
  };

  const dayLabels: Record<DayOfWeek, string> = {
    mon: 'Sin turno',
    tue: 'Sin turno',
    wed: 'Sin turno',
    thu: 'Sin turno',
    fri: 'Sin turno',
    sat: 'Sin turno',
    sun: 'Sin turno',
  };

  let totalHours = 0;

  // Group employee shifts
  shifts
    .filter(s => s.employeeId === employee.id)
    .forEach(shift => {
      shiftsByDay[shift.dayOfWeek].push(shift);
    });

  // Calculate hours per day
  DAYS_OF_WEEK.forEach(day => {
    const dayShifts = shiftsByDay[day.id];
    dayLabels[day.id] = formatShiftsForDay(dayShifts);

    dayShifts.forEach(shift => {
      if (shift.status === 'normal') {
        const duration = calculateShiftDurationHours(shift.startTime, shift.endTime);
        totalHours += duration;
      }
    });
  });

  totalHours = Number(totalHours.toFixed(2));
  const targetHours = employee.targetWeeklyHours || 40;
  const regularHours = Math.min(totalHours, targetHours);
  const overtimeHours = Math.max(0, Number((totalHours - targetHours).toFixed(2)));

  const stats: EmployeeWeeklyStats = {
    employeeId: employee.id,
    employeeName: employee.name,
    regularHours,
    overtimeHours,
    totalHours,
    targetHours,
    shiftsByDay,
    dayLabels,
  };

  // Strictly protected: Only attach financial calculations if user is admin!
  if (isUserAdmin && employee.hourlyRate) {
    const rate = employee.hourlyRate;
    const regularPay = Math.round(regularHours * rate);
    // Overtime at 1.5x regular rate (or regular rate)
    const overtimePay = Math.round(overtimeHours * (rate * 1.5));
    const totalPay = regularPay + overtimePay;

    stats.hourlyRate = rate;
    stats.regularPay = regularPay;
    stats.overtimePay = overtimePay;
    stats.totalPay = totalPay;
  }

  return stats;
}

export function formatCurrencyARS(amount?: number): string {
  if (amount === undefined || amount === null) return '$0';
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateSpanish(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function formatDateTimeSpanish(isoStr: string): string {
  if (!isoStr) return '';
  const date = new Date(isoStr);
  return date.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
