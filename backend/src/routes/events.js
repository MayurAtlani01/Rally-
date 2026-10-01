import { Router } from 'express';
import crypto from 'node:crypto';
import { store } from '../store.js';
import { authMiddleware, requireRole } from '../authMiddleware.js';
import { ROLES } from '../../../shared/constants.js';

const router = Router();

// Public preview endpoint for invitation links (accessible before login)
router.get('/preview-invite/:inviteCode', (req, res) => {
  const { inviteCode } = req.params;
  const ev = store.getEventByInviteCode(inviteCode);
  if (!ev) {
    return res.status(404).json({ error: 'Invalid or expired invitation link. No event found.' });
  }
  const organizerMembership = store.getMemberships(ev.id).find(m => m.role === ROLES.ORGANIZER);
  const organizerProfile = organizerMembership ? store.getProfileById(organizerMembership.userId) : null;

  res.json({
    id: ev.id,
    title: ev.title,
    description: ev.description,
    venueName: ev.venueName,
    startDate: ev.startDate,
    endDate: ev.endDate,
    timezone: ev.timezone,
    inviteCode: ev.inviteCode,
    organizerName: organizerProfile?.fullName || 'Event Organizer'
  });
});

router.use(authMiddleware);

// List all accessible events
router.get('/', (req, res) => {
  const events = store.getEvents();
  const userId = req.user.id;
  const userMemberships = store.getUserMemberships(userId);
  const memMap = new Map(userMemberships.map(m => [m.eventId, m]));

  const enriched = events.map(ev => {
    const mem = memMap.get(ev.id);
    const zones = store.getZones(ev.id);
    const shifts = store.getShifts(ev.id);
    const members = store.getMemberships(ev.id);

    return {
      ...ev,
      userRole: mem ? mem.role : null,
      isMember: !!mem,
      zonesCount: zones.length,
      shiftsCount: shifts.length,
      volunteersCount: members.length
    };
  });

  res.json({ events: enriched });
});

// Create new event
router.post('/', (req, res) => {
  const {
    title,
    description,
    venueName,
    startDate,
    endDate,
    timezone,
    inviteCode,
    maxHoursPerVolunteer,
    urgentEscalationMinutes,
    zones = []
  } = req.body;

  if (!title || !venueName || !startDate || !endDate) {
    return res.status(400).json({ error: 'Title, venue name, start date, and end date are required.' });
  }

  const newEvent = store.createEvent({
    title,
    description,
    venueName,
    startDate,
    endDate,
    timezone: timezone || 'UTC',
    inviteCode,
    maxHoursPerVolunteer: Number(maxHoursPerVolunteer) || 12.0,
    urgentEscalationMinutes: Number(urgentEscalationMinutes) || 15,
    createdBy: req.user.id
  });

  // If initial zones provided in setup wizard
  if (Array.isArray(zones) && zones.length > 0) {
    for (const z of zones) {
      store.createZone({
        eventId: newEvent.id,
        name: z.name,
        code: z.code,
        description: z.description,
        color: z.color || '#7054E8',
        posX: z.posX ?? 50,
        posY: z.posY ?? 50,
        requiredHeadcount: Number(z.requiredHeadcount) || 1
      });
    }
  }

  res.status(201).json({ event: newEvent });
});

// Join event via invitation code
// Security rule: Organizer membership cannot be self-selected through public signup or code
router.post('/join', (req, res) => {
  const { inviteCode } = req.body;
  if (!inviteCode) {
    return res.status(400).json({ error: 'Invitation code is required.' });
  }

  const ev = store.getEventByInviteCode(inviteCode);
  if (!ev) {
    return res.status(404).json({ error: 'Invalid invitation code. No matching event found.' });
  }

  // Join strictly as volunteer
  const membership = store.addMembership({
    eventId: ev.id,
    userId: req.user.id,
    role: ROLES.VOLUNTEER,
    status: 'active'
  });

  res.json({
    message: `Successfully joined ${ev.title} as a volunteer!`,
    event: ev,
    membership
  });
});

