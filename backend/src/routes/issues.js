import { Router } from 'express';
import { store } from '../store.js';
import { authMiddleware } from '../authMiddleware.js';
import { ROLES, ISSUE_STATUSES, ISSUE_SEVERITIES } from '../../../shared/constants.js';

const router = Router();
router.use(authMiddleware);

// List issues for event (optional ?zoneId=&status=)
router.get('/:id/issues', (req, res) => {
  const eventId = req.params.id;
  const { zoneId, status } = req.query;

  let issues = store.getIssues(eventId, zoneId);

  // Role-based visibility scoping
  if (req.isVolunteer()) {
    issues = issues.filter(i => i.reportedBy === req.user.id || i.assignedTo === req.user.id);
  } else if (req.isCoordinator() && !req.isOrganizer()) {
    const assignedZones = req.membership?.assignedZones || [];
    issues = issues.filter(i => !i.zoneId || assignedZones.includes(i.zoneId) || i.coordinatorId === req.user.id);
  }

  if (status) {
    issues = issues.filter(i => i.status === status);
  }

  const profilesMap = new Map(store.getProfiles().map(p => [p.id, p]));
  const zonesMap = new Map(store.getZones(eventId).map(z => [z.id, z]));

  const enriched = issues.map(issue => {
    const reporter = profilesMap.get(issue.reportedBy) || { fullName: 'Unknown', email: '' };
    const coord = issue.coordinatorId ? profilesMap.get(issue.coordinatorId) : null;
    const assignee = issue.assignedTo ? profilesMap.get(issue.assignedTo) : null;
    const zone = issue.zoneId ? zonesMap.get(issue.zoneId) : null;
    const activities = store.getIssueActivity(issue.id);

    return {
      ...issue,
      reporterName: reporter.fullName,
      reporterAvatar: reporter.avatarUrl,
      coordinatorName: coord ? coord.fullName : null,
      assigneeName: assignee ? assignee.fullName : null,
      zoneName: zone ? zone.name : 'All Event',
      activityCount: activities.length,
      activities
    };
  });

  res.json({ issues: enriched });
});

// Report new issue
router.post('/:id/issues', (req, res) => {
  const eventId = req.params.id;
  const { title, description, category, severity, zoneId, assignedTo } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }

  const issue = store.createIssue({
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

// Update issue status or assignee
router.put('/:id/issues/:issueId', (req, res) => {
  const { issueId } = req.params;
  const { status, assignedTo, severity, activityNote } = req.body;

  const existing = store.getIssueById(issueId);
  if (!existing || existing.eventId !== req.params.id) {
    return res.status(404).json({ error: 'Issue not found.' });
  }

  // Permission check: Volunteer reporter can edit notes; Coordinator/Organizer can change status/assign
  const isPrivileged = req.isOrganizer() || req.isCoordinator();
  const isReporter = existing.reportedBy === req.user.id;

  if (!isPrivileged && !isReporter) {
    return res.status(403).json({ error: 'Not authorized to modify this issue.' });
  }

  const updated = store.updateIssue(
    issueId,
    { status, assignedTo, severity, activityNote },
    req.user.id
  );

  res.json({ issue: updated });
});

// Trigger escalation check (can be called periodically or by worker)
router.post('/:id/issues/escalate-check', (req, res) => {
  const escalated = store.checkAndEscalateUrgentIssues(req.params.id);
  res.json({
    escalatedCount: escalated.length,
    escalatedIssues: escalated.map(i => ({ id: i.id, title: i.title, createdAt: i.createdAt }))
  });
});

export default router;
