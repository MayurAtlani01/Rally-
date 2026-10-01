import crypto from 'node:crypto';
import { getSupabaseAdmin } from './supabase.js';
import * as mappers from './mappers.js';
import { ROLES, ASSIGNMENT_STATUSES, ISSUE_STATUSES, ISSUE_SEVERITIES } from '../../../shared/constants.js';

let activeRepo = null;

export class SupabaseRepo {
  constructor(client = null) {
    this.client = client;
  }

  getClient() {
    return this.client || getSupabaseAdmin();
  }

  // --- Profiles ---
  async getProfileById(userId) {
    const { data, error } = await this.getClient()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return mappers.mapProfile(data);
  }

  async getProfileByEmail(email) {
    const { data, error } = await this.getClient()
      .from('profiles')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error || !data) return null;
    return mappers.mapProfile(data);
  }

  async upsertProfile({ id, email, fullName, name, phone = '', bio = '', avatarUrl = '' }) {
    const payload = {
      id,
      email,
      full_name: fullName || name || '',
      phone,
      bio,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString()
    };
    const { data, error } = await this.getClient()
      .from('profiles')
      .upsert(payload)
      .select('*')
      .single();
    if (error) throw new Error(`Failed to upsert profile: ${error.message}`);
    return mappers.mapProfile(data);
  }

  // --- Memberships & Scoping ---
  async getUserMemberships(userId) {
    const { data: mems, error } = await this.getClient()
      .from('event_memberships')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');
    if (error || !mems) return [];

    const memIds = mems.map(m => m.id);
    const { data: czData } = await this.getClient()
      .from('coordinator_zones')
      .select('*')
      .in('membership_id', memIds.length > 0 ? memIds : ['00000000-0000-0000-0000-000000000000']);

    const czMap = new Map();
    (czData || []).forEach(cz => {
      if (!czMap.has(cz.membership_id)) czMap.set(cz.membership_id, []);
      czMap.get(cz.membership_id).push(cz.zone_id);
    });

    return mems.map(m => mappers.mapMembership({
      ...m,
      assigned_zones: czMap.get(m.id) || []
    }));
  }

  async getMembership(eventId, userId) {
    const { data: mem, error } = await this.getClient()
      .from('event_memberships')
      .select('*')
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !mem) return null;

    const { data: czData } = await this.getClient()
      .from('coordinator_zones')
      .select('zone_id')
      .eq('membership_id', mem.id);

    const assignedZones = (czData || []).map(cz => cz.zone_id);
    return mappers.mapMembership({
      ...mem,
      assigned_zones: assignedZones
    });
  }

  async getMemberships(eventId) {
    const { data: mems, error } = await this.getClient()
      .from('event_memberships')
      .select('*')
      .eq('event_id', eventId);
    if (error || !mems) return [];

    const memIds = mems.map(m => m.id);
    const { data: czData } = await this.getClient()
      .from('coordinator_zones')
      .select('*')
      .in('membership_id', memIds.length > 0 ? memIds : ['00000000-0000-0000-0000-000000000000']);

    const czMap = new Map();
    (czData || []).forEach(cz => {
      if (!czMap.has(cz.membership_id)) czMap.set(cz.membership_id, []);
      czMap.get(cz.membership_id).push(cz.zone_id);
    });

    return mems.map(m => mappers.mapMembership({
      ...m,
      assigned_zones: czMap.get(m.id) || []
    }));
  }

  async addMembership({ eventId, userId, role = ROLES.VOLUNTEER, status = 'active' }) {
    const { data, error } = await this.getClient()
      .from('event_memberships')
      .insert({
        event_id: eventId,
        user_id: userId,
        role,
        status
      })
      .select('*')
      .single();
    if (error) throw new Error(`Failed to add membership: ${error.message}`);
    return mappers.mapMembership(data);
  }

  async updateMembershipRole(eventId, userId, role, assignedZones = null) {
    const { data: mem, error } = await this.getClient()
      .from('event_memberships')
      .update({ role })
      .eq('event_id', eventId)
      .eq('user_id', userId)
      .select('*')
      .single();
    if (error) throw new Error(`Failed to update membership: ${error.message}`);

    if (Array.isArray(assignedZones)) {
      await this.getClient()
        .from('coordinator_zones')
        .delete()
        .eq('membership_id', mem.id);

      if (assignedZones.length > 0) {
        const inserts = assignedZones.map(zid => ({
          membership_id: mem.id,
          zone_id: zid
        }));
        await this.getClient().from('coordinator_zones').insert(inserts);
      }
    }

    return this.getMembership(eventId, userId);
  }

  // --- Events ---
  async getEvents(userId) {
    const userMems = await this.getUserMemberships(userId);
    if (userMems.length === 0) return [];

    const eventIds = userMems.map(m => m.eventId);
    const { data: events, error } = await this.getClient()
      .from('events')
      .select('*')
      .in('id', eventIds);
    if (error || !events) return [];

    const memMap = new Map(userMems.map(m => [m.eventId, m]));
    return events.map(e => {
      const mapped = mappers.mapEvent(e);
      const mem = memMap.get(e.id);
      // Security: hide invite code from non-organizers
      if (mem?.role !== ROLES.ORGANIZER) {
        mapped.inviteCode = null;
      }
      return mapped;
    });
  }

  async getEventById(eventId) {
    const { data, error } = await this.getClient()
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();
    if (error || !data) return null;
    return mappers.mapEvent(data);
  }

  async getEventByInviteCode(inviteCode) {
    const clean = (inviteCode || '').trim();
    if (!clean) return null;

    try {
      const { data, error } = await this.getClient()
        .rpc('get_event_invite_preview', { p_invite_code: clean.toUpperCase() });
      if (!error && data && data.length > 0) return mappers.mapEvent(data[0]);
    } catch (e) {
      console.warn('RPC invite preview error:', e?.message || e);
    }

    try {
      const { data, error } = await this.getClient()
        .rpc('get_event_invite_preview', { p_invite_code: clean });
      if (!error && data && data.length > 0) return mappers.mapEvent(data[0]);
    } catch (e) {
      console.warn('RPC invite preview fallback error:', e?.message || e);
    }

    try {
      const now = new Date().toISOString();
      const { data: directData, error: dirErr } = await this.getClient()
        .from('events')
        .select('*')
        .ilike('invite_code', clean)
        .neq('status', 'closed')
        .is('invite_revoked_at', null)
        .or(`invite_expires_at.is.null,invite_expires_at.gt.${now}`)
        .maybeSingle();

      if (!dirErr && directData) return mappers.mapEvent(directData);
    } catch (e) {
      console.warn('Direct invite code lookup error:', e?.message || e);
    }

    return null;
  }

  async createEvent(eventData, creatorId) {
    const inviteCode = eventData.inviteCode || `INV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const { data, error } = await this.getClient().rpc('create_event_with_organizer', {
      p_title: eventData.title,
      p_description: eventData.description || '',
      p_venue_name: eventData.venueName,
      p_start_date: eventData.startDate,
      p_end_date: eventData.endDate,
      p_timezone: eventData.timezone || 'UTC',
      p_invite_code: inviteCode,
      p_max_hours: eventData.maxHoursPerVolunteer || 12.0,
      p_urgent_escalation_minutes: eventData.urgentEscalationMinutes || 15,
      p_creator_id: creatorId
    });
    if (error) throw new Error(`Event creation failed: ${error.message}`);
    return mappers.mapEvent(data.event);
  }

  async updateEvent(eventId, updates = {}) {
    const allowed = [
      'title', 'description', 'venueName', 'startDate', 'endDate',
      'timezone', 'layoutImageUrl', 'maxHoursPerVolunteer', 'urgentEscalationMinutes',
      'inviteCode', 'status', 'closedAt', 'closedBy', 'inviteExpiresAt', 'inviteRevokedAt'
    ];
    const payload = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        payload[snakeKey] = updates[key];
      }
    }

    const { data, error } = await this.getClient()
      .from('events')
      .update(payload)
      .eq('id', eventId)
      .select('*')
      .single();
    if (error) throw new Error(`Failed to update event: ${error.message}`);
    return mappers.mapEvent(data);
  }

  async closeEvent(eventId, userId) {
    return this.updateEvent(eventId, {
      status: 'closed',
      closedAt: new Date().toISOString(),
      closedBy: userId
    });
  }

  async regenerateInviteCode(eventId) {
    const newCode = `INV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    return this.updateEvent(eventId, {
      inviteCode: newCode,
      inviteRevokedAt: null
    });
  }

  async revokeInviteCode(eventId) {
    return this.updateEvent(eventId, {
      inviteRevokedAt: new Date().toISOString()
    });
  }

  // --- Zones ---
  async getZones(eventId, filterOptions = {}) {
    const { data: zones, error } = await this.getClient()
      .from('zones')
      .select('*')
      .eq('event_id', eventId);
    if (error || !zones) return [];

    const shifts = await this.getShifts(eventId);
    const assignments = await this.getAssignments(eventId);
    const issues = await this.getIssues(eventId);

    const evalTime = filterOptions.time ? new Date(filterOptions.time).getTime() : Date.now();

    return zones.map(z => {
      const mapped = mappers.mapZone(z);
      // Filter active shifts based on time window
      const zoneShifts = shifts.filter(s => s.zoneId === z.id);
      const activeShifts = zoneShifts.filter(s => {
        const start = new Date(s.startTime).getTime();
        const end = new Date(s.endTime).getTime();
        return start <= evalTime && end > evalTime;
      });

      const activeShiftIds = new Set(activeShifts.map(s => s.id));
      const activeAssignments = assignments.filter(
        a => activeShiftIds.has(a.shiftId) && a.status !== ASSIGNMENT_STATUSES.CANCELED && a.status !== ASSIGNMENT_STATUSES.ABSENT
      );
      const checkedInCount = activeAssignments.filter(a => a.status === ASSIGNMENT_STATUSES.CHECKED_IN).length;

      const requiredTotal = activeShifts.reduce((sum, s) => sum + (s.requiredHeadcount || 1), 0);
      const assignedTotal = activeAssignments.length;

      const zoneIssues = issues.filter(i => i.zoneId === z.id && i.status !== ISSUE_STATUSES.RESOLVED);
      const urgentIssues = zoneIssues.filter(i => i.severity === ISSUE_SEVERITIES.URGENT);

      let coverageStatus = 'full';
      if (requiredTotal === 0) {
        coverageStatus = 'idle'; // zero active shifts
      } else if (assignedTotal === 0) {
        coverageStatus = 'empty';
      } else if (assignedTotal < requiredTotal) {
        coverageStatus = 'understaffed';
      }
      if (urgentIssues.length > 0 || (requiredTotal > 0 && assignedTotal === 0)) {
        coverageStatus = 'critical';
      }

      return {
        ...mapped,
        requiredHeadcount: requiredTotal,
        assignedHeadcount: assignedTotal,
        checkedInHeadcount: checkedInCount,
        activeIssuesCount: zoneIssues.length,
        urgentIssuesCount: urgentIssues.length,
        coverageStatus
      };
    });
  }

  async getZoneById(zoneId) {
    const { data, error } = await this.getClient()
      .from('zones')
      .select('*')
      .eq('id', zoneId)
      .maybeSingle();
    if (error || !data) return null;
    return mappers.mapZone(data);
  }

  async createZone(zoneData) {
    const { data, error } = await this.getClient()
      .from('zones')
      .insert({
        event_id: zoneData.eventId,
        name: zoneData.name,
        code: zoneData.code,
        description: zoneData.description || '',
        color: zoneData.color || '#7054E8',
        pos_x: zoneData.posX !== undefined ? Number(zoneData.posX) : 50.0,
        pos_y: zoneData.posY !== undefined ? Number(zoneData.posY) : 50.0,
        required_headcount: Number(zoneData.requiredHeadcount) || 1
      })
      .select('*')
      .single();
    if (error) throw new Error(`Failed to create zone: ${error.message}`);
    return mappers.mapZone(data);
  }

  async updateZone(zoneId, eventId, updates = {}) {
    const zone = await this.getZoneById(zoneId);
    if (!zone || zone.eventId !== eventId) {
      return null;
    }

    const allowed = ['name', 'code', 'description', 'color', 'posX', 'posY', 'requiredHeadcount'];
    const payload = {};
    for (const key of allowed) {
      if (updates[key] !== undefined) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        payload[snakeKey] = updates[key];
      }
    }

    const { data, error } = await this.getClient()
      .from('zones')
      .update(payload)
      .eq('id', zoneId)
      .select('*')
      .single();
    if (error) throw new Error(`Failed to update zone: ${error.message}`);
    return mappers.mapZone(data);
  }

  // --- Shifts ---
  async getShifts(eventId, zoneId = null) {
    let query = this.getClient()
      .from('shifts')
      .select('*')
      .eq('event_id', eventId);
    if (zoneId) {
      query = query.eq('zone_id', zoneId);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mappers.mapShift);
  }

  async getShiftById(shiftId) {
    const { data, error } = await this.getClient()
      .from('shifts')
      .select('*')
      .eq('id', shiftId)
      .maybeSingle();
    if (error || !data) return null;
    return mappers.mapShift(data);
  }

  async createShift(shiftData) {
    const { data, error } = await this.getClient()
      .from('shifts')
      .insert({
        event_id: shiftData.eventId,
        zone_id: shiftData.zoneId,
        title: shiftData.title,
        role_name: shiftData.roleName || 'Volunteer',
        start_time: shiftData.startTime,
        end_time: shiftData.endTime,
        required_headcount: Number(shiftData.requiredHeadcount) || 1,
        required_skills: shiftData.requiredSkills || [],
        preferred_skills: shiftData.preferredSkills || [],
        notes: shiftData.notes || ''
      })
      .select('*')
      .single();
    if (error) throw new Error(`Failed to create shift: ${error.message}`);
    return mappers.mapShift(data);
  }

  // --- Assignments ---
  async getAssignments(eventId, shiftId = null) {
    let query = this.getClient()
      .from('assignments')
      .select('*')
      .eq('event_id', eventId);
    if (shiftId) {
      query = query.eq('shift_id', shiftId);
    }
    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mappers.mapAssignment);
  }

  async getAssignmentById(assignmentId) {
    const { data, error } = await this.getClient()
      .from('assignments')
      .select('*')
      .eq('id', assignmentId)
      .maybeSingle();
    if (error || !data) return null;
    return mappers.mapAssignment(data);
  }

  async assignVolunteerAtomic({ eventId, shiftId, volunteerId, assignedBy }) {
    const { data, error } = await this.getClient().rpc('assign_volunteer_atomic', {
      p_event_id: eventId,
      p_shift_id: shiftId,
      p_volunteer_id: volunteerId,
      p_assigned_by: assignedBy
    });
    if (error) {
      const err = new Error(error.message);
      if (error.message.includes('full capacity')) err.code = 'CAPACITY_EXCEEDED';
      if (error.message.includes('already assigned')) err.code = 'DUPLICATE_ASSIGNMENT';
      if (error.message.includes('overlapping')) err.code = 'OVERLAPPING_SHIFT';
      throw err;
    }
    return mappers.mapAssignment(data);
  }

  async reassignVolunteerAtomic({ eventId, sourceShiftId, targetShiftId, volunteerId, assignedBy }) {
    const { data, error } = await this.getClient().rpc('reassign_volunteer_atomic', {
      p_event_id: eventId,
      p_source_shift_id: sourceShiftId,
      p_target_shift_id: targetShiftId,
      p_volunteer_id: volunteerId,
      p_assigned_by: assignedBy
    });
    if (error) throw new Error(`Reassignment failed: ${error.message}`);
    return {
      previousAssignmentId: data.previousAssignmentId,
      newAssignment: mappers.mapAssignment(data.newAssignment)
    };
  }

  async cancelAssignment(assignmentId, reason, _actorId) {
    const asgn = await this.getAssignmentById(assignmentId);
    if (!asgn) throw new Error('Assignment not found');

    const { data, error } = await this.getClient()
      .from('assignments')
      .update({
        status: ASSIGNMENT_STATUSES.CANCELED,
        cancellation_reason: reason,
        canceled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .select('*')
      .single();
    if (error) throw new Error(`Failed to cancel assignment: ${error.message}`);

    // Alert coordinators
    const shift = await this.getShiftById(asgn.shiftId);
    const coordinators = (await this.getMemberships(asgn.eventId)).filter(
      m => m.role === ROLES.COORDINATOR || m.role === ROLES.ORGANIZER
    );
    for (const c of coordinators) {
      await this.createNotification({
        eventId: asgn.eventId,
        userId: c.userId,
        type: 'shift_canceled',
        title: '⚠️ Shift Cancellation',
        message: `Volunteer canceled on "${shift?.title || 'Shift'}". Staffing replacement recommended.`,
        link: '/shifts'
      });
    }

    return mappers.mapAssignment(data);
  }

  async markAbsent(assignmentId, reason, _actorId) {
    const asgn = await this.getAssignmentById(assignmentId);
    if (!asgn) throw new Error('Assignment not found');

    const { data, error } = await this.getClient()
      .from('assignments')
      .update({
        status: ASSIGNMENT_STATUSES.ABSENT,
        cancellation_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignmentId)
      .select('*')
      .single();
    if (error) throw new Error(`Failed to mark absent: ${error.message}`);
    return mappers.mapAssignment(data);
  }

  // --- Attendance ---
  async getAttendance(eventId, shiftId = null, volunteerId = null) {
    let query = this.getClient()
      .from('attendance')
      .select('*')
      .eq('event_id', eventId);
    if (shiftId) query = query.eq('shift_id', shiftId);
    if (volunteerId) query = query.eq('volunteer_id', volunteerId);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mappers.mapAttendance);
  }

  async recordCheckInAtomic({ eventId, assignmentId, volunteerId, method = 'self', verifiedBy = null, notes = '' }) {
    const { data, error } = await this.getClient().rpc('record_check_in_atomic', {
      p_event_id: eventId,
      p_assignment_id: assignmentId,
      p_volunteer_id: volunteerId,
      p_method: method,
      p_verified_by: verifiedBy,
      p_notes: notes
    });
    if (error) throw new Error(error.message);
    return mappers.mapAttendance(data);
  }

  async recordCheckOutAtomic({ eventId, attendanceId, verifiedBy = null, notes = '' }) {
    const { data, error } = await this.getClient().rpc('record_check_out_atomic', {
      p_event_id: eventId,
      p_attendance_id: attendanceId,
      p_verified_by: verifiedBy,
      p_notes: notes
    });
    if (error) throw new Error(error.message);
    return mappers.mapAttendance(data);
  }

  async createQrToken({ eventId, shiftId, createdBy }) {
    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error } = await this.getClient()
      .from('qr_tokens')
      .insert({
        token,
        event_id: eventId,
        shift_id: shiftId,
        created_by: createdBy,
        expires_at: expiresAt
      });
    if (error) throw new Error(`Failed to generate QR token: ${error.message}`);
    return { token, shiftId, expiresAt, validitySeconds: 300 };
  }

  async getQrToken(token) {
    const { data, error } = await this.getClient()
      .from('qr_tokens')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (error || !data) return null;
    return {
      token: data.token,
      eventId: data.event_id,
      shiftId: data.shift_id,
      createdBy: data.created_by,
      expiresAt: data.expires_at
    };
  }

  // --- Issues ---
  async getIssues(eventId, zoneId = null, status = null) {
    let query = this.getClient()
      .from('issues')
      .select('*')
      .eq('event_id', eventId);
    if (zoneId) query = query.eq('zone_id', zoneId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mappers.mapIssue);
  }

  async getIssueById(issueId) {
    const { data, error } = await this.getClient()
      .from('issues')
      .select('*')
      .eq('id', issueId)
      .maybeSingle();
    if (error || !data) return null;
    return mappers.mapIssue(data);
  }

  async createIssue(issueData) {
    const { data, error } = await this.getClient()
      .from('issues')
      .insert({
        event_id: issueData.eventId,
        zone_id: issueData.zoneId || null,
        title: issueData.title,
        description: issueData.description,
        category: issueData.category || 'general',
        severity: issueData.severity || 'medium',
        status: 'open',
        reported_by: issueData.reportedBy,
        assigned_to: issueData.assignedTo || null
      })
      .select('*')
      .single();
    if (error) throw new Error(`Failed to report issue: ${error.message}`);

    await this.getClient().from('issue_activity').insert({
      issue_id: data.id,
      user_id: issueData.reportedBy,
      action: 'created',
      note: 'Issue reported'
    });

    return mappers.mapIssue(data);
  }

  async updateIssue(issueId, eventId, updates, actorId, isPrivileged) {
    const issue = await this.getIssueById(issueId);
    if (!issue || issue.eventId !== eventId) return null;

    const payload = {};
    if (isPrivileged) {
      if (updates.status) {
        payload.status = updates.status;
        if (updates.status === 'acknowledged' && !issue.acknowledgedAt) {
          payload.acknowledged_at = new Date().toISOString();
        } else if (updates.status === 'resolved' && !issue.resolvedAt) {
          payload.resolved_at = new Date().toISOString();
        }
      }
      if (updates.severity) payload.severity = updates.severity;
      if (updates.assignedTo !== undefined) payload.assigned_to = updates.assignedTo;
    }

    if (updates.title) payload.title = updates.title;
    if (updates.description) payload.description = updates.description;

    const { data, error } = await this.getClient()
      .from('issues')
      .update(payload)
      .eq('id', issueId)
      .select('*')
      .single();
    if (error) throw new Error(`Failed to update issue: ${error.message}`);

    if (updates.activityNote || updates.status || updates.assignedTo) {
      await this.getClient().from('issue_activity').insert({
        issue_id: issueId,
        user_id: actorId,
        action: updates.status ? `status_${updates.status}` : 'updated',
        note: updates.activityNote || 'Issue modified'
      });
    }

    return mappers.mapIssue(data);
  }

  async getIssueActivity(issueId) {
    const { data, error } = await this.getClient()
      .from('issue_activity')
      .select('*')
      .eq('issue_id', issueId)
      .order('created_at', { ascending: true });
    if (error || !data) return [];
    return data.map(mappers.mapIssueActivity);
  }

  async checkAndEscalateUrgentIssues(thresholdMinutes = 15) {
    const { data, error } = await this.getClient().rpc('claim_urgent_issues_for_escalation', {
      p_threshold_minutes: thresholdMinutes
    });
    if (error || !data) return [];

    const escalatedIssues = data.map(mappers.mapIssue);
    for (const issue of escalatedIssues) {
      await this.getClient().from('issue_activity').insert({
        issue_id: issue.id,
        user_id: null, // explicit system activity
        action: 'escalated',
        note: `Automatically escalated to organizers after ${thresholdMinutes}m unacknowledged.`
      });

      const organizers = (await this.getMemberships(issue.eventId)).filter(m => m.role === ROLES.ORGANIZER);
      for (const org of organizers) {
        await this.createNotification({
          eventId: issue.eventId,
          userId: org.userId,
          type: 'urgent_escalation',
          title: `🚨 ESCALATED: ${issue.title}`,
          message: `Urgent issue unacknowledged for >${thresholdMinutes}m. Immediate action required.`,
          link: '/issues'
        });
      }
    }

    return escalatedIssues;
  }

  // --- Announcements & Notifications ---
  async getAnnouncements(eventId, userId, role, assignedZoneIds = []) {
    const { data, error } = await this.getClient()
      .from('announcements')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (error || !data) return [];

    const mapped = data.map(mappers.mapAnnouncement);
    if (role === ROLES.ORGANIZER) return mapped;

    // Filter by audience for volunteer / coordinator
    return mapped.filter(a => {
      if (a.audience === 'all') return true;
      if (a.audience === 'zone' && a.zoneId) {
        return assignedZoneIds.includes(a.zoneId);
      }
      if (a.audience === 'role' && a.roleName) {
        return a.roleName.toLowerCase() === role.toLowerCase();
      }
      return false;
    });
  }

  async createAnnouncement(data) {
    const { data: ann, error } = await this.getClient()
      .from('announcements')
      .insert({
        event_id: data.eventId,
        author_id: data.authorId,
        title: data.title,
        body: data.body,
        audience: data.audience || 'all',
        zone_id: data.zoneId || null,
        role_name: data.roleName || null
      })
      .select('*')
      .single();
    if (error) throw new Error(`Failed to create announcement: ${error.message}`);

    const mappedAnn = mappers.mapAnnouncement(ann);

    // Targeted notification delivery
    const members = await this.getMemberships(data.eventId);
    const shifts = await this.getShifts(data.eventId);
    const assignments = await this.getAssignments(data.eventId);

    for (const mem of members) {
      let isTargeted = false;
      if (mappedAnn.audience === 'all') {
        isTargeted = true;
      } else if (mappedAnn.audience === 'zone' && mappedAnn.zoneId) {
        const isCoordOfZone = (mem.assignedZones || []).includes(mappedAnn.zoneId);
        const hasActiveShiftInZone = assignments.some(a => {
          if (a.volunteerId !== mem.userId || a.status === 'canceled' || a.status === 'absent') return false;
          const s = shifts.find(shift => shift.id === a.shiftId);
          return s && s.zoneId === mappedAnn.zoneId;
        });
        isTargeted = isCoordOfZone || hasActiveShiftInZone || mem.role === ROLES.ORGANIZER;
      } else if (mappedAnn.audience === 'role' && mappedAnn.roleName) {
        isTargeted = mem.role.toLowerCase() === mappedAnn.roleName.toLowerCase() || mem.role === ROLES.ORGANIZER;
      }

      if (isTargeted) {
        await this.createNotification({
          eventId: data.eventId,
          userId: mem.userId,
          type: 'announcement',
          title: `📢 Announcement: ${mappedAnn.title}`,
          message: mappedAnn.body.slice(0, 120),
          link: '/messages'
        });
      }
    }

    return mappedAnn;
  }

  async getNotifications(userId, eventId = null) {
    let query = this.getClient()
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (eventId) query = query.eq('event_id', eventId);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mappers.mapNotification);
  }

  async createNotification(notifData) {
    const { data, error } = await this.getClient()
      .from('notifications')
      .insert({
        event_id: notifData.eventId,
        user_id: notifData.userId,
        type: notifData.type,
        title: notifData.title,
        message: notifData.message,
        link: notifData.link || null,
        is_read: false
      })
      .select('*')
      .single();
    if (error) return null;
    return mappers.mapNotification(data);
  }

  async markNotificationRead(notificationId, userId) {
    const { data, error } = await this.getClient()
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();
    if (error || !data) return null;
    return mappers.mapNotification(data);
  }

  async markAllNotificationsRead(userId, eventId = null) {
    let query = this.getClient()
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId);
    if (eventId) query = query.eq('event_id', eventId);
    await query;
    return true;
  }

  // --- Handover Notes ---
  async getHandoverNotes(eventId, zoneId = null) {
    let query = this.getClient()
      .from('handover_notes')
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false });
    if (zoneId) query = query.eq('zone_id', zoneId);

    const { data, error } = await query;
    if (error || !data) return [];
    return data.map(mappers.mapHandover);
  }

  async createHandoverNote(data) {
    const { data: note, error } = await this.getClient()
      .from('handover_notes')
      .insert({
        event_id: data.eventId,
        zone_id: data.zoneId,
        shift_id: data.shiftId,
        author_id: data.authorId,
        summary: data.summary,
        open_issues: data.openIssues || '',
        notes: data.notes || ''
      })
      .select('*')
      .single();
    if (error) throw new Error(`Failed to create handover note: ${error.message}`);
    return mappers.mapHandover(note);
  }

  // --- Volunteer Details (Event-Scoped) ---
  async getVolunteerDetails(eventId) {
    const members = await this.getMemberships(eventId);
    const volunteerMembers = members.filter(m => m.role === ROLES.VOLUNTEER && m.status === 'active');
    if (volunteerMembers.length === 0) return [];

    const userIds = volunteerMembers.map(m => m.userId);

    const { data: profiles } = await this.getClient().from('profiles').select('*').in('id', userIds);
    const { data: skills } = await this.getClient().from('volunteer_skills').select('*').eq('event_id', eventId).in('user_id', userIds);
    const { data: avails } = await this.getClient().from('volunteer_availabilities').select('*').eq('event_id', eventId).in('user_id', userIds);
    const { data: prefs } = await this.getClient().from('volunteer_preferences').select('*').eq('event_id', eventId).in('user_id', userIds);

    const profMap = new Map((profiles || []).map(p => [p.id, mappers.mapProfile(p)]));
    const skillsMap = new Map();
    (skills || []).forEach(s => {
      if (!skillsMap.has(s.user_id)) skillsMap.set(s.user_id, []);
      skillsMap.get(s.user_id).push(s.skill_name);
    });

    const availsMap = new Map();
    (avails || []).forEach(a => {
      if (!availsMap.has(a.user_id)) availsMap.set(a.user_id, []);
      availsMap.get(a.user_id).push({
        id: a.id,
        startTime: a.start_time,
        endTime: a.end_time
      });
    });

    const prefsMap = new Map();
    (prefs || []).forEach(p => {
      prefsMap.set(p.user_id, {
        preferredZoneIds: p.preferred_zone_ids || [],
        preferredRoleNames: p.preferred_role_names || []
      });
    });

    return volunteerMembers.map(m => {
      const p = profMap.get(m.userId) || { fullName: 'Unknown', email: '' };
      const pr = prefsMap.get(m.userId) || { preferredZoneIds: [], preferredRoleNames: [] };
      return {
        id: m.userId,
        membershipId: m.id,
        eventId,
        name: p.fullName,
        email: p.email,
        phone: p.phone,
        avatarUrl: p.avatarUrl,
        bio: p.bio,
        role: m.role,
        membershipStatus: m.status,
        skills: skillsMap.get(m.userId) || [],
        availabilities: availsMap.get(m.userId) || [],
        preferredZoneIds: pr.preferredZoneIds,
        preferredRoleNames: pr.preferredRoleNames
      };
    });
  }

  async updateVolunteerProfile(eventId, userId, { skills, availabilities, preferredZoneIds, preferredRoleNames, phone, bio }) {
    if (phone !== undefined || bio !== undefined) {
      await this.getClient().from('profiles').update({
        ...(phone !== undefined ? { phone } : {}),
        ...(bio !== undefined ? { bio } : {}),
        updated_at: new Date().toISOString()
      }).eq('id', userId);
    }

    if (Array.isArray(skills)) {
      await this.getClient().from('volunteer_skills').delete().eq('event_id', eventId).eq('user_id', userId);
      if (skills.length > 0) {
        const rows = skills.map(s => ({
          user_id: userId,
          event_id: eventId,
          skill_name: s
        }));
        await this.getClient().from('volunteer_skills').insert(rows);
      }
    }

    if (Array.isArray(availabilities)) {
      await this.getClient().from('volunteer_availabilities').delete().eq('event_id', eventId).eq('user_id', userId);
      if (availabilities.length > 0) {
        const rows = availabilities.map(a => ({
          user_id: userId,
          event_id: eventId,
          start_time: a.startTime,
          end_time: a.endTime
        }));
        await this.getClient().from('volunteer_availabilities').insert(rows);
      }
    }

    if (Array.isArray(preferredZoneIds) || Array.isArray(preferredRoleNames)) {
      await this.getClient().from('volunteer_preferences').upsert({
        user_id: userId,
        event_id: eventId,
        preferred_zone_ids: preferredZoneIds || [],
        preferred_role_names: preferredRoleNames || [],
        updated_at: new Date().toISOString()
      });
    }

    return true;
  }
}

export function getRepo() {
  if (!activeRepo) {
    activeRepo = new SupabaseRepo();
  }
  return activeRepo;
}

export function setTestRepo(repoInstance) {
  activeRepo = repoInstance;
}
