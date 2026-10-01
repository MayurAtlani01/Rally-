export const activeAssignments = (shift) => (shift.assignments || []).filter(a => !['canceled', 'absent'].includes(a.status));

export function shiftWindow(shifts, lens, now = Date.now()) {
  const active = shifts.filter(s => new Date(s.startTime).getTime() <= now && new Date(s.endTime).getTime() > now);
  if (lens === 'now') return active;
  const future = shifts.filter(s => new Date(s.startTime).getTime() > now).sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  if (!future.length) return [];
  const nextStart = new Date(future[0].startTime).getTime();
  return future.filter(s => new Date(s.startTime).getTime() === nextStart);
}

export function zoneCoverage(zones, shifts, attendance, lens, now = Date.now()) {
  const windowShifts = shiftWindow(shifts, lens, now);
  return zones.map(zone => {
    const zoneShifts = windowShifts.filter(s => s.zoneId === zone.id);
    const ids = new Set(zoneShifts.map(s => s.id));
    const assigned = zoneShifts.reduce((n, s) => n + activeAssignments(s).length, 0);
    const checkedIn = new Set(attendance.filter(a => ids.has(a.shiftId) && a.checkInTime && !a.checkOutTime).map(a => a.volunteerId)).size;
    return { ...zone, windowShifts: zoneShifts, required: zoneShifts.reduce((n, s) => n + (s.requiredHeadcount || 0), 0), assigned, checkedIn };
  });
}

export function eventTime(value, timezone = 'UTC', options = {}) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone, ...options }).format(new Date(value));
}
