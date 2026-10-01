# RALLY Backend API Contract & Frontend Handoff Specification

This document provides the definitive API contract for frontend developers integrating with the hardened RALLY backend. All routes operate against real Supabase PostgreSQL data with enforced authentication, strict event membership boundaries, and transactional database integrity.

---

## 1. Authentication & Identity

### Authentication Headers
- Every protected backend request must include an official Supabase Bearer access token:
  ```http
  Authorization: Bearer <supabase_access_token>
  ```
- **Deprecated / Rejected Headers**:
  - `x-user-id` is **STRICTLY REJECTED** (401 UNAUTHENTICATED).
  - Unsigned/forged JWTs or demo tokens (e.g. `demo-token-*`) return `401 INVALID_TOKEN`.
  - Backend derives user identity directly from Supabase Auth (`auth.users.id`).

### Profile Synchronization (`/api/auth/sync-profile`)
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Body**:
  ```json
  {
    "id": "uuid-must-match-authenticated-user",
    "email": "user@example.com",
    "name": "Jane Doe",
    "phone": "+1-555-0199",
    "bio": "Certified EMT and logistics coordinator"
  }
  ```
- **Security**: The backend asserts `payload.id === req.user.id`. Any attempt to supply another user's ID returns `403 FORBIDDEN`.

### Get Current User Profile (`/api/auth/me`)
- **Method**: `GET`
- **Headers**: `Authorization: Bearer <token>`
- **Response**:
  ```json
  {
    "user": {
      "id": "c138d6aa-f273-42e5-b1a1-9a7065977dd0",
      "email": "jane@example.com",
      "name": "Jane Doe",
      "phone": "+1-555-0199",
      "bio": "Certified EMT",
      "avatarUrl": ""
    }
  }
  ```

---

## 2. Event Lifecycle & Membership Scoping

### Event Listing (`GET /api/events`)
- Returns **only** events where the authenticated user holds an active membership.
- Sensitive fields like `inviteCode` are only returned if the user is an **organizer** for that event. Volunteers and coordinators receive `inviteCode: undefined`.

### Event Creation (`POST /api/events`)
- **Method**: `POST`
- **Body**:
  ```json
  {
    "title": "Hackathon 2026",
    "description": "Annual civic hackathon",
    "venueName": "Main Concourse",
    "startDate": "2026-10-10T08:00:00Z",
    "endDate": "2026-10-10T20:00:00Z",
    "timezone": "America/New_York",
    "zones": [
      {
        "name": "Registration",
        "code": "REG",
        "color": "#4F46E5",
        "posX": 25.0,
        "posY": 40.0,
        "requiredHeadcount": 2
      }
    ]
  }
  ```
- Atomically creates the event, initial zones, and automatically grants the creator the `organizer` role.

### Event Closure (`POST /api/events/:eventId/close`)
- **Role Required**: `organizer`
- Sets `status: 'closed'`, `closed_at: now()`, and `closed_by: userId`.
- **Integrity Rule**: Unfinished tasks and issues remain in their recorded status (`open`, `investigating`, etc.) for audit fidelity; they are not silently overwritten.
- Once closed:
  - New shifts cannot be scheduled.
  - New assignments cannot be added.
  - New volunteers cannot join via invite code.

---

## 3. Invitation Flow & Public Preview

### Public Preview (`GET /api/events/preview?code=<inviteCode>` or `GET /api/events/preview-invite/:inviteCode`)
- **Auth Required**: **NO** (Publicly accessible before signup/login)
- **Response**:
  ```json
  {
    "event": {
      "id": "e0000000-0000-0000-0000-000000000001",
      "title": "City Marathon 2026",
      "description": "Annual charity marathon",
      "venueName": "Central Stadium",
      "startDate": "2026-10-10T07:00:00Z",
      "endDate": "2026-10-10T17:00:00Z",
      "timezone": "UTC",
      "inviteCode": "RALLY-MARATHON-26",
      "status": "active"
    }
  }
  ```
- Does not expose volunteer lists, contact details, or organizer UUIDs.

