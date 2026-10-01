import { Router } from 'express';
import { getRepo } from '../db/repo.js';
import { authMiddleware, requireRole } from '../authMiddleware.js';
import { ROLES, ANNOUNCEMENT_AUDIENCES } from '../../../shared/constants.js';

const router = Router();
router.use(authMiddleware);

// Get announcements for event (filtered by recipient audience eligibility)
router.get('/:id/announcements', async (req, res) => {
  const eventId = req.params.id;
  const repo = getRepo();

  const userRole = req.membership?.role || ROLES.VOLUNTEER;
  const assignedZones = req.membership?.assignedZones || [];

  const announcements = await repo.getAnnouncements(eventId, req.user.id, userRole, assignedZones);
  const zones = await repo.getZones(eventId);
  const zonesMap = new Map(zones.map(z => [z.id, z]));

  const enriched = [];
  for (const a of announcements) {
    const author = await repo.getProfileById(a.authorId);
    const zone = a.zoneId ? zonesMap.get(a.zoneId) : null;
    enriched.push({
      ...a,
      authorName: author?.fullName || 'Event Staff',
      authorAvatar: author?.avatarUrl || '',
      zoneName: zone ? zone.name : null
    });
  }

  res.json({ announcements: enriched });
});

// Post announcement (Organizers can target any; Coordinators can target their assigned zones)
router.post('/:id/announcements', requireRole(ROLES.ORGANIZER, ROLES.COORDINATOR), async (req, res) => {
  const eventId = req.params.id;
  const title = req.body.title;
  const body = req.body.body || req.body.message;
  const audience = req.body.audience || req.body.targetAudience || ANNOUNCEMENT_AUDIENCES.ALL;
  const zoneId = req.body.zoneId || req.body.targetZoneId;
  const roleName = req.body.roleName || req.body.targetRole || req.body.targetRoleName;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body (or message) are required.' });
  }

  const allowedAudiences = Object.values(ANNOUNCEMENT_AUDIENCES);
  if (!allowedAudiences.includes(audience)) {
    return res.status(400).json({ error: `Audience must be one of [${allowedAudiences.join(', ')}].` });
  }

  const repo = getRepo();

  // Zone audience validation
  if (audience === ANNOUNCEMENT_AUDIENCES.ZONE) {
    if (!zoneId) {
      return res.status(400).json({ error: 'zoneId is required when audience is "zone".' });
    }
    const zone = await repo.getZoneById(zoneId);
    if (!zone || zone.eventId !== eventId) {
      return res.status(400).json({ error: 'Zone does not exist in this event.' });
    }
  }

  // Role audience validation
  if (audience === ANNOUNCEMENT_AUDIENCES.ROLE) {
    if (!roleName) {
      return res.status(400).json({ error: 'roleName is required when audience is "role".' });
    }
  }

  // Coordinator permission check
  if (req.isCoordinator() && !req.isOrganizer()) {
    const coordinatorZones = req.membership?.assignedZones || [];
    if (audience === ANNOUNCEMENT_AUDIENCES.ALL) {
      return res.status(403).json({ error: 'Forbidden: Coordinators cannot broadcast to all event participants. Select an assigned zone.' });
    }
    if (audience === ANNOUNCEMENT_AUDIENCES.ROLE) {
      return res.status(403).json({ error: 'Forbidden: Coordinators cannot broadcast by role across the event.' });
    }
    if (zoneId && !coordinatorZones.includes(zoneId)) {
      return res.status(403).json({ error: 'Forbidden: Cannot broadcast to a zone you do not coordinate.' });
    }
  }

  const ann = await repo.createAnnouncement({
    eventId,
    authorId: req.user.id,
    title,
    body,
    audience,
    zoneId: zoneId || null,
    roleName: roleName || null
  });

  res.status(201).json({ announcement: ann });
});

export default router;
