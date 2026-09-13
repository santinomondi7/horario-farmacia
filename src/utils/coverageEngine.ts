import { Shift, Employee, DayOfWeek, DAYS_OF_WEEK, CoverageSlot, DayCoverageSummary, WeekCoverageStats } from '../types';
import { timeStringToMinutes } from './timeCalculations';

interface SlotRule {
  startHour: number;
  endHour: number;
  minEmployees: number;
  label: string;
}

// Get the hourly rules for a specific day
export function getRulesForDay(dayOfWeek: DayOfWeek): SlotRule[] {
  const isSunday = dayOfWeek === 'sun';
  const rules: SlotRule[] = [];

  if (!isSunday) {
    // Mon - Sat: Open 09:00 to 23:00
    for (let h = 9; h < 23; h++) {
      const isPeakMorning = h >= 10 && h < 14; // 10:00 - 14:00 (min 2)
      const isPeakEvening = h >= 17 && h < 21; // 17:00 - 21:00 (min 2)
      const minEmployees = isPeakMorning || isPeakEvening ? 2 : 1;
      
      const startStr = `${String(h).padStart(2, '0')}:00`;
      const endStr = `${String(h + 1).padStart(2, '0')}:00`;

      rules.push({
        startHour: h,
        endHour: h + 1,
        minEmployees,
        label: `${startStr} - ${endStr}`,
      });
    }
  } else {
    // Sunday: Open 10:00 to 14:00 and 17:00 to 22:00
    // Morning: 10:00 - 14:00 (Mandatory 2 employees)
    for (let h = 10; h < 14; h++) {
      const startStr = `${String(h).padStart(2, '0')}:00`;
      const endStr = `${String(h + 1).padStart(2, '0')}:00`;
      rules.push({
        startHour: h,
        endHour: h + 1,
        minEmployees: 2, // 10:00 - 14:00 requires min 2
        label: `${startStr} - ${endStr}`,
      });
    }

    // Evening: 17:00 - 22:00 (17:00 - 21:00 requires min 2, 21:00 - 22:00 requires min 1)
    for (let h = 17; h < 22; h++) {
      const isPeak = h < 21; // 17:00 - 21:00 requires 2, 21:00 - 22:00 requires 1
      const minEmployees = isPeak ? 2 : 1;
      const startStr = `${String(h).padStart(2, '0')}:00`;
      const endStr = `${String(h + 1).padStart(2, '0')}:00`;
      rules.push({
        startHour: h,
        endHour: h + 1,
        minEmployees,
        label: `${startStr} - ${endStr}`,
      });
    }
  }

  return rules;
}

// Analyze coverage for a single day
export function analyzeDayCoverage(
  dayOfWeek: DayOfWeek,
  shifts: Shift[],
  employees: Employee[]
): DayCoverageSummary {
  const dayInfo = DAYS_OF_WEEK.find(d => d.id === dayOfWeek) || DAYS_OF_WEEK[0];
  const rules = getRulesForDay(dayOfWeek);

  // Active shifts for this day with status 'normal'
  const activeShifts = shifts.filter(s => s.dayOfWeek === dayOfWeek && s.status === 'normal');
  const employeeMap = new Map<string, Employee>();
  employees.forEach(e => employeeMap.set(e.id, e));

  const slots: CoverageSlot[] = [];
  let deficiencyCount = 0;

  rules.forEach(rule => {
    const slotStartMin = rule.startHour * 60;
    const slotEndMin = rule.endHour * 60;

    // An employee is working during this slot if their shift covers at least part of the slot
    // Strict coverage check: an employee covers the slot if they are scheduled during this hour
    const workingInSlot: {
      id: string;
      name: string;
      avatarColor: string;
      shiftSummary: string;
    }[] = [];

    activeShifts.forEach(shift => {
      const shiftStartMin = timeStringToMinutes(shift.startTime);
      const shiftEndMin = timeStringToMinutes(shift.endTime);

      // Overlaps with the slot
      if (Math.max(slotStartMin, shiftStartMin) < Math.min(slotEndMin, shiftEndMin)) {
        const emp = employeeMap.get(shift.employeeId);
        if (emp && !workingInSlot.some(w => w.id === emp.id)) {
          workingInSlot.push({
            id: emp.id,
            name: emp.name,
            avatarColor: emp.avatarColor || '#0d9488',
            shiftSummary: `${shift.startTime} - ${shift.endTime}`,
          });
        }
      }
    });

    const isDeficient = workingInSlot.length < rule.minEmployees;
    const shortageCount = Math.max(0, rule.minEmployees - workingInSlot.length);

    if (isDeficient) {
      deficiencyCount++;
    }

    slots.push({
      slotId: `${dayOfWeek}-${rule.startHour}-${rule.endHour}`,
      startHour: rule.startHour,
      endHour: rule.endHour,
      label: rule.label,
      requiredCount: rule.minEmployees,
      availableEmployees: workingInSlot,
      isDeficient,
      isOpen: true,
      shortageCount,
    });
  });

  return {
    day: dayInfo,
    slots,
    deficiencyCount,
    isFullyCovered: deficiencyCount === 0,
  };
}

// Analyze entire week coverage
export function analyzeWeekCoverage(
  shifts: Shift[],
  employees: Employee[]
): {
  days: Record<DayOfWeek, DayCoverageSummary>;
  stats: WeekCoverageStats;
} {
  const daysSummary: Record<DayOfWeek, DayCoverageSummary> = {} as Record<DayOfWeek, DayCoverageSummary>;
  let totalSlots = 0;
  let totalDeficientSlots = 0;
  let daysWithDeficiencies = 0;
  const criticalGaps: WeekCoverageStats['criticalGaps'] = [];

  DAYS_OF_WEEK.forEach(d => {
    const summary = analyzeDayCoverage(d.id, shifts, employees);
    daysSummary[d.id] = summary;

    totalSlots += summary.slots.length;
    totalDeficientSlots += summary.deficiencyCount;

    if (summary.deficiencyCount > 0) {
      daysWithDeficiencies++;
    }

    // Extract individual gap descriptions
    summary.slots.forEach(slot => {
      if (slot.isDeficient) {
        let reason = '';
        if (slot.availableEmployees.length === 0) {
          reason = `Sin personal trabajando (se requiere ${slot.requiredCount})`;
        } else {
          reason = `Hay ${slot.availableEmployees.length} empleado. Se necesitan ${slot.requiredCount}.`;
        }

        criticalGaps.push({
          dayName: d.name,
          timeRange: slot.label,
          available: slot.availableEmployees.length,
          required: slot.requiredCount,
          reason,
        });
      }
    });
  });

  const coveredSlots = totalSlots - totalDeficientSlots;
  const coveragePercentage = totalSlots > 0 ? Math.round((coveredSlots / totalSlots) * 100) : 100;

  return {
    days: daysSummary,
    stats: {
      totalDeficiencies: totalDeficientSlots,
      daysWithDeficiencies,
      coveragePercentage,
      criticalGaps,
    },
  };
}
