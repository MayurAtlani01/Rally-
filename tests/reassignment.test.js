import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../backend/src/store.js';
import { ASSIGNMENT_STATUSES } from '../shared/constants.js';

describe('Atomic Reassignment and Replacement Workflow', () => {
  beforeEach(() => {
    store.resetDemo();
  });

  it('atomically moves a volunteer from source shift to target shift', () => {
    const eventId = 'ev-ignite-2026';
    const volunteerId = 'usr-vol-maya';
    const sourceShiftId = 'shift-entry-afternoon';
    const targetShiftId = 'shift-reg-afternoon';

    // Maya Lin is currently assigned to Entry Afternoon
    const sourceAsgnBefore = store.getAssignments(eventId, sourceShiftId).find(
      a => a.volunteerId === volunteerId && a.status === ASSIGNMENT_STATUSES.ASSIGNED
    );
    assert.ok(sourceAsgnBefore, 'Source assignment should exist initially');

    const result = store.reassignVolunteerAtomic({
      eventId,
      volunteerId,
      sourceShiftId,
      targetShiftId,
      assignedBy: 'usr-organizer-elena'
    });

    assert.equal(result.success, true);
    assert.equal(result.canceledAssignment.status, ASSIGNMENT_STATUSES.CANCELED);
    assert.equal(result.newAssignment.shiftId, targetShiftId);
    assert.equal(result.newAssignment.volunteerId, volunteerId);

    // Verify source assignment is no longer active in store
    const activeOnSource = store.getAssignments(eventId, sourceShiftId).filter(
      a => a.volunteerId === volunteerId && a.status !== ASSIGNMENT_STATUSES.CANCELED
    );
    assert.equal(activeOnSource.length, 0);

    // Verify new assignment is active on target shift
    const activeOnTarget = store.getAssignments(eventId, targetShiftId).filter(
      a => a.volunteerId === volunteerId && a.status === ASSIGNMENT_STATUSES.ASSIGNED
    );
    assert.equal(activeOnTarget.length, 1);
  });

  it('fails atomically if volunteer does not have active assignment on source shift', () => {
    const eventId = 'ev-ignite-2026';
    const volunteerId = 'usr-vol-chloe'; // Chloe is not on Entry Afternoon
    const sourceShiftId = 'shift-entry-afternoon';
    const targetShiftId = 'shift-stage-afternoon';

    assert.throws(() => {
      store.reassignVolunteerAtomic({
        eventId,
        volunteerId,
        sourceShiftId,
        targetShiftId,
        assignedBy: 'usr-organizer-elena'
      });
    }, /does not have an active assignment/);
  });
});
