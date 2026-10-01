import { Router } from 'express';
import { getRepo } from '../db/repo.js';
import { authMiddleware, requireRole } from '../authMiddleware.js';
import { ROLES, ASSIGNMENT_STATUSES } from '../../../shared/constants.js';
import { rankEligibleCandidates, previewReassignmentImpact } from '../../../shared/matching.js';

const router = Router();
router.use(authMiddleware);

// Get all shifts for event (optional ?zoneId=)
router.get('/:id/shifts', async (req, res) => {
  const eventId = req.params.id;
  const { zoneId } = req.query;

  const repo = getRepo();
  const shifts = await repo.getShifts(eventId, zoneId);
  const assignments = await repo.getAssignments(eventId);
  const zones = await repo.getZones(eventId);
  const zonesMap = new Map(zones.map(z => [z.id, z]));
  const volunteers = await repo.getVolunteerDetails(eventId);
  const volMap = new Map(volunteers.map(v => [v.id, v]));

  const enriched = shifts.map(shift => {
    const shiftAssignments = assignments.filter(
      a => a.shiftId === shift.id &&
      a.status !== ASSIGNMENT_STATUSES.CANCELED &&
      a.status !== ASSIGNMENT_STATUSES.ABSENT
    );

    const canceledAssignments = assignments.filter(
      a => a.shiftId === shift.id && a.status === ASSIGNMENT_STATUSES.CANCELED
    );

    const enrichedAssignments = shiftAssignments.map(a => {
      const v = volMap.get(a.volunteerId) || { name: 'Unknown', email: '' };
      return {
        ...a,
        volunteerName: v.name,
        volunteerEmail: v.email,
        volunteerAvatar: v.avatarUrl
      };
    });

    const isUnderstaffed = shiftAssignments.length < shift.requiredHeadcount;
    const isCritical = shiftAssignments.length === 0 && shift.requiredHeadcount > 0;

    return {
      ...shift,
      zone: zonesMap.get(shift.zoneId) || null,
      assignedCount: shiftAssignments.length,
      canceledCount: canceledAssignments.length,
      isUnderstaffed,
      isCritical,
      assignments: enrichedAssignments
    };
  });

  res.json({ shifts: enriched });
});

// Create new shift (Organizer only)
router.post('/:id/shifts', requireRole(ROLES.ORGANIZER), async (req, res) => {
  const eventId = req.params.id;
  const {
    zoneId,
    title,
    roleName,
    startTime,
    endTime,
    requiredHeadcount,
    requiredSkills,
    preferredSkills,
    notes
  } = req.body;

  if (!zoneId || !title || !startTime || !endTime) {
    return res.status(400).json({ error: 'Zone, title, start time, and end time are required.' });
  }

  const sTime = new Date(startTime).getTime();
  const eTime = new Date(endTime).getTime();
  if (isNaN(sTime) || isNaN(eTime) || sTime >= eTime) {
    return res.status(400).json({ error: 'Start time must be strictly before end time.' });
  }

  const repo = getRepo();
  const ev = await repo.getEventById(eventId);
  if (!ev) return res.status(404).json({ error: 'Event not found.' });

  if (ev.status === 'closed') {
    return res.status(400).json({ error: 'Cannot add shifts: Event is closed.' });
  }

  // Validate zone belongs to event
  const zone = await repo.getZoneById(zoneId);
  if (!zone || zone.eventId !== eventId) {
    return res.status(400).json({ error: 'Zone does not exist in this event.' });
  }

  // Shift bounds validation within event dates
  const evStart = new Date(ev.startDate).getTime();
  const evEnd = new Date(ev.endDate).getTime();
  if (sTime < evStart || eTime > evEnd) {
    return res.status(400).json({
      error: `Shift time window (${startTime} - ${endTime}) must fall within event dates (${ev.startDate} - ${ev.endDate}).`
    });
  }

  const shift = await repo.createShift({
    eventId,
    zoneId,
    title,
    roleName: roleName || 'Volunteer',
    startTime,
    endTime,
    requiredHeadcount: Math.max(1, parseInt(requiredHeadcount, 10) || 1),
    requiredSkills: requiredSkills || [],
    preferredSkills: preferredSkills || [],
    notes: notes || ''
  });

  res.status(201).json({ shift });
});

