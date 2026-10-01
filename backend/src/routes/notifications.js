import { Router } from 'express';
import { store } from '../store.js';
import { authMiddleware } from '../authMiddleware.js';

const router = Router();
router.use(authMiddleware);

// Get current user's notifications
router.get('/', (req, res) => {
  const { eventId } = req.query;
  const notifs = store.getNotifications(req.user.id, eventId);
  notifs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const unreadCount = notifs.filter(n => !n.isRead).length;

  res.json({ notifications: notifs, unreadCount });
});

// Mark single notification as read
router.put('/:id/read', (req, res) => {
  const notif = store.markNotificationRead(req.params.id);
  if (!notif) return res.status(404).json({ error: 'Notification not found' });
  res.json({ notification: notif });
});

// Mark all as read
router.put('/read-all', (req, res) => {
  store.markAllNotificationsRead(req.user.id);
  res.json({ success: true });
});

export default router;
