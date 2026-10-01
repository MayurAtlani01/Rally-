import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAdjacentOrNonOverlapping,
  evaluateVolunteerEligibility,
  rankEligibleCandidates,
  previewReassignmentImpact
} from '../shared/matching.js';
import { ASSIGNMENT_STATUSES } from '../shared/constants.js';

describe('RALLY Matching and Eligibility Engine', () => {
  it('correctly treats adjacent shifts as non-overlapping', () => {
    // 09:00 - 11:00 and 11:00 - 13:00 are adjacent
    const shift1Start = '2026-10-01T09:00:00Z';
    const shift1End = '2026-10-01T11:00:00Z';
    const shift2Start = '2026-10-01T11:00:00Z';
    const shift2End = '2026-10-01T13:00:00Z';

    assert.equal(isAdjacentOrNonOverlapping(shift1Start, shift1End, shift2Start, shift2End), true);
  });

  it('correctly detects overlapping shifts', () => {
    // 09:00 - 12:00 and 11:00 - 14:00 overlap from 11:00 to 12:00
    const shift1Start = '2026-10-01T09:00:00Z';
    const shift1End = '2026-10-01T12:00:00Z';
    const shift2Start = '2026-10-01T11:00:00Z';
    const shift2End = '2026-10-01T14:00:00Z';

    assert.equal(isAdjacentOrNonOverlapping(shift1Start, shift1End, shift2Start, shift2End), false);
  });

  it('rejects candidate if required skills are missing', () => {
    const shift = {
      id: 'shift-1',
      startTime: '2026-10-01T10:00:00Z',
      endTime: '2026-10-01T12:00:00Z',
      requiredSkills: ['First Aid', 'Crowd Control'],
      preferredSkills: []
    };

    const volunteer = {
      id: 'vol-1',
      name: 'Taylor Swift',
      membershipStatus: 'active',
      skills: ['Crowd Control'], // Missing 'First Aid'
      availabilities: [{ startTime: '2026-10-01T08:00:00Z', endTime: '2026-10-01T18:00:00Z' }]
    };

    const result = evaluateVolunteerEligibility(volunteer, shift);
    assert.equal(result.isEligible, false);
    assert.match(result.ineligibilityReasons[0], /Missing required skill\(s\): First Aid/);
  });

  it('rejects candidate if availability does not cover the shift window', () => {
    const shift = {
      id: 'shift-1',
      startTime: '2026-10-01T10:00:00Z',
      endTime: '2026-10-01T14:00:00Z',
      requiredSkills: [],
      preferredSkills: []
    };

    const volunteer = {
      id: 'vol-1',
      name: 'Jordan Lee',
      membershipStatus: 'active',
      skills: [],
      // Availability ends at 12:00, but shift ends at 14:00
      availabilities: [{ startTime: '2026-10-01T09:00:00Z', endTime: '2026-10-01T12:00:00Z' }]
    };

    const result = evaluateVolunteerEligibility(volunteer, shift);
    assert.equal(result.isEligible, false);
    assert.match(result.ineligibilityReasons[0], /does not fully cover/);
  });

  it('prioritizes candidate with fewer assigned hours (fair workload distribution)', () => {
    const shift = {
      id: 'shift-target',
      zoneId: 'zone-1',
      startTime: '2026-10-01T14:00:00Z',
      endTime: '2026-10-01T16:00:00Z',
      requiredSkills: [],
      preferredSkills: []
    };

    const volHeavy = {
      id: 'vol-heavy',
      name: 'Sam High Hours',
      membershipStatus: 'active',
      skills: [],
      availabilities: [{ startTime: '2026-10-01T08:00:00Z', endTime: '2026-10-01T20:00:00Z' }]
    };

    const volLight = {
      id: 'vol-light',
      name: 'Alex Zero Hours',
      membershipStatus: 'active',
      skills: [],
      availabilities: [{ startTime: '2026-10-01T08:00:00Z', endTime: '2026-10-01T20:00:00Z' }]
    };

    const morningShift = {
      id: 'shift-morning',
      startTime: '2026-10-01T09:00:00Z',
      endTime: '2026-10-01T13:00:00Z' // 4 hours
    };

    const existingAssignments = [
      { id: 'asgn-1', volunteerId: 'vol-heavy', shiftId: 'shift-morning', status: ASSIGNMENT_STATUSES.ASSIGNED }
    ];

    const ranked = rankEligibleCandidates([volHeavy, volLight], shift, {
      allShifts: [morningShift, shift],
      allAssignments: existingAssignments
    });

    assert.equal(ranked.eligible.length, 2);
    // vol-light has 0 hours assigned, should be ranked 1st
    assert.equal(ranked.eligible[0].volunteer.id, 'vol-light');
    assert.equal(ranked.eligible[1].volunteer.id, 'vol-heavy');
  });

  it('ignores canceled assignments so canceled shift does not block new assignment or count in workload', () => {
    const shift = {
      id: 'shift-target',
      zoneId: 'zone-1',
      startTime: '2026-10-01T10:00:00Z',
      endTime: '2026-10-01T12:00:00Z',
      requiredSkills: [],
      preferredSkills: []
    };

    const volunteer = {
      id: 'vol-1',
      name: 'Casey',
      membershipStatus: 'active',
      skills: [],
      availabilities: [{ startTime: '2026-10-01T08:00:00Z', endTime: '2026-10-01T20:00:00Z' }]
    };

    // Had an assignment on this exact shift, but canceled!
    const assignments = [
      { id: 'asgn-old', volunteerId: 'vol-1', shiftId: 'shift-target', status: ASSIGNMENT_STATUSES.CANCELED }
    ];

    const result = evaluateVolunteerEligibility(volunteer, shift, {
      allShifts: [shift],
      allAssignments: assignments
    });

    assert.equal(result.isEligible, true);
    assert.equal(result.currentAssignedHours, 0);
  });

  it('generates an accurate reassignment preview with understaffing warnings', () => {
    const zoneMain = { id: 'z-main', name: 'Main Stage' };
    const zoneReg = { id: 'z-reg', name: 'Registration' };

    const sourceShift = {
      id: 'shift-main',
      zoneId: 'z-main',
      title: 'Stage Usher',
      startTime: '2026-10-01T14:00:00Z',
      endTime: '2026-10-01T18:00:00Z',
      requiredHeadcount: 2
    };

    const targetShift = {
      id: 'shift-reg',
      zoneId: 'z-reg',
      title: 'Registration Desk',
      startTime: '2026-10-01T14:00:00Z',
      endTime: '2026-10-01T18:00:00Z',
      requiredHeadcount: 3
    };

    const volunteer = {
      id: 'vol-star',
      name: 'Riley',
      membershipStatus: 'active',
      skills: ['Hospitality'],
      availabilities: [{ startTime: '2026-10-01T10:00:00Z', endTime: '2026-10-01T20:00:00Z' }]
    };

    // Currently only 2 volunteers on Main Stage (Riley + another)
    const assignments = [
      { id: 'asgn-1', volunteerId: 'vol-star', shiftId: 'shift-main', status: ASSIGNMENT_STATUSES.ASSIGNED },
      { id: 'asgn-2', volunteerId: 'vol-other', shiftId: 'shift-main', status: ASSIGNMENT_STATUSES.ASSIGNED },
      { id: 'asgn-3', volunteerId: 'vol-reg-1', shiftId: 'shift-reg', status: ASSIGNMENT_STATUSES.ASSIGNED }
    ];

    const preview = previewReassignmentImpact({
      volunteer,
      sourceShift,
      targetShift,
      allShifts: [sourceShift, targetShift],
      allAssignments: assignments,
      allZones: [zoneMain, zoneReg]
    });

    assert.equal(preview.isEligible, true);
    // Source was 2/2, will become 1/2, so understaffed!
    assert.equal(preview.sourceZone.beforeCount, 2);
    assert.equal(preview.sourceZone.afterCount, 1);
    assert.equal(preview.sourceZone.willBeUnderstaffed, true);
    assert.match(preview.warnings[0], /leave Main Stage understaffed/);

    // Target was 1/3, will become 2/3
    assert.equal(preview.targetZone.beforeCount, 1);
    assert.equal(preview.targetZone.afterCount, 2);
  });
});
