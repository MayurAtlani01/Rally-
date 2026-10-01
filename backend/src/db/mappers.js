/**
 * Database to API explicit mappers.
 * Maps Postgres snake_case columns to clean camelCase properties expected by frontend contracts.
 */

export function mapProfile(row) {
  if (!row) return null;
  return {
    id: row.id,
    fullName: row.full_name || '',
    email: row.email || '',
    phone: row.phone || '',
    avatarUrl: row.avatar_url || '',
    bio: row.bio || '',
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

export function mapEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    venueName: row.venue_name,
    startDate: row.start_date,
    endDate: row.end_date,
    timezone: row.timezone || 'UTC',
    inviteCode: row.invite_code || null,
    layoutImageUrl: row.layout_image_url || null,
    maxHoursPerVolunteer: row.max_hours_per_volunteer ? Number(row.max_hours_per_volunteer) : 12.0,
    urgentEscalationMinutes: row.urgent_escalation_minutes ? Number(row.urgent_escalation_minutes) : 15,
    status: row.status || 'active',
    closedAt: row.closed_at || null,
    closedBy: row.closed_by || null,
    inviteExpiresAt: row.invite_expires_at || null,
    inviteRevokedAt: row.invite_revoked_at || null,
    createdBy: row.created_by || null,
    createdAt: row.created_at || null
  };
}

export function mapMembership(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    role: row.role,
    status: row.status || 'active',
    assignedZones: row.assigned_zones || [],
    emergencyContact: row.emergency_contact || null,
    createdAt: row.created_at || null
  };
}

export function mapZone(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    code: row.code,
    description: row.description || '',
    color: row.color || '#7054E8',
    posX: row.pos_x !== undefined && row.pos_x !== null ? Number(row.pos_x) : 50.0,
    posY: row.pos_y !== undefined && row.pos_y !== null ? Number(row.pos_y) : 50.0,
    requiredHeadcount: Number(row.required_headcount) || 1,
    createdAt: row.created_at || null
  };
}

export function mapShift(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    zoneId: row.zone_id,
    title: row.title,
    roleName: row.role_name || 'Volunteer',
    startTime: row.start_time,
    endTime: row.end_time,
    requiredHeadcount: Number(row.required_headcount) || 1,
    requiredSkills: row.required_skills || [],
    preferredSkills: row.preferred_skills || [],
    notes: row.notes || '',
    createdAt: row.created_at || null
  };
}

export function mapAssignment(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    shiftId: row.shift_id,
    volunteerId: row.volunteer_id,
    status: row.status || 'assigned',
    cancellationReason: row.cancellation_reason || null,
    canceledAt: row.canceled_at || null,
    assignedBy: row.assigned_by || null,
    createdAt: row.created_at || null,
    updatedAt: row.updated_at || null
  };
}

export function mapAttendance(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    assignmentId: row.assignment_id,
    volunteerId: row.volunteer_id,
    shiftId: row.shift_id,
    checkInTime: row.check_in_time,
    checkOutTime: row.check_out_time || null,
    method: row.method || 'self',
    verifiedBy: row.verified_by || null,
    isFlagged: Boolean(row.is_flagged),
    flaggedReason: row.flagged_reason || null,
    notes: row.notes || null,
    createdAt: row.created_at || null
  };
}

export function mapIssue(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    zoneId: row.zone_id || null,
    title: row.title,
    description: row.description,
    category: row.category || 'general',
    severity: row.severity || 'medium',
    status: row.status || 'open',
    reportedBy: row.reported_by,
    coordinatorId: row.coordinator_id || null,
    assignedTo: row.assigned_to || null,
    acknowledgedAt: row.acknowledged_at || null,
    resolvedAt: row.resolved_at || null,
    escalatedAt: row.escalated_at || null,
    createdAt: row.created_at || null
  };
}

export function mapIssueActivity(row) {
  if (!row) return null;
  return {
    id: row.id,
    issueId: row.issue_id,
    userId: row.user_id || null,
    action: row.action,
    note: row.note || '',
    createdAt: row.created_at || null
  };
}

export function mapAnnouncement(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    authorId: row.author_id,
    title: row.title,
    body: row.body,
    audience: row.audience || 'all',
    zoneId: row.zone_id || null,
    roleName: row.role_name || null,
    createdAt: row.created_at || null
  };
}

export function mapNotification(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    userId: row.user_id,
    type: row.type,
    title: row.title,
    message: row.message,
    link: row.link || null,
    isRead: Boolean(row.is_read),
    createdAt: row.created_at || null
  };
}

export function mapHandover(row) {
  if (!row) return null;
  return {
    id: row.id,
    eventId: row.event_id,
    zoneId: row.zone_id,
    shiftId: row.shift_id,
    authorId: row.author_id,
    summary: row.summary,
    openIssues: row.open_issues || '',
    notes: row.notes || '',
    createdAt: row.created_at || null
  };
}
