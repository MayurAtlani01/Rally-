import { Router } from 'express';
import { getRepo } from '../db/repo.js';
import { authMiddleware, requireRole } from '../authMiddleware.js';
import { ROLES } from '../../../shared/constants.js';

const router = Router();
router.use(authMiddleware);

// Get attendance records for event
router.get('/:id/attendance', async (req, res) => {
  const eventId = req.params.id;
  const { shiftId } = req.query;
  const repo = getRepo();

  // Role scoping: Volunteers can ONLY view their own attendance records
  let volunteerId = req.query.volunteerId || null;
  if (req.isVolunteer()) {
    volunteerId = req.user.id;
  }

  const records = await repo.getAttendance(eventId, shiftId, volunteerId);

  const shifts = await repo.getShifts(eventId);
  const shiftsMap = new Map(shifts.map(s => [s.id, s]));
  const zones = await repo.getZones(eventId);
  const zonesMap = new Map(zones.map(z => [z.id, z]));

  const enriched = [];
  for (const r of records) {
    const p = await repo.getProfileById(r.volunteerId);
    const s = shiftsMap.get(r.shiftId) || { title: 'Scheduled Shift', zoneId: null };
    const z = s.zoneId ? zonesMap.get(s.zoneId) : null;
    const verifier = r.verifiedBy ? await repo.getProfileById(r.verifiedBy) : null;

    let attendedHours = null;
    if (r.checkInTime && r.checkOutTime) {
      attendedHours = (new Date(r.checkOutTime) - new Date(r.checkInTime)) / (1000 * 60 * 60);
    }

    enriched.push({
      ...r,
      volunteerName: p?.fullName || 'Volunteer',
      volunteerEmail: p?.email || '',
      volunteerAvatar: p?.avatarUrl || '',
      shiftTitle: s.title,
      zoneName: z ? z.name : 'All Event',
      verifiedByName: verifier ? verifier.fullName : null,
      attendedHours: attendedHours ? Number(attendedHours.toFixed(2)) : null
    });
  }

  res.json({ attendance: enriched });
});

