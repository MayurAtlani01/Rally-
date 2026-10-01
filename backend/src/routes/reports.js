import { Router } from 'express';
import { getRepo } from '../db/repo.js';
import { authMiddleware, requireRole } from '../authMiddleware.js';
import { ROLES, ASSIGNMENT_STATUSES } from '../../../shared/constants.js';

const router = Router();
router.use(authMiddleware);

router.get('/:id/report', requireRole(ROLES.ORGANIZER, ROLES.COORDINATOR), async (req, res) => {
  const eventId = req.params.id;
  const repo = getRepo();
  const ev = await repo.getEventById(eventId);
  if (!ev) return res.status(404).json({ error: 'Event not found' });

  const shifts = await repo.getShifts(eventId);
  const assignments = await repo.getAssignments(eventId);
  const attendance = await repo.getAttendance(eventId);
  const issues = await repo.getIssues(eventId);
  const zones = await repo.getZones(eventId);

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
    const zoneRequired = zoneShifts.reduce((acc, s) => acc + (s.requiredHeadcount || 1), 0);
    const zoneShiftIds = new Set(zoneShifts.map(s => s.id));
    const zoneAssigned = validActiveAssignments.filter(a => zoneShiftIds.has(a.shiftId)).length;
    const zoneCheckedIn = attendance.filter(att => zoneShiftIds.has(att.shiftId) && att.checkInTime).length;

    totalRequiredPositions += zoneRequired;
    if (zoneRequired > zoneAssigned) {
      unfilledPositions += (zoneRequired - zoneAssigned);
    }

    const fillRatePercent = zoneRequired > 0 ? Math.round((zoneAssigned / zoneRequired) * 100) : 100;

    return {
      zoneId: z.id,
      zoneName: z.name,
      requiredPositions: zoneRequired,
      assignedPositions: zoneAssigned,
      checkedInPositions: zoneCheckedIn,
      fillRatePercent
    };
  });

  const overallFillRate = totalRequiredPositions > 0
    ? Math.round(((totalRequiredPositions - unfilledPositions) / totalRequiredPositions) * 100)
    : 100;

  res.json({
    event: ev,
    generatedAt: new Date().toISOString(),
    metrics: {
      attendanceRatePercent: attendanceRate,
      overallFillRatePercent: overallFillRate,
      totalAssignedHours: Number(totalAssignedHours.toFixed(1)),
      totalAttendedHours: Number(totalAttendedHours.toFixed(1)),
      incompleteCheckoutsCount: incompleteRecordsCount,
      totalIssuesCount: issues.length,
      unresolvedIssuesCount: issues.filter(i => i.status !== 'resolved').length,
      urgentIssuesCount: issues.filter(i => i.severity === 'urgent').length,
      averageAcknowledgeMinutes: avgAckTimeMinutes,
      averageResolveMinutes: avgResolveTimeMinutes,
      totalRequiredPositions,
      unfilledPositions
    },
    zoneBreakdown
  });
});

router.get('/:id/report/csv', requireRole(ROLES.ORGANIZER), async (req, res) => {
  const eventId = req.params.id;
  const repo = getRepo();
  const ev = await repo.getEventById(eventId);
  if (!ev) return res.status(404).send('Event not found');

  const shifts = await repo.getShifts(eventId);
  const assignments = await repo.getAssignments(eventId);
  const attendance = await repo.getAttendance(eventId);
  const zones = await repo.getZones(eventId);
  const zonesMap = new Map(zones.map(z => [z.id, z]));

  const rows = [
    ['Shift Title', 'Zone', 'Volunteer ID', 'Assignment Status', 'Check-In', 'Check-Out', 'Attended Hours']
  ];

  for (const asgn of assignments) {
    const s = shifts.find(shift => shift.id === asgn.shiftId) || {};
    const z = s.zoneId ? zonesMap.get(s.zoneId) : null;
    const att = attendance.find(a => a.assignmentId === asgn.id);

    let hrs = '';
    if (att?.checkInTime && att?.checkOutTime) {
      hrs = ((new Date(att.checkOutTime) - new Date(att.checkInTime)) / (1000 * 60 * 60)).toFixed(2);
    }

    rows.push([
      `"${s.title || ''}"`,
      `"${z?.name || ''}"`,
      `"${asgn.volunteerId}"`,
      `"${asgn.status}"`,
      att?.checkInTime || '',
      att?.checkOutTime || '',
      hrs
    ]);
  }

  const csv = rows.map(r => r.join(',')).join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${ev.title.replace(/\s+/g, '_')}_Report.csv"`);
  res.send(csv);
});

export default router;
