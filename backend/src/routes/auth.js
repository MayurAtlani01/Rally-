import { Router } from 'express';
import { getRepo } from '../db/repo.js';
import { authMiddleware } from '../authMiddleware.js';

const router = Router();

// /me is strictly protected and derives identity from the verified Supabase token
router.get('/me', authMiddleware, async (req, res) => {
  const repo = getRepo();
  const userId = req.user.id;
  const profile = await repo.getProfileById(userId);

  if (!profile) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  const memberships = await repo.getUserMemberships(userId);
  const events = [];
  for (const m of memberships) {
    const ev = await repo.getEventById(m.eventId);
    if (ev) {
      events.push({
        ...m,
        event: ev
      });
    }
  }

  res.json({
    user: profile,
    memberships,
    events
  });
});

// Sync profile from verified Supabase session
// Security rule: Profile sync cannot create or update another user's identity
router.post('/sync-profile', authMiddleware, async (req, res) => {
  const { id, fullName, phone, bio } = req.body;
  const verifiedUserId = req.user.id;

  // Prevent spoofing or writing to another user's profile
  if (id && id !== verifiedUserId) {
    return res.status(403).json({
      error: 'Forbidden: You cannot modify another user’s profile identity.',
      code: 'IDENTITY_SPOOFING_FORBIDDEN'
    });
  }

  const repo = getRepo();
  const profile = await repo.upsertProfile({
    id: verifiedUserId,
    email: req.user.email,
    fullName: fullName || req.user.fullName,
    phone: phone !== undefined ? phone : req.user.phone,
    bio: bio !== undefined ? bio : req.user.bio,
    avatarUrl: req.user.avatarUrl
  });

  const memberships = await repo.getUserMemberships(verifiedUserId);
  const events = [];
  for (const m of memberships) {
    const ev = await repo.getEventById(m.eventId);
    if (ev) events.push({ ...m, event: ev });
  }

  res.json({
    user: profile,
    memberships,
    events
  });
});

// Retired demo endpoints return 404 with clear actionable explanation
router.all(['/login', '/signup', '/personas', '/reset-demo'], (req, res) => {
  res.status(404).json({
    error: 'Demo authentication is disabled. RALLY requires Supabase authentication. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env and SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env.',
    code: 'SUPABASE_AUTH_REQUIRED'
  });
});

export default router;
