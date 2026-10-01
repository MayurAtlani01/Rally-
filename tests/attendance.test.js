import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../backend/src/store.js';
import { ASSIGNMENT_STATUSES } from '../shared/constants.js';

describe('Attendance and Check-In Engine', () => {
  beforeEach(() => {
    store.resetDemo();
  });

  it('records check-in and updates assignment status', () => {
    const eventId = 'ev-ignite-2026';
    const assignment = store.data.assignments.find(a => a.status === ASSIGNMENT_STATUSES.ASSIGNED);
    assert.ok(assignment, 'Found assigned shift');

    const record = store.recordCheckIn({
      eventId,
      assignmentId: assignment.id,
      volunteerId: assignment.volunteerId,
      shiftId: assignment.shiftId,
      method: 'self',
      notes: 'On-time arrival at gate'
    });

    assert.ok(record.id);
    assert.equal(record.assignmentId, assignment.id);
    assert.equal(assignment.status, ASSIGNMENT_STATUSES.CHECKED_IN);
  });

  it('prevents duplicate active check-ins for the same assignment', () => {
    const eventId = 'ev-ignite-2026';
    const assignment = store.data.assignments.find(a => a.status === ASSIGNMENT_STATUSES.ASSIGNED);

    store.recordCheckIn({
      eventId,
      assignmentId: assignment.id,
      volunteerId: assignment.volunteerId,
      shiftId: assignment.shiftId,
      method: 'self'
    });

    assert.throws(() => {
      store.recordCheckIn({
        eventId,
        assignmentId: assignment.id,
        volunteerId: assignment.volunteerId,
        shiftId: assignment.shiftId,
        method: 'self'
      });
    }, /already checked in/);
  });

  it('records check-out and completes assignment', () => {
    const eventId = 'ev-ignite-2026';
    const assignment = store.data.assignments.find(a => a.status === ASSIGNMENT_STATUSES.ASSIGNED);

    const checkIn = store.recordCheckIn({
      eventId,
      assignmentId: assignment.id,
      volunteerId: assignment.volunteerId,
      shiftId: assignment.shiftId,
      method: 'self'
    });

    const checkOut = store.recordCheckOut({
      attendanceId: checkIn.id,
      notes: 'Shift completed with all tasks done'
    });

    assert.ok(checkOut.checkOutTime);
    assert.equal(assignment.status, ASSIGNMENT_STATUSES.COMPLETED);

    // Verify attended hours are positive
    const hrs = (new Date(checkOut.checkOutTime) - new Date(checkOut.checkInTime)) / (1000 * 60 * 60);
    assert.ok(hrs >= 0);
  });
});
