import { Router } from 'express';
import { store } from '../store.js';
import { authMiddleware, requireRole } from '../authMiddleware.js';
import { ROLES, ASSIGNMENT_STATUSES } from '../../../shared/constants.js';
import { rankEligibleCandidates, previewReassignmentImpact } from '../../../shared/matching.js';

const router = Router();
router.use(authMiddleware);

// Get all shifts for event (optional ?zoneId=)
router.get('/:id/shifts', (req, res) => {
  const eventId = req.params.id;
  const { zoneId } = req.query;

  const shifts = store.getShifts(eventId, zoneId);
  const assignments = store.getAssignments(eventId);
  const zones = store.getZones(eventId);
  const zonesMap = new Map(zones.map(z => [z.id, z]));
  const profilesMap = new Map(store.getProfiles().map(p => [p.id, p]));

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
      const p = profilesMap.get(a.volunteerId) || { fullName: 'Unknown', email: '' };
      return {
        ...a,
        volunteerName: p.fullName,
        volunteerEmail: p.email,
        volunteerAvatar: p.avatarUrl
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
router.post('/:id/shifts', requireRole(ROLES.ORGANIZER), (req, res) => {
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

  const shift = store.createShift({
    eventId,
    zoneId,
    title,
    roleName: roleName || 'Volunteer',
    startTime,
    endTime,
    requiredHeadcount: Number(requiredHeadcount) || 1,
    requiredSkills: requiredSkills || [],
    preferredSkills: preferredSkills || [],
    notes
  });

  res.status(201).json({ shift });
});

// Candidate Matching & Ranking for a Shift
router.get('/:id/shifts/:shiftId/candidates', (req, res) => {
  const eventId = req.params.id;
  const shift = store.getShiftById(req.params.shiftId);
  if (!shift || shift.eventId !== eventId) {
    return res.status(404).json({ error: 'Shift not found.' });
  }

  const event = store.getEventById(eventId);
  const allVolunteers = store.getVolunteerDetails(eventId);
  const allShifts = store.getShifts(eventId);
  const allAssignments = store.getAssignments(eventId);

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
router.post('/:id/shifts/:shiftId/assign', requireRole(ROLES.ORGANIZER, ROLES.COORDINATOR), (req, res) => {
  const eventId = req.params.id;
  const shiftId = req.params.shiftId;
  const { volunteerId } = req.body;

  if (!volunteerId) {
    return res.status(400).json({ error: 'volunteerId is required.' });
  }

  try {
    const assignment = store.assignVolunteer({
      eventId,
      shiftId,
      volunteerId,
      assignedBy: req.user.id
    });
    res.status(201).json({ success: true, assignment });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Cancel Assignment (Volunteer self-cancellation or Coordinator override)
router.post('/:id/assignments/:assignmentId/cancel', (req, res) => {
  const eventId = req.params.id;
  const asgn = store.getAssignmentById(req.params.assignmentId);

  if (!asgn || asgn.eventId !== eventId) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }

  // Permission: Volunteer can cancel their own assignment, or Organizer/Coordinator can cancel
  const isOwner = asgn.volunteerId === req.user.id;
  const isPrivileged = req.isOrganizer() || req.isCoordinator();

  if (!isOwner && !isPrivileged) {
    return res.status(403).json({ error: 'You are not authorized to cancel this assignment.' });
  }

  const { reason = isOwner ? 'Volunteer cannot attend' : 'Coordinator adjustment' } = req.body;

  try {
    const canceled = store.cancelAssignment(asgn.id, reason, req.user.id);
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
router.post('/:id/assignments/:assignmentId/absent', requireRole(ROLES.ORGANIZER, ROLES.COORDINATOR), (req, res) => {
  const eventId = req.params.id;
  const asgn = store.getAssignmentById(req.params.assignmentId);

  if (!asgn || asgn.eventId !== eventId) {
    return res.status(404).json({ error: 'Assignment not found.' });
  }

  // If coordinator (not organizer), check zone scope
  if (req.isCoordinator() && !req.isOrganizer()) {
    const shift = store.getShiftById(asgn.shiftId);
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
    const updated = store.markAbsent(asgn.id, reason, req.user.id);
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
router.post('/:id/shifts/reassign-preview', requireRole(ROLES.ORGANIZER, ROLES.COORDINATOR), (req, res) => {
  const eventId = req.params.id;
  const { volunteerId, sourceShiftId, targetShiftId } = req.body;

  if (!volunteerId || !sourceShiftId || !targetShiftId) {
    return res.status(400).json({ error: 'volunteerId, sourceShiftId, and targetShiftId are required.' });
  }

  const sourceShift = store.getShiftById(sourceShiftId);
  const targetShift = store.getShiftById(targetShiftId);

  if (!sourceShift || !targetShift) {
    return res.status(404).json({ error: 'Source or target shift not found.' });
  }

  const volunteer = store.getVolunteerDetails(eventId).find(v => v.id === volunteerId);
  if (!volunteer) {
    return res.status(404).json({ error: 'Volunteer not found.' });
  }

  const preview = previewReassignmentImpact({
    volunteer,
    sourceShift,
    targetShift,
    allShifts: store.getShifts(eventId),
    allAssignments: store.getAssignments(eventId),
    allZones: store.getZones(eventId),
    maxHoursPerVolunteer: store.getEventById(eventId)?.maxHoursPerVolunteer
  });

  res.json({ preview });
});

// Atomic Reassignment: execute move atomically
router.post('/:id/shifts/reassign-atomic', requireRole(ROLES.ORGANIZER, ROLES.COORDINATOR), (req, res) => {
  const eventId = req.params.id;
  const { volunteerId, sourceShiftId, targetShiftId } = req.body;

  if (!volunteerId || !sourceShiftId || !targetShiftId) {
    return res.status(400).json({ error: 'volunteerId, sourceShiftId, and targetShiftId are required.' });
  }

  try {
    const result = store.reassignVolunteerAtomic({
      eventId,
      volunteerId,
      sourceShiftId,
      targetShiftId,
      assignedBy: req.user.id
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