// Get event by ID
router.get('/:id', (req, res) => {
  const ev = store.getEventById(req.params.id);
  if (!ev) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  const membership = store.getMembership(ev.id, req.user.id);
  const zones = store.getZones(ev.id);
  const shifts = store.getShifts(ev.id);
  const members = store.getMemberships(ev.id);

  res.json({
    event: ev,
    userRole: membership ? membership.role : null,
    membership,
    stats: {
      zonesCount: zones.length,
      shiftsCount: shifts.length,
      membersCount: members.length
    }
  });
});

// Update event details (Organizer only)
router.put('/:id', requireRole(ROLES.ORGANIZER), (req, res) => {
  const {
    title,
    description,
    venueName,
    startDate,
    endDate,
    timezone,
    layoutImageUrl,
    maxHoursPerVolunteer,
    urgentEscalationMinutes,
    inviteCode
  } = req.body;

  const updated = store.updateEvent(req.params.id, {
    ...(title !== undefined ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    ...(venueName !== undefined ? { venueName } : {}),
    ...(startDate !== undefined ? { startDate } : {}),
    ...(endDate !== undefined ? { endDate } : {}),
    ...(timezone !== undefined ? { timezone } : {}),
    ...(layoutImageUrl !== undefined ? { layoutImageUrl } : {}),
    ...(maxHoursPerVolunteer !== undefined ? { maxHoursPerVolunteer: Number(maxHoursPerVolunteer) } : {}),
    ...(urgentEscalationMinutes !== undefined ? { urgentEscalationMinutes: Number(urgentEscalationMinutes) } : {}),
    ...(inviteCode !== undefined ? { inviteCode } : {})
  });

  if (!updated) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  res.json({ event: updated });
});

// --- Zones Management ---
router.get('/:id/zones', (req, res) => {
  const zones = store.getZones(req.params.id);
  const shifts = store.getShifts(req.params.id);
  const assignments = store.getAssignments(req.params.id);
  const issues = store.getIssues(req.params.id);

  // Compute live coverage and attendance per zone
  const enrichedZones = zones.map(zone => {
    const zoneShifts = shifts.filter(s => s.zoneId === zone.id);
    const zoneShiftIds = new Set(zoneShifts.map(s => s.id));

    const zoneAssignments = assignments.filter(
      a => zoneShiftIds.has(a.shiftId) && a.status !== 'canceled' && a.status !== 'absent'
    );

    const checkedInCount = zoneAssignments.filter(a => a.status === 'checked_in').length;
    const requiredTotal = zoneShifts.reduce((sum, s) => sum + (s.requiredHeadcount || 1), 0) || zone.requiredHeadcount;
    const assignedTotal = zoneAssignments.length;

    const zoneIssues = issues.filter(i => i.zoneId === zone.id && i.status !== 'resolved');
    const urgentIssues = zoneIssues.filter(i => i.severity === 'urgent');

    let coverageStatus = 'full';
    if (assignedTotal === 0) {
      coverageStatus = 'empty';
    } else if (assignedTotal < requiredTotal) {
      coverageStatus = 'understaffed';
    }
    if (urgentIssues.length > 0 || (requiredTotal > 0 && assignedTotal === 0)) {
      coverageStatus = 'critical';
    }

    return {
      ...zone,
      requiredHeadcount: requiredTotal,
      assignedHeadcount: assignedTotal,
      checkedInHeadcount: checkedInCount,
      activeIssuesCount: zoneIssues.length,
      urgentIssuesCount: urgentIssues.length,
      coverageStatus
    };
  });

  res.json({ zones: enrichedZones });
});

router.post('/:id/zones', requireRole(ROLES.ORGANIZER), (req, res) => {
  const { name, code, description, color, posX, posY, requiredHeadcount } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Zone name is required.' });
  }

  const zone = store.createZone({
    eventId: req.params.id,
    name,
    code,
    description,
    color,
    posX,
    posY,
    requiredHeadcount
  });

  res.status(201).json({ zone });
});

router.put('/:id/zones/:zoneId', requireRole(ROLES.ORGANIZER), (req, res) => {
  const updated = store.updateZone(req.params.zoneId, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Zone not found.' });
  }
  res.json({ zone: updated });
});

