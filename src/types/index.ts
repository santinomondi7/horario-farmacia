export type UserRole = 'admin' | 'employee';

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface DayInfo {
  id: DayOfWeek;
  name: string;
  shortName: string;
  isSunday: boolean;
  openTime: string;
  closeTime: string;
}

export const DAYS_OF_WEEK: DayInfo[] = [
  { id: 'mon', name: 'Lunes', shortName: 'Lun', isSunday: false, openTime: '09:00', closeTime: '23:00' },
  { id: 'tue', name: 'Martes', shortName: 'Mar', isSunday: false, openTime: '09:00', closeTime: '23:00' },
  { id: 'wed', name: 'Miércoles', shortName: 'Mié', isSunday: false, openTime: '09:00', closeTime: '23:00' },
  { id: 'thu', name: 'Jueves', shortName: 'Jue', isSunday: false, openTime: '09:00', closeTime: '23:00' },
  { id: 'fri', name: 'Viernes', shortName: 'Vie', isSunday: false, openTime: '09:00', closeTime: '23:00' },
  { id: 'sat', name: 'Sábado', shortName: 'Sáb', isSunday: false, openTime: '09:00', closeTime: '23:00' },
  { id: 'sun', name: 'Domingo', shortName: 'Dom', isSunday: true, openTime: '10:00', closeTime: '22:00' },
];

export type ShiftStatus = 'normal' | 'franco' | 'vacaciones' | 'licencia' | 'enfermedad';

export interface Shift {
  id: string;
  employeeId: string;
  weekId: string;
  dayOfWeek: DayOfWeek;
  startTime: string; // "09:00"
  endTime: string;   // "17:00"
  status: ShiftStatus;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Employee {
  id: string;
  name: string;
  role: UserRole;
  hourlyRate?: number; // Only accessible to Admins
  targetWeeklyHours: number; // e.g. 40
  active: boolean;
  avatarColor: string;
  phone?: string;
  email?: string;
}

export interface Week {
  id: string; // e.g. "2026-W37"
  year: number;
  weekNumber: number;
  startDate: string; // "2026-09-07"
  endDate: string;   // "2026-09-13"
  status: 'draft' | 'published';
  copiedFromWeekId?: string;
  publishedAt?: string;
  updatedAt: string;
}

export interface ScheduleAuditLog {
  id: string;
  weekId: string;
  employeeId: string;
  employeeName: string;
  dayOfWeek: DayOfWeek;
  previousValue: string; // e.g. "09:00 - 17:00" or "Franco" or "Sin turno"
  newValue: string;      // e.g. "10:00 - 18:00" or "Franco"
  changedBy: string;     // user ID
  changedByName: string; // "Yanina" or "Fernando"
  timestamp: string;     // ISO String "2026-09-12T15:42:00Z"
}

export interface CoverageSlot {
  slotId: string;
  startHour: number;     // e.g. 10
  endHour: number;       // e.g. 11
  label: string;         // e.g. "10:00 - 11:00"
  requiredCount: number; // 2 or 1 or 0
  availableEmployees: {
    id: string;
    name: string;
    avatarColor: string;
    shiftSummary: string;
  }[];
  isDeficient: boolean;
  isOpen: boolean;
  shortageCount: number;
}

export interface DayCoverageSummary {
  day: DayInfo;
  slots: CoverageSlot[];
  deficiencyCount: number;
  isFullyCovered: boolean;
}

export interface WeekCoverageStats {
  totalDeficiencies: number;
  daysWithDeficiencies: number;
  coveragePercentage: number;
  criticalGaps: {
    dayName: string;
    timeRange: string;
    available: number;
    required: number;
    reason: string;
  }[];
}

export interface EmployeeWeeklyStats {
  employeeId: string;
  employeeName: string;
  regularHours: number;
  overtimeHours: number;
  totalHours: number;
  targetHours: number;
  hourlyRate?: number;
  regularPay?: number;
  overtimePay?: number;
  totalPay?: number;
  shiftsByDay: Record<DayOfWeek, Shift[]>;
  dayLabels: Record<DayOfWeek, string>;
}

export interface CurrentUser {
  id: string;
  name: string;
  role: UserRole;
  email?: string;
}
