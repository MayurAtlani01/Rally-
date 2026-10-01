import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDatabase } from './helpers/testDb.js';
import { ROLES, ASSIGNMENT_STATUSES } from '../shared/constants.js';

describe('Postgres Database Transactions & Concurrency Integrity', () => {
  let db;
  let repo;

  const orgId = '20000000-0000-0000-0000-000000000001';
  const vol1Id = '20000000-0000-0000-0000-000000000002';
  const vol2Id = '20000000-0000-0000-0000-000000000003';

  let event;
  let zone;
  let shiftSingleSlot;
  let shiftOverlap;
  let shiftTarget;

  before(async () => {
    const res = await createTestDatabase();
    db = res.db;
    repo = res.repo;

    // Seed users in auth & profiles
    for (const uid of [orgId, vol1Id, vol2Id]) {
      await db.query('insert into auth.users (id, email) values ($1, $2);', [uid, `${uid}@test.local`]);
      await repo.upsertProfile({ id: uid, email: `${uid}@test.local`, fullName: `User ${uid.slice(-4)}` });
    }

    // Atomic event creation
    event = await repo.createEvent({
      title: 'Hackathon 2026',
      venueName: 'Tech Arena',
      startDate: '2026-10-01T08:00:00.000Z',
      endDate: '2026-10-02T20:00:00.000Z',
      inviteCode: 'HACK26'
    }, orgId);

    // Verify creator is automatically an Organizer
    const creatorMem = await repo.getMembership(event.id, orgId);
    assert.equal(creatorMem.role, ROLES.ORGANIZER);

    // Add volunteers
    await repo.addMembership({ eventId: event.id, userId: vol1Id, role: ROLES.VOLUNTEER });
    await repo.addMembership({ eventId: event.id, userId: vol2Id, role: ROLES.VOLUNTEER });

    // Zone
    zone = await repo.createZone({
      eventId: event.id,
      name: 'Main Stage',
      code: 'STAGE',
      requiredHeadcount: 1
    });

    // Single-slot shift (headcount = 1)
    shiftSingleSlot = await repo.createShift({
      eventId: event.id,
      zoneId: zone.id,
      title: 'VIP Stage Shift',
      startTime: '2026-10-01T10:00:00.000Z',
      endTime: '2026-10-01T14:00:00.000Z',
      requiredHeadcount: 1
    });

    // Overlapping shift (11:00 - 15:00)
    shiftOverlap = await repo.createShift({
      eventId: event.id,
      zoneId: zone.id,
      title: 'Midday Stage Shift',
      startTime: '2026-10-01T11:00:00.000Z',
      endTime: '2026-10-01T15:00:00.000Z',
      requiredHeadcount: 2
    });

    // Target shift for reassignment (16:00 - 20:00)
    shiftTarget = await repo.createShift({
      eventId: event.id,
      zoneId: zone.id,
      title: 'Evening Stage Shift',
      startTime: '2026-10-01T16:00:00.000Z',
      endTime: '2026-10-01T20:00:00.000Z',
      requiredHeadcount: 2
    });
  });

  it('assigns first volunteer to shift and fills available capacity', async () => {
    const asgn = await repo.assignVolunteerAtomic({
      eventId: event.id,
      shiftId: shiftSingleSlot.id,
      volunteerId: vol1Id,
      assignedBy: orgId
    });
    assert.ok(asgn.id);
    assert.equal(asgn.status, ASSIGNMENT_STATUSES.ASSIGNED);
  });

  it('strictly prevents capacity overflow: second assignment to filled shift is rejected', async () => {
    await assert.rejects(
      async () => {
        await repo.assignVolunteerAtomic({
          eventId: event.id,
          shiftId: shiftSingleSlot.id,
          volunteerId: vol2Id,
          assignedBy: orgId
        });
      },
      (err) => {
        assert.match(err.message, /full capacity/i);
        return true;
      }
    );
  });

  it('strictly prevents duplicate assignment of same volunteer to same shift', async () => {
    await assert.rejects(
      async () => {
        await repo.assignVolunteerAtomic({
          eventId: event.id,
          shiftId: shiftSingleSlot.id,
          volunteerId: vol1Id,
          assignedBy: orgId
        });
      },
      (err) => {
        assert.match(err.message, /(already assigned|full capacity)/i);
        return true;
      }
    );
  });

  it('strictly prevents overlapping shifts for a volunteer across different shifts', async () => {
    // vol1 is assigned 10:00 - 14:00 on shiftSingleSlot.
    // shiftOverlap is 11:00 - 15:00. Attempting to assign vol1 to shiftOverlap must fail.
    await assert.rejects(
      async () => {
        await repo.assignVolunteerAtomic({
          eventId: event.id,
          shiftId: shiftOverlap.id,
          volunteerId: vol1Id,
          assignedBy: orgId
        });
      },
      (err) => {
        assert.match(err.message, /overlapping active shift/i);
        return true;
      }
    );
  });

  it('atomic reassignment: moves volunteer from source to target and cancels source atomically', async () => {
    // Move vol1 from shiftSingleSlot to shiftTarget
    const res = await repo.reassignVolunteerAtomic({
      eventId: event.id,
      sourceShiftId: shiftSingleSlot.id,
      targetShiftId: shiftTarget.id,
      volunteerId: vol1Id,
      assignedBy: orgId
    });

    assert.ok(res.newAssignment.id);
    assert.equal(res.newAssignment.shiftId, shiftTarget.id);

    // Source assignment must now be canceled
    const sourceAsgn = await repo.getAssignmentById(res.previousAssignmentId);
    assert.equal(sourceAsgn.status, ASSIGNMENT_STATUSES.CANCELED);

    // shiftSingleSlot should now have 0 active assignments, freeing up the slot!
    const activeAssignments = (await repo.getAssignments(event.id, shiftSingleSlot.id))
      .filter(a => a.status !== 'canceled' && a.status !== 'absent');
    assert.equal(activeAssignments.length, 0);

    // Now vol2 can be assigned to shiftSingleSlot!
    const newAsgn = await repo.assignVolunteerAtomic({
      eventId: event.id,
      shiftId: shiftSingleSlot.id,
      volunteerId: vol2Id,
      assignedBy: orgId
    });
    assert.ok(newAsgn.id);
  });

  it('atomic check-in window: rejects check-in if shift has already concluded', async () => {
    // Create shift in the past
    const pastShift = await repo.createShift({
      eventId: event.id,
      zoneId: zone.id,
      title: 'Yesterday Shift',
      startTime: '2026-09-30T08:00:00.000Z',
      endTime: '2026-09-30T12:00:00.000Z',
      requiredHeadcount: 1
    });

    const asgn = await repo.assignVolunteerAtomic({
      eventId: event.id,
      shiftId: pastShift.id,
      volunteerId: vol1Id,
      assignedBy: orgId
    });

    await assert.rejects(
      async () => {
        await repo.recordCheckInAtomic({
          eventId: event.id,
          assignmentId: asgn.id,
          volunteerId: vol1Id,
          method: 'self'
        });
      },
      (err) => {
        assert.match(err.message, /concluded|closed/i);
        return true;
      }
    );
  });

  it('prevents duplicate active check-in for the same assignment', async () => {
    // Create shift active right now
    const now = new Date();
    const activeShift = await repo.createShift({
      eventId: event.id,
      zoneId: zone.id,
      title: 'Current Active Shift',
      startTime: new Date(now.getTime() - 10 * 60 * 1000).toISOString(),
      endTime: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
      requiredHeadcount: 1
    });

    // Cancel previous conflicting assignment for vol2
    const prevAssignments = await repo.getAssignments(event.id, shiftSingleSlot.id);
    for (const a of prevAssignments) {
      if (a.volunteerId === vol2Id) await repo.cancelAssignment(a.id, 'cleanup', orgId);
    }

    const asgn = await repo.assignVolunteerAtomic({
      eventId: event.id,
      shiftId: activeShift.id,
      volunteerId: vol2Id,
      assignedBy: orgId
    });

    // First check-in succeeds
    const att = await repo.recordCheckInAtomic({
      eventId: event.id,
      assignmentId: asgn.id,
      volunteerId: vol2Id,
      method: 'self'
    });
    assert.ok(att.id);

    // Second check-in before checkout must fail
    await assert.rejects(
      async () => {
        await repo.recordCheckInAtomic({
          eventId: event.id,
          assignmentId: asgn.id,
          volunteerId: vol2Id,
          method: 'self'
        });
      },
      (err) => {
        assert.match(err.message, /already checked in/i);
        return true;
      }
    );

    // Checkout succeeds
    const checkout = await repo.recordCheckOutAtomic({
      eventId: event.id,
      attendanceId: att.id
    });
    assert.ok(checkout.checkOutTime);

    // Duplicate check-out must fail
    await assert.rejects(
      async () => {
        await repo.recordCheckOutAtomic({
          eventId: event.id,
          attendanceId: att.id
        });
      },
      (err) => {
        assert.match(err.message, /already completed/i);
        return true;
      }
    );
  });

  it('atomic escalation: claims due issues and deduplicates concurrent escalation cycles', async () => {
    // Insert an urgent issue that was created 20 minutes ago
    const pastTime = new Date(Date.now() - 20 * 60 * 1000).toISOString();
    const insertRes = await db.query(`
      insert into public.issues (
        event_id, zone_id, title, description, category, severity, status, reported_by, created_at
      ) values (
        $1, $2, 'Fire alarm sounding', 'Alarm tripped near zone', 'safety', 'urgent', 'open', $3, $4
      ) returning id;
    `, [event.id, zone.id, vol1Id, pastTime]);

    const issueId = insertRes.rows[0].id;

    // First escalation cycle claims it
    const escalatedFirst = await repo.checkAndEscalateUrgentIssues(15);
    assert.ok(escalatedFirst.some(i => i.id === issueId));

    // Second escalation cycle finds 0 because it was already claimed and marked escalated_at
    const escalatedSecond = await repo.checkAndEscalateUrgentIssues(15);
    assert.ok(!escalatedSecond.some(i => i.id === issueId));
  });

  after(async () => {
    if (db) await db.close();
  });
});
