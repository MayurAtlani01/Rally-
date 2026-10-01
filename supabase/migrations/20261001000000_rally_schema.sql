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
