import { Router } from 'express';
import { getRepo } from '../db/repo.js';
import { authMiddleware, requireRole } from '../authMiddleware.js';
import { ROLES } from '../../../shared/constants.js';

const router = Router();

// Public preview endpoint for invitation links (accessible before login)
// Security: returns strictly minimal public event metadata without leaking rosters or organizer profiles
const handlePreview = async (req, res) => {
  const rawCode = req.params.inviteCode || req.query.code || req.query.inviteCode;
  if (!rawCode || !rawCode.trim()) {
    return res.status(400).json({ error: 'Invite code is required.' });
  }
  const inviteCode = rawCode.trim();
  const repo = getRepo();
  const ev = await repo.getEventByInviteCode(inviteCode);
  if (!ev) {
    return res.status(404).json({ error: 'Invalid or expired invitation link. No event found.' });
  }

  const payload = {
    id: ev.id,
    title: ev.title,
    description: ev.description,
    venueName: ev.venueName,
    startDate: ev.startDate,
    endDate: ev.endDate,
    timezone: ev.timezone,
    inviteCode: ev.inviteCode,
    status: ev.status
  };

  res.json({
    ...payload,
    event: payload
  });
};

router.get('/preview-invite/:inviteCode', handlePreview);
router.get('/preview', handlePreview);

router.use(authMiddleware);

// List all accessible events: strictly returns events the authenticated user is a member of
router.get('/', async (req, res) => {
  const repo = getRepo();
  const events = await repo.getEvents(req.user.id);
  const userMemberships = await repo.getUserMemberships(req.user.id);
  const memMap = new Map(userMemberships.map(m => [m.eventId, m]));

  const enriched = [];
  for (const ev of events) {
    const mem = memMap.get(ev.id);
    const zones = await repo.getZones(ev.id);
    const shifts = await repo.getShifts(ev.id);
    const members = await repo.getMemberships(ev.id);

    enriched.push({
      ...ev,
      userRole: mem ? mem.role : null,
      isMember: Boolean(mem),
      zonesCount: zones.length,
      shiftsCount: shifts.length,
      volunteersCount: members.length
    });
  }

  res.json({ events: enriched });
});

// Create new event
router.post('/', async (req, res) => {
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

  if (new Date(startDate).getTime() >= new Date(endDate).getTime()) {
    return res.status(400).json({ error: 'Start date must be before end date.' });
  }

  const repo = getRepo();
  const newEvent = await repo.createEvent({
    title,
    description,
    venueName,
    startDate,
    endDate,
    timezone: timezone || 'UTC',
    inviteCode,
    maxHoursPerVolunteer: Number(maxHoursPerVolunteer) || 12.0,
    urgentEscalationMinutes: Number(urgentEscalationMinutes) || 15
  }, req.user.id);

  // If initial zones provided in setup wizard
  if (Array.isArray(zones) && zones.length > 0) {
    for (const z of zones) {
      await repo.createZone({
        eventId: newEvent.id,
        name: z.name,
        code: z.code || z.name.slice(0, 3).toUpperCase(),
        description: z.description,
        color: z.color || '#7054E8',
        posX: z.posX !== undefined ? Number(z.posX) : 50.0,
        posY: z.posY !== undefined ? Number(z.posY) : 50.0,
        requiredHeadcount: Number(z.requiredHeadcount) || 1
      });
    }
  }

  res.status(201).json({ event: newEvent });
});

// Join event via invitation code
// Security rule: Joining via public invite grants strictly Volunteer role, never Organizer
router.post('/join', async (req, res) => {
  const { inviteCode: rawCode } = req.body;
  if (!rawCode || !rawCode.trim()) {
    return res.status(400).json({ error: 'Invitation code is required.' });
  }

  const inviteCode = rawCode.trim();
  const repo = getRepo();
  const ev = await repo.getEventByInviteCode(inviteCode);
  if (!ev) {
    return res.status(404).json({ error: 'Invalid or expired invitation code. No matching event found.' });
  }

  if (ev.status === 'closed') {
    return res.status(400).json({ error: 'Cannot join an event that has concluded and is closed.' });
  }

  // Idempotent join: if already a member, return existing membership
  const existingMem = await repo.getMembership(ev.id, req.user.id);
  if (existingMem && existingMem.status === 'active') {
    return res.json({
      message: `You are already an active ${existingMem.role} in ${ev.title}.`,
      event: ev,
      membership: existingMem
    });
  }

  const membership = await repo.addMembership({
    eventId: ev.id,
    userId: req.user.id,
    role: ROLES.VOLUNTEER,
    status: 'active'
  });

  res.status(201).json({
    message: `Successfully joined ${ev.title} as a volunteer!`,
    event: ev,
    membership
  });
});

// Update event details (Organizer only)
router.put('/:id', requireRole(ROLES.ORGANIZER), async (req, res) => {
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

  if (startDate && endDate && new Date(startDate).getTime() >= new Date(endDate).getTime()) {
    return res.status(400).json({ error: 'Start date must be before end date.' });
  }

  const repo = getRepo();
  const updated = await repo.updateEvent(req.params.id, {
    title,
    description,
    venueName,
    startDate,
    endDate,
    timezone,
    layoutImageUrl,
    maxHoursPerVolunteer: maxHoursPerVolunteer !== undefined ? Number(maxHoursPerVolunteer) : undefined,
    urgentEscalationMinutes: urgentEscalationMinutes !== undefined ? Number(urgentEscalationMinutes) : undefined,
    inviteCode
  });

  if (!updated) {
    return res.status(404).json({ error: 'Event not found.' });
  }

  res.json({ event: updated });
});

