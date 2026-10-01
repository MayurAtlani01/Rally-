import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../backend/src/store.js';
import { ISSUE_SEVERITIES, ISSUE_STATUSES } from '../shared/constants.js';

describe('Urgent Issue Escalation Engine', () => {
  beforeEach(() => {
    store.resetDemo();
  });

  it('escalates unacknowledged urgent issues after threshold minutes and prevents duplicate alerts', () => {
    const eventId = 'ev-ignite-2026';

    // Create an urgent issue created 20 minutes ago (threshold is 15m)
    const twentyMinsAgo = new Date(Date.now() - (20 * 60 * 1000)).toISOString();
    const issue = store.createIssue({
      eventId,
      title: 'Perimeter fence breach near Gate 2',
      description: 'Crowd bypass detected',
      category: 'safety',
      severity: ISSUE_SEVERITIES.URGENT,
      reportedBy: 'usr-vol-maya'
    });
    // Manually backdate createdAt for testing
    issue.createdAt = twentyMinsAgo;

    // Run escalation check
    const escalatedFirstTime = store.checkAndEscalateUrgentIssues(eventId);
    assert.ok(escalatedFirstTime.some(i => i.id === issue.id), 'Created issue must be escalated');
    assert.ok(issue.escalatedAt, 'Issue should have escalatedAt timestamp set');

    // Run escalation check again immediately: MUST deduplicate and return 0
    const escalatedSecondTime = store.checkAndEscalateUrgentIssues(eventId);
    assert.equal(escalatedSecondTime.length, 0);

    // Verify notifications were delivered to organizers
    const orgNotifs = store.getNotifications('usr-organizer-elena', eventId);
    const urgentAlert = orgNotifs.find(n => n.type === 'urgent_escalation');
    assert.ok(urgentAlert, 'Organizer should receive urgent escalation alert');
  });

  it('does NOT escalate if urgent issue was already acknowledged', () => {
    const eventId = 'ev-ignite-2026';
    const thirtyMinsAgo = new Date(Date.now() - (30 * 60 * 1000)).toISOString();

    const issue = store.createIssue({
      eventId,
      title: 'Power outage in First Aid tent',
      description: 'Generators tripping',
      category: 'equipment',
      severity: ISSUE_SEVERITIES.URGENT,
      reportedBy: 'usr-vol-chloe'
    });
    issue.createdAt = thirtyMinsAgo;
    // Coordinator acknowledged it 5 minutes later
    issue.status = ISSUE_STATUSES.ACKNOWLEDGED;
    issue.acknowledgedAt = new Date(Date.now() - (25 * 60 * 1000)).toISOString();

    const escalated = store.checkAndEscalateUrgentIssues(eventId);
    assert.equal(escalated.filter(i => i.id === issue.id).length, 0);
  });
});
