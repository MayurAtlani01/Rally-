import { Router } from 'express';
import { store } from '../store.js';
import { authMiddleware } from '../authMiddleware.js';

const router = Router();
router.use(authMiddleware);

// Get handover notes for event (optional ?zoneId=)
router.get('/:id/handover', (req, res) => {
  const eventId = req.params.id;
  const { zoneId } = req.query;

  const notes = store.getHandoverNotes(eventId, zoneId);
  const profilesMap = new Map(store.getProfiles().map(p => [p.id, p]));
  const shiftsMap = new Map(store.getShifts(eventId).map(s => [s.id, s]));
  const zonesMap = new Map(store.getZones(eventId).map(z => [z.id, z]));

  const enriched = notes.map(n => {
    const author = profilesMap.get(n.authorId) || { fullName: 'Unknown', avatarUrl: '' };
    const shift = shiftsMap.get(n.shiftId) || { title: 'Unknown Shift' };
    const zone = zonesMap.get(n.zoneId) || { name: 'Unknown Zone' };

    return {
      ...n,
      authorName: author.fullName,
      authorAvatar: author.avatarUrl,
      shiftTitle: shift.title,
      zoneName: zone.name
    };
  });

  enriched.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ handoverNotes: enriched });
});

// Create handover note
router.post('/:id/handover', (req, res) => {
  const eventId = req.params.id;
  const { zoneId, shiftId, summary, openIssues, notes } = req.body;

  if (!zoneId || !shiftId || !summary) {
    return res.status(400).json({ error: 'zoneId, shiftId, and summary are required.' });
  }

  const note = store.createHandoverNote({
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
