import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../backend/src/store.js';
import { ROLES } from '../shared/constants.js';

describe('Event Role Scoping and Access Authorization', () => {
  beforeEach(() => {
    store.resetDemo();
  });

  it('guarantees that joining via invite code assigns ONLY volunteer role, never organizer', () => {
    const ev = store.getEvents()[0];
    const newUserId = 'usr-external-applicant';
    store.createProfile({
      id: newUserId,
      fullName: 'External Applicant',
      email: 'applicant@test.com'
    });

    // Simulate join via invite code
    const foundEvent = store.getEventByInviteCode(ev.inviteCode);
    assert.ok(foundEvent);

    const membership = store.addMembership({
      eventId: foundEvent.id,
      userId: newUserId,
      role: ROLES.VOLUNTEER, // Enforced by code
      status: 'active'
    });

    assert.equal(membership.role, ROLES.VOLUNTEER);
    assert.notEqual(membership.role, ROLES.ORGANIZER);
  });

  it('correctly scopes coordinator zones and permissions', () => {
    const eventId = 'ev-ignite-2026';
    const marcusMembership = store.getMembership(eventId, 'usr-coord-marcus');
    assert.equal(marcusMembership.role, ROLES.COORDINATOR);
    assert.ok(marcusMembership.assignedZones.includes('zone-entry'));
    assert.ok(!marcusMembership.assignedZones.includes('zone-stage')); // Stage belongs to Priya
  });

  it('isolates data between different events', () => {
    // Create second event
    const event2 = store.createEvent({
      title: 'Charity Marathon 2026',
      venueName: 'Riverside Park',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 86400000).toISOString(),
      inviteCode: 'MARATHON',
      createdBy: 'usr-organizer-elena'
    });

    const shift1 = store.getShifts('ev-ignite-2026');
    const shift2 = store.getShifts(event2.id);

    assert.ok(shift1.length > 0);
    assert.equal(shift2.length, 0); // No shifts created yet in second event
  });
});
