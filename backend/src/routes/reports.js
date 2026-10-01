import { Router } from 'express';
import { store } from '../store.js';
import { authMiddleware } from '../authMiddleware.js';
import { ROLES, ASSIGNMENT_STATUSES, ISSUE_STATUSES } from '../../../shared/constants.js';

const router = Router();
router.use(authMiddleware);

router.get('/:id/report', (req, res) => {
  const eventId = req.params.id;
  const ev = store.getEventById(eventId);
  if (!ev) return res.status(404).json({ error: 'Event not found' });

  const shifts = store.getShifts(eventId);
  const assignments = store.getAssignments(eventId);
  const attendance = store.getAttendance(eventId);
  const issues = store.getIssues(eventId);
  const zones = store.getZones(eventId);

  // 1. Attendance calculations
  const validActiveAssignments = assignments.filter(
    a => a.status !== ASSIGNMENT_STATUSES.CANCELED && a.status !== ASSIGNMENT_STATUSES.ABSENT
  );

  const completedOrCheckedIn = validActiveAssignments.filter(
    a => a.status === ASSIGNMENT_STATUSES.CHECKED_IN || a.status === ASSIGNMENT_STATUSES.COMPLETED
  );

  const attendanceRate = validActiveAssignments.length > 0
    ? Math.round((completedOrCheckedIn.length / validActiveAssignments.length) * 100)
    : 0;

  // 2. Assigned vs Attended hours
  let totalAssignedHours = 0;
  for (const a of validActiveAssignments) {
    const s = shifts.find(shift => shift.id === a.shiftId);
    if (s) {
      totalAssignedHours += (new Date(s.endTime) - new Date(s.startTime)) / (1000 * 60 * 60);
    }
  }

  let totalAttendedHours = 0;
  let incompleteRecordsCount = 0;

  for (const att of attendance) {
    if (att.checkInTime && att.checkOutTime) {
      const hrs = (new Date(att.checkOutTime) - new Date(att.checkInTime)) / (1000 * 60 * 60);
      totalAttendedHours += hrs;
    } else if (att.checkInTime && !att.checkOutTime) {
      // In progress or missing checkout - honestly marked as incomplete, not invented
      incompleteRecordsCount++;
    }
  }

  // 3. Issue response metrics
  let totalAckTimeMinutes = 0;
  let ackCount = 0;
  let totalResolveTimeMinutes = 0;
  let resolveCount = 0;

  for (const iss of issues) {
    if (iss.acknowledgedAt) {
      const ackDiff = (new Date(iss.acknowledgedAt) - new Date(iss.createdAt)) / (1000 * 60);
      totalAckTimeMinutes += Math.max(0, ackDiff);
      ackCount++;
    }
    if (iss.resolvedAt) {
      const resDiff = (new Date(iss.resolvedAt) - new Date(iss.createdAt)) / (1000 * 60);
      totalResolveTimeMinutes += Math.max(0, resDiff);
      resolveCount++;
    }
  }

  const avgAckTimeMinutes = ackCount > 0 ? Math.round(totalAckTimeMinutes / ackCount) : null;
  const avgResolveTimeMinutes = resolveCount > 0 ? Math.round(totalResolveTimeMinutes / resolveCount) : null;

  // 4. Staffing gaps & unfilled shifts
  let totalRequiredPositions = 0;
  let unfilledPositions = 0;
  const zoneBreakdown = zones.map(z => {
    const zoneShifts = shifts.filter(s => s.zoneId === z.id);
    const required = zoneShifts.reduce((acc, s) => acc + s.requiredHeadcount, 0) || z.requiredHeadcount;
    const filled = assignments.filter(
      a => zoneShifts.some(s => s.id === a.shiftId) &&
      a.status !== ASSIGNMENT_STATUSES.CANCELED &&
      a.status !== ASSIGNMENT_STATUSES.ABSENT
    ).length;

    totalRequiredPositions += required;
    unfilledPositions += Math.max(0, required - filled);

    return {
      zoneId: z.id,
      zoneName: z.name,
      color: z.color,
      requiredPositions: required,
      filledPositions: filled,
      fillRate: required > 0 ? Math.round((filled / required) * 100) : 100
    };
  });

  res.json({
    event: {
      id: ev.id,
      title: ev.title,
      venueName: ev.venueName,
      startDate: ev.startDate,
      endDate: ev.endDate
    },
    metrics: {
      totalVolunteersRegistered: store.getMemberships(eventId).filter(m => m.role === ROLES.VOLUNTEER).length,
      totalAssignments: validActiveAssignments.length,
      completedOrCheckedInCount: completedOrCheckedIn.length,
      attendanceRatePercent: attendanceRate,
      totalAssignedHours: Number(totalAssignedHours.toFixed(1)),
      totalAttendedHours: Number(totalAttendedHours.toFixed(1)),
      incompleteAttendanceRecords: incompleteRecordsCount,
      totalRequiredPositions,
      unfilledPositions,
      totalIssuesReported: issues.length,
      resolvedIssuesCount: issues.filter(i => i.status === ISSUE_STATUSES.RESOLVED).length,
      avgAckTimeMinutes,
      avgResolveTimeMinutes
    },
    zoneBreakdown
  });
});

// CSV Export
router.get('/:id/report/csv', (req, res) => {
  const eventId = req.params.id;
  const ev = store.getEventById(eventId);
  if (!ev) return res.status(404).json({ error: 'Event not found' });

  const shifts = store.getShifts(eventId);
  const assignments = store.getAssignments(eventId);
  const attendance = store.getAttendance(eventId);
  const zones = store.getZones(eventId);
  const zonesMap = new Map(zones.map(z => [z.id, z]));
  const profilesMap = new Map(store.getProfiles().map(p => [p.id, p]));
  const shiftsMap = new Map(shifts.map(s => [s.id, s]));

  // Build CSV rows for all assignments and attendance
  const headers = [
    'Assignment ID',
    'Volunteer Name',
    'Volunteer Email',
    'Zone',
    'Shift Title',
    'Role',
    'Shift Start',
    'Shift End',
    'Assignment Status',
    'Check-in Time',
    'Check-out Time',
    'Hours Attended',
    'Verification Method'
  ];

  const rows = [headers.join(',')];

  for (const asgn of assignments) {
    const prof = profilesMap.get(asgn.volunteerId) || {};
    const shift = shiftsMap.get(asgn.shiftId) || {};
    const zone = shift.zoneId ? zonesMap.get(shift.zoneId) : {};
    const att = attendance.find(a => a.assignmentId === asgn.id);

    let hrs = '';
    if (att && att.checkInTime && att.checkOutTime) {
      hrs = ((new Date(att.checkOutTime) - new Date(att.checkInTime)) / (1000 * 60 * 60)).toFixed(2);
    }

    const row = [
      `"${asgn.id}"`,
      `"${(prof.fullName || '').replace(/"/g, '""')}"`,
      `"${(prof.email || '').replace(/"/g, '""')}"`,
      `"${(zone.name || '').replace(/"/g, '""')}"`,
      `"${(shift.title || '').replace(/"/g, '""')}"`,
      `"${(shift.roleName || '').replace(/"/g, '""')}"`,
      `"${shift.startTime || ''}"`,
      `"${shift.endTime || ''}"`,
      `"${asgn.status}"`,
      `"${att?.checkInTime || ''}"`,
      `"${att?.checkOutTime || ''}"`,
      `"${hrs}"`,
      `"${att?.method || ''}"`
    ];

    rows.push(row.join(','));
  }

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="rally-${ev.inviteCode}-report.csv"`);
  res.send(rows.join('\r\n'));
});

export default router;
