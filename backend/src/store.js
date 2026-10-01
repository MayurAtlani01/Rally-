import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { generateSeedData } from './seedData.js';
import { ASSIGNMENT_STATUSES, ISSUE_STATUSES, ISSUE_SEVERITIES, ROLES } from '../../shared/constants.js';
import { evaluateVolunteerEligibility } from '../../shared/matching.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = process.env.RALLY_DATA_FILE || path.resolve(__dirname, '../data/app.json');
// Native test workers must never read or reset a user's saved demo dataset.
const IS_TEST = process.env.NODE_ENV === 'test' || Boolean(process.env.NODE_TEST_CONTEXT);

export function createEmptyData() {
  return {
    profiles: [],
    events: [],
    memberships: [],
    zones: [],
    coordinatorZones: [],
    skills: [],
    volunteerSkills: [],
    volunteerAvailabilities: [],
    volunteerPreferences: [],
    shifts: [],
    assignments: [],
    attendance: [],
    issues: [],
    issueActivity: [],
    announcements: [],
    notifications: [],
    handoverNotes: [],
    auditEvents: []
  };
}

class DataStore {
  constructor() {
    this.data = null;
    this.init();
  }

  init() {
    if (IS_TEST) {
      this.resetDemo();
      return;
    }
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        if (raw && raw.trim().length > 0) {
          this.data = JSON.parse(raw);
          return;
        }
      }
      this.data = createEmptyData();
      this.save();
    } catch {
      this.data = createEmptyData();
      this.save();
    }
  }

  save() {
    if (IS_TEST) return;
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist demo data:', err);
    }
  }

  resetDemo(baseDate = new Date()) {
    this.data = generateSeedData(baseDate);
    this.save();
    return this.data;
  }

  // --- Profiles & Auth ---
  getProfiles() {
    return this.data.profiles;
  }

  getProfileById(id) {
    return this.data.profiles.find(p => p.id === id) || null;
  }

  getProfileByEmail(email) {
    return this.data.profiles.find(p => p.email.toLowerCase() === email.toLowerCase()) || null;
  }

  createProfile({ id = `usr-${crypto.randomUUID()}`, fullName, email, phone = '', avatarUrl = '', bio = '' }) {
    const profile = { id, fullName, email, phone, avatarUrl, bio };
    this.data.profiles.push(profile);
    this.save();
    return profile;
  }

  // --- Events ---
  getEvents() {
    return this.data.events;
  }

  getEventById(id) {
    return this.data.events.find(e => e.id === id) || null;
  }

  getEventByInviteCode(code) {
    return this.data.events.find(e => e.inviteCode.toLowerCase() === code.trim().toLowerCase()) || null;
  }

  createEvent(eventData) {
    const id = eventData.id || `ev-${crypto.randomUUID()}`;
    const newEvent = {
      id,
      title: eventData.title,
      description: eventData.description || '',
      venueName: eventData.venueName,
      startDate: eventData.startDate,
      endDate: eventData.endDate,
      timezone: eventData.timezone || 'UTC',
      inviteCode: eventData.inviteCode || crypto.randomUUID().slice(0, 6).toUpperCase(),
      layoutImageUrl: eventData.layoutImageUrl || null,
      maxHoursPerVolunteer: eventData.maxHoursPerVolunteer || 12.0,
      urgentEscalationMinutes: eventData.urgentEscalationMinutes || 15,
      createdBy: eventData.createdBy,
      createdAt: new Date().toISOString()
    };
    this.data.events.push(newEvent);

    // Automatically make creator an Organizer
    if (eventData.createdBy) {
      this.addMembership({
        eventId: id,
        userId: eventData.createdBy,
        role: ROLES.ORGANIZER,
        status: 'active'
      });
    }

    this.save();
    return newEvent;
  }

  updateEvent(id, updates = {}) {
    const ev = this.getEventById(id);
    if (!ev) return null;
    const allowed = [
      'title', 'description', 'venueName', 'startDate', 'endDate',
      'timezone', 'layoutImageUrl', 'maxHoursPerVolunteer', 'urgentEscalationMinutes'
    ];
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        ev[key] = updates[key];
      }
    }
    this.save();
    return ev;
  }

  // --- Memberships ---
  getMemberships(eventId) {
    return this.data.memberships.filter(m => m.eventId === eventId);
  }

  getUserMemberships(userId) {
    return this.data.memberships.filter(m => m.userId === userId);
  }

  getMembership(eventId, userId) {
    return this.data.memberships.find(m => m.eventId === eventId && m.userId === userId) || null;
  }

  addMembership({ eventId, userId, role = ROLES.VOLUNTEER, status = 'active', assignedZones = [] }) {
    let existing = this.getMembership(eventId, userId);
    if (existing) {
      // Do not overwrite role or duplicate
      return existing;
    }
    const mem = {
      id: `mem-${crypto.randomUUID()}`,
      eventId,
      userId,
      role,
      status,
      assignedZones,
      createdAt: new Date().toISOString()
    };
    this.data.memberships.push(mem);
    this.save();
    return mem;
  }

  // --- Zones ---
  getZones(eventId) {
    return this.data.zones.filter(z => z.eventId === eventId);
  }

  getZoneById(id) {
    return this.data.zones.find(z => z.id === id) || null;
  }

  createZone(zoneData) {
    const zone = {
      id: zoneData.id || `zone-${crypto.randomUUID()}`,
      eventId: zoneData.eventId,
      name: zoneData.name,
      code: zoneData.code || zoneData.name.slice(0, 4).toUpperCase(),
      description: zoneData.description || '',
      color: zoneData.color || '#7054E8',
      posX: zoneData.posX ?? 50,
      posY: zoneData.posY ?? 50,
      requiredHeadcount: Number(zoneData.requiredHeadcount) || 1,
      createdAt: new Date().toISOString()
    };
    this.data.zones.push(zone);
    this.save();
    return zone;
  }

  updateZone(id, updates) {
    const zone = this.getZoneById(id);
    if (!zone) return null;
    Object.assign(zone, updates);
    this.save();
    return zone;
  }

  // --- Skills & Volunteer Details ---
  getEventSkills(_eventId) {
    return this.data.skills;
  }

  getVolunteerDetails(eventId) {
    const memberships = this.getMemberships(eventId);
    const volunteerMemberships = memberships.filter(m => m.role === ROLES.VOLUNTEER || m.role === ROLES.COORDINATOR);
    const eventShifts = this.getShifts(eventId);
    const eventAssignments = this.getAssignments(eventId);

    return volunteerMemberships.map(mem => {
      const profile = this.getProfileById(mem.userId) || { id: mem.userId, fullName: 'Unknown', email: '' };
      const vSkills = (this.data.volunteerSkills.find(vs => vs.userId === mem.userId && (!vs.eventId || vs.eventId === eventId)) || {}).skills || [];
      const vAvail = (this.data.volunteerAvailabilities.find(va => va.userId === mem.userId && (!va.eventId || va.eventId === eventId)) || {}).availabilities || [];
      const vPref = (this.data.volunteerPreferences || []).find(vp => vp.userId === mem.userId && (!vp.eventId || vp.eventId === eventId)) || null;

      // Compute active assignments and total hours
      const activeAsgns = eventAssignments.filter(
        a => a.volunteerId === mem.userId &&
        a.status !== ASSIGNMENT_STATUSES.CANCELED &&
        a.status !== ASSIGNMENT_STATUSES.ABSENT
      );

      let totalAssignedHours = 0;
      const assignedShiftDetails = [];
      for (const asgn of activeAsgns) {
        const shift = eventShifts.find(s => s.id === asgn.shiftId);
        if (shift) {
          const hours = (new Date(shift.endTime) - new Date(shift.startTime)) / (1000 * 60 * 60);
          totalAssignedHours += hours;
          assignedShiftDetails.push({
            assignmentId: asgn.id,
            shiftId: shift.id,
            shiftTitle: shift.title,
            roleName: shift.roleName,
            zoneId: shift.zoneId,
            startTime: shift.startTime,
            endTime: shift.endTime,
            status: asgn.status
          });
        }
      }

      return {
        id: mem.userId,
        membershipId: mem.id,
        role: mem.role,
        status: mem.status,
        membershipStatus: mem.status,
        name: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        avatarUrl: profile.avatarUrl,
        bio: profile.bio,
        skills: vSkills,
        availabilities: vAvail,
        preferences: vPref,
        assignedHours: totalAssignedHours,
        assignmentsCount: activeAsgns.length,
        assignments: assignedShiftDetails
      };
    });
  }

  updateVolunteerProfile(userId, { skills, availabilities, preferences, phone, bio }, eventId = null) {
    if (phone !== undefined || bio !== undefined) {
      const profile = this.getProfileById(userId);
      if (profile) {
        if (phone !== undefined) profile.phone = phone;
        if (bio !== undefined) profile.bio = bio;
      }
    }

    if (skills) {
      let vs = this.data.volunteerSkills.find(v => v.userId === userId && (!eventId || v.eventId === eventId));
      if (!vs) {
        vs = { eventId, userId, skills: [] };
        this.data.volunteerSkills.push(vs);
      }
      vs.skills = skills;
    }

    if (availabilities) {
      let va = this.data.volunteerAvailabilities.find(v => v.userId === userId && (!eventId || v.eventId === eventId));
      if (!va) {
        va = { eventId, userId, availabilities: [] };
        this.data.volunteerAvailabilities.push(va);
      }
      va.availabilities = availabilities;
    }

    if (preferences) {
      if (!this.data.volunteerPreferences) this.data.volunteerPreferences = [];
      let vp = this.data.volunteerPreferences.find(v => v.userId === userId && (!eventId || v.eventId === eventId));
      if (!vp) {
        vp = { eventId, userId, preferredZoneIds: [], preferredRoleNames: [] };
        this.data.volunteerPreferences.push(vp);
      }
      if (preferences.preferredZoneIds) vp.preferredZoneIds = preferences.preferredZoneIds;
      if (preferences.preferredRoleNames) vp.preferredRoleNames = preferences.preferredRoleNames;
    }

    this.save();
    return true;
  }

  // --- Shifts ---
  getShifts(eventId, zoneId = null) {
    return this.data.shifts.filter(s => s.eventId === eventId && (!zoneId || s.zoneId === zoneId));
  }

  getShiftById(id) {
    return this.data.shifts.find(s => s.id === id) || null;
  }

  createShift(shiftData) {
    const shift = {
      id: shiftData.id || `shift-${crypto.randomUUID()}`,
      eventId: shiftData.eventId,
      zoneId: shiftData.zoneId,
      title: shiftData.title,
      roleName: shiftData.roleName || 'Volunteer',
      startTime: shiftData.startTime,
      endTime: shiftData.endTime,
      requiredHeadcount: Number(shiftData.requiredHeadcount) || 1,
      requiredSkills: shiftData.requiredSkills || [],
      preferredSkills: shiftData.preferredSkills || [],
      notes: shiftData.notes || '',
      createdAt: new Date().toISOString()
    };
    this.data.shifts.push(shift);
    this.save();
    return shift;
  }

  // --- Assignments ---
  getAssignments(eventId, shiftId = null, volunteerId = null) {
    return this.data.assignments.filter(a => {
      if (a.eventId !== eventId) return false;
      if (shiftId && a.shiftId !== shiftId) return false;
      if (volunteerId && a.volunteerId !== volunteerId) return false;
      return true;
    });
  }

  getAssignmentById(id) {
    return this.data.assignments.find(a => a.id === id) || null;
  }

  assertCanManageShifts(eventId, actorId, shifts) {
    const membership = this.getMembership(eventId, actorId);
    if (!membership || membership.status !== 'active' || ![ROLES.ORGANIZER, ROLES.COORDINATOR].includes(membership.role)) {
      throw new Error('Only an active organizer or coordinator can manage assignments.');
    }
    if (membership.role === ROLES.COORDINATOR && shifts.some(shift => !(membership.assignedZones || []).includes(shift.zoneId))) {
      throw new Error('Coordinators can only manage assignments in their assigned zones.');
    }
  }

  assignVolunteer({ eventId, shiftId, volunteerId, assignedBy }) {
    const shift = this.getShiftById(shiftId);
    if (!shift || shift.eventId !== eventId) {
      throw new Error('Shift not found in this event.');
    }
    this.assertCanManageShifts(eventId, assignedBy, [shift]);

    // Check membership
    const membership = this.getMembership(eventId, volunteerId);
    if (!membership || membership.status !== 'active') {
      throw new Error('Volunteer is not an active member of this event.');
    }

    // Check duplicate active assignment
    const existingActive = this.data.assignments.find(
      a => a.shiftId === shiftId && a.volunteerId === volunteerId &&
      a.status !== ASSIGNMENT_STATUSES.CANCELED && a.status !== ASSIGNMENT_STATUSES.ABSENT
    );
    if (existingActive) {
      throw new Error('Volunteer is already assigned to this shift.');
    }

    // Capacity check: prevent overflow under concurrent requests
    const currentAssignedCount = this.data.assignments.filter(
      a => a.shiftId === shiftId &&
      a.status !== ASSIGNMENT_STATUSES.CANCELED && a.status !== ASSIGNMENT_STATUSES.ABSENT
    ).length;
    if (currentAssignedCount >= shift.requiredHeadcount) {
      throw new Error(`Shift is already at maximum capacity (${shift.requiredHeadcount}/${shift.requiredHeadcount}).`);
    }

    // Re-evaluate current server data; a candidate preview may have gone stale.
    const volunteer = this.getVolunteerDetails(eventId).find(v => v.id === volunteerId);
    if (!volunteer) throw new Error('Volunteer not found in this event.');
    const eligibility = evaluateVolunteerEligibility(volunteer, shift, {
      allShifts: this.getShifts(eventId),
      allAssignments: this.getAssignments(eventId),
      maxHoursPerVolunteer: this.getEventById(eventId)?.maxHoursPerVolunteer
    });
    if (!eligibility.isEligible) {
      throw new Error(`Assignment invalid: ${eligibility.ineligibilityReasons.join(' ')}`);
    }

    const assignment = {
      id: `asgn-${crypto.randomUUID()}`,
      eventId,
      shiftId,
      volunteerId,
      status: ASSIGNMENT_STATUSES.ASSIGNED,
      assignedBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.assignments.push(assignment);

    // Create in-app notification for volunteer
    this.createNotification({
      eventId,
      userId: volunteerId,
      type: 'shift_assigned',
      title: 'Shift Assignment Confirmed',
      message: `You have been assigned to "${shift.title}" (${shift.roleName}).`,
      link: '/volunteer/today'
    });

    this.logAuditEvent({
      eventId,
      actorId: assignedBy,
      action: 'assignment_created',
      entityType: 'assignment',
      entityId: assignment.id,
      details: { shiftId, volunteerId, title: shift.title }
    });

    this.save();
    return assignment;
  }

  cancelAssignment(id, reason = 'Volunteer requested cancellation', canceledBy = null) {
    const asgn = this.getAssignmentById(id);
    if (!asgn) throw new Error('Assignment not found.');

    asgn.status = ASSIGNMENT_STATUSES.CANCELED;
    asgn.cancellationReason = reason;
    asgn.canceledAt = new Date().toISOString();
    asgn.updatedAt = new Date().toISOString();

    const shift = this.getShiftById(asgn.shiftId);
    const zone = shift ? this.getZoneById(shift.zoneId) : null;

    // Check if shift is now understaffed and alert coordinators/organizers
    if (shift) {
      const remainingCount = this.data.assignments.filter(
        a => a.shiftId === shift.id &&
        a.status !== ASSIGNMENT_STATUSES.CANCELED && a.status !== ASSIGNMENT_STATUSES.ABSENT
      ).length;

      if (remainingCount < shift.requiredHeadcount) {
        // Find coordinators for this zone + event organizers
        const organizers = this.getMemberships(asgn.eventId).filter(m => m.role === ROLES.ORGANIZER);
        for (const org of organizers) {
          this.createNotification({
            eventId: asgn.eventId,
            userId: org.userId,
            type: 'staffing_gap',
            title: `Staffing Gap in ${zone ? zone.name : 'Zone'}`,
            message: `Assignment canceled on "${shift.title}". Current coverage: ${remainingCount}/${shift.requiredHeadcount}. Replacements available.`,
            link: `/shifts?highlight=${shift.id}`
          });
        }
      }
    }

    this.logAuditEvent({
      eventId: asgn.eventId,
      actorId: canceledBy || asgn.volunteerId,
      action: 'assignment_canceled',
      entityType: 'assignment',
      entityId: asgn.id,
      details: { reason, shiftId: asgn.shiftId, volunteerId: asgn.volunteerId }
    });

    this.save();
    return asgn;
  }

  markAbsent(id, reason = 'Marked absent by coordinator', markedBy = null) {
    const asgn = this.getAssignmentById(id);
    if (!asgn) throw new Error('Assignment not found.');

    asgn.status = ASSIGNMENT_STATUSES.ABSENT;
    asgn.absenceReason = reason;
    asgn.markedAbsentAt = new Date().toISOString();
    asgn.markedAbsentBy = markedBy;
    asgn.updatedAt = new Date().toISOString();

    const shift = this.getShiftById(asgn.shiftId);
    const zone = shift ? this.getZoneById(shift.zoneId) : null;

    if (shift) {
      const remainingCount = this.data.assignments.filter(
        a => a.shiftId === shift.id &&
        a.status !== ASSIGNMENT_STATUSES.CANCELED && a.status !== ASSIGNMENT_STATUSES.ABSENT
      ).length;

      if (remainingCount < shift.requiredHeadcount) {
        const organizers = this.getMemberships(asgn.eventId).filter(m => m.role === ROLES.ORGANIZER);
        for (const org of organizers) {
          this.createNotification({
            eventId: asgn.eventId,
            userId: org.userId,
            type: 'staffing_gap',
            title: `Staffing Gap in ${zone ? zone.name : 'Zone'}`,
            message: `Volunteer marked absent on "${shift.title}". Current coverage: ${remainingCount}/${shift.requiredHeadcount}. Replacements available.`,
            link: `/shifts?highlight=${shift.id}`
          });
        }
      }
    }

    this.logAuditEvent({
      eventId: asgn.eventId,
      actorId: markedBy || asgn.volunteerId,
      action: 'assignment_marked_absent',
      entityType: 'assignment',
      entityId: asgn.id,
      details: { reason, shiftId: asgn.shiftId, volunteerId: asgn.volunteerId }
    });

    this.save();
    return asgn;
  }

  // Atomic Reassignment
  reassignVolunteerAtomic({ eventId, volunteerId, sourceShiftId, targetShiftId, assignedBy }) {
    const sourceShift = this.getShiftById(sourceShiftId);
    const targetShift = this.getShiftById(targetShiftId);

    if (!sourceShift || !targetShift || sourceShift.eventId !== eventId || targetShift.eventId !== eventId) {
      throw new Error('Source or target shift does not exist in this event.');
    }
    if (sourceShiftId === targetShiftId) {
      throw new Error('Source and target shifts must be different.');
    }
    this.assertCanManageShifts(eventId, assignedBy, [sourceShift, targetShift]);

    // Find active assignment on source shift
    const sourceAssignment = this.data.assignments.find(
      a => a.eventId === eventId && a.shiftId === sourceShiftId && a.volunteerId === volunteerId &&
      a.status !== ASSIGNMENT_STATUSES.CANCELED && a.status !== ASSIGNMENT_STATUSES.ABSENT
    );

    if (!sourceAssignment) {
      throw new Error('Volunteer does not have an active assignment on the source shift.');
    }
    if (sourceAssignment.status !== ASSIGNMENT_STATUSES.ASSIGNED) {
      throw new Error('Only scheduled assignments can be moved. Checked-in and completed attendance must be preserved.');
    }

    // Validate eligibility for target shift (ignoring source shift)
    const volunteerList = this.getVolunteerDetails(eventId);
    const volunteer = volunteerList.find(v => v.id === volunteerId);
    if (!volunteer) throw new Error('Volunteer not found.');

    const eligibility = evaluateVolunteerEligibility(volunteer, targetShift, {
      allShifts: this.getShifts(eventId),
      allAssignments: this.getAssignments(eventId),
      maxHoursPerVolunteer: this.getEventById(eventId)?.maxHoursPerVolunteer,
      ignoreAssignmentId: sourceAssignment.id
    });

    if (!eligibility.isEligible) {
      throw new Error(`Reassignment invalid: ${eligibility.ineligibilityReasons.join(' ')}`);
    }

    // Atomically cancel source and create target
    sourceAssignment.status = ASSIGNMENT_STATUSES.CANCELED;
    sourceAssignment.cancellationReason = `Reassigned to "${targetShift.title}"`;
    sourceAssignment.canceledAt = new Date().toISOString();
    sourceAssignment.updatedAt = new Date().toISOString();

    const newAssignment = {
      id: `asgn-${crypto.randomUUID()}`,
      eventId,
      shiftId: targetShiftId,
      volunteerId,
      status: ASSIGNMENT_STATUSES.ASSIGNED,
      assignedBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.data.assignments.push(newAssignment);

    // Notify volunteer
    this.createNotification({
      eventId,
      userId: volunteerId,
      type: 'shift_reassigned',
      title: 'Shift Reassignment Notice',
      message: `You were moved from "${sourceShift.title}" to "${targetShift.title}".`,
      link: '/volunteer/today'
    });

    this.logAuditEvent({
      eventId,
      actorId: assignedBy,
      action: 'assignment_reassigned_atomic',
      entityType: 'assignment',
      entityId: newAssignment.id,
      details: {
        sourceShiftId,
        targetShiftId,
        volunteerId,
        oldAssignmentId: sourceAssignment.id
      }
    });

    this.save();
    return {
      success: true,
      canceledAssignment: sourceAssignment,
      newAssignment
    };
  }

  // --- Attendance ---
  getAttendance(eventId, shiftId = null, volunteerId = null) {
    return this.data.attendance.filter(a => {
      if (a.eventId !== eventId) return false;
      if (shiftId && a.shiftId !== shiftId) return false;
      if (volunteerId && a.volunteerId !== volunteerId) return false;
      return true;
    });
  }

  recordCheckIn({ eventId, assignmentId, volunteerId, shiftId, method = 'self', verifiedBy = null, notes = '' }) {
    // Check if already checked in
    const existing = this.data.attendance.find(
      a => a.assignmentId === assignmentId && !a.checkOutTime
    );
    if (existing) {
      throw new Error('Volunteer is already checked in for this assignment.');
    }
    const assignment = this.getAssignmentById(assignmentId);
    if (!assignment || assignment.eventId !== eventId || assignment.volunteerId !== volunteerId || assignment.shiftId !== shiftId) {
      throw new Error('Assignment not found in this event for this volunteer.');
    }
    if (assignment.status !== ASSIGNMENT_STATUSES.ASSIGNED) {
      throw new Error('Only a scheduled assignment can be checked in.');
    }

    const checkInRecord = {
      id: `att-${crypto.randomUUID()}`,
      eventId,
      assignmentId,
      volunteerId,
      shiftId,
      checkInTime: new Date().toISOString(),
      checkOutTime: null,
      method,
      verifiedBy,
      isFlagged: false,
      flaggedReason: null,
      notes,
      createdAt: new Date().toISOString()
    };

    this.data.attendance.push(checkInRecord);

    // Update assignment status
    const asgn = this.getAssignmentById(assignmentId);
    if (asgn) {
      asgn.status = ASSIGNMENT_STATUSES.CHECKED_IN;
      asgn.updatedAt = new Date().toISOString();
    }

    this.logAuditEvent({
      eventId,
      actorId: verifiedBy || volunteerId,
      action: 'attendance_checkin',
      entityType: 'attendance',
      entityId: checkInRecord.id,
      details: { assignmentId, method }
    });

    this.save();
    return checkInRecord;
  }

  recordCheckOut({ attendanceId, verifiedBy = null, notes = '' }) {
    const record = this.data.attendance.find(a => a.id === attendanceId);
    if (!record) throw new Error('Attendance record not found.');
    if (record.checkOutTime) throw new Error('Volunteer has already checked out.');

    record.checkOutTime = new Date().toISOString();
    if (verifiedBy) record.verifiedBy = verifiedBy;
    if (notes) record.notes = record.notes ? `${record.notes} | ${notes}` : notes;

    // Update assignment to completed
    const asgn = this.getAssignmentById(record.assignmentId);
    if (asgn) {
      asgn.status = ASSIGNMENT_STATUSES.COMPLETED;
      asgn.updatedAt = new Date().toISOString();
    }

    this.logAuditEvent({
      eventId: record.eventId,
      actorId: verifiedBy || record.volunteerId,
      action: 'attendance_checkout',
      entityType: 'attendance',
      entityId: record.id,
      details: { checkInTime: record.checkInTime, checkOutTime: record.checkOutTime }
    });

    this.save();
    return record;
  }

  // --- Issues and Tasks ---
  getIssues(eventId, zoneId = null) {
    return this.data.issues.filter(i => i.eventId === eventId && (!zoneId || i.zoneId === zoneId));
  }

  getIssueById(id) {
    return this.data.issues.find(i => i.id === id) || null;
  }

  createIssue(issueData) {
    const id = `iss-${crypto.randomUUID()}`;
    const zone = issueData.zoneId ? this.getZoneById(issueData.zoneId) : null;

    // Automatically route to coordinator of this zone if any
    let coordinatorId = null;
    if (issueData.zoneId) {
      const coordMembership = this.getMemberships(issueData.eventId).find(
        m => m.role === ROLES.COORDINATOR && (m.assignedZones || []).includes(issueData.zoneId)
      );
      if (coordMembership) coordinatorId = coordMembership.userId;
    }

    const issue = {
      id,
      eventId: issueData.eventId,
      zoneId: issueData.zoneId || null,
      title: issueData.title,
      description: issueData.description,
      category: issueData.category || 'general',
      severity: issueData.severity || ISSUE_SEVERITIES.MEDIUM,
      status: ISSUE_STATUSES.OPEN,
      reportedBy: issueData.reportedBy,
      coordinatorId,
      assignedTo: issueData.assignedTo || null,
      acknowledgedAt: null,
      resolvedAt: null,
      escalatedAt: null,
      createdAt: new Date().toISOString()
    };

    this.data.issues.push(issue);

    // Initial activity log
    this.data.issueActivity.push({
      id: `act-${crypto.randomUUID()}`,
      issueId: id,
      userId: issueData.reportedBy,
      action: 'created',
      note: 'Issue reported.',
      createdAt: new Date().toISOString()
    });

    // Notify coordinator or organizers
    if (coordinatorId) {
      this.createNotification({
        eventId: issueData.eventId,
        userId: coordinatorId,
        type: 'issue_assigned',
        title: `Issue in ${zone ? zone.name : 'Zone'}: ${issue.title}`,
        message: `Severity: ${issue.severity.toUpperCase()}. ${issue.description}`,
        link: '/issues'
      });
    } else {
      const organizers = this.getMemberships(issueData.eventId).filter(m => m.role === ROLES.ORGANIZER);
      for (const org of organizers) {
        this.createNotification({
          eventId: issueData.eventId,
          userId: org.userId,
          type: 'issue_assigned',
          title: `Issue reported: ${issue.title}`,
          message: `Zone: ${zone ? zone.name : 'Unassigned'}. Severity: ${issue.severity.toUpperCase()}. ${issue.description}`,
          link: '/issues'
        });
      }
    }

    this.save();
    return issue;
  }

  updateIssue(id, updates, actorId) {
    const issue = this.getIssueById(id);
    if (!issue) return null;

    if (updates.status && updates.status !== issue.status) {
      if (updates.status === ISSUE_STATUSES.ACKNOWLEDGED && !issue.acknowledgedAt) {
        issue.acknowledgedAt = new Date().toISOString();
      }
      if (updates.status === ISSUE_STATUSES.RESOLVED && !issue.resolvedAt) {
        issue.resolvedAt = new Date().toISOString();
      }
      this.data.issueActivity.push({
        id: `act-${crypto.randomUUID()}`,
        issueId: id,
        userId: actorId,
        action: updates.status,
        note: updates.activityNote || `Status updated to ${updates.status}`,
        createdAt: new Date().toISOString()
      });
    }

    if (updates.assignedTo !== undefined) issue.assignedTo = updates.assignedTo;
    if (updates.severity) issue.severity = updates.severity;
    if (updates.title) issue.title = updates.title;
    if (updates.description) issue.description = updates.description;
    if (updates.status) issue.status = updates.status;

    this.save();
    return issue;
  }

  getIssueActivity(issueId) {
    return this.data.issueActivity.filter(a => a.issueId === issueId);
  }

  // Escalation engine: unacknowledged urgent issues escalate to organizers
  checkAndEscalateUrgentIssues(eventId = null) {
    const now = Date.now();
    const targetEvents = eventId ? [this.getEventById(eventId)].filter(Boolean) : this.data.events;
    const escalatedList = [];

    for (const ev of targetEvents) {
      const thresholdMinutes = ev.urgentEscalationMinutes || 15;
      const thresholdMs = thresholdMinutes * 60 * 1000;

      const openUrgentIssues = this.data.issues.filter(
        i => i.eventId === ev.id &&
        i.severity === ISSUE_SEVERITIES.URGENT &&
        !i.acknowledgedAt &&
        !i.escalatedAt &&
        i.status === ISSUE_STATUSES.OPEN
      );

      for (const issue of openUrgentIssues) {
        const createdMs = new Date(issue.createdAt).getTime();
        if (now - createdMs >= thresholdMs) {
          // Escalate!
          issue.escalatedAt = new Date().toISOString();
          escalatedList.push(issue);

          this.data.issueActivity.push({
            id: `act-${crypto.randomUUID()}`,
            issueId: issue.id,
            userId: 'system',
            action: 'escalated',
            note: `Automatically escalated to Event Organizers after ${thresholdMinutes}m unacknowledged.`,
            createdAt: new Date().toISOString()
          });

          // Send persistent alert to all organizers
          const organizers = this.getMemberships(ev.id).filter(m => m.role === ROLES.ORGANIZER);
          for (const org of organizers) {
            this.createNotification({
              eventId: ev.id,
              userId: org.userId,
              type: 'urgent_escalation',
              title: `🚨 ESCALATED: ${issue.title}`,
              message: `Urgent issue has remained unacknowledged for >${thresholdMinutes}m. Immediate action required.`,
              link: '/issues'
            });
          }
        }
      }
    }

    if (escalatedList.length > 0) {
      this.save();
    }
    return escalatedList;
  }

  // --- Announcements & Notifications ---
  getAnnouncements(eventId) {
    return this.data.announcements.filter(a => a.eventId === eventId);
  }

  createAnnouncement(data) {
    const ann = {
      id: `ann-${crypto.randomUUID()}`,
      eventId: data.eventId,
      authorId: data.authorId,
      title: data.title,
      body: data.body,
      audience: data.audience || 'all',
      zoneId: data.zoneId || null,
      roleName: data.roleName || null,
      createdAt: new Date().toISOString()
    };
    this.data.announcements.push(ann);

    // Send notifications to members matching audience
    const members = this.getMemberships(data.eventId);
    for (const mem of members) {
      this.createNotification({
        eventId: data.eventId,
        userId: mem.userId,
        type: 'announcement',
        title: `Announcement: ${ann.title}`,
        message: ann.body.slice(0, 120),
        link: '/announcements'
      });
    }

    this.save();
    return ann;
  }

  getNotifications(userId, eventId = null) {
    return this.data.notifications.filter(n => n.userId === userId && (!eventId || n.eventId === eventId));
  }

  markNotificationRead(id) {
    const notif = this.data.notifications.find(n => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.save();
      return notif;
    }
    return null;
  }

  markAllNotificationsRead(userId) {
    this.data.notifications.filter(n => n.userId === userId).forEach(n => { n.isRead = true; });
    this.save();
    return true;
  }

  createNotification(notifData) {
    const notif = {
      id: `notif-${crypto.randomUUID()}`,
      eventId: notifData.eventId,
      userId: notifData.userId,
      type: notifData.type,
      title: notifData.title,
      message: notifData.message,
      link: notifData.link || null,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    this.data.notifications.push(notif);
    this.save();
    return notif;
  }

  // --- Handover Notes ---
  getHandoverNotes(eventId, zoneId = null) {
    return this.data.handoverNotes.filter(h => h.eventId === eventId && (!zoneId || h.zoneId === zoneId));
  }

  createHandoverNote(data) {
    const note = {
      id: `handover-${crypto.randomUUID()}`,
      eventId: data.eventId,
      zoneId: data.zoneId,
      shiftId: data.shiftId,
      authorId: data.authorId,
      summary: data.summary,
      openIssues: data.openIssues || '',
      notes: data.notes || '',
      createdAt: new Date().toISOString()
    };
    this.data.handoverNotes.push(note);
    this.save();
    return note;
  }

  // --- Audit Events ---
  getAuditEvents(eventId) {
    return this.data.auditEvents.filter(a => a.eventId === eventId);
  }

  logAuditEvent({ eventId, actorId, action, entityType, entityId, details = {} }) {
    const event = {
      id: `audit-${crypto.randomUUID()}`,
      eventId,
      actorId: actorId || null,
      action,
      entityType,
      entityId,
      details,
      createdAt: new Date().toISOString()
    };
    this.data.auditEvents.push(event);
    // Maintain max 500 audit events in memory/disk
    if (this.data.auditEvents.length > 500) {
      this.data.auditEvents = this.data.auditEvents.slice(-500);
    }
    return event;
  }
}

export const store = new DataStore();
