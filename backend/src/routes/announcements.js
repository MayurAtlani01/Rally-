import { Router } from 'express';
import { store } from '../store.js';
import { authMiddleware, requireRole } from '../authMiddleware.js';
import { ROLES, ANNOUNCEMENT_AUDIENCES } from '../../../shared/constants.js';

const router = Router();
router.use(authMiddleware);

// Get announcements for event
router.get('/:id/announcements', (req, res) => {
  const eventId = req.params.id;
  const announcements = store.getAnnouncements(eventId);
  const profilesMap = new Map(store.getProfiles().map(p => [p.id, p]));
  const zonesMap = new Map(store.getZones(eventId).map(z => [z.id, z]));

  const enriched = announcements.map(a => {
    const author = profilesMap.get(a.authorId) || { fullName: 'Unknown', email: '' };
    const zone = a.zoneId ? zonesMap.get(a.zoneId) : null;
    return {
      ...a,
      authorName: author.fullName,
      authorAvatar: author.avatarUrl,
      zoneName: zone ? zone.name : null
    };
  });

  // Sort newest first
  enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ announcements: enriched });
});

// Post announcement (Organizers can target any; Coordinators can target their assigned zones)
router.post('/:id/announcements', requireRole(ROLES.ORGANIZER, ROLES.COORDINATOR), (req, res) => {
  const eventId = req.params.id;
  const { title, body, audience = ANNOUNCEMENT_AUDIENCES.ALL, zoneId, roleName } = req.body;

  if (!title || !body) {
    return res.status(400).json({ error: 'Title and body are required.' });
  }

  // If coordinator, verify zone scope if zone-specific
  if (req.isCoordinator() && !req.isOrganizer()) {
    const coordinatorZones = req.membership?.assignedZones || [];
    if (audience === ANNOUNCEMENT_AUDIENCES.ALL) {
      return res.status(403).json({ error: 'Coordinators can only broadcast to their assigned zones.' });
    }
    if (zoneId && !coordinatorZones.includes(zoneId)) {
      return res.status(403).json({ error: 'Cannot broadcast to a zone you do not coordinate.' });
    }
  }

  const ann = store.createAnnouncement({
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