// Candidate Matching & Ranking for a Shift
router.get('/:id/shifts/:shiftId/candidates', async (req, res) => {
  const eventId = req.params.id;
  const repo = getRepo();
  const shift = await repo.getShiftById(req.params.shiftId);
  if (!shift || shift.eventId !== eventId) {
    return res.status(404).json({ error: 'Shift not found in this event.' });
  }

  const event = await repo.getEventById(eventId);
  const allVolunteers = await repo.getVolunteerDetails(eventId);
  const allShifts = await repo.getShifts(eventId);
  const allAssignments = await repo.getAssignments(eventId);

  const rankedResult = rankEligibleCandidates(allVolunteers, shift, {
    allShifts,
    allAssignments,
    maxHoursPerVolunteer: event?.maxHoursPerVolunteer || null
  });

  res.json({
    shift,
    ...rankedResult
  });
});

// Assign Volunteer to Shift
router.post('/:id/shifts/:shiftId/assign', requireRole(ROLES.ORGANIZER, ROLES.COORDINATOR), async (req, res) => {
  const eventId = req.params.id;
  const shiftId = req.params.shiftId;
  const { volunteerId } = req.body;

  if (!volunteerId) {
    return res.status(400).json({ error: 'volunteerId is required.' });
  }

  const repo = getRepo();
  const shift = await repo.getShiftById(shiftId);
  if (!shift || shift.eventId !== eventId) {
    return res.status(404).json({ error: 'Shift not found in this event.' });
  }

  // Zone scope enforcement for coordinator
  if (req.isCoordinator() && !req.isOrganizer()) {
    const assignedZones = req.membership?.assignedZones || [];
    if (!assignedZones.includes(shift.zoneId)) {
      return res.status(403).json({
        error: 'Forbidden: Coordinators can only assign volunteers to their assigned zones.',
        code: 'ZONE_SCOPE_DENIED'
      });
    }
  }

  try {
    const assignment = await repo.assignVolunteerAtomic({
      eventId,
      shiftId,
      volunteerId,
      assignedBy: req.user.id
    });
    res.status(201).json({ success: true, assignment });
  } catch (err) {
    const statusCode = err.code === 'CAPACITY_EXCEEDED' || err.code === 'DUPLICATE_ASSIGNMENT' || err.code === 'OVERLAPPING_SHIFT' ? 409 : 400;
    res.status(statusCode).json({ error: err.message, code: err.code });
  }
});

