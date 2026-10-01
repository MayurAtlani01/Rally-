import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import shiftRoutes from './routes/shifts.js';
import attendanceRoutes from './routes/attendance.js';
import issueRoutes from './routes/issues.js';
import announcementRoutes from './routes/announcements.js';
import notificationRoutes from './routes/notifications.js';
import reportRoutes from './routes/reports.js';
import handoverRoutes from './routes/handover.js';
import { store } from './store.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '127.0.0.1';

app.use(helmet({
  contentSecurityPolicy: false // Allow local dev embedding and fonts
}));

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5173',
  credentials: true
}));

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: 'demo',
    storage: 'local-json',
    requestedMode: process.env.RALLY_MODE || 'demo',
    liveSupported: false,
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/events', shiftRoutes);
app.use('/api/events', attendanceRoutes);
app.use('/api/events', issueRoutes);
app.use('/api/events', announcementRoutes);
app.use('/api/events', reportRoutes);
app.use('/api/events', handoverRoutes);
app.use('/api/notifications', notificationRoutes);

// Automatic background escalation runner every 60 seconds
const ESCALATION_INTERVAL_MS = 60 * 1000;
const escalationTimer = setInterval(() => {
  try {
    const escalated = store.checkAndEscalateUrgentIssues();
    if (escalated.length > 0) {
      console.log(`[Escalation Engine] Auto-escalated ${escalated.length} urgent unacknowledged issues to organizers.`);
    }
  } catch (err) {
    console.error('[Escalation Engine] Error during check:', err);
  }
}, ESCALATION_INTERVAL_MS);

escalationTimer.unref();

// Error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

if (process.env.NODE_ENV !== 'test' && !process.env.NODE_TEST_CONTEXT) {
  app.listen(PORT, HOST, () => {
    console.log(`🚀 RALLY backend service listening on http://${HOST}:${PORT}`);
    console.log('Mode: demo (device-local persistence; Supabase adapter is not installed)');
  });
}

export default app;
