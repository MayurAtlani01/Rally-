import { store } from '../backend/src/store.js';

console.log('🌱 Seeding RALLY demo data for "Ignite Fest 2026"...');
const data = store.resetDemo();

console.log(`✅ Success! Seeded:
- ${data.events.length} Event(s)
- ${data.zones.length} Zones
- ${data.shifts.length} Shifts
- ${data.profiles.length} Volunteer & Staff Profiles
- ${data.assignments.length} Initial Assignments
- ${data.attendance.length} Attendance Records
- ${data.issues.length} Issues & Tasks
- ${data.announcements.length} Announcements
`);
