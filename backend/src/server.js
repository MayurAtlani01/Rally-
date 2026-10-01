import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config, { checkConfig } from './config.js';
import authRoutes from './routes/auth.js';
import eventRoutes from './routes/events.js';
import shiftRoutes from './routes/shifts.js';
import attendanceRoutes from './routes/attendance.js';
import issueRoutes from './routes/issues.js';
import announcementRoutes from './routes/announcements.js';
import notificationRoutes from './routes/notifications.js';
import reportRoutes from './routes/reports.js';
import handoverRoutes from './routes/handover.js';
import { getRepo } from './db/repo.js';

const configStatus = checkConfig();

if (!configStatus.valid && !config.isTest) {
  console.warn('\n' + '='.repeat(80));
  console.warn('⚠️  RALLY BACKEND: Supabase Configuration Required!');
  console.warn('='.repeat(80));
  console.warn(`Missing: ${configStatus.missing.join(', ')}`);
  console.warn('Normal operation requires Supabase Postgres persistence and verified identity.');
  console.warn('Please add your project credentials to backend/.env:');
  console.warn('  SUPABASE_URL=https://<project-ref>.supabase.co');
  console.warn('  SUPABASE_SERVICE_ROLE_KEY=<service-role-key>');
  console.warn('='.repeat(80) + '\n');
}

const app = express();

app.use(helmet({
  contentSecurityPolicy: false // Allow local dev embedding and fonts
}));

app.use(cors({
  origin: config.frontendOrigin,
  credentials: true
}));

app.use(express.json());

// Health check endpoint reflecting real Postgres persistence and Supabase integration
app.get('/api/health', (req, res) => {
  res.json({
    status: configStatus.valid ? 'ok' : 'config_required',
    mode: config.dataMode,
    storage: 'postgres',
    liveSupported: true,
    configured: configStatus.valid,
    missing: configStatus.missing,
    timestamp: new Date().toISOString()
  });
});

// If Supabase keys are not yet configured in runtime, return clear actionable 503 error
if (!configStatus.valid && !config.isTest) {
  app.use('/api', (req, res) => {
    res.status(503).json({
      error: `RALLY backend is waiting for Supabase configuration (${configStatus.missing.join(', ')}). Please configure backend/.env with your Supabase credentials.`,
      code: 'SUPABASE_CONFIG_REQUIRED',
      missing: configStatus.missing
    });
  });
}

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

// Automatic background escalation runner backed by shared Postgres state
if (configStatus.valid && !config.isTest) {
  const escalationTimer = setInterval(async () => {
    try {
      const repo = getRepo();
      const escalated = await repo.checkAndEscalateUrgentIssues(config.urgentEscalationMinutesDefault);
      if (escalated.length > 0) {
        console.log(`[Escalation Engine] Auto-escalated ${escalated.length} urgent unacknowledged issues to organizers.`);
      }
    } catch (err) {
      console.error('[Escalation Engine] Error during check:', err.message);
    }
  }, config.escalationIntervalMs);

  escalationTimer.unref();
}

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

if (!config.isTest) {
  app.listen(config.port, config.host, () => {
    console.log(`🚀 RALLY backend service listening on http://${config.host}:${config.port}`);
    console.log(`Mode: ${config.dataMode} (Supabase Postgres persistence active)`);
  });
}

export default app;