// --- Volunteer Directory & Profiles ---
router.get('/:id/volunteers', (req, res) => {
  const volunteers = store.getVolunteerDetails(req.params.id);
  const { query, skill } = req.query;

  let filtered = volunteers;

  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(v =>
      v.name.toLowerCase().includes(q) ||
      v.email.toLowerCase().includes(q) ||
      (v.skills || []).some(s => s.toLowerCase().includes(q))
    );
  }

  if (skill) {
    filtered = filtered.filter(v =>
      (v.skills || []).some(s => s.toLowerCase() === skill.toLowerCase())
    );
  }

  // Scoped contact details:
  // If requestor is Volunteer, don't show other volunteers' phone numbers unless organizer/coordinator
  const isPrivileged = req.isOrganizer() || req.isCoordinator();
  const sanitized = filtered.map(v => ({
    ...v,
    phone: isPrivileged || v.id === req.user.id ? v.phone : undefined
  }));

  res.json({ volunteers: sanitized, total: volunteers.length });
});

// Update volunteer skills and availability
router.put('/:id/volunteers/:userId', (req, res) => {
  // Volunteer can edit their own profile, or Organizer can edit any
  if (req.user.id !== req.params.userId && !req.isOrganizer()) {
    return res.status(403).json({ error: 'Cannot update other volunteer profiles.' });
  }

  const { skills, availabilities, phone, bio } = req.body;
  store.updateVolunteerProfile(req.params.userId, { skills, availabilities, phone, bio });

  res.json({ success: true, message: 'Profile and availability updated.' });
});

// Appoint or update member role and zone assignments (Organizer only)
router.put('/:id/members/:userId', requireRole(ROLES.ORGANIZER), (req, res) => {
  const { role, assignedZones } = req.body;
  const eventId = req.params.id;
  const targetUserId = req.params.userId;

  const membership = store.getMembership(eventId, targetUserId);
  if (!membership) {
    return res.status(404).json({ error: 'Membership not found for this user and event.' });
  }

  // Prevent demoting the creator if they are the only organizer
  if (membership.role === ROLES.ORGANIZER && role && role !== ROLES.ORGANIZER) {
    const organizers = store.getMemberships(eventId).filter(m => m.role === ROLES.ORGANIZER);
    if (organizers.length <= 1) {
      return res.status(400).json({ error: 'Cannot demote the only organizer of this event.' });
    }
  }

  if (role) membership.role = role;
  if (Array.isArray(assignedZones)) membership.assignedZones = assignedZones;
  membership.updatedAt = new Date().toISOString();
  store.save();

  res.json({ success: true, membership });
});

// Regenerate invitation code (Organizer only)
router.post('/:id/invite/regenerate', requireRole(ROLES.ORGANIZER), (req, res) => {
  const newCode = `INV-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const updated = store.updateEvent(req.params.id, { inviteCode: newCode });
  res.json({ success: true, inviteCode: newCode, event: updated });
});

// Revoke invitation code (Organizer only)
router.post('/:id/invite/revoke', requireRole(ROLES.ORGANIZER), (req, res) => {
  const updated = store.updateEvent(req.params.id, { inviteCode: null });
  res.json({ success: true, message: 'Invitation code revoked.', event: updated });
});

// Close Event (Organizer only)
// Preserves integrity: Event closure must not silently mark unfinished tasks resolved.
router.post('/:id/close', requireRole(ROLES.ORGANIZER), (req, res) => {
  const eventId = req.params.id;
  const issues = store.getIssues(eventId);
  const pendingIssues = issues.filter(i => i.status !== 'resolved');

  const updated = store.updateEvent(eventId, {
    status: 'closed',
    closedAt: new Date().toISOString(),
    closedBy: req.user.id
  });

  if (!updated) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  res.json({
    success: true,
    message: 'Event closed successfully. Unfinished tasks remain in their recorded status.',
    event: updated,
    unresolvedTasksCount: pendingIssues.length
  });
});

export default router;
