import { Router } from 'express';
import { getRepo } from '../db/repo.js';
import { authMiddleware } from '../authMiddleware.js';

const router = Router();
router.use(authMiddleware);

// Get current user's notifications
router.get('/', async (req, res) => {
  const { eventId } = req.query;
  const repo = getRepo();
  const notifs = await repo.getNotifications(req.user.id, eventId || null);
  const unreadCount = notifs.filter(n => !n.isRead).length;

  res.json({ notifications: notifs, unreadCount });
});

// Mark single notification as read (strictly verifies ownership)
router.put('/:id/read', async (req, res) => {
  const repo = getRepo();
  const notif = await repo.markNotificationRead(req.params.id, req.user.id);
  if (!notif) {
    return res.status(404).json({ error: 'Notification not found or access denied.' });
  }
  res.json({ notification: notif });
});

// Mark all notifications as read for current user
router.put('/read-all', async (req, res) => {
  const repo = getRepo();
  const { eventId } = req.query;
  await repo.markAllNotificationsRead(req.user.id, eventId || null);
  res.json({ success: true });
});

export default router;