// Self Check-in or Coordinator Check-in
router.post('/:id/attendance/check-in', async (req, res) => {
  const eventId = req.params.id;
  const { assignmentId, method = 'self', notes = '' } = req.body;

  if (!assignmentId) {
    return res.status(400).json({ error: 'assignmentId is required.' });
  }

  const repo = getRepo();
  const asgn = await repo.getAssignmentById(assignmentId);
  if (!asgn || asgn.eventId !== eventId) {
    return res.status(404).json({ error: 'Assignment not found in this event.' });
  }

  const isOwner = asgn.volunteerId === req.user.id;
  const isOrganizer = req.isOrganizer();
  const isCoordinator = req.isCoordinator();

  if (!isOwner && !isOrganizer && !isCoordinator) {
    return res.status(403).json({ error: 'Cannot check in for another volunteer without coordinator role.' });
  }

  const shift = await repo.getShiftById(asgn.shiftId);
  if (!shift) {
    return res.status(404).json({ error: 'Shift not found.' });
  }

  // Coordinator zone scope check
  if (isCoordinator && !isOrganizer && !isOwner) {
    const assignedZones = req.membership?.assignedZones || [];
    if (!assignedZones.includes(shift.zoneId)) {
      return res.status(403).json({
        error: 'Forbidden: You can only mark attendance for your assigned zones.',
        code: 'ZONE_SCOPE_DENIED'
      });
    }
  }

  // Check-in window validation: opens 30 minutes before shift start and closes at shift end
  const now = Date.now();
  const shiftStart = new Date(shift.startTime).getTime();
  const shiftEnd = new Date(shift.endTime).getTime();
  const windowStart = shiftStart - (30 * 60 * 1000);

  if (now < windowStart) {
    return res.status(400).json({
      error: 'Check-in window is not open yet. Check-in opens 30 minutes prior to shift start.',
      code: 'CHECK_IN_WINDOW_NOT_OPEN'
    });
  }

  if (now > shiftEnd) {
    return res.status(400).json({
      error: 'Shift has already concluded. Check-in closed at shift end time.',
      code: 'SHIFT_ALREADY_ENDED'
    });
  }

  try {
    const record = await repo.recordCheckInAtomic({
      eventId,
      assignmentId,
      volunteerId: asgn.volunteerId,
      method: (isOrganizer || isCoordinator) && !isOwner ? 'coordinator' : method,
      verifiedBy: (isOrganizer || isCoordinator) && !isOwner ? req.user.id : null,
      notes
    });

    res.status(201).json({ success: true, attendance: record });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Check-out
router.post('/:id/attendance/check-out', async (req, res) => {
  const { attendanceId, notes = '' } = req.body;
  if (!attendanceId) {
    return res.status(400).json({ error: 'attendanceId is required.' });
  }

  const repo = getRepo();
  const attendanceList = await repo.getAttendance(req.params.id);
  const record = attendanceList.find(a => a.id === attendanceId);

  if (!record || record.eventId !== req.params.id) {
    return res.status(404).json({ error: 'Attendance record not found in this event.' });
  }

  const isOwner = record.volunteerId === req.user.id;
  const isOrganizer = req.isOrganizer();
  const isCoordinator = req.isCoordinator();

  if (!isOwner && !isOrganizer && !isCoordinator) {
    return res.status(403).json({ error: 'Cannot check out for another volunteer.' });
  }

  // Coordinator zone scope check
  if (isCoordinator && !isOrganizer && !isOwner) {
    const shift = await repo.getShiftById(record.shiftId);
    const assignedZones = req.membership?.assignedZones || [];
    if (shift && !assignedZones.includes(shift.zoneId)) {
      return res.status(403).json({
        error: 'Forbidden: You can only mark checkout for your assigned zones.',
        code: 'ZONE_SCOPE_DENIED'
      });
    }
  }

  try {
    const updated = await repo.recordCheckOutAtomic({
      eventId: req.params.id,
      attendanceId,
      verifiedBy: (isOrganizer || isCoordinator) && !isOwner ? req.user.id : null,
      notes
    });

    res.json({ success: true, attendance: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Generate Time-Limited QR Check-In Token (for Coordinator or Shift Lead)
router.post('/:id/attendance/qr-token', requireRole(ROLES.ORGANIZER, ROLES.COORDINATOR), async (req, res) => {
  const eventId = req.params.id;
  const { shiftId } = req.body;

  if (!shiftId) {
    return res.status(400).json({ error: 'shiftId is required.' });
  }

  const repo = getRepo();
  const shift = await repo.getShiftById(shiftId);
  if (!shift || shift.eventId !== eventId) {
    return res.status(404).json({ error: 'Shift not found in this event.' });
  }

  // Coordinator zone check
  if (req.isCoordinator() && !req.isOrganizer()) {
    const assignedZones = req.membership?.assignedZones || [];
    if (!assignedZones.includes(shift.zoneId)) {
      return res.status(403).json({
        error: 'Forbidden: Coordinators can only issue QR tokens for their assigned zones.',
        code: 'ZONE_SCOPE_DENIED'
      });
    }
  }

  const tokenData = await repo.createQrToken({
    eventId,
    shiftId,
    createdBy: req.user.id
  });

  res.json({
    token: tokenData.token,
    shiftId,
    shiftTitle: shift.title,
    expiresAt: tokenData.expiresAt,
    validitySeconds: tokenData.validitySeconds
  });
});

// Scan / Redeem QR Token (Volunteer scanning coordinator's screen)
router.post('/:id/attendance/qr-scan', async (req, res) => {
  const eventId = req.params.id;
  const { token, assignmentId } = req.body;

  if (!token || !assignmentId) {
    return res.status(400).json({ error: 'token and assignmentId are required.' });
  }

  const repo = getRepo();
  const tokenData = await repo.getQrToken(token);
  if (!tokenData) {
    return res.status(400).json({ error: 'Invalid or expired QR check-in token.' });
  }

  if (tokenData.eventId !== eventId) {
    return res.status(400).json({ error: 'Token event mismatch.' });
  }

  const asgn = await repo.getAssignmentById(assignmentId);
  if (!asgn || asgn.volunteerId !== req.user.id) {
    return res.status(403).json({ error: 'You are not assigned to this shift.' });
  }

  if (asgn.shiftId !== tokenData.shiftId) {
    return res.status(400).json({ error: 'This QR code is for a different shift.' });
  }

  const shift = await repo.getShiftById(asgn.shiftId);
  const now = Date.now();
  const shiftStart = new Date(shift.startTime).getTime();
  const shiftEnd = new Date(shift.endTime).getTime();
  const windowStart = shiftStart - (30 * 60 * 1000);

  if (now < windowStart || now > shiftEnd) {
    return res.status(400).json({
      error: 'Check-in window is not active for this shift.',
      code: 'CHECK_IN_WINDOW_INACTIVE'
    });
  }

  try {
    const record = await repo.recordCheckInAtomic({
      eventId,
      assignmentId,
      volunteerId: req.user.id,
      method: 'qr',
      verifiedBy: tokenData.createdBy,
      notes: 'Verified via dynamic QR code token.'
    });

    res.json({
      success: true,
      message: 'QR check-in validated successfully!',
      attendance: record
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
