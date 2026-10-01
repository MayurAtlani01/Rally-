import { Router } from 'express';
import crypto from 'node:crypto';
import { store } from '../store.js';
import { authMiddleware, requireRole } from '../authMiddleware.js';
import { ROLES, ASSIGNMENT_STATUSES } from '../../../shared/constants.js';

const router = Router();
router.use(authMiddleware);

// Store active QR tokens in memory: token -> { eventId, shiftId, expiresAt }
const qrTokens = new Map();

// Get attendance records for event
router.get('/:id/attendance', (req, res) => {
  const eventId = req.params.id;
  const { shiftId, volunteerId } = req.query;

  const records = store.getAttendance(eventId, shiftId, volunteerId);
  const profilesMap = new Map(store.getProfiles().map(p => [p.id, p]));
  const shiftsMap = new Map(store.getShifts(eventId).map(s => [s.id, s]));
  const zonesMap = new Map(store.getZones(eventId).map(z => [z.id, z]));

  const enriched = records.map(r => {
    const p = profilesMap.get(r.volunteerId) || { fullName: 'Unknown', email: '' };
    const s = shiftsMap.get(r.shiftId) || { title: 'Unknown Shift', zoneId: null };
    const z = s.zoneId ? zonesMap.get(s.zoneId) : null;
    const verifier = r.verifiedBy ? profilesMap.get(r.verifiedBy) : null;

    let attendedHours = null;
    if (r.checkInTime && r.checkOutTime) {
      attendedHours = (new Date(r.checkOutTime) - new Date(r.checkInTime)) / (1000 * 60 * 60);
    }

    return {
      ...r,
      volunteerName: p.fullName,
      volunteerEmail: p.email,
      volunteerAvatar: p.avatarUrl,
      shiftTitle: s.title,
      zoneName: z ? z.name : 'Unknown Zone',
      verifiedByName: verifier ? verifier.fullName : null,
      attendedHours: attendedHours ? Number(attendedHours.toFixed(2)) : null
    };
  });

  res.json({ attendance: enriched });
});

// Self Check-in or Coordinator Check-in
router.post('/:id/attendance/check-in', (req, res) => {
  const eventId = req.params.id;
  const { assignmentId, method = 'self', notes = '' } = req.body;

  if (!assignmentId) {
    return res.status(400).json({ error: 'assignmentId is required.' });
  }

  const asgn = store.getAssignmentById(assignmentId);
  if (!asgn || asgn.eventId !== eventId) {
    return res.status(404).json({ error: 'Assignment not found in this event.' });
  }

  // Permission check: Volunteer can check in for self; Coordinator/Organizer can check in anyone
  const isOwner = asgn.volunteerId === req.user.id;
  const isPrivileged = req.isOrganizer() || req.isCoordinator();

  if (!isOwner && !isPrivileged) {
    return res.status(403).json({ error: 'Cannot check in for another volunteer without coordinator role.' });
  }

  // Coordinator zone scope check
  if (req.isCoordinator() && !req.isOrganizer() && !isOwner) {
    const shift = store.getShiftById(asgn.shiftId);
    const assignedZones = req.membership?.assignedZones || [];
    if (shift && !assignedZones.includes(shift.zoneId)) {
      return res.status(403).json({
        error: 'Forbidden: You can only mark attendance for your assigned zones.',
        code: 'ZONE_SCOPE_DENIED'
      });
    }
  }

  try {
    const record = store.recordCheckIn({
      eventId,
      assignmentId,
      volunteerId: asgn.volunteerId,
      shiftId: asgn.shiftId,
      method: isPrivileged && !isOwner ? 'coordinator' : method,
      verifiedBy: isPrivileged && !isOwner ? req.user.id : null,
      notes
    });

    res.status(201).json({ success: true, attendance: record });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Check-out
router.post('/:id/attendance/check-out', (req, res) => {
  const { attendanceId, notes = '' } = req.body;
  if (!attendanceId) {
    return res.status(400).json({ error: 'attendanceId is required.' });
  }

  const record = store.data.attendance.find(a => a.id === attendanceId);
  if (!record || record.eventId !== req.params.id) {
    return res.status(404).json({ error: 'Attendance record not found.' });
  }

  const isOwner = record.volunteerId === req.user.id;
  const isPrivileged = req.isOrganizer() || req.isCoordinator();

  if (!isOwner && !isPrivileged) {
    return res.status(403).json({ error: 'Cannot check out for another volunteer.' });
  }

  // Coordinator zone scope check
  if (req.isCoordinator() && !req.isOrganizer() && !isOwner) {
    const shift = store.getShiftById(record.shiftId);
    const assignedZones = req.membership?.assignedZones || [];
    if (shift && !assignedZones.includes(shift.zoneId)) {
      return res.status(403).json({
        error: 'Forbidden: You can only mark checkout for your assigned zones.',
        code: 'ZONE_SCOPE_DENIED'
      });
    }
  }

  try {
    const updated = store.recordCheckOut({
      attendanceId,
      verifiedBy: isPrivileged && !isOwner ? req.user.id : null,
      notes
    });

    res.json({ success: true, attendance: updated });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Generate Time-Limited QR Check-In Token (for Coordinator or Shift Lead)
router.post('/:id/attendance/qr-token', requireRole(ROLES.ORGANIZER, ROLES.COORDINATOR), (req, res) => {
  const eventId = req.params.id;
  const { shiftId } = req.body;

  if (!shiftId) {
    return res.status(400).json({ error: 'shiftId is required.' });
  }

  const shift = store.getShiftById(shiftId);
  if (!shift || shift.eventId !== eventId) {
    return res.status(404).json({ error: 'Shift not found.' });
  }

  const token = crypto.randomBytes(16).toString('hex');
  const expiresAt = Date.now() + (5 * 60 * 1000); // 5 minutes validity

  qrTokens.set(token, {
    eventId,
    shiftId,
    expiresAt,
    createdBy: req.user.id
  });

  res.json({
    token,
    shiftId,
    shiftTitle: shift.title,
    expiresAt: new Date(expiresAt).toISOString(),
    validitySeconds: 300
  });
});

// Scan / Redeem QR Token (Volunteer scanning coordinator's screen)
router.post('/:id/attendance/qr-scan', (req, res) => {
  const eventId = req.params.id;
  const { token, assignmentId } = req.body;

  if (!token || !assignmentId) {
    return res.status(400).json({ error: 'token and assignmentId are required.' });
  }

  const tokenData = qrTokens.get(token);
  if (!tokenData) {
    return res.status(400).json({ error: 'Invalid or expired QR check-in token.' });
  }

  if (Date.now() > tokenData.expiresAt) {
    qrTokens.delete(token);
    return res.status(400).json({ error: 'QR token has expired. Please refresh the coordinator QR code.' });
  }

  if (tokenData.eventId !== eventId) {
    return res.status(400).json({ error: 'Token event mismatch.' });
  }

  const asgn = store.getAssignmentById(assignmentId);
  if (!asgn || asgn.volunteerId !== req.user.id) {
    return res.status(403).json({ error: 'You are not assigned to this shift.' });
  }

  if (asgn.shiftId !== tokenData.shiftId) {
    return res.status(400).json({ error: 'This QR code is for a different shift.' });
  }

  try {
    const record = store.recordCheckIn({
      eventId,
      assignmentId,
      volunteerId: req.user.id,
      shiftId: asgn.shiftId,
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
