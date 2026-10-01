let currentUserId = localStorage.getItem('rally_user_id') || null;
let currentEventId = localStorage.getItem('rally_event_id') || null;
let currentAuthToken = localStorage.getItem('rally_auth_token') || null;

export function setApiSession(userId, eventId, token = null) {
  if (userId) {
    currentUserId = userId;
    localStorage.setItem('rally_user_id', userId);
  } else if (userId === null) {
    currentUserId = null;
    localStorage.removeItem('rally_user_id');
  }

  if (eventId) {
    currentEventId = eventId;
    localStorage.setItem('rally_event_id', eventId);
  } else if (eventId === null) {
    currentEventId = null;
    localStorage.removeItem('rally_event_id');
  }

  if (token) {
    currentAuthToken = token;
    localStorage.setItem('rally_auth_token', token);
  } else if (token === null) {
    currentAuthToken = null;
    localStorage.removeItem('rally_auth_token');
  }
}

export function clearApiSession() {
  currentUserId = null;
  currentEventId = null;
  currentAuthToken = null;
  localStorage.removeItem('rally_user_id');
  localStorage.removeItem('rally_event_id');
  localStorage.removeItem('rally_auth_token');
}

export function getApiSession() {
  return { userId: currentUserId, eventId: currentEventId, token: currentAuthToken };
}

async function request(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(currentUserId ? { 'x-user-id': currentUserId } : {}),
    ...(currentEventId ? { 'x-event-id': currentEventId } : {}),
    ...(currentAuthToken ? { 'Authorization': `Bearer ${currentAuthToken}` } : {}),
    ...(options.headers || {})
  };

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errMessage = 'An unexpected error occurred.';
    let errData = {};
    try {
      errData = await response.json();
      errMessage = errData.error || errMessage;
    } catch {
      errMessage = response.statusText || errMessage;
    }
    const err = new Error(errMessage);
    err.status = response.status;
    err.data = errData;
    throw err;
  }

  return response.json();
}

export const api = {
  // Auth
  getMe: () => request('/api/auth/me'),
  login: (data) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  signup: (data) => request('/api/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  syncProfile: (data) => request('/api/auth/sync-profile', { method: 'POST', body: JSON.stringify(data) }),
  resetPassword: (email) => request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email }) }),

  // Events
  getEvents: () => request('/api/events'),
  getEvent: (id) => request(`/api/events/${id}`),
  createEvent: (data) => request('/api/events', { method: 'POST', body: JSON.stringify(data) }),
  updateEvent: (id, data) => request(`/api/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  closeEvent: (id) => request(`/api/events/${id}/close`, { method: 'POST' }),
  previewInvite: (inviteCode) => request(`/api/events/preview-invite/${inviteCode}`),
  joinEvent: (inviteCode) => request('/api/events/join', { method: 'POST', body: JSON.stringify({ inviteCode }) }),
  updateMemberRole: (eventId, userId, data) => request(`/api/events/${eventId}/members/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),
  regenerateInviteCode: (eventId) => request(`/api/events/${eventId}/invite/regenerate`, { method: 'POST' }),
  revokeInviteCode: (eventId) => request(`/api/events/${eventId}/invite/revoke`, { method: 'POST' }),

  // Zones
  getZones: (eventId = currentEventId) => request(`/api/events/${eventId}/zones`),
  createZone: (eventId, data) => request(`/api/events/${eventId}/zones`, { method: 'POST', body: JSON.stringify(data) }),
  updateZone: (eventId, zoneId, data) => request(`/api/events/${eventId}/zones/${zoneId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Volunteers Directory & Onboarding
  getVolunteers: (eventId = currentEventId, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/events/${eventId}/volunteers${q ? `?${q}` : ''}`);
  },
  updateVolunteer: (eventId, userId, data) => request(`/api/events/${eventId}/volunteers/${userId}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Shifts & Matching
  getShifts: (eventId = currentEventId, zoneId = '') => {
    const q = zoneId ? `?zoneId=${zoneId}` : '';
    return request(`/api/events/${eventId}/shifts${q}`);
  },
  createShift: (eventId, data) => request(`/api/events/${eventId}/shifts`, { method: 'POST', body: JSON.stringify(data) }),
  getCandidates: (eventId, shiftId) => request(`/api/events/${eventId}/shifts/${shiftId}/candidates`),
  assignVolunteer: (eventId, shiftId, volunteerId) => request(`/api/events/${eventId}/shifts/${shiftId}/assign`, { method: 'POST', body: JSON.stringify({ volunteerId }) }),
  cancelAssignment: (eventId, assignmentId, reason) => request(`/api/events/${eventId}/assignments/${assignmentId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
  markAbsent: (eventId, assignmentId, reason) => request(`/api/events/${eventId}/assignments/${assignmentId}/absent`, { method: 'POST', body: JSON.stringify({ reason }) }),
  reassignPreview: (eventId, payload) => request(`/api/events/${eventId}/shifts/reassign-preview`, { method: 'POST', body: JSON.stringify(payload) }),
  reassignAtomic: (eventId, payload) => request(`/api/events/${eventId}/shifts/reassign-atomic`, { method: 'POST', body: JSON.stringify(payload) }),

  // Attendance
  getAttendance: (eventId = currentEventId, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/events/${eventId}/attendance${q ? `?${q}` : ''}`);
  },
  checkIn: (eventId, data) => request(`/api/events/${eventId}/attendance/check-in`, { method: 'POST', body: JSON.stringify(data) }),
  checkOut: (eventId, data) => request(`/api/events/${eventId}/attendance/check-out`, { method: 'POST', body: JSON.stringify(data) }),

  // Issues
  getIssues: (eventId = currentEventId, params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/api/events/${eventId}/issues${q ? `?${q}` : ''}`);
  },
  createIssue: (eventId, data) => request(`/api/events/${eventId}/issues`, { method: 'POST', body: JSON.stringify(data) }),
  updateIssue: (eventId, issueId, data) => request(`/api/events/${eventId}/issues/${issueId}`, { method: 'PUT', body: JSON.stringify(data) }),
  escalateCheck: (eventId) => request(`/api/events/${eventId}/issues/escalate-check`, { method: 'POST' }),

  // Announcements
  getAnnouncements: (eventId = currentEventId) => request(`/api/events/${eventId}/announcements`),
  createAnnouncement: (eventId, data) => request(`/api/events/${eventId}/announcements`, { method: 'POST', body: JSON.stringify(data) }),

  // Notifications
  getNotifications: (eventId = currentEventId) => request(`/api/notifications?eventId=${eventId}`),
  markNotificationRead: (id) => request(`/api/notifications/${id}/read`, { method: 'PUT' }),

  // Shift Handover
  getHandoverNotes: (eventId = currentEventId, zoneId = '') => {
    const q = zoneId ? `?zoneId=${zoneId}` : '';
    return request(`/api/events/${eventId}/handover${q}`);
  },
  createHandoverNote: (eventId, data) => request(`/api/events/${eventId}/handover`, { method: 'POST', body: JSON.stringify(data) }),

  // Reports
  getEventReport: (eventId = currentEventId) => request(`/api/events/${eventId}/report`),
  getReport: (eventId = currentEventId) => request(`/api/events/${eventId}/report`),
  getCsvUrl: (eventId = currentEventId) => `/api/events/${eventId}/report/csv`
};
