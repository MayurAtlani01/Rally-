import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import app from '../backend/src/server.js';
import { createTestDatabase } from './helpers/testDb.js';
import { setupTestAuth, registerMockUser, clearMockUsers } from './helpers/authHelper.js';
import { ROLES } from '../shared/constants.js';

describe('Permissions, Event Scoping, and Authorization Boundaries', () => {
  let server;
  let baseUrl;
  let testRepo;
  let db;

  const organizerId = '10000000-0000-0000-0000-000000000001';
  const coordinatorId = '10000000-0000-0000-0000-000000000002';
  const volunteerId = '10000000-0000-0000-0000-000000000003';
  const outsiderId = '10000000-0000-0000-0000-000000000004';

  const organizerToken = 'token-organizer';
  const coordinatorToken = 'token-coordinator';
  const volunteerToken = 'token-volunteer';
  const outsiderToken = 'token-outsider';

  let event1;
  let zoneNorth;
  let zoneSouth;
  let shiftNorth;
  let shiftSouth;

  before(async () => {
    const res = await createTestDatabase();
    db = res.db;
    testRepo = res.repo;
    setupTestAuth(db);

    server = createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    // Register identities
    await registerMockUser(organizerToken, { id: organizerId, email: 'organizer@rally.test', user_metadata: { full_name: 'Elena Vance' } });
    await registerMockUser(coordinatorToken, { id: coordinatorId, email: 'coord@rally.test', user_metadata: { full_name: 'Marcus Brody' } });
    await registerMockUser(volunteerToken, { id: volunteerId, email: 'vol@rally.test', user_metadata: { full_name: 'Maya Lin' } });
    await registerMockUser(outsiderToken, { id: outsiderId, email: 'outsider@rally.test', user_metadata: { full_name: 'Outsider Dave' } });

    // Seed profile records
    await testRepo.upsertProfile({ id: organizerId, email: 'organizer@rally.test', fullName: 'Elena Vance' });
    await testRepo.upsertProfile({ id: coordinatorId, email: 'coord@rally.test', fullName: 'Marcus Brody' });
    await testRepo.upsertProfile({ id: volunteerId, email: 'vol@rally.test', fullName: 'Maya Lin' });
    await testRepo.upsertProfile({ id: outsiderId, email: 'outsider@rally.test', fullName: 'Outsider Dave' });

    // Create Event
    event1 = await testRepo.createEvent({
      title: 'Ignite Fest 2026',
      venueName: 'Central Campus Quad',
      startDate: '2026-10-01T08:00:00.000Z',
      endDate: '2026-10-02T22:00:00.000Z',
      inviteCode: 'IGNITE2026'
    }, organizerId);

    // Create Zones
    zoneNorth = await testRepo.createZone({
      eventId: event1.id,
      name: 'North Entry Gate',
      code: 'GATE',
      posX: 20,
      posY: 30,
      requiredHeadcount: 2
    });

    zoneSouth = await testRepo.createZone({
      eventId: event1.id,
      name: 'South Amphitheater',
      code: 'STAGE',
      posX: 80,
      posY: 70,
      requiredHeadcount: 2
    });

    // Add memberships: coordinator scoped to North Zone only
    await testRepo.addMembership({ eventId: event1.id, userId: coordinatorId, role: ROLES.COORDINATOR });
    await testRepo.updateMembershipRole(event1.id, coordinatorId, ROLES.COORDINATOR, [zoneNorth.id]);

    // Volunteer membership
    await testRepo.addMembership({ eventId: event1.id, userId: volunteerId, role: ROLES.VOLUNTEER });

    // Shifts
    shiftNorth = await testRepo.createShift({
      eventId: event1.id,
      zoneId: zoneNorth.id,
      title: 'Gate Security Shift',
      startTime: '2026-10-01T09:00:00.000Z',
      endTime: '2026-10-01T13:00:00.000Z',
      requiredHeadcount: 2
    });

    shiftSouth = await testRepo.createShift({
      eventId: event1.id,
      zoneId: zoneSouth.id,
      title: 'Stage Audio Shift',
      startTime: '2026-10-01T09:00:00.000Z',
      endTime: '2026-10-01T13:00:00.000Z',
      requiredHeadcount: 2
    });
  });

  after(async () => {
    clearMockUsers();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (db) {
      await db.close();
    }
  });

  it('rejects access from non-members when accessing event routes (403 NOT_A_MEMBER)', async () => {
    const res = await fetch(`${baseUrl}/api/events/${event1.id}/zones`, {
      headers: { Authorization: `Bearer ${outsiderToken}` }
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.code, 'NOT_A_MEMBER');
  });

  it('event listing filters to accessible events and conceals invite codes from non-organizers', async () => {
    // Volunteer views events
    const volRes = await fetch(`${baseUrl}/api/events`, {
      headers: { Authorization: `Bearer ${volunteerToken}` }
    });
    assert.equal(volRes.status, 200);
    const volBody = await volRes.json();
    assert.equal(volBody.events.length, 1);
    assert.equal(volBody.events[0].id, event1.id);
    assert.equal(volBody.events[0].inviteCode, null); // Concealed from volunteer

    // Organizer views events
    const orgRes = await fetch(`${baseUrl}/api/events`, {
      headers: { Authorization: `Bearer ${organizerToken}` }
    });
    assert.equal(orgRes.status, 200);
    const orgBody = await orgRes.json();
    assert.equal(orgBody.events[0].inviteCode, 'IGNITE2026'); // Visible to organizer
  });

  it('coordinator CANNOT assign volunteer to a shift outside their assigned zone (403 ZONE_SCOPE_DENIED)', async () => {
    const res = await fetch(`${baseUrl}/api/events/${event1.id}/shifts/${shiftSouth.id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${coordinatorToken}`
      },
      body: JSON.stringify({ volunteerId })
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.code, 'ZONE_SCOPE_DENIED');
  });

  it('coordinator CAN assign volunteer to a shift within their assigned zone (201)', async () => {
    const res = await fetch(`${baseUrl}/api/events/${event1.id}/shifts/${shiftNorth.id}/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${coordinatorToken}`
      },
      body: JSON.stringify({ volunteerId })
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.assignment.id);
  });

  it('coordinator CANNOT issue QR token for a shift outside their assigned zone (403 ZONE_SCOPE_DENIED)', async () => {
    const res = await fetch(`${baseUrl}/api/events/${event1.id}/attendance/qr-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${coordinatorToken}`
      },
      body: JSON.stringify({ shiftId: shiftSouth.id })
    });
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.code, 'ZONE_SCOPE_DENIED');
  });

  it('issue reporters CANNOT modify status or assignee (403 INSUFFICIENT_PERMISSIONS)', async () => {
    // Volunteer reports an issue
    const reportRes = await fetch(`${baseUrl}/api/events/${event1.id}/issues`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volunteerToken}`
      },
      body: JSON.stringify({
        title: 'Leaky tent',
        description: 'Water leaking onto equipment',
        zoneId: zoneNorth.id
      })
    });
    assert.equal(reportRes.status, 201);
    const { issue } = await reportRes.json();

    // Volunteer attempts to resolve issue or reassign it
    const updateRes = await fetch(`${baseUrl}/api/events/${event1.id}/issues/${issue.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volunteerToken}`
      },
      body: JSON.stringify({
        status: 'resolved'
      })
    });
    assert.equal(updateRes.status, 403);
    const updateBody = await updateRes.json();
    assert.equal(updateBody.code, 'INSUFFICIENT_PERMISSIONS');
  });

  it('notification ownership: user cannot mark another user’s notification as read (404/403)', async () => {
    // Create notification for organizer
    const notif = await testRepo.createNotification({
      eventId: event1.id,
      userId: organizerId,
      type: 'test_alert',
      title: 'Secret Organizer Alert',
      message: 'Confidential'
    });

    // Volunteer tries to mark organizer's notification as read
    const res = await fetch(`${baseUrl}/api/notifications/${notif.id}/read`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${volunteerToken}` }
    });
    assert.equal(res.status, 404);
  });

  it('zone update verifies zone belongs to event and adheres to field allowlist', async () => {
    // Attempt update with arbitrary unallowed field
    const res = await fetch(`${baseUrl}/api/events/${event1.id}/zones/${zoneNorth.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({
        name: 'North Entry Gate Renamed',
        randomInjectedField: 'dangerous'
      })
    });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.zone.name, 'North Entry Gate Renamed');
    assert.equal(body.zone.randomInjectedField, undefined);
  });
});
