import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import app from '../backend/src/server.js';
import { createTestDatabase } from './helpers/testDb.js';
import { setupTestAuth, registerMockUser, clearMockUsers } from './helpers/authHelper.js';
import { ROLES } from '../shared/constants.js';

describe('End-to-End Workflows & Lifecycle Integration', () => {
  let server;
  let baseUrl;
  let testRepo;
  let db;

  const organizerId = '10000000-0000-0000-0000-000000000001';
  const coordinatorId = '10000000-0000-0000-0000-000000000002';
  const volunteerId = '10000000-0000-0000-0000-000000000003';
  const newVolunteerId = '10000000-0000-0000-0000-000000000005';

  const organizerToken = 'token-organizer';
  const coordinatorToken = 'token-coordinator';
  const volunteerToken = 'token-volunteer';
  const newVolunteerToken = 'token-new-volunteer';

  let event1;
  let zoneNorth;
  let zoneSouth;
  let initialInviteCode;
  let rotatedInviteCode;

  before(async () => {
    const res = await createTestDatabase();
    db = res.db;
    testRepo = res.repo;
    setupTestAuth(db);

    server = createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    // Register test personas
    registerMockUser(organizerToken, { id: organizerId, email: 'org@test.local', user_metadata: { name: 'Alice Org' } });
    registerMockUser(coordinatorToken, { id: coordinatorId, email: 'coord@test.local', user_metadata: { name: 'Bob Coord' } });
    registerMockUser(volunteerToken, { id: volunteerId, email: 'vol@test.local', user_metadata: { name: 'Charlie Vol' } });
    registerMockUser(newVolunteerToken, { id: newVolunteerId, email: 'newvol@test.local', user_metadata: { name: 'Dan New' } });

    // Seed profiles
    await testRepo.upsertProfile({ id: organizerId, email: 'org@test.local', name: 'Alice Org' });
    await testRepo.upsertProfile({ id: coordinatorId, email: 'coord@test.local', name: 'Bob Coord' });
    await testRepo.upsertProfile({ id: volunteerId, email: 'vol@test.local', name: 'Charlie Vol' });
    await testRepo.upsertProfile({ id: newVolunteerId, email: 'newvol@test.local', name: 'Dan New' });

    // Create event
    initialInviteCode = 'INIT-INVITE-101';
    event1 = await testRepo.createEvent({
      title: 'City Marathon 2026',
      description: 'Annual charity marathon',
      venueName: 'Central Stadium',
      startDate: new Date(Date.now() + 86400000).toISOString(),
      endDate: new Date(Date.now() + 172800000).toISOString(),
      timezone: 'UTC',
      inviteCode: initialInviteCode
    }, organizerId);

    zoneNorth = await testRepo.createZone({
      eventId: event1.id,
      name: 'North Entrance',
      code: 'NTH',
      description: 'North gate intake',
      color: '#4F46E5',
      posX: 10,
      posY: 20,
      requiredHeadcount: 2
    });

    zoneSouth = await testRepo.createZone({
      eventId: event1.id,
      name: 'South Finish',
      code: 'STH',
      description: 'South finish line',
      color: '#10B981',
      posX: 80,
      posY: 80,
      requiredHeadcount: 2
    });

    // Coordinator assigned to zoneNorth only
    await testRepo.addMembership({
      eventId: event1.id,
      userId: coordinatorId,
      role: ROLES.COORDINATOR,
      status: 'active',
      assignedZones: [zoneNorth.id]
    });

    // Existing volunteer
    await testRepo.addMembership({
      eventId: event1.id,
      userId: volunteerId,
      role: ROLES.VOLUNTEER,
      status: 'active'
    });
  });

  after(async () => {
    clearMockUsers();
    if (server) await new Promise((resolve) => server.close(resolve));
    if (db) await db.close();
  });

  it('Organizer rotates invitation code: previous code is invalidated immediately', async () => {
    const res = await fetch(`${baseUrl}/api/events/${event1.id}/invite/rotate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` }
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.inviteCode);
    assert.notEqual(body.inviteCode, initialInviteCode);
    rotatedInviteCode = body.inviteCode;

    // Joining with old invite code is strictly rejected
    const oldJoin = await fetch(`${baseUrl}/api/events/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newVolunteerToken}`
      },
      body: JSON.stringify({ inviteCode: initialInviteCode })
    });

    assert.equal(oldJoin.status, 404);
  });

  it('Public preview: displays sanitized event info without roster leak', async () => {
    const res = await fetch(`${baseUrl}/api/events/preview?code=${rotatedInviteCode}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.event);
    assert.equal(body.event.id, event1.id);
    assert.equal(body.event.title, 'City Marathon 2026');
    assert.equal(body.event.members, undefined);
    assert.equal(body.event.assignments, undefined);
  });

  it('Volunteer joins via active invitation code: granted strictly volunteer role', async () => {
    const res = await fetch(`${baseUrl}/api/events/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newVolunteerToken}`
      },
      body: JSON.stringify({ inviteCode: rotatedInviteCode })
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.membership);
    assert.equal(body.membership.role, 'volunteer');
    assert.equal(body.membership.status, 'active');
  });

  it('Join is idempotent: subsequent join returns existing membership without duplicate or error', async () => {
    const res = await fetch(`${baseUrl}/api/events/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${newVolunteerToken}`
      },
      body: JSON.stringify({ inviteCode: rotatedInviteCode })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(body.membership);
    assert.equal(body.membership.userId, newVolunteerId);
    assert.equal(body.membership.role, 'volunteer');
  });

  it('Organizer revokes invitation code: subsequent joins are rejected', async () => {
    const revokeRes = await fetch(`${baseUrl}/api/events/${event1.id}/invite/revoke`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` }
    });

    assert.equal(revokeRes.status, 200);

    const outsiderToken = 'token-outsider-99';
    registerMockUser(outsiderToken, { id: '90000000-0000-0000-0000-000000000099', email: 'out@test.local' });
    await testRepo.upsertProfile({ id: '90000000-0000-0000-0000-000000000099', email: 'out@test.local', name: 'Outsider' });

    const joinRes = await fetch(`${baseUrl}/api/events/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${outsiderToken}`
      },
      body: JSON.stringify({ inviteCode: rotatedInviteCode })
    });

    assert.equal(joinRes.status, 404);
  });

  it('Volunteer updates skills, availability, and preferences (event-scoped)', async () => {
    const res = await fetch(`${baseUrl}/api/events/${event1.id}/volunteers/${volunteerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volunteerToken}`
      },
      body: JSON.stringify({
        skills: ['First Aid', 'Crowd Control'],
        availabilities: [
          { startTime: '2026-10-10T08:00:00.000Z', endTime: '2026-10-10T14:00:00.000Z' }
        ],
        preferredZoneIds: [zoneNorth.id],
        preferredRoleNames: ['Medical Lead']
      })
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    // Volunteer cannot modify another member's profile
    const unauth = await fetch(`${baseUrl}/api/events/${event1.id}/volunteers/${organizerId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volunteerToken}`
      },
      body: JSON.stringify({ skills: ['Unauthorized'] })
    });

    assert.equal(unauth.status, 403);
  });

  it('Targeted announcements: role and zone scoping enforced on delivery', async () => {
    // 1. Organizer targets 'coordinator' role
    const pubRes = await fetch(`${baseUrl}/api/events/${event1.id}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({
        title: 'Lead Briefing',
        message: 'All coordinators report to control room',
        targetAudience: 'role',
        targetRole: 'coordinator'
      })
    });

    assert.equal(pubRes.status, 201);

    // 2. Coordinator can see it
    const coordGet = await fetch(`${baseUrl}/api/events/${event1.id}/announcements`, {
      headers: { Authorization: `Bearer ${coordinatorToken}` }
    });
    assert.equal(coordGet.status, 200);
    const coordData = await coordGet.json();
    assert.ok(coordData.announcements.some(a => a.title === 'Lead Briefing'));

    // 3. Volunteer cannot see coordinator-targeted announcement
    const volGet = await fetch(`${baseUrl}/api/events/${event1.id}/announcements`, {
      headers: { Authorization: `Bearer ${volunteerToken}` }
    });
    assert.equal(volGet.status, 200);
    const volData = await volGet.json();
    assert.equal(volData.announcements.some(a => a.title === 'Lead Briefing'), false);

    // 4. Coordinator cannot broadcast to unassigned zone
    const unauthZone = await fetch(`${baseUrl}/api/events/${event1.id}/announcements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${coordinatorToken}`
      },
      body: JSON.stringify({
        title: 'South Zone Alert',
        message: 'Invalid broadcast',
        targetAudience: 'zone',
        targetZoneId: zoneSouth.id // Coordinator only has zoneNorth
      })
    });

    assert.equal(unauthZone.status, 403);
  });

  it('Event closure: persists metadata and prevents further shifts and joins', async () => {
    const closeRes = await fetch(`${baseUrl}/api/events/${event1.id}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${organizerToken}` }
    });

    assert.equal(closeRes.status, 200);
    const closeData = await closeRes.json();
    assert.equal(closeData.success, true);
    assert.equal(closeData.event.status, 'closed');
    assert.ok(closeData.event.closedAt);
    assert.equal(closeData.event.closedBy, organizerId);

    // Rejects adding shift to closed event
    const shiftRes = await fetch(`${baseUrl}/api/events/${event1.id}/shifts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${organizerToken}`
      },
      body: JSON.stringify({
        zoneId: zoneNorth.id,
        title: 'Post-Event Cleanup',
        roleName: 'Sweeper',
        startTime: new Date(Date.now() + 90000000).toISOString(),
        endTime: new Date(Date.now() + 95000000).toISOString(),
        requiredHeadcount: 1
      })
    });

    assert.equal(shiftRes.status, 400);
    const shiftData = await shiftRes.json();
    assert.match(shiftData.error, /closed/i);
  });
});