### Joining an Event (`POST /api/events/join`)
- **Method**: `POST`
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ "inviteCode": "RALLY-MARATHON-26" }`
- **Security Rule**: Ordinary invite codes **strictly grant the volunteer role** (`role: 'volunteer'`). They can never be used to claim organizer status.
- **Idempotence**: Calling join again when already an active member returns `200 OK` with existing membership rather than failing.

### Invitation Rotation & Revocation (`POST /api/events/:eventId/invite/rotate`, `POST /api/events/:eventId/invite/revoke`)
- **Role Required**: `organizer`
- `rotate`: Generates a cryptographically strong new code and immediately invalidates the prior code.
- `revoke`: Sets `invite_revoked_at`, instantly blocking any further joins using that code.

---

## 4. Shifts, Assignments & Atomic Reassignment

### Shifts List (`GET /api/events/:eventId/shifts`)
- Enriched with:
  - `assignedCount`: Total active (non-canceled) assignments.
  - `canceledCount`: Total canceled assignments.
  - `isUnderstaffed`: `assignedCount < requiredHeadcount`.
  - `isCritical`: `assignedCount === 0 && requiredHeadcount > 0`.
  - `assignments`: Array of volunteer objects with names, emails, avatars, and check-in statuses.

### Assigning a Volunteer (`POST /api/events/:eventId/shifts/:shiftId/assign`)
- **Role Required**: `organizer` or `coordinator` (for shifts in their assigned zones).
- **Body**: `{ "volunteerId": "uuid" }`
- **Transactional Protections**:
  - Capacity Overflow Protection: Rejects with `409 Conflict` (`CAPACITY_EXCEEDED`) if shift is already full.
  - Overlap Protection: Rejects with `409 Conflict` (`OVERLAPPING_SHIFT`) if volunteer is already booked during this time window.
  - Duplicate Protection: Rejects with `409 Conflict` (`DUPLICATE_ASSIGNMENT`).

### Cross-Zone Reassignment (`POST /api/events/:eventId/reassign`)
- **Role Required**: `organizer` or `coordinator` (with authority over target zone).
- **Body**:
  ```json
  {
    "volunteerId": "uuid",
    "sourceShiftId": "shift-1-uuid",
    "targetShiftId": "shift-2-uuid",
    "reason": "Filling critical gap at First Aid"
  }
  ```
- **Atomicity**: Executed in a single database transaction. Moves the volunteer to `targetShiftId` and marks `sourceShiftId` assignment canceled with replacement reasoning. If the target shift fills up before commit, the entire transaction rolls back.

---

## 5. Coverage & Venue Pulse Lens

### Zone Coverage API (`GET /api/events/:eventId/zones`)
- **Query Parameter**:
  - `?time=YYYY-MM-DDTHH:mm:ssZ`: Evaluates coverage specifically for shifts that overlap the given timestamp.
- **Metrics Calculated**:
  - `requiredHeadcount`: Staff required for active shifts in this zone at `time`.
  - `assignedHeadcount`: Volunteers currently assigned to active shifts at `time`.
  - `checkedInHeadcount`: Volunteers physically checked in to active shifts at `time`.
  - `coveragePercentage`: `min(100, (assignedHeadcount / requiredHeadcount) * 100)`.
  - `checkedInPercentage`: `min(100, (checkedInHeadcount / requiredHeadcount) * 100)`.
  - `isUnderstaffed`: `assignedHeadcount < requiredHeadcount`.
- **Note on Zero Shifts**: If no shift is scheduled for a zone at the evaluated time, `requiredHeadcount` is `0` and `coveragePercentage` is `100%` (not understaffed).

---

## 6. Attendance & Check-In Window Enforcement

### Check-In Windows (`POST /api/events/:eventId/attendance/check-in`)
- **Allowed Window**: Check-in opens **30 minutes prior to shift start** and closes at **shift end time**.
- Attempting to check in before the opening window returns `400 Bad Request` (`Check-in is not open yet`).
- Attempting to check in after shift end returns `400 Bad Request` (`Shift has already concluded`).
- **Duplicate Prevention**: Only one active check-in record can exist per assignment.

### Coordinator-Assisted Check-In
- Coordinators may check in volunteers **only** for shifts located in zones they are explicitly assigned to manage. Attempts outside their assigned zones return `403 Forbidden` (`ZONE_SCOPE_DENIED`).

### Server-Issued QR Tokens (`POST /api/events/:eventId/attendance/qr-token`)
- Generates a cryptographically secure, expiring token stored in the Postgres `qr_tokens` table.
- Accessible by all instances of the backend service (no in-memory single-server limitations).

---

## 7. Issues & Role Permissions

### Issue Permissions Matrix
| Action | Organizer | Coordinator (Assigned Zone) | Coordinator (Other Zone) | Volunteer (Reporter) |
|---|:---:|:---:|:---:|:---:|
| Report issue | ✅ | ✅ | ✅ | ✅ |
| Update title/description | ✅ | ✅ | ❌ | ✅ (Own issue only) |
| Update status (`investigating`, `resolved`) | ✅ | ✅ | ❌ | ❌ (403 Forbidden) |
| Update severity (`urgent`, `critical`) | ✅ | ✅ | ❌ | ❌ (403 Forbidden) |
| Reassign issue (`assignedTo`) | ✅ | ✅ | ❌ | ❌ (403 Forbidden) |

---

## 8. Targeted Announcements

### Creating Announcements (`POST /api/events/:eventId/announcements`)
- **Allowed Audiences**:
  1. `audience: "all"` — Broadcasts to all active members of the event. (Organizers only).
  2. `audience: "zone"` — Requires `zoneId`. Only members assigned to or coordinating that zone receive notifications and can view the announcement.
  3. `audience: "role"` — Requires `roleName` (e.g. `'coordinator'`, `'volunteer'`).
- Both `body` and `message`, `audience` and `targetAudience`, `zoneId` and `targetZoneId` are accepted by the backend.

---

## 9. Required Frontend Adaptations Checklist

1. **Authentication Token Storage**:
   - Ensure the Supabase session access token (`session.access_token`) is attached to `Authorization: Bearer <token>` for all `api.get`, `api.post`, `api.put`, and `api.delete` calls.
   - Remove any custom header injection of `x-user-id`.
2. **Handle 409 Conflict**:
   - On candidate assignment or shift creation, handle HTTP `409` responses gracefully by displaying the backend's conflict message (e.g. *"Shift is already at full capacity"* or *"Volunteer is double-booked during this shift"*).
3. **Pass ISO Time to Zones**:
   - When switching between *"Now"* and *"Next shift"* on the venue map or hero metrics, pass `?time=${activeTimestamp.toISOString()}` to `GET /api/events/:eventId/zones` to ensure real-time headcount reflects the selected time window.
4. **Volunteer Profile Updates**:
   - Save skills, availability intervals, and zone/role preferences using `PUT /api/events/:eventId/volunteers/:userId` so preferences are correctly scoped to the active event.