// Cancel Assignment (Volunteer self-cancellation or Coordinator/Organizer override)
router.post('/:id/assignments/:assignmentId/cancel', async (req, res) => {
  const eventId = req.params.id;
  const repo = getRepo();
  const asgn = await repo.getAssignmentById(req.params.assignmentId);

  if (!asgn || asgn.eventId !== eventId) {
    return res.status(404).json({ error: 'Assignment not found in this event.' });
  }

  const isOwner = asgn.volunteerId === req.user.id;
  const isOrganizer = req.isOrganizer();
  const isCoordinator = req.isCoordinator();

  if (!isOwner && !isOrganizer && !isCoordinator) {
    return res.status(403).json({ error: 'You are not authorized to cancel this assignment.' });
  }

  // Coordinator zone scope check
  if (isCoordinator && !isOrganizer && !isOwner) {
    const shift = await repo.getShiftById(asgn.shiftId);
    const assignedZones = req.membership?.assignedZones || [];
    if (shift && !assignedZones.includes(shift.zoneId)) {
      return res.status(403).json({
        error: 'Forbidden: Coordinators can only cancel assignments within their assigned zones.',
        code: 'ZONE_SCOPE_DENIED'
      });
    }
  }

  const { reason = isOwner ? 'Volunteer cannot attend' : 'Coordinator adjustment' } = req.body;

  try {
    const canceled = await repo.cancelAssignment(asgn.id, reason, req.user.id);
    res.json({
      success: true,
      message: 'Assignment canceled. Staffing gap alerted to coordinators.',
      assignment: canceled
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Mark Absent (Coordinator or Organizer)
router.post('/:id/assignments/:assignmentId/absent', requireRole(ROLES.ORGANIZER, ROLES.COORDINATOR), async (req, res) => {
  const eventId = req.params.id;
  const repo = getRepo();
  const asgn = await repo.getAssignmentById(req.params.assignmentId);

  if (!asgn || asgn.eventId !== eventId) {
    return res.status(404).json({ error: 'Assignment not found in this event.' });
  }

  // If coordinator (not organizer), check zone scope
  if (req.isCoordinator() && !req.isOrganizer()) {
    const shift = await repo.getShiftById(asgn.shiftId);
    const assignedZones = req.membership?.assignedZones || [];
    if (shift && !assignedZones.includes(shift.zoneId)) {
      return res.status(403).json({
        error: 'Forbidden: You can only mark absence for your assigned zones.',
        code: 'ZONE_SCOPE_DENIED'
      });
    }
  }

  const { reason = 'Volunteer marked absent by coordinator' } = req.body;

  try {
    const updated = await repo.markAbsent(asgn.id, reason, req.user.id);
    res.json({
      success: true,
      message: 'Volunteer marked absent. Staffing gap alerted to organizers.',
      assignment: updated
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Reassignment Preview: evaluate impact before committing
router.post('/:id/shifts/reassign-preview', requireRole(ROLES.ORGANIZER, ROLES.COORDINATOR), async (req, res) => {
  const eventId = req.params.id;
  const { volunteerId, sourceShiftId, targetShiftId } = req.body;

  if (!volunteerId || !sourceShiftId || !targetShiftId) {
    return res.status(400).json({ error: 'volunteerId, sourceShiftId, and targetShiftId are required.' });
  }

  const repo = getRepo();
  const sourceShift = await repo.getShiftById(sourceShiftId);
  const targetShift = await repo.getShiftById(targetShiftId);

  if (!sourceShift || !targetShift || sourceShift.eventId !== eventId || targetShift.eventId !== eventId) {
    return res.status(404).json({ error: 'Source or target shift not found in this event.' });
  }

  const volunteers = await repo.getVolunteerDetails(eventId);
  const volunteer = volunteers.find(v => v.id === volunteerId);
  if (!volunteer) {
    return res.status(404).json({ error: 'Volunteer not found.' });
  }

  const event = await repo.getEventById(eventId);
  const preview = previewReassignmentImpact({
    volunteer,
    sourceShift,
    targetShift,
    allShifts: await repo.getShifts(eventId),
    allAssignments: await repo.getAssignments(eventId),
    allZones: await repo.getZones(eventId),
    maxHoursPerVolunteer: event?.maxHoursPerVolunteer || null
  });

  res.json({ preview });
});

// Atomic Reassignment: execute move atomically
router.post('/:id/shifts/reassign-atomic', requireRole(ROLES.ORGANIZER, ROLES.COORDINATOR), async (req, res) => {
  const eventId = req.params.id;
  const { volunteerId, sourceShiftId, targetShiftId } = req.body;

  if (!volunteerId || !sourceShiftId || !targetShiftId) {
    return res.status(400).json({ error: 'volunteerId, sourceShiftId, and targetShiftId are required.' });
  }

  const repo = getRepo();
  const sourceShift = await repo.getShiftById(sourceShiftId);
  const targetShift = await repo.getShiftById(targetShiftId);
  if (!sourceShift || !targetShift || sourceShift.eventId !== eventId || targetShift.eventId !== eventId) {
    return res.status(404).json({ error: 'Source or target shift not found in this event.' });
  }

  // If coordinator: verify zone scope for at least one of the shifts
  if (req.isCoordinator() && !req.isOrganizer()) {
    const assignedZones = req.membership?.assignedZones || [];
    if (!assignedZones.includes(sourceShift.zoneId) && !assignedZones.includes(targetShift.zoneId)) {
      return res.status(403).json({
        error: 'Forbidden: Coordinators can only reassign volunteers to/from their assigned zones.',
        code: 'ZONE_SCOPE_DENIED'
      });
    }
  }

  try {
    const result = await repo.reassignVolunteerAtomic({
      eventId,
      sourceShiftId,
      targetShiftId,
      volunteerId,
      assignedBy: req.user.id
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
