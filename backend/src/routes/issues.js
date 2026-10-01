import { Router } from 'express';
import { getRepo } from '../db/repo.js';
import { authMiddleware, requireRole } from '../authMiddleware.js';
import { ROLES, ISSUE_STATUSES, ISSUE_SEVERITIES } from '../../../shared/constants.js';

const router = Router();
router.use(authMiddleware);

// List issues for event (optional ?zoneId=&status=)
router.get('/:id/issues', async (req, res) => {
  const eventId = req.params.id;
  const { zoneId, status } = req.query;
  const repo = getRepo();

  let issues = await repo.getIssues(eventId, zoneId, status);

  // Role-based visibility scoping
  if (req.isVolunteer()) {
    issues = issues.filter(i => i.reportedBy === req.user.id || i.assignedTo === req.user.id);
  } else if (req.isCoordinator() && !req.isOrganizer()) {
    const assignedZones = req.membership?.assignedZones || [];
    issues = issues.filter(i => !i.zoneId || assignedZones.includes(i.zoneId) || i.reportedBy === req.user.id || i.assignedTo === req.user.id);
  }

  const zones = await repo.getZones(eventId);
  const zonesMap = new Map(zones.map(z => [z.id, z]));

  const enriched = [];
  for (const issue of issues) {
    const reporter = await repo.getProfileById(issue.reportedBy);
    const coord = issue.coordinatorId ? await repo.getProfileById(issue.coordinatorId) : null;
    const assignee = issue.assignedTo ? await repo.getProfileById(issue.assignedTo) : null;
    const zone = issue.zoneId ? zonesMap.get(issue.zoneId) : null;
    const activities = await repo.getIssueActivity(issue.id);

    enriched.push({
      ...issue,
      reporterName: reporter?.fullName || 'Volunteer',
      reporterAvatar: reporter?.avatarUrl || '',
      coordinatorName: coord ? coord.fullName : null,
      assigneeName: assignee ? assignee.fullName : null,
      zoneName: zone ? zone.name : 'All Event',
      activityCount: activities.length,
      activities
    });
  }

  res.json({ issues: enriched });
});

// Report new issue
router.post('/:id/issues', async (req, res) => {
  const eventId = req.params.id;
  const { title, description, category, severity, zoneId, assignedTo } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }

  const allowedCategories = ['crowd', 'medical', 'logistics', 'safety', 'equipment', 'general'];
  if (category && !allowedCategories.includes(category)) {
    return res.status(400).json({ error: `Category must be one of [${allowedCategories.join(', ')}].` });
  }

  const allowedSeverities = Object.values(ISSUE_SEVERITIES);
  if (severity && !allowedSeverities.includes(severity)) {
    return res.status(400).json({ error: `Severity must be one of [${allowedSeverities.join(', ')}].` });
  }

  const repo = getRepo();
  if (zoneId) {
    const zone = await repo.getZoneById(zoneId);
    if (!zone || zone.eventId !== eventId) {
      return res.status(400).json({ error: 'Zone does not exist in this event.' });
    }
  }

  const issue = await repo.createIssue({
    eventId,
    zoneId: zoneId || null,
    title,
    description,
    category: category || 'general',
    severity: severity || ISSUE_SEVERITIES.MEDIUM,
    reportedBy: req.user.id,
    assignedTo: assignedTo || null
  });

  res.status(201).json({ issue });
});

// Update issue status, assignee, or notes
router.put('/:id/issues/:issueId', async (req, res) => {
  const { issueId } = req.params;
  const { status, assignedTo, severity, title, description, activityNote } = req.body;

  const repo = getRepo();
  const existing = await repo.getIssueById(issueId);
  if (!existing || existing.eventId !== req.params.id) {
    return res.status(404).json({ error: 'Issue not found in this event.' });
  }

  const isOrganizer = req.isOrganizer();
  const isCoordinator = req.isCoordinator();
  const isReporter = existing.reportedBy === req.user.id;

  // Coordinator zone scope enforcement
  if (isCoordinator && !isOrganizer) {
    const assignedZones = req.membership?.assignedZones || [];
    if (existing.zoneId && !assignedZones.includes(existing.zoneId)) {
      return res.status(403).json({
        error: 'Forbidden: Coordinators can only modify issues within their assigned zones.',
        code: 'ZONE_SCOPE_DENIED'
      });
    }
  }

  const isPrivileged = isOrganizer || isCoordinator;

  // Security rule: Non-privileged reporters CANNOT modify status, severity, or assignee
  if (!isPrivileged) {
    if (!isReporter) {
      return res.status(403).json({ error: 'Not authorized to modify this issue.' });
    }
    if (status !== undefined || severity !== undefined || assignedTo !== undefined) {
      return res.status(403).json({
        error: 'Forbidden: Issue reporters cannot modify status, severity, or assignee. Only coordinators and organizers can update these fields.',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
    }
  }

  const updated = await repo.updateIssue(
    issueId,
    req.params.id,
    { status, assignedTo, severity, title, description, activityNote },
    req.user.id,
    isPrivileged
  );

  res.json({ issue: updated });
});

// Escalate check endpoint
router.post('/:id/issues/escalate-check', requireRole(ROLES.ORGANIZER, ROLES.COORDINATOR), async (req, res) => {
  const repo = getRepo();
  const escalated = await repo.checkAndEscalateUrgentIssues(15);
  res.json({
    success: true,
    escalatedCount: escalated.length,
    escalatedIssues: escalated
  });
});

export default router;
