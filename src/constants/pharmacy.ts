import { Employee, Shift, Week, ScheduleAuditLog } from '../types';

export const PHARMACY_INFO = {
  name: 'Mondino Farmacia y Perfumería',
  shortName: 'Mondino',
  whatsappGroup: 'Horarios Mondino',
  openingHours: {
    weekday: '09:00 a 23:00',
    sunday: '10:00 a 14:00 y 17:00 a 22:00',
  },
  mandatoryCoverageRules: [
    { start: '10:00', end: '14:00', minEmployees: 2, label: 'Turno Mañana Pico (10:00 - 14:00)' },
    { start: '17:00', end: '21:00', minEmployees: 2, label: 'Turno Tarde Pico (17:00 - 21:00)' },
  ],
  standardMinCoverage: 1,
};

export const INITIAL_EMPLOYEES: Employee[] = [
  {
    id: 'emp-fernando',
    name: 'Fernando',
    role: 'admin',
    hourlyRate: 5000,
    targetWeeklyHours: 40,
    active: true,
    avatarColor: '#059669', // Emerald
    email: 'fernando@mondino.com',
  },
  {
    id: 'emp-yanina',
    name: 'Yanina',
    role: 'admin',
    hourlyRate: 5500,
    targetWeeklyHours: 40,
    active: true,
    avatarColor: '#0d9488', // Teal
    email: 'yanina@mondino.com',
  },
  {
    id: 'emp-juanchi',
    name: 'Juanchi',
    role: 'employee',
    hourlyRate: 4800,
    targetWeeklyHours: 40,
    active: true,
    avatarColor: '#2563eb', // Blue
    email: 'juanchi@mondino.com',
  },
  {
    id: 'emp-romina',
    name: 'Romina',
    role: 'employee',
    hourlyRate: 4800,
    targetWeeklyHours: 40,
    active: true,
    avatarColor: '#7c3aed', // Violet
    email: 'romina@mondino.com',
  },
  {
    id: 'emp-agustina',
    name: 'Agustina',
    role: 'employee',
    hourlyRate: 4800,
    targetWeeklyHours: 40,
    active: true,
    avatarColor: '#db2777', // Pink
    email: 'agustina@mondino.com',
  },
  {
    id: 'emp-eliana',
    name: 'Eliana',
    role: 'employee',
    hourlyRate: 4800,
    targetWeeklyHours: 40,
    active: true,
    avatarColor: '#ea580c', // Orange
    email: 'eliana@mondino.com',
  },
];