// --- Zones Management ---
router.get('/:id/zones', async (req, res) => {
  const repo = getRepo();
  const time = req.query.time || null;
  const zones = await repo.getZones(req.params.id, { time });
  res.json({ zones });
});

router.post('/:id/zones', requireRole(ROLES.ORGANIZER), async (req, res) => {
  const { name, code, description, color, posX, posY, requiredHeadcount } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Zone name is required.' });
  }

  const pX = Number(posX);
  const pY = Number(posY);
  if ((posX !== undefined && (isNaN(pX) || pX < 0 || pX > 100)) ||
      (posY !== undefined && (isNaN(pY) || pY < 0 || pY > 100))) {
    return res.status(400).json({ error: 'Zone coordinates posX and posY must be numbers between 0 and 100.' });
  }

  const repo = getRepo();
  const zone = await repo.createZone({
    eventId: req.params.id,
    name,
    code: code || name.slice(0, 3).toUpperCase(),
    description,
    color,
    posX: !isNaN(pX) ? pX : 50.0,
    posY: !isNaN(pY) ? pY : 50.0,
    requiredHeadcount: Number(requiredHeadcount) || 1
  });

  res.status(201).json({ zone });
});

router.put('/:id/zones/:zoneId', requireRole(ROLES.ORGANIZER), async (req, res) => {
  const repo = getRepo();
  const updated = await repo.updateZone(req.params.zoneId, req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Zone not found in this event.' });
  }
  res.json({ zone: updated });
});

// --- Volunteer Directory & Profiles ---
router.get('/:id/volunteers', async (req, res) => {
  const repo = getRepo();
  const volunteers = await repo.getVolunteerDetails(req.params.id);
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
  // Volunteers cannot see other volunteers' phone numbers unless coordinator or organizer
  const isPrivileged = req.isOrganizer() || req.isCoordinator();
  const sanitized = filtered.map(v => ({
    ...v,
    phone: isPrivileged || v.id === req.user.id ? v.phone : undefined
  }));

  res.json({ volunteers: sanitized, total: volunteers.length });
});

// Update volunteer skills and availability (Event-Scoped)
router.put('/:id/volunteers/:userId', async (req, res) => {
  // Volunteer can edit their own profile, or Organizer can edit any
  if (req.user.id !== req.params.userId && !req.isOrganizer()) {
    return res.status(403).json({ error: 'Cannot update other volunteer profiles.' });
  }

  const { skills, availabilities, preferredZoneIds, preferredRoleNames, phone, bio } = req.body;
  const repo = getRepo();
  await repo.updateVolunteerProfile(req.params.id, req.params.userId, {
    skills,
    availabilities,
    preferredZoneIds,
    preferredRoleNames,
    phone,
    bio
  });

  res.json({ success: true, message: 'Profile, skills, availability, and preferences updated.' });
});

// Appoint or update member role and zone assignments (Organizer only)
router.put('/:id/members/:userId', requireRole(ROLES.ORGANIZER), async (req, res) => {
  const { role, assignedZones } = req.body;
  const eventId = req.params.id;
  const targetUserId = req.params.userId;

  const repo = getRepo();
  const membership = await repo.getMembership(eventId, targetUserId);
  if (!membership) {
    return res.status(404).json({ error: 'Membership not found for this user and event.' });
  }

  // Prevent demoting the creator if they are the only organizer
  if (membership.role === ROLES.ORGANIZER && role && role !== ROLES.ORGANIZER) {
    const organizers = (await repo.getMemberships(eventId)).filter(m => m.role === ROLES.ORGANIZER);
    if (organizers.length <= 1) {
      return res.status(400).json({ error: 'Cannot demote the only organizer of this event.' });
    }
  }

  const updated = await repo.updateMembershipRole(eventId, targetUserId, role || membership.role, assignedZones);
  res.json({ success: true, membership: updated });
});

// Regenerate / Rotate invitation code (Organizer only)
const handleRotateInvite = async (req, res) => {
  const repo = getRepo();
  const updated = await repo.regenerateInviteCode(req.params.id);
  res.json({ success: true, inviteCode: updated.inviteCode, event: updated });
};
router.post('/:id/invite/regenerate', requireRole(ROLES.ORGANIZER), handleRotateInvite);
router.post('/:id/invite/rotate', requireRole(ROLES.ORGANIZER), handleRotateInvite);

// Revoke invitation code (Organizer only)
router.post('/:id/invite/revoke', requireRole(ROLES.ORGANIZER), async (req, res) => {
  const repo = getRepo();
  const updated = await repo.revokeInviteCode(req.params.id);
  res.json({ success: true, message: 'Invitation code revoked.', event: updated });
});

// Close Event (Organizer only)
// Preserves integrity: Event closure must not silently mark unfinished tasks resolved
router.post('/:id/close', requireRole(ROLES.ORGANIZER), async (req, res) => {
  const eventId = req.params.id;
  const repo = getRepo();
  const issues = await repo.getIssues(eventId);
  const pendingIssues = issues.filter(i => i.status !== 'resolved');

  const updated = await repo.closeEvent(eventId, req.user.id);
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
