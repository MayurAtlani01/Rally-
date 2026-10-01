import { Router } from 'express';
import { getRepo } from '../db/repo.js';
import { authMiddleware, requireRole } from '../authMiddleware.js';
import { ROLES } from '../../../shared/constants.js';

const router = Router();
router.use(authMiddleware);

// Get handover notes for event (optional ?zoneId=)
router.get('/:id/handover', async (req, res) => {
  const eventId = req.params.id;
  const { zoneId } = req.query;
  const repo = getRepo();

  const notes = await repo.getHandoverNotes(eventId, zoneId);
  const shifts = await repo.getShifts(eventId);
  const shiftsMap = new Map(shifts.map(s => [s.id, s]));
  const zones = await repo.getZones(eventId);
  const zonesMap = new Map(zones.map(z => [z.id, z]));

  const enriched = [];
  for (const n of notes) {
    const author = await repo.getProfileById(n.authorId);
    const shift = shiftsMap.get(n.shiftId) || { title: 'Unknown Shift' };
    const zone = zonesMap.get(n.zoneId) || { name: 'Unknown Zone' };

    enriched.push({
      ...n,
      authorName: author?.fullName || 'Shift Lead',
      authorAvatar: author?.avatarUrl || '',
      shiftTitle: shift.title,
      zoneName: zone.name
    });
  }

  res.json({ handoverNotes: enriched });
});

// Create handover note (Organizer or Coordinator)
router.post('/:id/handover', requireRole(ROLES.ORGANIZER, ROLES.COORDINATOR), async (req, res) => {
  const eventId = req.params.id;
  const { zoneId, shiftId, summary, openIssues, notes } = req.body;

  if (!zoneId || !shiftId || !summary) {
    return res.status(400).json({ error: 'zoneId, shiftId, and summary are required.' });
  }

  const repo = getRepo();
  const zone = await repo.getZoneById(zoneId);
  if (!zone || zone.eventId !== eventId) {
    return res.status(400).json({ error: 'Zone does not belong to this event.' });
  }

  const shift = await repo.getShiftById(shiftId);
  if (!shift || shift.eventId !== eventId) {
    return res.status(400).json({ error: 'Shift does not belong to this event.' });
  }

  // Coordinator zone scope check
  if (req.isCoordinator() && !req.isOrganizer()) {
    const assignedZones = req.membership?.assignedZones || [];
    if (!assignedZones.includes(zoneId)) {
      return res.status(403).json({
        error: 'Forbidden: Coordinators can only create handover notes for their assigned zones.',
        code: 'ZONE_SCOPE_DENIED'
      });
    }
  }

  const note = await repo.createHandoverNote({
    eventId,
    zoneId,
    shiftId,
    authorId: req.user.id,
    summary,
    openIssues: openIssues || '',
    notes: notes || ''
  });

  res.status(201).json({ handoverNote: note });
});

export default router;
