-- ==========================================
-- RALLY: Complete Schema & V2 Core Migration
-- ==========================================

-- RALLY: Complete Supabase Postgres Schema and RLS Policies
-- Event volunteer and crowd coordination platform

-- Extensions
create extension if not exists "uuid-ossp";

-- 1. Profiles (mirrors auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  avatar_url text,
  created_at timestamptz default now() not null
);

-- 2. Events
create table if not exists public.events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  venue_name text not null,
  start_date timestamptz not null,
  end_date timestamptz not null,
  timezone text default 'UTC' not null,
  invite_code text unique not null,
  layout_image_url text,
  max_hours_per_volunteer numeric(4,1) default 12.0,
  urgent_escalation_minutes integer default 15,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now() not null
);

create index if not exists idx_events_invite_code on public.events(invite_code);

-- 3. Event Memberships (Roles scoped per event)
create table if not exists public.event_memberships (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('organizer', 'coordinator', 'volunteer')),
  status text default 'active' not null check (status in ('active', 'inactive', 'suspended')),
  emergency_contact text,
  created_at timestamptz default now() not null,
  unique(event_id, user_id)
);

create index if not exists idx_memberships_event_user on public.event_memberships(event_id, user_id);

-- 4. Zones
create table if not exists public.zones (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  code text not null,
  description text,
  color text default '#7054E8',
  pos_x numeric(5,2) default 50.00 not null, -- percentage 0-100 on schematic
  pos_y numeric(5,2) default 50.00 not null,
  required_headcount integer default 1 not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_zones_event on public.zones(event_id);

-- 5. Coordinator Zone Assignments
create table if not exists public.coordinator_zones (
  id uuid primary key default uuid_generate_v4(),
  membership_id uuid not null references public.event_memberships(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete cascade,
  created_at timestamptz default now() not null,
  unique(membership_id, zone_id)
);

-- 6. Skills
create table if not exists public.skills (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  category text,
  created_at timestamptz default now() not null,
  unique(event_id, name)
);

-- 7. Volunteer Skills
create table if not exists public.volunteer_skills (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  skill_name text not null,
  created_at timestamptz default now() not null,
  unique(user_id, event_id, skill_name)
);

-- 8. Volunteer Availability
create table if not exists public.volunteer_availabilities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_availabilities_user_event on public.volunteer_availabilities(user_id, event_id);

-- 9. Volunteer Preferences
create table if not exists public.volunteer_preferences (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  preferred_zone_ids text[] default '{}',
  preferred_role_names text[] default '{}',
  updated_at timestamptz default now() not null,
  unique(user_id, event_id)
);

-- 10. Shifts
create table if not exists public.shifts (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete cascade,
  title text not null,
  role_name text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  required_headcount integer default 1 not null,
  required_skills text[] default '{}',
  preferred_skills text[] default '{}',
  notes text,
  created_at timestamptz default now() not null
);

create index if not exists idx_shifts_event_zone on public.shifts(event_id, zone_id);
create index if not exists idx_shifts_time on public.shifts(start_time, end_time);

-- 11. Assignments
create table if not exists public.assignments (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  volunteer_id uuid not null references public.profiles(id) on delete cascade,
  status text default 'assigned' not null check (status in ('assigned', 'confirmed', 'checked_in', 'completed', 'canceled', 'absent')),
  cancellation_reason text,
  canceled_at timestamptz,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists idx_assignments_volunteer on public.assignments(volunteer_id, event_id);
create index if not exists idx_assignments_shift on public.assignments(shift_id);

-- Partial unique index: only 1 active assignment per volunteer per shift
create unique index if not exists idx_unique_active_assignment
  on public.assignments(shift_id, volunteer_id)
  where status not in ('canceled', 'absent');

-- 12. Attendance
create table if not exists public.attendance (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  volunteer_id uuid not null references public.profiles(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  check_in_time timestamptz not null default now(),
  check_out_time timestamptz,
  method text default 'self' not null check (method in ('self', 'coordinator', 'qr')),
  verified_by uuid references public.profiles(id),
  is_flagged boolean default false not null,
  flagged_reason text,
  notes text,
  created_at timestamptz default now() not null
);

create index if not exists idx_attendance_event on public.attendance(event_id);
create index if not exists idx_attendance_shift on public.attendance(shift_id);

-- 13. Tasks and Issues
create table if not exists public.issues (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  zone_id uuid references public.zones(id) on delete set null,
  title text not null,
  description text not null,
  category text not null check (category in ('crowd', 'medical', 'logistics', 'safety', 'equipment', 'general')),
  severity text not null check (severity in ('low', 'medium', 'high', 'urgent')),
  status text default 'open' not null check (status in ('open', 'acknowledged', 'in_progress', 'resolved')),
  reported_by uuid not null references public.profiles(id),
  coordinator_id uuid references public.profiles(id),
  assigned_to uuid references public.profiles(id),
  acknowledged_at timestamptz,
  resolved_at timestamptz,
  escalated_at timestamptz,
  created_at timestamptz default now() not null
);

create index if not exists idx_issues_event_status on public.issues(event_id, status);
create index if not exists idx_issues_escalation on public.issues(event_id, severity, acknowledged_at, escalated_at);

-- 14. Issue Activity / Audit History
create table if not exists public.issue_activity (
  id uuid primary key default uuid_generate_v4(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  action text not null,
  note text,
  created_at timestamptz default now() not null
);

-- 15. Announcements
create table if not exists public.announcements (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  title text not null,
  body text not null,
  audience text not null check (audience in ('all', 'zone', 'role')),
  zone_id uuid references public.zones(id) on delete set null,
  role_name text,
  created_at timestamptz default now() not null
);

-- 16. In-App Notifications
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text not null,
  link text,
  is_read boolean default false not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_notifications_user on public.notifications(user_id, is_read);

-- 17. Shift Handover Notes
create table if not exists public.handover_notes (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  summary text not null,
  open_issues text,
  notes text,
  created_at timestamptz default now() not null
);

-- 18. Audit Events
create table if not exists public.audit_events (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.events(id) on delete cascade,
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text not null,
  details jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- Row Level Security (RLS) setup
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_memberships enable row level security;
alter table public.zones enable row level security;
alter table public.coordinator_zones enable row level security;
alter table public.shifts enable row level security;
alter table public.assignments enable row level security;
alter table public.attendance enable row level security;
alter table public.issues enable row level security;
alter table public.issue_activity enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.handover_notes enable row level security;
alter table public.audit_events enable row level security;

-- Helper security functions
create or replace function public.get_user_role_in_event(event_id uuid)
returns text as $$
  select role from public.event_memberships
  where event_memberships.event_id = $1
    and event_memberships.user_id = auth.uid()
    and event_memberships.status = 'active'
  limit 1;
$$ language sql security definer;

-- Profiles: users can read all profiles of events they belong to, edit own
create policy "Users can view profiles in same events" on public.profiles
  for select using (
    id = auth.uid() or
    exists (
      select 1 from public.event_memberships m1
      join public.event_memberships m2 on m1.event_id = m2.event_id
      where m1.user_id = auth.uid() and m2.user_id = public.profiles.id
    )
  );

create policy "Users can update own profile" on public.profiles
  for update using (id = auth.uid());

-- Events: members can view events; anyone can query by invite_code
create policy "Members can view their events" on public.events
  for select using (
    exists (
      select 1 from public.event_memberships
      where event_memberships.event_id = public.events.id
        and event_memberships.user_id = auth.uid()
    ) or true -- public read for invite join preview
  );

create policy "Organizers can update event" on public.events
  for update using (public.get_user_role_in_event(id) = 'organizer');

-- Zones and Shifts: members can view; organizers can manage
create policy "Members can view zones" on public.zones
  for select using (
    exists (
      select 1 from public.event_memberships
      where event_memberships.event_id = public.zones.event_id
        and event_memberships.user_id = auth.uid()
    )
  );

create policy "Organizers can manage zones" on public.zones
  for all using (public.get_user_role_in_event(event_id) = 'organizer');

create policy "Members can view shifts" on public.shifts
  for select using (
    exists (
      select 1 from public.event_memberships
      where event_memberships.event_id = public.shifts.event_id
        and event_memberships.user_id = auth.uid()
    )
  );

create policy "Organizers can manage shifts" on public.shifts
  for all using (public.get_user_role_in_event(event_id) = 'organizer');

-- Assignments:
-- Volunteers can view their own assignments and teammates on same shift
-- Coordinators and Organizers can view all assignments for event
create policy "View assignments policy" on public.assignments
  for select using (
    volunteer_id = auth.uid() or
    public.get_user_role_in_event(event_id) in ('organizer', 'coordinator')
  );

create policy "Organizers and coordinators manage assignments" on public.assignments
  for all using (
    public.get_user_role_in_event(event_id) in ('organizer', 'coordinator')
  );

-- Attendance:
create policy "View attendance policy" on public.attendance
  for select using (
    volunteer_id = auth.uid() or
    public.get_user_role_in_event(event_id) in ('organizer', 'coordinator')
  );

create policy "Volunteers can record own check in/out" on public.attendance
  for insert with check (
    volunteer_id = auth.uid() or
    public.get_user_role_in_event(event_id) in ('organizer', 'coordinator')
  );

-- Notifications: user can view and update own notifications
create policy "Users view own notifications" on public.notifications
  for select using (user_id = auth.uid());

create policy "Users update own notifications" on public.notifications
  for update using (user_id = auth.uid());


-- ==========================================
-- V2 Core & Security Hardening
-- ==========================================

-- RALLY: Schema Enhancements, Security Policies, and Transactional RPCs (v2)
-- Versioned migration addressing review findings 4, 7, 8, 9, 10, 11, 12, 13, 14

-- 1. Profiles Table Updates
alter table public.profiles add column if not exists bio text default '';
alter table public.profiles add column if not exists updated_at timestamptz default now();

-- Schema adjustments: Issue activity user_id can be null for system actions (escalations)
alter table public.issue_activity alter column user_id drop not null;

-- 2. Events Table Updates: Lifecycle & Invitation Expiry/Revocation
alter table public.events add column if not exists status text default 'active' check (status in ('draft', 'active', 'closed'));
alter table public.events add column if not exists closed_at timestamptz;
alter table public.events add column if not exists closed_by uuid references public.profiles(id);
alter table public.events add column if not exists invite_expires_at timestamptz;
alter table public.events add column if not exists invite_revoked_at timestamptz;
alter table public.events add column if not exists invite_rotation_count integer default 0;

-- 3. QR Check-In Tokens Table (Shared multi-instance token state)
create table if not exists public.qr_tokens (
  token text primary key,
  event_id uuid not null references public.events(id) on delete cascade,
  shift_id uuid not null references public.shifts(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz default now() not null
);

create index if not exists idx_qr_tokens_shift on public.qr_tokens(shift_id, expires_at);

-- 4. Enable RLS on previously un-enabled tables
alter table public.skills enable row level security;
alter table public.volunteer_skills enable row level security;
alter table public.volunteer_availabilities enable row level security;
alter table public.volunteer_preferences enable row level security;
alter table public.qr_tokens enable row level security;

-- 5. Helper Functions for Scoped Access
create or replace function public.is_event_organizer(p_event_id uuid, p_user_id uuid default auth.uid())
returns boolean as $$
  select exists (
    select 1 from public.event_memberships
    where event_id = p_event_id
      and user_id = p_user_id
      and role = 'organizer'
      and status = 'active'
  );
$$ language sql security definer;

create or replace function public.is_event_coordinator(p_event_id uuid, p_user_id uuid default auth.uid())
returns boolean as $$
  select exists (
    select 1 from public.event_memberships
    where event_id = p_event_id
      and user_id = p_user_id
      and role in ('organizer', 'coordinator')
      and status = 'active'
  );
$$ language sql security definer;

create or replace function public.is_coordinator_for_zone(p_zone_id uuid, p_user_id uuid default auth.uid())
returns boolean as $$
  select exists (
    select 1 from public.zones z
    join public.event_memberships m on m.event_id = z.event_id
    left join public.coordinator_zones cz on cz.membership_id = m.id and cz.zone_id = z.id
    where z.id = p_zone_id
      and m.user_id = p_user_id
      and m.status = 'active'
      and (m.role = 'organizer' or (m.role = 'coordinator' and cz.id is not null))
  );
$$ language sql security definer;

-- 6. Fix Events Select Policy (Remove "or true" leak)
drop policy if exists "Members can view their events" on public.events;
create policy "Members can view their events" on public.events
  for select using (
    exists (
      select 1 from public.event_memberships
      where event_memberships.event_id = public.events.id
        and event_memberships.user_id = auth.uid()
        and event_memberships.status = 'active'
    )
  );

-- Public Invite Preview Function (Security Definer - leaks no roster or organizer details)
create or replace function public.get_event_invite_preview(p_invite_code text)
returns table (
  id uuid,
  title text,
  description text,
  venue_name text,
  start_date timestamptz,
  end_date timestamptz,
  timezone text,
  invite_code text,
  status text
) as $$
  select
    e.id,
    e.title,
    e.description,
    e.venue_name,
    e.start_date,
    e.end_date,
    e.timezone,
    e.invite_code,
    e.status
  from public.events e
  where e.invite_code = p_invite_code
    and e.status != 'closed'
    and e.invite_revoked_at is null
    and (e.invite_expires_at is null or e.invite_expires_at > now())
  limit 1;
$$ language sql security definer;

-- 7. Missing Policies for Event Memberships & Coordinator Zones
drop policy if exists "Members can view memberships in their events" on public.event_memberships;
create policy "Members can view memberships in their events" on public.event_memberships
  for select using (
    user_id = auth.uid() or
    exists (
      select 1 from public.event_memberships m2
      where m2.event_id = public.event_memberships.event_id
        and m2.user_id = auth.uid()
        and m2.status = 'active'
    )
  );

drop policy if exists "Organizers manage memberships" on public.event_memberships;
create policy "Organizers manage memberships" on public.event_memberships
  for all using (public.is_event_organizer(event_id));

drop policy if exists "Members view coordinator zones" on public.coordinator_zones;
create policy "Members view coordinator zones" on public.coordinator_zones
  for select using (
    exists (
      select 1 from public.event_memberships m
      where m.id = public.coordinator_zones.membership_id
        and (m.user_id = auth.uid() or exists (
          select 1 from public.event_memberships m2
          where m2.event_id = m.event_id and m2.user_id = auth.uid()
        ))
    )
  );

drop policy if exists "Organizers manage coordinator zones" on public.coordinator_zones;
create policy "Organizers manage coordinator zones" on public.coordinator_zones
  for all using (
    exists (
      select 1 from public.event_memberships m
      where m.id = public.coordinator_zones.membership_id
        and public.is_event_organizer(m.event_id)
    )
  );

-- 8. Policies for Skills, Volunteer Skills, Availability, and Preferences
create policy "Members view skills" on public.skills
  for select using (
    exists (select 1 from public.event_memberships m where m.event_id = public.skills.event_id and m.user_id = auth.uid())
  );
create policy "Organizers manage skills" on public.skills
  for all using (public.is_event_organizer(event_id));

create policy "Members view volunteer skills" on public.volunteer_skills
  for select using (
    user_id = auth.uid() or
    exists (select 1 from public.event_memberships m where m.event_id = public.volunteer_skills.event_id and m.user_id = auth.uid())
  );
create policy "Volunteers update own skills" on public.volunteer_skills
  for all using (
    user_id = auth.uid() or public.is_event_organizer(event_id)
  );

create policy "Members view volunteer availabilities" on public.volunteer_availabilities
  for select using (
    user_id = auth.uid() or
    public.is_event_coordinator(event_id)
  );
create policy "Volunteers manage own availabilities" on public.volunteer_availabilities
  for all using (
    user_id = auth.uid() or public.is_event_organizer(event_id)
  );

create policy "View volunteer preferences" on public.volunteer_preferences
  for select using (
    user_id = auth.uid() or public.is_event_coordinator(event_id)
  );
create policy "Volunteers manage own preferences" on public.volunteer_preferences
  for all using (
    user_id = auth.uid() or public.is_event_organizer(event_id)
  );

-- 9. Assignments Policy with Zone-Restricted Coordinator Access
drop policy if exists "Organizers and coordinators manage assignments" on public.assignments;
create policy "Organizers and coordinators manage assignments" on public.assignments
  for all using (
    public.is_event_organizer(event_id) or (
      public.is_event_coordinator(event_id) and exists (
        select 1 from public.shifts s
        where s.id = public.assignments.shift_id
          and public.is_coordinator_for_zone(s.zone_id)
      )
    )
  );

-- 10. Issues Policies: Scoped Visibility and Reporting/Updating
create policy "View issues policy" on public.issues
  for select using (
    public.is_event_organizer(event_id) or
    reported_by = auth.uid() or
    assigned_to = auth.uid() or (
      zone_id is not null and public.is_coordinator_for_zone(zone_id)
    )
  );

create policy "Members can report issues" on public.issues
  for insert with check (
    reported_by = auth.uid() and
    exists (select 1 from public.event_memberships m where m.event_id = public.issues.event_id and m.user_id = auth.uid() and m.status = 'active')
  );

create policy "Update issues policy" on public.issues
  for update using (
    public.is_event_organizer(event_id) or (
      zone_id is not null and public.is_coordinator_for_zone(zone_id)
    ) or (
      reported_by = auth.uid()
    )
  );

-- 11. Announcements Policies
create policy "View announcements policy" on public.announcements
  for select using (
    public.is_event_organizer(event_id) or
    audience = 'all' or (
      audience = 'zone' and zone_id is not null and (
        public.is_coordinator_for_zone(zone_id) or
        exists (
          select 1 from public.assignments a
          join public.shifts s on s.id = a.shift_id
          where s.zone_id = public.announcements.zone_id
            and a.volunteer_id = auth.uid()
            and a.status not in ('canceled', 'absent')
        )
      )
    ) or (
      audience = 'role' and exists (
        select 1 from public.event_memberships m
        where m.event_id = public.announcements.event_id
          and m.user_id = auth.uid()
          and m.role = public.announcements.role_name
      )
    )
  );

create policy "Create announcements policy" on public.announcements
  for insert with check (
    author_id = auth.uid() and (
      public.is_event_organizer(event_id) or (
        audience = 'zone' and zone_id is not null and public.is_coordinator_for_zone(zone_id)
      )
    )
  );

-- 12. Handover Notes Policies
create policy "View handover notes policy" on public.handover_notes
  for select using (
    public.is_event_coordinator(event_id)
  );

create policy "Create handover notes policy" on public.handover_notes
  for insert with check (
    author_id = auth.uid() and (
      public.is_event_organizer(event_id) or public.is_coordinator_for_zone(zone_id)
    )
  );

-- 13. Audit Events Policies
create policy "Organizers view audit events" on public.audit_events
  for select using (public.is_event_organizer(event_id));

create policy "Insert audit events policy" on public.audit_events
  for insert with check (
    exists (select 1 from public.event_memberships m where m.event_id = public.audit_events.event_id and m.user_id = auth.uid())
  );

-- 14. Transactional RPC: Atomic Event Creation + Organizer Membership
create or replace function public.create_event_with_organizer(
  p_title text,
  p_description text,
  p_venue_name text,
  p_start_date timestamptz,
  p_end_date timestamptz,
  p_timezone text,
  p_invite_code text,
  p_max_hours numeric,
  p_urgent_escalation_minutes integer,
  p_creator_id uuid
) returns jsonb as $$
declare
  v_event public.events%rowtype;
  v_mem public.event_memberships%rowtype;
begin
  if p_start_date >= p_end_date then
    raise exception 'Start date must be before end date';
  end if;

  insert into public.events (
    title, description, venue_name, start_date, end_date,
    timezone, invite_code, max_hours_per_volunteer,
    urgent_escalation_minutes, created_by, status
  ) values (
    p_title, p_description, p_venue_name, p_start_date, p_end_date,
    coalesce(p_timezone, 'UTC'), p_invite_code, coalesce(p_max_hours, 12.0),
    coalesce(p_urgent_escalation_minutes, 15), p_creator_id, 'active'
  ) returning * into v_event;

  insert into public.event_memberships (
    event_id, user_id, role, status
  ) values (
    v_event.id, p_creator_id, 'organizer', 'active'
  ) returning * into v_mem;

  return jsonb_build_object(
    'event', to_jsonb(v_event),
    'membership', to_jsonb(v_mem)
  );
end;
$$ language plpgsql security definer;

-- 15. Transactional RPC: Atomic Assignment
create or replace function public.assign_volunteer_atomic(
  p_event_id uuid,
  p_shift_id uuid,
  p_volunteer_id uuid,
  p_assigned_by uuid
) returns jsonb as $$
declare
  v_shift public.shifts%rowtype;
  v_event public.events%rowtype;
  v_active_count integer;
  v_overlap_count integer;
  v_new_assignment public.assignments%rowtype;
begin
  -- Lock shift row to serialize concurrent assignments to this shift
  select * into v_shift from public.shifts where id = p_shift_id for update;
  if not found or v_shift.event_id != p_event_id then
    raise exception 'Shift not found in event';
  end if;

  select * into v_event from public.events where id = p_event_id;
  if v_event.status = 'closed' then
    raise exception 'Cannot assign volunteer: Event is closed.';
  end if;

  -- Verify active membership
  if not exists (
    select 1 from public.event_memberships
    where event_id = p_event_id and user_id = p_volunteer_id and status = 'active'
  ) then
    raise exception 'Volunteer is not an active member of this event.';
  end if;

  -- Check shift capacity
  select count(*) into v_active_count from public.assignments
  where shift_id = p_shift_id and status not in ('canceled', 'absent');

  if v_active_count >= v_shift.required_headcount then
    raise exception 'Shift is already at full capacity (% / %)', v_active_count, v_shift.required_headcount;
  end if;

  -- Check duplicate assignment
  if exists (
    select 1 from public.assignments
    where shift_id = p_shift_id and volunteer_id = p_volunteer_id and status not in ('canceled', 'absent')
  ) then
    raise exception 'Volunteer is already assigned to this shift.';
  end if;

  -- Check overlapping active shifts for this volunteer (across any active shift in the system)
  select count(*) into v_overlap_count
  from public.assignments a
  join public.shifts s on s.id = a.shift_id
  where a.volunteer_id = p_volunteer_id
    and a.status not in ('canceled', 'absent')
    and not (v_shift.start_time >= s.end_time or v_shift.end_time <= s.start_time);

  if v_overlap_count > 0 then
    raise exception 'Volunteer has an overlapping active shift.';
  end if;

  -- Insert assignment
  insert into public.assignments (
    event_id, shift_id, volunteer_id, status, assigned_by
  ) values (
    p_event_id, p_shift_id, p_volunteer_id, 'assigned', p_assigned_by
  ) returning * into v_new_assignment;

  -- Notification
  insert into public.notifications (
    event_id, user_id, type, title, message, link
  ) values (
    p_event_id, p_volunteer_id, 'shift_assigned', 'New Shift Assignment',
    'You have been scheduled for "' || v_shift.title || '".', '/volunteer/today'
  );

  -- Audit log
  insert into public.audit_events (
    event_id, actor_id, action, entity_type, entity_id, details
  ) values (
    p_event_id, p_assigned_by, 'assigned_volunteer', 'assignment', v_new_assignment.id::text,
    jsonb_build_object('shiftId', p_shift_id, 'volunteerId', p_volunteer_id)
  );

  return to_jsonb(v_new_assignment);
end;
$$ language plpgsql security definer;

-- 16. Transactional RPC: Atomic Reassignment with Commit-Time Revalidation
create or replace function public.reassign_volunteer_atomic(
  p_event_id uuid,
  p_source_shift_id uuid,
  p_target_shift_id uuid,
  p_volunteer_id uuid,
  p_assigned_by uuid
) returns jsonb as $$
declare
  v_source_shift public.shifts%rowtype;
  v_target_shift public.shifts%rowtype;
  v_source_assignment public.assignments%rowtype;
  v_target_count integer;
  v_overlap_count integer;
  v_new_assignment public.assignments%rowtype;
begin
  -- Lock both shifts in consistent order to prevent deadlocks
  if p_source_shift_id < p_target_shift_id then
    select * into v_source_shift from public.shifts where id = p_source_shift_id for update;
    select * into v_target_shift from public.shifts where id = p_target_shift_id for update;
  else
    select * into v_target_shift from public.shifts where id = p_target_shift_id for update;
    select * into v_source_shift from public.shifts where id = p_source_shift_id for update;
  end if;

  if not found or v_source_shift.event_id != p_event_id or v_target_shift.event_id != p_event_id then
    raise exception 'Source or target shift not found in event.';
  end if;

  -- Find and lock active source assignment
  select * into v_source_assignment from public.assignments
  where shift_id = p_source_shift_id
    and volunteer_id = p_volunteer_id
    and status not in ('canceled', 'absent')
  for update;

  if not found then
    raise exception 'Volunteer does not have an active assignment on the source shift.';
  end if;

  -- Validate target capacity
  select count(*) into v_target_count from public.assignments
  where shift_id = p_target_shift_id and status not in ('canceled', 'absent');

  if v_target_count >= v_target_shift.required_headcount then
    raise exception 'Target shift is at full capacity (% / %)', v_target_count, v_target_shift.required_headcount;
  end if;

  -- Validate no overlap with OTHER shifts (excluding source shift being vacated)
  select count(*) into v_overlap_count
  from public.assignments a
  join public.shifts s on s.id = a.shift_id
  where a.volunteer_id = p_volunteer_id
    and a.id != v_source_assignment.id
    and a.status not in ('canceled', 'absent')
    and not (v_target_shift.start_time >= s.end_time or v_target_shift.end_time <= s.start_time);

  if v_overlap_count > 0 then
    raise exception 'Reassignment fails: Volunteer has an overlapping active shift with target shift.';
  end if;

  -- Cancel source assignment
  update public.assignments set
    status = 'canceled',
    cancellation_reason = 'Reassigned to "' || v_target_shift.title || '"',
    canceled_at = now(),
    updated_at = now()
  where id = v_source_assignment.id;

  -- Insert target assignment
  insert into public.assignments (
    event_id, shift_id, volunteer_id, status, assigned_by
  ) values (
    p_event_id, p_target_shift_id, p_volunteer_id, 'assigned', p_assigned_by
  ) returning * into v_new_assignment;

  -- Notification
  insert into public.notifications (
    event_id, user_id, type, title, message, link
  ) values (
    p_event_id, p_volunteer_id, 'shift_reassigned', 'Shift Reassignment Notice',
    'You were moved from "' || v_source_shift.title || '" to "' || v_target_shift.title || '".', '/volunteer/today'
  );

  -- Audit log
  insert into public.audit_events (
    event_id, actor_id, action, entity_type, entity_id, details
  ) values (
    p_event_id, p_assigned_by, 'reassigned_volunteer', 'assignment', v_new_assignment.id::text,
    jsonb_build_object('sourceShiftId', p_source_shift_id, 'targetShiftId', p_target_shift_id, 'volunteerId', p_volunteer_id)
  );

  return jsonb_build_object(
    'previousAssignmentId', v_source_assignment.id,
    'newAssignment', to_jsonb(v_new_assignment)
  );
end;
$$ language plpgsql security definer;

-- 17. Transactional RPC: Check-in with Window Enforcement
create or replace function public.record_check_in_atomic(
  p_event_id uuid,
  p_assignment_id uuid,
  p_volunteer_id uuid,
  p_method text,
  p_verified_by uuid,
  p_notes text
) returns jsonb as $$
declare
  v_asgn public.assignments%rowtype;
  v_shift public.shifts%rowtype;
  v_att public.attendance%rowtype;
  v_now timestamptz := now();
  v_window_start timestamptz;
begin
  select * into v_asgn from public.assignments where id = p_assignment_id for update;
  if not found or v_asgn.event_id != p_event_id then
    raise exception 'Assignment not found in event.';
  end if;

  if v_asgn.status = 'canceled' or v_asgn.status = 'absent' then
    raise exception 'Cannot check in for a canceled or absent assignment.';
  end if;

  select * into v_shift from public.shifts where id = v_asgn.shift_id;

  -- Check-in window enforcement: allowed 30 minutes before shift start until shift end
  v_window_start := v_shift.start_time - interval '30 minutes';
  if v_now < v_window_start then
    raise exception 'Check-in window has not opened yet. Check-in opens 30 minutes prior to shift start.';
  end if;
  if v_now > v_shift.end_time then
    raise exception 'Shift has already concluded. Check-in closed at %.', v_shift.end_time;
  end if;

  -- Prevent duplicate active check-in
  if exists (
    select 1 from public.attendance
    where assignment_id = p_assignment_id and check_out_time is null
  ) then
    raise exception 'Volunteer is already checked in for this assignment.';
  end if;

  -- Record attendance
  insert into public.attendance (
    event_id, assignment_id, volunteer_id, shift_id,
    check_in_time, method, verified_by, notes
  ) values (
    p_event_id, p_assignment_id, p_volunteer_id, v_asgn.shift_id,
    v_now, coalesce(p_method, 'self'), p_verified_by, p_notes
  ) returning * into v_att;

  -- Update assignment status
  update public.assignments set
    status = 'checked_in',
    updated_at = v_now
  where id = p_assignment_id;

  return to_jsonb(v_att);
end;
$$ language plpgsql security definer;

-- 18. Transactional RPC: Check-out
create or replace function public.record_check_out_atomic(
  p_event_id uuid,
  p_attendance_id uuid,
  p_verified_by uuid,
  p_notes text
) returns jsonb as $$
declare
  v_att public.attendance%rowtype;
  v_now timestamptz := now();
begin
  select * into v_att from public.attendance where id = p_attendance_id for update;
  if not found or v_att.event_id != p_event_id then
    raise exception 'Attendance record not found in event.';
  end if;

  if v_att.check_out_time is not null then
    raise exception 'Attendance record is already completed with check-out.';
  end if;

  update public.attendance set
    check_out_time = v_now,
    notes = case when p_notes is not null and p_notes != '' then coalesce(notes || ' | ', '') || p_notes else notes end
  where id = p_attendance_id
  returning * into v_att;

  update public.assignments set
    status = 'completed',
    updated_at = v_now
  where id = v_att.assignment_id;

  return to_jsonb(v_att);
end;
$$ language plpgsql security definer;

-- 19. Transactional RPC: Atomic Claim of Urgent Issues for Escalation
create or replace function public.claim_urgent_issues_for_escalation(
  p_threshold_minutes integer default 15
) returns setof public.issues as $$
begin
  return query
  update public.issues
  set escalated_at = now()
  where severity = 'urgent'
    and status in ('open', 'in_progress')
    and acknowledged_at is null
    and escalated_at is null
    and created_at <= (now() - (p_threshold_minutes || ' minutes')::interval)
  returning *;
end;
$$ language plpgsql security definer;
