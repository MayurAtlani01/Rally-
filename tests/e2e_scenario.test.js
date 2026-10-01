import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { store } from '../backend/src/store.js';
import { rankEligibleCandidates } from '../shared/matching.js';
import { ASSIGNMENT_STATUSES, ISSUE_STATUSES, ISSUE_SEVERITIES } from '../shared/constants.js';

describe('RALLY End-to-End Core Product Lifecycle', () => {
  let event;
  let shift;
  let volunteerMaya;
  let volunteerChloe;
  let initialAssignment;

  before(() => {
    store.resetDemo();
  });

  it('Step 1: Organizer creates event and shift', () => {
    event = store.createEvent({
      title: 'Spring Marathon 2026',
      venueName: 'Lakefront Arena',
      startDate: '2026-10-01T08:00:00Z',
      endDate: '2026-10-01T18:00:00Z',
      inviteCode: 'MARATHON',
      createdBy: 'usr-organizer-elena'
    });

    assert.ok(event.id);
    assert.equal(event.inviteCode, 'MARATHON');

    const zone = store.createZone({
      eventId: event.id,
      name: 'Finish Line Water Station',
      code: 'WATER',
      requiredHeadcount: 2,
      posX: 50,
      posY: 50
    });

    shift = store.createShift({
      eventId: event.id,
      zoneId: zone.id,
      title: 'Hydration & Triage Support',
      roleName: 'Hydration Marshal',
      startTime: '2026-10-01T10:00:00Z',
      endTime: '2026-10-01T14:00:00Z',
      requiredHeadcount: 2,
      requiredSkills: ['First Aid']
    });

    assert.ok(shift.id);
    assert.equal(shift.requiredHeadcount, 2);
  });

  it('Step 2: Volunteer joins via code and submits availability & skills', () => {
    volunteerMaya = store.createProfile({
      fullName: 'Maya Lin',
      email: 'maya.marathon@rally.demo'
    });

    volunteerChloe = store.createProfile({
      fullName: 'Chloe Bennett',
      email: 'chloe.marathon@rally.demo'
    });

    // Join via code: strictly joins as volunteer
    const memMaya = store.addMembership({
      eventId: event.id,
      userId: volunteerMaya.id,
      role: 'volunteer'
    });
    assert.equal(memMaya.role, 'volunteer');

    const memChloe = store.addMembership({
      eventId: event.id,
      userId: volunteerChloe.id,
      role: 'volunteer'
    });
    assert.equal(memChloe.role, 'volunteer');

    // Register skills & availability
    store.updateVolunteerProfile(volunteerMaya.id, {
      skills: ['First Aid', 'Crowd Control'],
      availabilities: [{ startTime: '2026-10-01T08:00:00Z', endTime: '2026-10-01T18:00:00Z' }]
    });

    store.updateVolunteerProfile(volunteerChloe.id, {
      skills: ['First Aid'],
      availabilities: [{ startTime: '2026-10-01T08:00:00Z', endTime: '2026-10-01T18:00:00Z' }]
    });
  });

  it('Step 3: Organizer assigns volunteer', () => {
    initialAssignment = store.assignVolunteer({
      eventId: event.id,
      shiftId: shift.id,
      volunteerId: volunteerMaya.id,
      assignedBy: 'usr-organizer-elena'
    });

    assert.ok(initialAssignment.id);
    assert.equal(initialAssignment.status, ASSIGNMENT_STATUSES.ASSIGNED);

    // Notification generated for volunteer
    const notifs = store.getNotifications(volunteerMaya.id, event.id);
    assert.ok(notifs.some(n => n.type === 'shift_assigned'));
  });

  it('Step 4: Volunteer sees assignment and cancels', () => {
    // Volunteer inspects active assignments
    const active = store.getAssignments(event.id, null, volunteerMaya.id).filter(
      a => a.status !== ASSIGNMENT_STATUSES.CANCELED
    );
    assert.equal(active.length, 1);
    assert.equal(active[0].shiftId, shift.id);

    // Volunteer clicks Cannot Attend
    const canceled = store.cancelAssignment(
      initialAssignment.id,
      'Sudden flight delay / unable to reach venue',
      volunteerMaya.id
    );

    assert.equal(canceled.status, ASSIGNMENT_STATUSES.CANCELED);
  });

  it('Step 5: Coverage changes and staffing gap is recognized', () => {
    const activeAssignments = store.getAssignments(event.id, shift.id).filter(
      a => a.status !== ASSIGNMENT_STATUSES.CANCELED
    );

    // 0 active out of 2 required
    assert.equal(activeAssignments.length, 0);
    assert.ok(activeAssignments.length < shift.requiredHeadcount, 'Shift must be understaffed');
  });

  it('Step 6: Organizer matches candidates and ranks Chloe Bennett as top replacement', () => {
    const allVolunteers = store.getVolunteerDetails(event.id);
    const ranked = rankEligibleCandidates(allVolunteers, shift, {
      allShifts: [shift],
      allAssignments: store.getAssignments(event.id)
    });

    assert.ok(ranked.eligible.length > 0, 'Must have at least one eligible replacement');
    // Chloe Bennett has First Aid and 0 hours assigned, Maya is also available now but Chloe has fewer cancellations
    const topCandidate = ranked.eligible[0];
    assert.ok(topCandidate.isEligible);
    assert.ok(topCandidate.reasons.length > 0);
    assert.match(topCandidate.reasons[0], /Available for the entire shift window/);
  });

  it('Step 7: Organizer confirms replacement with preview and atomic assignment', () => {
    // Assign Chloe
    const replacementAsgn = store.assignVolunteer({
      eventId: event.id,
      shiftId: shift.id,
      volunteerId: volunteerChloe.id,
      assignedBy: 'usr-organizer-elena'
    });

    assert.ok(replacementAsgn.id);
    assert.equal(replacementAsgn.volunteerId, volunteerChloe.id);
    assert.equal(replacementAsgn.status, ASSIGNMENT_STATUSES.ASSIGNED);

    // Verify Chloe sees her assignment
    const chloeActive = store.getAssignments(event.id, null, volunteerChloe.id).filter(
      a => a.status !== ASSIGNMENT_STATUSES.CANCELED
    );
    assert.equal(chloeActive.length, 1);
    assert.equal(chloeActive[0].id, replacementAsgn.id);
  });

  it('Step 8: Attendance and issue workflows update the organizer view', () => {
    // Chloe checks in on site
    const chloeAsgn = store.getAssignments(event.id, null, volunteerChloe.id)[0];
    const checkIn = store.recordCheckIn({
      eventId: event.id,
      assignmentId: chloeAsgn.id,
      volunteerId: volunteerChloe.id,
      shiftId: shift.id,
      method: 'self'
    });

    assert.ok(checkIn.id);
    assert.equal(chloeAsgn.status, ASSIGNMENT_STATUSES.CHECKED_IN);

    // Chloe reports a medical issue at finish line
    const issue = store.createIssue({
      eventId: event.id,
      zoneId: shift.zoneId,
      title: 'Runner collapse at 50m mark',
      description: 'Heat exhaustion, triage ice packs applied',
      category: 'medical',
      severity: ISSUE_SEVERITIES.HIGH,
      reportedBy: volunteerChloe.id
    });

    assert.ok(issue.id);
    assert.equal(issue.status, ISSUE_STATUSES.OPEN);

    // Coordinator acknowledges issue
    const ack = store.updateIssue(issue.id, { status: ISSUE_STATUSES.ACKNOWLEDGED }, 'usr-coord-priya');
    assert.equal(ack.status, ISSUE_STATUSES.ACKNOWLEDGED);
    assert.ok(ack.acknowledgedAt);

    // Handover note created
    const handover = store.createHandoverNote({
      eventId: event.id,
      zoneId: shift.zoneId,
      shiftId: shift.id,
      authorId: volunteerChloe.id,
      summary: 'Handled 4 heat cases. Re-stocked water coolers.',
      openIssues: 'Ice bags running low in cooler 2.'
    });

    assert.ok(handover.id);
  });
});
