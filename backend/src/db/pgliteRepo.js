import crypto from 'node:crypto';
import * as mappers from './mappers.js';
import { ROLES, ASSIGNMENT_STATUSES, ISSUE_STATUSES, ISSUE_SEVERITIES } from '../../../shared/constants.js';

export class PgRepo {
  constructor(pgliteInstance) {
    this.db = pgliteInstance;
  }

  async query(sql, params = []) {
    const res = await this.db.query(sql, params);
    return res.rows || [];
  }

  // --- Profiles ---
  async getProfileById(userId) {
    const rows = await this.query('select * from public.profiles where id = $1', [userId]);
    return rows.length > 0 ? mappers.mapProfile(rows[0]) : null;
  }

  async getProfileByEmail(email) {
    const rows = await this.query('select * from public.profiles where email = $1', [email]);
    return rows.length > 0 ? mappers.mapProfile(rows[0]) : null;
  }

  async upsertProfile({ id, email, fullName, name, phone = '', bio = '', avatarUrl = '' }) {
    const finalName = fullName || name || '';
    const sql = `
      insert into public.profiles (id, email, full_name, phone, bio, avatar_url, updated_at)
      values ($1, $2, $3, $4, $5, $6, now())
      on conflict (id) do update set
        email = excluded.email,
        full_name = excluded.full_name,
        phone = excluded.phone,
        bio = excluded.bio,
        avatar_url = excluded.avatar_url,
        updated_at = now()
      returning *;
    `;
    const rows = await this.query(sql, [id, email, finalName, phone, bio, avatarUrl]);
    return mappers.mapProfile(rows[0]);
  }

  // --- Memberships & Scoping ---
  async getUserMemberships(userId) {
    const sql = `
      select m.*, coalesce(array_agg(cz.zone_id) filter (where cz.zone_id is not null), '{}') as assigned_zones
      from public.event_memberships m
      left join public.coordinator_zones cz on cz.membership_id = m.id
      where m.user_id = $1 and m.status = 'active'
      group by m.id;
    `;
    const rows = await this.query(sql, [userId]);
    return rows.map(mappers.mapMembership);
  }

  async getMembership(eventId, userId) {
    const sql = `
      select m.*, coalesce(array_agg(cz.zone_id) filter (where cz.zone_id is not null), '{}') as assigned_zones
      from public.event_memberships m
      left join public.coordinator_zones cz on cz.membership_id = m.id
      where m.event_id = $1 and m.user_id = $2
      group by m.id;
    `;
    const rows = await this.query(sql, [eventId, userId]);
    return rows.length > 0 ? mappers.mapMembership(rows[0]) : null;
  }

  async getMemberships(eventId) {
    const sql = `
      select m.*, coalesce(array_agg(cz.zone_id) filter (where cz.zone_id is not null), '{}') as assigned_zones
      from public.event_memberships m
      left join public.coordinator_zones cz on cz.membership_id = m.id
      where m.event_id = $1
      group by m.id;
    `;
    const rows = await this.query(sql, [eventId]);
    return rows.map(mappers.mapMembership);
  }

  async addMembership({ eventId, userId, role = ROLES.VOLUNTEER, status = 'active' }) {
    const sql = `
      insert into public.event_memberships (event_id, user_id, role, status)
      values ($1, $2, $3, $4)
      returning *;
    `;
    const rows = await this.query(sql, [eventId, userId, role, status]);
    return mappers.mapMembership(rows[0]);
  }

  async updateMembershipRole(eventId, userId, role, assignedZones = null) {
    const sql = `
      update public.event_memberships
      set role = $1
      where event_id = $2 and user_id = $3
      returning id;
    `;
    const rows = await this.query(sql, [role, eventId, userId]);
    if (rows.length === 0) return null;
    const memId = rows[0].id;

    if (Array.isArray(assignedZones)) {
      await this.query('delete from public.coordinator_zones where membership_id = $1', [memId]);
      for (const zid of assignedZones) {
        await this.query(
          'insert into public.coordinator_zones (membership_id, zone_id) values ($1, $2) on conflict do nothing',
          [memId, zid]
        );
      }
    }

    return this.getMembership(eventId, userId);
  }