// Calendar / ISO-week helpers. All dates are represented as local YYYY-MM-DD strings.
export function getWeekInfoForDate(baseDate: Date = new Date()): Week {
  const date = new Date(baseDate);
  date.setHours(12, 0, 0, 0);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(date);
  monday.setDate(date.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  // ISO week number/year.
  const isoThursday = new Date(monday);
  isoThursday.setDate(monday.getDate() + 3);
  const year = isoThursday.getFullYear();
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const firstThursday = new Date(jan4);
  firstThursday.setDate(jan4.getDate() + (4 - jan4Day));
  const weekNumber = 1 + Math.round((isoThursday.getTime() - firstThursday.getTime()) / (7 * 86400000));

  return {
    id: `${year}-W${String(weekNumber).padStart(2, '0')}`,
    year,
    weekNumber,
    startDate: monday.toISOString().slice(0, 10),
    endDate: sunday.toISOString().slice(0, 10),
    status: 'draft',
    updatedAt: new Date().toISOString(),
  };
}

export function getCurrentWeekInfo(baseDate: Date = new Date()): Week {
  const week = getWeekInfoForDate(baseDate);
  week.status = 'published';
  return week;
}

export function getWeeksUntilEndOfYear(baseDate: Date = new Date()): Week[] {
  const current = getWeekInfoForDate(baseDate);
  const year = baseDate.getFullYear();
  const result: Week[] = [];
  let cursor = new Date(`${current.startDate}T12:00:00`);
  const endOfYear = new Date(year, 11, 31, 12, 0, 0);

  while (cursor <= endOfYear) {
    const week = getWeekInfoForDate(cursor);
    if (week.year === year || week.startDate <= endOfYear.toISOString().slice(0, 10)) {
      result.push(week);
    }
    cursor.setDate(cursor.getDate() + 7);
  }
  return result;
}

// Initial realistic shifts for current week
export function generateInitialShifts(weekId: string): Shift[] {
  const now = new Date().toISOString();
  return [
    // Fernando
    { id: 's-fer-mon', employeeId: 'emp-fernando', weekId, dayOfWeek: 'mon', startTime: '09:00', endTime: '17:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-fer-tue', employeeId: 'emp-fernando', weekId, dayOfWeek: 'tue', startTime: '14:00', endTime: '23:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-fer-wed', employeeId: 'emp-fernando', weekId, dayOfWeek: 'wed', startTime: '00:00', endTime: '00:00', status: 'franco', createdAt: now, updatedAt: now },
    { id: 's-fer-thu', employeeId: 'emp-fernando', weekId, dayOfWeek: 'thu', startTime: '09:00', endTime: '17:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-fer-fri', employeeId: 'emp-fernando', weekId, dayOfWeek: 'fri', startTime: '09:00', endTime: '17:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-fer-sat', employeeId: 'emp-fernando', weekId, dayOfWeek: 'sat', startTime: '14:00', endTime: '23:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-fer-sun', employeeId: 'emp-fernando', weekId, dayOfWeek: 'sun', startTime: '10:00', endTime: '14:00', status: 'normal', createdAt: now, updatedAt: now },

    // Yanina
    { id: 's-yan-mon', employeeId: 'emp-yanina', weekId, dayOfWeek: 'mon', startTime: '14:00', endTime: '23:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-yan-tue', employeeId: 'emp-yanina', weekId, dayOfWeek: 'tue', startTime: '09:00', endTime: '17:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-yan-wed', employeeId: 'emp-yanina', weekId, dayOfWeek: 'wed', startTime: '09:00', endTime: '17:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-yan-thu', employeeId: 'emp-yanina', weekId, dayOfWeek: 'thu', startTime: '00:00', endTime: '00:00', status: 'franco', createdAt: now, updatedAt: now },
    { id: 's-yan-fri', employeeId: 'emp-yanina', weekId, dayOfWeek: 'fri', startTime: '14:00', endTime: '23:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-yan-sat', employeeId: 'emp-yanina', weekId, dayOfWeek: 'sat', startTime: '09:00', endTime: '17:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-yan-sun', employeeId: 'emp-yanina', weekId, dayOfWeek: 'sun', startTime: '17:00', endTime: '22:00', status: 'normal', createdAt: now, updatedAt: now },

    // Juanchi
    { id: 's-jua-mon', employeeId: 'emp-juanchi', weekId, dayOfWeek: 'mon', startTime: '09:00', endTime: '17:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-jua-tue', employeeId: 'emp-juanchi', weekId, dayOfWeek: 'tue', startTime: '10:00', endTime: '19:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-jua-wed', employeeId: 'emp-juanchi', weekId, dayOfWeek: 'wed', startTime: '14:00', endTime: '23:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-jua-thu', employeeId: 'emp-juanchi', weekId, dayOfWeek: 'thu', startTime: '10:00', endTime: '19:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-jua-fri', employeeId: 'emp-juanchi', weekId, dayOfWeek: 'fri', startTime: '00:00', endTime: '00:00', status: 'franco', createdAt: now, updatedAt: now },
    { id: 's-jua-sat', employeeId: 'emp-juanchi', weekId, dayOfWeek: 'sat', startTime: '10:00', endTime: '19:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-jua-sun', employeeId: 'emp-juanchi', weekId, dayOfWeek: 'sun', startTime: '00:00', endTime: '00:00', status: 'franco', createdAt: now, updatedAt: now },

    // Romina
    { id: 's-rom-mon', employeeId: 'emp-romina', weekId, dayOfWeek: 'mon', startTime: '10:00', endTime: '18:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-rom-tue', employeeId: 'emp-romina', weekId, dayOfWeek: 'tue', startTime: '00:00', endTime: '00:00', status: 'franco', createdAt: now, updatedAt: now },
    { id: 's-rom-wed', employeeId: 'emp-romina', weekId, dayOfWeek: 'wed', startTime: '10:00', endTime: '19:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-rom-thu', employeeId: 'emp-romina', weekId, dayOfWeek: 'thu', startTime: '14:00', endTime: '23:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-rom-fri', employeeId: 'emp-romina', weekId, dayOfWeek: 'fri', startTime: '10:00', endTime: '19:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-rom-sat', employeeId: 'emp-romina', weekId, dayOfWeek: 'sat', startTime: '09:00', endTime: '17:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-rom-sun', employeeId: 'emp-romina', weekId, dayOfWeek: 'sun', startTime: '00:00', endTime: '00:00', status: 'franco', createdAt: now, updatedAt: now },

    // Agustina
    { id: 's-agu-mon', employeeId: 'emp-agustina', weekId, dayOfWeek: 'mon', startTime: '00:00', endTime: '00:00', status: 'franco', createdAt: now, updatedAt: now },
    { id: 's-agu-tue', employeeId: 'emp-agustina', weekId, dayOfWeek: 'tue', startTime: '15:00', endTime: '23:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-agu-wed', employeeId: 'emp-agustina', weekId, dayOfWeek: 'wed', startTime: '15:00', endTime: '23:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-agu-thu', employeeId: 'emp-agustina', weekId, dayOfWeek: 'thu', startTime: '09:00', endTime: '17:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-agu-fri', employeeId: 'emp-agustina', weekId, dayOfWeek: 'fri', startTime: '14:00', endTime: '23:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-agu-sat', employeeId: 'emp-agustina', weekId, dayOfWeek: 'sat', startTime: '00:00', endTime: '00:00', status: 'franco', createdAt: now, updatedAt: now },
    // Agustina split shift Sunday: 10:00-14:00 and 17:00-22:00
    { id: 's-agu-sun-1', employeeId: 'emp-agustina', weekId, dayOfWeek: 'sun', startTime: '10:00', endTime: '14:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-agu-sun-2', employeeId: 'emp-agustina', weekId, dayOfWeek: 'sun', startTime: '17:00', endTime: '22:00', status: 'normal', createdAt: now, updatedAt: now },

    // Eliana
    { id: 's-eli-mon', employeeId: 'emp-eliana', weekId, dayOfWeek: 'mon', startTime: '15:00', endTime: '23:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-eli-tue', employeeId: 'emp-eliana', weekId, dayOfWeek: 'tue', startTime: '09:00', endTime: '17:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-eli-wed', employeeId: 'emp-eliana', weekId, dayOfWeek: 'wed', startTime: '00:00', endTime: '00:00', status: 'franco', createdAt: now, updatedAt: now },
    { id: 's-eli-thu', employeeId: 'emp-eliana', weekId, dayOfWeek: 'thu', startTime: '15:00', endTime: '23:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-eli-fri', employeeId: 'emp-eliana', weekId, dayOfWeek: 'fri', startTime: '09:00', endTime: '17:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-eli-sat', employeeId: 'emp-eliana', weekId, dayOfWeek: 'sat', startTime: '14:00', endTime: '23:00', status: 'normal', createdAt: now, updatedAt: now },
    { id: 's-eli-sun', employeeId: 'emp-eliana', weekId, dayOfWeek: 'sun', startTime: '00:00', endTime: '00:00', status: 'franco', createdAt: now, updatedAt: now },
  ];
}

export const INITIAL_AUDIT_LOGS: ScheduleAuditLog[] = [
  {
    id: 'log-1',
    weekId: '2026-W37',
    employeeId: 'emp-romina',
    employeeName: 'Romina',
    dayOfWeek: 'mon',
    previousValue: '09:00 - 17:00',
    newValue: '10:00 - 18:00',
    changedBy: 'emp-yanina',
    changedByName: 'Yanina',
    timestamp: '2026-09-12T15:42:00Z',
  },
  {
    id: 'log-2',
    weekId: '2026-W37',
    employeeId: 'emp-agustina',
    employeeName: 'Agustina',
    dayOfWeek: 'sun',
    previousValue: 'Franco',
    newValue: '10:00 - 14:00 / 17:00 - 22:00',
    changedBy: 'emp-fernando',
    changedByName: 'Fernando',
    timestamp: '2026-09-11T11:20:00Z',
  },
];
