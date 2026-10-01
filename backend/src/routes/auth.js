import { Router } from 'express';
import { store } from '../store.js';

const router = Router();

router.get('/personas', (req, res) => {
  const allProfiles = store.getProfiles();
  const defaultEventId = 'ev-ignite-2026';
  const members = store.getMemberships(defaultEventId);

  const personas = allProfiles.slice(0, 8).map(p => {
    const mem = members.find(m => m.userId === p.id);
    return {
      id: p.id,
      name: p.fullName,
      email: p.email,
      avatarUrl: p.avatarUrl,
      role: mem ? mem.role : 'volunteer',
      bio: p.bio,
      assignedZones: mem?.assignedZones || []
    };
  });

  res.json({ personas, currentEventId: defaultEventId });
});

router.get('/me', (req, res) => {
  const userId = req.headers['x-user-id'] || 'usr-organizer-elena';
  const profile = store.getProfileById(userId);
  if (!profile) {
    return res.status(404).json({ error: 'User profile not found' });
  }

  const memberships = store.getUserMemberships(userId);
  const events = memberships.map(m => {
    const ev = store.getEventById(m.eventId);
    return {
      ...m,
      event: ev
    };
  });

  res.json({
    user: profile,
    memberships,
    events
  });
});

router.post('/login', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  let profile = store.getProfileByEmail(email);
  if (!profile) {
    // If not found in demo mode, auto-create a user profile
    const namePart = email.split('@')[0];
    const fullName = namePart.charAt(0).toUpperCase() + namePart.slice(1);
    profile = store.createProfile({
      fullName,
      email,
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80`
    });
  }

  const memberships = store.getUserMemberships(profile.id);
  res.json({
    user: profile,
    memberships,
    token: `demo-token-${profile.id}`
  });
});

router.post('/signup', (req, res) => {
  const { fullName, email, phone, bio } = req.body;
  if (!fullName || !email) {
    return res.status(400).json({ error: 'Full name and email are required' });
  }

  const existing = store.getProfileByEmail(email);
  if (existing) {
    return res.status(400).json({ error: 'User with this email already exists' });
  }

  const profile = store.createProfile({
    fullName,
    email,
    phone,
    bio,
    avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80`
  });

  res.status(201).json({
    user: profile,
    memberships: [],
    token: `demo-token-${profile.id}`
  });
});

// Sync profile from Supabase Auth into application store
// Store application profile details separately from Auth credentials; no passwords stored here
router.post('/sync-profile', (req, res) => {
  const { id, email, fullName, phone, bio } = req.body;
  if (!id || !email) {
    return res.status(400).json({ error: 'id and email are required to sync profile' });
  }

  let profile = store.getProfileById(id);
  if (!profile) {
    profile = store.createProfile({
      id,
      email,
      fullName: fullName || email.split('@')[0],
      phone: phone || '',
      bio: bio || '',
      avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80`
    });
  } else {
    if (fullName) profile.fullName = fullName;
    if (phone !== undefined) profile.phone = phone;
    if (bio !== undefined) profile.bio = bio;
    profile.updatedAt = new Date().toISOString();
    store.save();
  }

  const memberships = store.getUserMemberships(profile.id);
  const events = memberships.map(m => ({ ...m, event: store.getEventById(m.eventId) }));

  res.json({
    user: profile,
    memberships,
    events
  });
});

router.post('/reset-demo', (req, res) => {
  const freshData = store.resetDemo();
  res.json({
    message: 'Demo dataset successfully reset to default state.',
    eventsCount: freshData.events.length,
    shiftsCount: freshData.shifts.length,
    volunteersCount: freshData.profiles.length
  });
});

export default router;