  // --- Events ---
  async getEvents(userId) {
    const userMems = await this.getUserMemberships(userId);
    if (userMems.length === 0) return [];
    const eventIds = userMems.map(m => m.eventId);

    const placeholders = eventIds.map((_, i) => `$${i + 1}`).join(', ');
    const sql = `select * from public.events where id in (${placeholders});`;
    const rows = await this.query(sql, eventIds);

    const memMap = new Map(userMems.map(m => [m.eventId, m]));
    return rows.map(e => {
      const mapped = mappers.mapEvent(e);
      const mem = memMap.get(e.id);
      if (mem?.role !== ROLES.ORGANIZER) {
        mapped.inviteCode = null;
      }
      return mapped;
    });
  }

  async getEventById(eventId) {
    const rows = await this.query('select * from public.events where id = $1', [eventId]);
    return rows.length > 0 ? mappers.mapEvent(rows[0]) : null;
  }

  async getEventByInviteCode(inviteCode) {
    const sql = `select * from public.get_event_invite_preview($1);`;
    const rows = await this.query(sql, [inviteCode]);
    return rows.length > 0 ? mappers.mapEvent(rows[0]) : null;
  }

  async createEvent(eventData, creatorId) {
    const inviteCode = eventData.inviteCode || `INV-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const sql = `
      select public.create_event_with_organizer(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      ) as res;
    `;
    const rows = await this.query(sql, [
      eventData.title,
      eventData.description || '',
      eventData.venueName,
      eventData.startDate,
      eventData.endDate,
      eventData.timezone || 'UTC',
      inviteCode,
      eventData.maxHoursPerVolunteer || 12.0,
      eventData.urgentEscalationMinutes || 15,
      creatorId
    ]);
    const res = rows[0]?.res;
    return mappers.mapEvent(res.event);
  }

  async updateEvent(eventId, updates = {}) {
    const allowed = [
      'title', 'description', 'venueName', 'startDate', 'endDate',
      'timezone', 'layoutImageUrl', 'maxHoursPerVolunteer', 'urgentEscalationMinutes',
      'inviteCode', 'status', 'closedAt', 'closedBy', 'inviteExpiresAt', 'inviteRevokedAt'
    ];
    const setClauses = [];
    const params = [];
    let idx = 1;

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        setClauses.push(`${snakeKey} = $${idx++}`);
        params.push(updates[key]);
      }
    }

    if (setClauses.length === 0) return this.getEventById(eventId);

    params.push(eventId);
    const sql = `update public.events set ${setClauses.join(', ')} where id = $${idx} returning *;`;
    const rows = await this.query(sql, params);
    return rows.length > 0 ? mappers.mapEvent(rows[0]) : null;
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
    const rows = await this.query('select * from public.zones where event_id = $1 order by name asc', [eventId]);
    const shifts = await this.getShifts(eventId);
    const assignments = await this.getAssignments(eventId);
    const issues = await this.getIssues(eventId);

    const evalTime = filterOptions.time ? new Date(filterOptions.time).getTime() : Date.now();

    return rows.map(z => {
      const mapped = mappers.mapZone(z);
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
        coverageStatus = 'idle';
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
    const rows = await this.query('select * from public.zones where id = $1', [zoneId]);
    return rows.length > 0 ? mappers.mapZone(rows[0]) : null;
  }

  async createZone(zoneData) {
    const sql = `
      insert into public.zones (event_id, name, code, description, color, pos_x, pos_y, required_headcount)
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      returning *;
    `;
    const rows = await this.query(sql, [
      zoneData.eventId,
      zoneData.name,
      zoneData.code,
      zoneData.description || '',
      zoneData.color || '#7054E8',
      zoneData.posX !== undefined ? Number(zoneData.posX) : 50.0,
      zoneData.posY !== undefined ? Number(zoneData.posY) : 50.0,
      Number(zoneData.requiredHeadcount) || 1
    ]);
    return mappers.mapZone(rows[0]);
  }

  async updateZone(zoneId, eventId, updates = {}) {
    const zone = await this.getZoneById(zoneId);
    if (!zone || zone.eventId !== eventId) return null;

    const allowed = ['name', 'code', 'description', 'color', 'posX', 'posY', 'requiredHeadcount'];
    const setClauses = [];
    const params = [];
    let idx = 1;

    for (const key of allowed) {
      if (updates[key] !== undefined) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        setClauses.push(`${snakeKey} = $${idx++}`);
        params.push(updates[key]);
      }
    }

    if (setClauses.length === 0) return zone;
    params.push(zoneId);
    const sql = `update public.zones set ${setClauses.join(', ')} where id = $${idx} returning *;`;
    const rows = await this.query(sql, params);
    return rows.length > 0 ? mappers.mapZone(rows[0]) : null;
  }

  // --- Shifts ---
  async getShifts(eventId, zoneId = null) {
    let sql = 'select * from public.shifts where event_id = $1';
    const params = [eventId];
    if (zoneId) {
      sql += ' and zone_id = $2';
      params.push(zoneId);
    }
    sql += ' order by start_time asc;';
    const rows = await this.query(sql, params);
    return rows.map(mappers.mapShift);
  }

  async getShiftById(shiftId) {
    const rows = await this.query('select * from public.shifts where id = $1', [shiftId]);
    return rows.length > 0 ? mappers.mapShift(rows[0]) : null;
  }

  async createShift(shiftData) {
    const sql = `
      insert into public.shifts (
        event_id, zone_id, title, role_name, start_time, end_time,
        required_headcount, required_skills, preferred_skills, notes
      ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      returning *;
    `;
    const rows = await this.query(sql, [
      shiftData.eventId,
      shiftData.zoneId,
      shiftData.title,
      shiftData.roleName || 'Volunteer',
      shiftData.startTime,
      shiftData.endTime,
      Number(shiftData.requiredHeadcount) || 1,
      shiftData.requiredSkills || [],
      shiftData.preferredSkills || [],
      shiftData.notes || ''
    ]);
    return mappers.mapShift(rows[0]);
  }

  // --- Assignments ---
  async getAssignments(eventId, shiftId = null) {
    let sql = 'select * from public.assignments where event_id = $1';
    const params = [eventId];
    if (shiftId) {
      sql += ' and shift_id = $2';
      params.push(shiftId);
    }
    const rows = await this.query(sql, params);
    return rows.map(mappers.mapAssignment);
  }

  async getAssignmentById(assignmentId) {
    const rows = await this.query('select * from public.assignments where id = $1', [assignmentId]);
    return rows.length > 0 ? mappers.mapAssignment(rows[0]) : null;
  }

  async assignVolunteerAtomic({ eventId, shiftId, volunteerId, assignedBy }) {
    const sql = `select public.assign_volunteer_atomic($1, $2, $3, $4) as res;`;
    try {
      const rows = await this.query(sql, [eventId, shiftId, volunteerId, assignedBy]);
      return mappers.mapAssignment(rows[0].res);
    } catch (err) {
      if (err.message.includes('full capacity')) err.code = 'CAPACITY_EXCEEDED';
      if (err.message.includes('already assigned')) err.code = 'DUPLICATE_ASSIGNMENT';
      if (err.message.includes('overlapping')) err.code = 'OVERLAPPING_SHIFT';
      throw err;
    }
  }

  async reassignVolunteerAtomic({ eventId, sourceShiftId, targetShiftId, volunteerId, assignedBy }) {
    const sql = `select public.reassign_volunteer_atomic($1, $2, $3, $4, $5) as res;`;
    const rows = await this.query(sql, [eventId, sourceShiftId, targetShiftId, volunteerId, assignedBy]);
    const res = rows[0].res;
    return {
      previousAssignmentId: res.previousAssignmentId,
      newAssignment: mappers.mapAssignment(res.newAssignment)
    };
  }

  async cancelAssignment(assignmentId, reason, _actorId) {
    const asgn = await this.getAssignmentById(assignmentId);
    if (!asgn) throw new Error('Assignment not found');

    const sql = `
      update public.assignments set
        status = 'canceled',
        cancellation_reason = $1,
        canceled_at = now(),
        updated_at = now()
      where id = $2
      returning *;
    `;
    const rows = await this.query(sql, [reason, assignmentId]);

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

    return mappers.mapAssignment(rows[0]);
  }

  async markAbsent(assignmentId, reason, _actorId) {
    const sql = `
      update public.assignments set
        status = 'absent',
        cancellation_reason = $1,
        updated_at = now()
      where id = $2
      returning *;
    `;
    const rows = await this.query(sql, [reason, assignmentId]);
    return rows.length > 0 ? mappers.mapAssignment(rows[0]) : null;
  }

  // --- Attendance ---
  async getAttendance(eventId, shiftId = null, volunteerId = null) {
    let sql = 'select * from public.attendance where event_id = $1';
    const params = [eventId];
    let idx = 2;
    if (shiftId) {
      sql += ` and shift_id = $${idx++}`;
      params.push(shiftId);
    }
    if (volunteerId) {
      sql += ` and volunteer_id = $${idx++}`;
      params.push(volunteerId);
    }
    sql += ' order by check_in_time desc;';
    const rows = await this.query(sql, params);
    return rows.map(mappers.mapAttendance);
  }

  async recordCheckInAtomic({ eventId, assignmentId, volunteerId, method = 'self', verifiedBy = null, notes = '' }) {
    const sql = `select public.record_check_in_atomic($1, $2, $3, $4, $5, $6) as res;`;
    const rows = await this.query(sql, [eventId, assignmentId, volunteerId, method, verifiedBy, notes]);
    return mappers.mapAttendance(rows[0].res);
  }

  async recordCheckOutAtomic({ eventId, attendanceId, verifiedBy = null, notes = '' }) {
    const sql = `select public.record_check_out_atomic($1, $2, $3, $4) as res;`;
    const rows = await this.query(sql, [eventId, attendanceId, verifiedBy, notes]);
    return mappers.mapAttendance(rows[0].res);
  }

  async createQrToken({ eventId, shiftId, createdBy }) {
    const token = crypto.randomBytes(16).toString('hex');
    const sql = `
      insert into public.qr_tokens (token, event_id, shift_id, created_by, expires_at)
      values ($1, $2, $3, $4, now() + interval '5 minutes')
      returning *;
    `;
    const rows = await this.query(sql, [token, eventId, shiftId, createdBy]);
    return { token, shiftId, expiresAt: rows[0].expires_at, validitySeconds: 300 };
  }

  async getQrToken(token) {
    const sql = `select * from public.qr_tokens where token = $1 and expires_at > now();`;
    const rows = await this.query(sql, [token]);
    if (rows.length === 0) return null;
    return {
      token: rows[0].token,
      eventId: rows[0].event_id,
      shiftId: rows[0].shift_id,
      createdBy: rows[0].created_by,
      expiresAt: rows[0].expires_at
    };
  }

  // --- Issues ---
  async getIssues(eventId, zoneId = null, status = null) {
    let sql = 'select * from public.issues where event_id = $1';
    const params = [eventId];
    let idx = 2;
    if (zoneId) {
      sql += ` and zone_id = $${idx++}`;
      params.push(zoneId);
    }
    if (status) {
      sql += ` and status = $${idx++}`;
      params.push(status);
    }
    sql += ' order by created_at desc;';
    const rows = await this.query(sql, params);
    return rows.map(mappers.mapIssue);
  }

  async getIssueById(issueId) {
    const rows = await this.query('select * from public.issues where id = $1', [issueId]);
    return rows.length > 0 ? mappers.mapIssue(rows[0]) : null;
  }

  async createIssue(issueData) {
    const sql = `
      insert into public.issues (
        event_id, zone_id, title, description, category, severity, status, reported_by, assigned_to
      ) values ($1, $2, $3, $4, $5, $6, 'open', $7, $8)
      returning *;
    `;
    const rows = await this.query(sql, [
      issueData.eventId,
      issueData.zoneId || null,
      issueData.title,
      issueData.description,
      issueData.category || 'general',
      issueData.severity || 'medium',
      issueData.reportedBy,
      issueData.assignedTo || null
    ]);
    const issue = rows[0];

    await this.query(
      'insert into public.issue_activity (issue_id, user_id, action, note) values ($1, $2, $3, $4);',
      [issue.id, issueData.reportedBy, 'created', 'Issue reported']
    );

    return mappers.mapIssue(issue);
  }

  async updateIssue(issueId, eventId, updates, actorId, isPrivileged) {
    let issue = await this.getIssueById(issueId);
    if (!issue || issue.eventId !== eventId) return null;

    const setClauses = [];
    const params = [];
    let idx = 1;

    if (isPrivileged) {
      if (updates.status) {
        setClauses.push(`status = $${idx++}`);
        params.push(updates.status);
        if (updates.status === 'acknowledged' && !issue.acknowledgedAt) {
          setClauses.push('acknowledged_at = now()');
        } else if (updates.status === 'resolved' && !issue.resolvedAt) {
          setClauses.push('resolved_at = now()');
        }
      }
      if (updates.severity) {
        setClauses.push(`severity = $${idx++}`);
        params.push(updates.severity);
      }
      if (updates.assignedTo !== undefined) {
        setClauses.push(`assigned_to = $${idx++}`);
        params.push(updates.assignedTo);
      }
    }

    if (updates.title) {
      setClauses.push(`title = $${idx++}`);
      params.push(updates.title);
    }
    if (updates.description) {
      setClauses.push(`description = $${idx++}`);
      params.push(updates.description);
    }

    if (setClauses.length > 0) {
      params.push(issueId);
      const sql = `update public.issues set ${setClauses.join(', ')} where id = $${idx} returning *;`;
      const rows = await this.query(sql, params);
      issue = rows[0];
    }

    if (updates.activityNote || updates.status || updates.assignedTo) {
      await this.query(
        'insert into public.issue_activity (issue_id, user_id, action, note) values ($1, $2, $3, $4);',
        [issueId, actorId, updates.status ? `status_${updates.status}` : 'updated', updates.activityNote || 'Issue modified']
      );
    }

    return mappers.mapIssue(issue);
  }

  async getIssueActivity(issueId) {
    const rows = await this.query(
      'select * from public.issue_activity where issue_id = $1 order by created_at asc;',
      [issueId]
    );
    return rows.map(mappers.mapIssueActivity);
  }

  async checkAndEscalateUrgentIssues(thresholdMinutes = 15) {
    const sql = `select * from public.claim_urgent_issues_for_escalation($1);`;
    const rows = await this.query(sql, [thresholdMinutes]);
    const escalatedIssues = rows.map(mappers.mapIssue);

    for (const issue of escalatedIssues) {
      await this.query(
        'insert into public.issue_activity (issue_id, user_id, action, note) values ($1, $2, $3, $4);',
        [issue.id, null, 'escalated', `Automatically escalated to organizers after ${thresholdMinutes}m unacknowledged.`]
      );

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
    const rows = await this.query(
      'select * from public.announcements where event_id = $1 order by created_at desc;',
      [eventId]
    );
    const mapped = rows.map(mappers.mapAnnouncement);
    if (role === ROLES.ORGANIZER) return mapped;

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
    const sql = `
      insert into public.announcements (event_id, author_id, title, body, audience, zone_id, role_name)
      values ($1, $2, $3, $4, $5, $6, $7)
      returning *;
    `;
    const rows = await this.query(sql, [
      data.eventId,
      data.authorId,
      data.title,
      data.body,
      data.audience || 'all',
      data.zoneId || null,
      data.roleName || null
    ]);
    const mappedAnn = mappers.mapAnnouncement(rows[0]);

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
    let sql = 'select * from public.notifications where user_id = $1';
    const params = [userId];
    if (eventId) {
      sql += ' and event_id = $2';
      params.push(eventId);
    }
    sql += ' order by created_at desc;';
    const rows = await this.query(sql, params);
    return rows.map(mappers.mapNotification);
  }

  async createNotification(notifData) {
    const sql = `
      insert into public.notifications (event_id, user_id, type, title, message, link, is_read)
      values ($1, $2, $3, $4, $5, $6, false)
      returning *;
    `;
    const rows = await this.query(sql, [
      notifData.eventId,
      notifData.userId,
      notifData.type,
      notifData.title,
      notifData.message,
      notifData.link || null
    ]);
    return rows.length > 0 ? mappers.mapNotification(rows[0]) : null;
  }

  async markNotificationRead(notificationId, userId) {
    const sql = `
      update public.notifications set is_read = true
      where id = $1 and user_id = $2
      returning *;
    `;
    const rows = await this.query(sql, [notificationId, userId]);
    return rows.length > 0 ? mappers.mapNotification(rows[0]) : null;
  }

  async markAllNotificationsRead(userId, eventId = null) {
    let sql = 'update public.notifications set is_read = true where user_id = $1';
    const params = [userId];
    if (eventId) {
      sql += ' and event_id = $2';
      params.push(eventId);
    }
    await this.query(sql, params);
    return true;
  }

  // --- Handover Notes ---
  async getHandoverNotes(eventId, zoneId = null) {
    let sql = 'select * from public.handover_notes where event_id = $1';
    const params = [eventId];
    if (zoneId) {
      sql += ' and zone_id = $2';
      params.push(zoneId);
    }
    sql += ' order by created_at desc;';
    const rows = await this.query(sql, params);
    return rows.map(mappers.mapHandover);
  }

  async createHandoverNote(data) {
    const sql = `
      insert into public.handover_notes (event_id, zone_id, shift_id, author_id, summary, open_issues, notes)
      values ($1, $2, $3, $4, $5, $6, $7)
      returning *;
    `;
    const rows = await this.query(sql, [
      data.eventId,
      data.zoneId,
      data.shiftId,
      data.authorId,
      data.summary,
      data.openIssues || '',
      data.notes || ''
    ]);
    return mappers.mapHandover(rows[0]);
  }

  // --- Volunteer Details (Event-Scoped) ---
  async getVolunteerDetails(eventId) {
    const members = await this.getMemberships(eventId);
    const volunteerMembers = members.filter(m => m.role === ROLES.VOLUNTEER && m.status === 'active');
    if (volunteerMembers.length === 0) return [];
    const userIds = volunteerMembers.map(m => m.userId);

    const placeholders = userIds.map((_, i) => `$${i + 1}`).join(', ');
    const profiles = await this.query(`select * from public.profiles where id in (${placeholders})`, userIds);

    const skills = await this.query(
      `select * from public.volunteer_skills where event_id = $1 and user_id in (${placeholders.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + 1}`)})`,
      [eventId, ...userIds]
    );

    const avails = await this.query(
      `select * from public.volunteer_availabilities where event_id = $1 and user_id in (${placeholders.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + 1}`)})`,
      [eventId, ...userIds]
    );

    const prefs = await this.query(
      `select * from public.volunteer_preferences where event_id = $1 and user_id in (${placeholders.replace(/\$(\d+)/g, (_, n) => `$${Number(n) + 1}`)})`,
      [eventId, ...userIds]
    );

    const profMap = new Map(profiles.map(p => [p.id, mappers.mapProfile(p)]));
    const skillsMap = new Map();
    skills.forEach(s => {
      if (!skillsMap.has(s.user_id)) skillsMap.set(s.user_id, []);
      skillsMap.get(s.user_id).push(s.skill_name);
    });

    const availsMap = new Map();
    avails.forEach(a => {
      if (!availsMap.has(a.user_id)) availsMap.set(a.user_id, []);
      availsMap.get(a.user_id).push({
        id: a.id,
        startTime: a.start_time,
        endTime: a.end_time
      });
    });

    const prefsMap = new Map();
    prefs.forEach(p => {
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
      await this.query(
        'update public.profiles set phone = coalesce($1, phone), bio = coalesce($2, bio), updated_at = now() where id = $3',
        [phone ?? null, bio ?? null, userId]
      );
    }

    if (Array.isArray(skills)) {
      await this.query('delete from public.volunteer_skills where event_id = $1 and user_id = $2', [eventId, userId]);
      for (const s of skills) {
        await this.query(
          'insert into public.volunteer_skills (event_id, user_id, skill_name) values ($1, $2, $3) on conflict do nothing;',
          [eventId, userId, s]
        );
      }
    }

    if (Array.isArray(availabilities)) {
      await this.query('delete from public.volunteer_availabilities where event_id = $1 and user_id = $2', [eventId, userId]);
      for (const a of availabilities) {
        await this.query(
          'insert into public.volunteer_availabilities (event_id, user_id, start_time, end_time) values ($1, $2, $3, $4);',
          [eventId, userId, a.startTime, a.endTime]
        );
      }
    }

    if (Array.isArray(preferredZoneIds) || Array.isArray(preferredRoleNames)) {
      const sql = `
        insert into public.volunteer_preferences (event_id, user_id, preferred_zone_ids, preferred_role_names, updated_at)
        values ($1, $2, $3, $4, now())
        on conflict (user_id, event_id) do update set
          preferred_zone_ids = excluded.preferred_zone_ids,
          preferred_role_names = excluded.preferred_role_names,
          updated_at = now();
      `;
      await this.query(sql, [eventId, userId, preferredZoneIds || [], preferredRoleNames || []]);
    }

    return true;
  }
}
