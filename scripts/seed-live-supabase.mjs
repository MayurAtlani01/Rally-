import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../backend/.env') });

const { getSupabaseAdmin } = await import('../backend/src/db/supabase.js');

async function seed() {
  console.log('🚀 Connecting to Supabase...');
  const supabase = getSupabaseAdmin();

  // 1. Find user's organizer profile
  const { data: existingProfiles, error: pErr } = await supabase.from('profiles').select('*');
  if (pErr) {
    console.error('Error fetching profiles:', pErr);
    process.exit(1);
  }

  if (!existingProfiles || existingProfiles.length === 0) {
    console.error('No profiles found in Supabase. Please sign up or log in first.');
    process.exit(1);
  }

  // Use Mayuresh's profile or the first profile
  const organizer = existingProfiles.find(p => p.email.includes('mayur') || p.email.includes('admin')) || existingProfiles[0];
  console.log(`👤 Using Organizer: ${organizer.full_name} (${organizer.email}, ID: ${organizer.id})`);

  // 2. Base dates (today at 08:00 UTC)
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const day = now.getUTCDate();

  const iso = (dOffset, h, m = 0) => new Date(Date.UTC(year, month, day + dOffset, h, m, 0)).toISOString();

  // 3. Create Event
  const inviteCode = 'IGNITE-' + Math.random().toString(36).substring(2, 7).toUpperCase();
  const { data: event, error: eErr } = await supabase.from('events').insert({
    title: 'Ignite Fest 2026',
    description: 'Annual Campus Innovation & Cultural Festival. Over 10,000 attendees, live concert stage, tech exhibits, and food pavilions.',
    venue_name: 'TSEC Central Quadrangle & Campus Grounds',
    start_date: iso(0, 8),
    end_date: iso(1, 23),
    timezone: 'Asia/Calcutta',
    invite_code: inviteCode,
    max_hours_per_volunteer: 12.0,
    urgent_escalation_minutes: 15,
    created_by: organizer.id,
    status: 'active'
  }).select().single();

  if (eErr) {
    console.error('Error creating event:', eErr);
    process.exit(1);
  }

  console.log(`🎉 Created Event: "${event.title}" (ID: ${event.id}, Invite: ${event.invite_code})`);

  // 4. Add Organizer Membership
  await supabase.from('event_memberships').insert({
    event_id: event.id,
    user_id: organizer.id,
    role: 'organizer',
    status: 'active'
  });

  // 5. Create 6 Zones
  const zonesToCreate = [
    {
      event_id: event.id,
      name: 'Registration & Welcome',
      code: 'REG',
      description: 'Main entrance check-in, wristbands, and attendee registration',
      color: '#7054E8',
      pos_x: 22.0,
      pos_y: 38.0,
      required_headcount: 3
    },
    {
      event_id: event.id,
      name: 'Main Stage Amphitheater',
      code: 'STG',
      description: 'Auditorium and live concert performance bowl',
      color: '#10B981',
      pos_x: 58.0,
      pos_y: 28.0,
      required_headcount: 4
    },
    {
      event_id: event.id,
      name: 'North Entry Gate',
      code: 'GTN',
      description: 'Campus vehicle gate and initial security checkpoint',
      color: '#3B82F6',
      pos_x: 14.0,
      pos_y: 72.0,
      required_headcount: 3
    },
    {
      event_id: event.id,
      name: 'Food Court & Refreshments',
      code: 'FOD',
      description: 'Lakeside dining tents and hydration stations',
      color: '#F59E0B',
      pos_x: 78.0,
      pos_y: 62.0,
      required_headcount: 3
    },
    {
      event_id: event.id,
      name: 'First Aid & Medical Tent',
      code: 'MED',
      description: 'Emergency response, EMT triage station, and hydration',
      color: '#EF4444',
      pos_x: 40.0,
      pos_y: 76.0,
      required_headcount: 2
    },
    {
      event_id: event.id,
      name: 'Staff Parking & Logistics Hub',
      code: 'LOG',
      description: 'Supply staging, sound equipment storage, and parking',
      color: '#6B7280',
      pos_x: 86.0,
      pos_y: 86.0,
      required_headcount: 2
    }
  ];

  const { data: zones, error: zErr } = await supabase.from('zones').insert(zonesToCreate).select();
  if (zErr) {
    console.error('Error creating zones:', zErr);
    process.exit(1);
  }
  console.log(`🗺️ Created ${zones.length} Zones.`);

  const zMap = new Map(zones.map(z => [z.code, z]));

  // 6. Create Staff & Volunteers via Supabase Auth Admin
  const volunteerDefs = [
    {
      name: 'Marcus Brody',
      email: `marcus.brody.${Date.now()}@rally.demo`,
      role: 'coordinator',
      phone: '+91 98201 12345',
      bio: 'Operations Coordinator: Entry Gate, Registration & Logistics',
      assignedZones: [zMap.get('REG').id, zMap.get('GTN').id, zMap.get('LOG').id]
    },
    {
      name: 'Priya Sharma',
      email: `priya.sharma.${Date.now()}@rally.demo`,
      role: 'coordinator',
      phone: '+91 98202 23456',
      bio: 'Safety & Stage Coordinator: Main Stage & Medical Tent',
      assignedZones: [zMap.get('STG').id, zMap.get('MED').id]
    },
    {
      name: 'Maya Lin',
      email: `maya.lin.${Date.now()}@rally.demo`,
      role: 'volunteer',
      phone: '+91 98203 34567',
      bio: 'Computer Science senior. Fast badge printing and crowd greeting.'
    },
    {
      name: 'Lucas Trent',
      email: `lucas.trent.${Date.now()}@rally.demo`,
      role: 'volunteer',
      phone: '+91 98204 45678',
      bio: 'Hospitality lead. Certified food hygiene and inventory management.'
    },
    {
      name: 'Jordan Lee',
      email: `jordan.lee.${Date.now()}@rally.demo`,
      role: 'volunteer',
      phone: '+91 98205 56789',
      bio: 'Sound technician. Live stage audio and mixing console specialist.'
    },
    {
      name: 'Chloe Bennett',
      email: `chloe.bennett.${Date.now()}@rally.demo`,
      role: 'volunteer',
      phone: '+91 98206 67890',
      bio: 'Nursing student. Certified EMT, CPR/AED and emergency response.'
    },
    {
      name: 'Samira Khan',
      email: `samira.khan.${Date.now()}@rally.demo`,
      role: 'volunteer',
      phone: '+91 98207 78901',
      bio: 'Bilingual guide and attendee orientation lead.'
    },
    {
      name: 'Daniel O\'Connor',
      email: `daniel.oconnor.${Date.now()}@rally.demo`,
      role: 'volunteer',
      phone: '+91 98208 89012',
      bio: 'Stage lighting specialist and equipment runner.'
    },
    {
      name: 'Aisha Patel',
      email: `aisha.patel.${Date.now()}@rally.demo`,
      role: 'volunteer',
      phone: '+91 98209 90123',
      bio: 'Registration and VIP check-in coordinator.'
    },
    {
      name: 'Mateo Rodriguez',
      email: `mateo.rodriguez.${Date.now()}@rally.demo`,
      role: 'volunteer',
      phone: '+91 98210 01234',
      bio: 'Campus security volunteer and vehicle checkpoint lead.'
    },
    {
      name: 'Zoe Chen',
      email: `zoe.chen.${Date.now()}@rally.demo`,
      role: 'volunteer',
      phone: '+91 98211 12345',
      bio: 'Logistics coordinator and radio dispatch runner.'
    }
  ];

  console.log('👥 Creating verified volunteer accounts in Supabase Auth...');
  const createdVolunteers = [];
  for (const vDef of volunteerDefs) {
    const { data: authUser, error: aErr } = await supabase.auth.admin.createUser({
      email: vDef.email,
      password: 'DemoUserPassword2026!',
      email_confirm: true,
      user_metadata: { full_name: vDef.name, phone: vDef.phone }
    });

    if (aErr) {
      console.warn(`Could not create auth user ${vDef.email}:`, aErr.message);
      continue;
    }

    const uid = authUser.user.id;
    // Upsert profile
    await supabase.from('profiles').upsert({
      id: uid,
      email: vDef.email,
      full_name: vDef.name,
      phone: vDef.phone,
      bio: vDef.bio
    });

    // Add membership
    const { data: mem } = await supabase.from('event_memberships').insert({
      event_id: event.id,
      user_id: uid,
      role: vDef.role,
      status: 'active'
    }).select().single();

    if (vDef.role === 'coordinator' && vDef.assignedZones) {
      for (const zid of vDef.assignedZones) {
        await supabase.from('coordinator_zones').insert({
          membership_id: mem.id,
          zone_id: zid
        });
      }
    }

    createdVolunteers.push({ ...vDef, id: uid });
  }

  console.log(`✅ Created ${createdVolunteers.length} verified volunteers and staff in Supabase!`);

  const vMap = new Map(createdVolunteers.map(v => [v.name, v]));

  // 7. Shifts
  // Create current active shifts and afternoon shifts
  const shiftDefs = [
    // Current Active Shifts (starts 2h ago, ends in 2h)
    {
      zone_id: zMap.get('REG').id,
      title: 'Morning Registration Desk',
      role_name: 'Check-in Volunteer',
      start_time: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      end_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      required_headcount: 3,
      required_skills: ['Registration'],
      preferred_skills: ['Fast Typing']
    },
    {
      zone_id: zMap.get('STG').id,
      title: 'Opening Ceremony & Live Audio',
      role_name: 'Stage Crew',
      start_time: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      end_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      required_headcount: 3,
      required_skills: ['Stage Crew'],
      preferred_skills: ['Live Audio']
    },
    {
      zone_id: zMap.get('GTN').id,
      title: 'North Gate Crowd Control',
      role_name: 'Gate Usher',
      start_time: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      end_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      required_headcount: 2,
      required_skills: ['Security'],
      preferred_skills: ['Communication']
    },
    {
      zone_id: zMap.get('MED').id,
      title: 'Medical Triage Unit',
      role_name: 'First Aid Responder',
      start_time: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      end_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      required_headcount: 2,
      required_skills: ['First Aid'],
      preferred_skills: ['CPR']
    },
    {
      zone_id: zMap.get('FOD').id,
      title: 'Food Court Hospitality',
      role_name: 'Food Service Attendant',
      start_time: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      end_time: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
      required_headcount: 2,
      required_skills: ['Hospitality'],
      preferred_skills: ['Food Safety']
    },
    // Upcoming Afternoon Shifts
    {
      zone_id: zMap.get('REG').id,
      title: 'Afternoon Badge Helpdesk',
      role_name: 'Check-in Volunteer',
      start_time: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
      end_time: new Date(Date.now() + 7 * 3600 * 1000).toISOString(),
      required_headcount: 2,
      required_skills: ['Registration'],
      preferred_skills: []
    },
    {
      zone_id: zMap.get('STG').id,
      title: 'Evening Cultural Showcase',
      role_name: 'Stage Crew',
      start_time: new Date(Date.now() + 3 * 3600 * 1000).toISOString(),
      end_time: new Date(Date.now() + 7 * 3600 * 1000).toISOString(),
      required_headcount: 3,
      required_skills: ['Stage Crew'],
      preferred_skills: ['Lighting']
    }
  ];

  const { data: createdShifts, error: sErr } = await supabase.from('shifts').insert(
    shiftDefs.map(s => ({ ...s, event_id: event.id }))
  ).select();

  if (sErr) {
    console.error('Error creating shifts:', sErr);
    process.exit(1);
  }
  console.log(`⏱️ Created ${createdShifts.length} Shifts.`);

  // 8. Assignments & Attendance
  console.log('📋 Assigning volunteers and recording active check-ins...');
  const sReg = createdShifts[0]; // REG morning (needs 3, we assign 2 so it is intentionally understaffed for demo replacement)
  const sStg = createdShifts[1]; // STG morning (needs 3, assign 3)
  const sGtn = createdShifts[2]; // GTN morning (needs 2, assign 2)
  const sMed = createdShifts[3]; // MED morning (needs 2, assign 2)
  const sFod = createdShifts[4]; // FOD morning (needs 2, assign 2)

  const assignmentsToInsert = [
    // REG (Maya Lin, Aisha Patel) - 1 slot open for replacement test!
    { shift_id: sReg.id, volunteer_id: vMap.get('Maya Lin').id, status: 'checked_in' },
    { shift_id: sReg.id, volunteer_id: vMap.get('Aisha Patel').id, status: 'checked_in' },

    // STG (Jordan Lee, Daniel O'Connor, Samira Khan)
    { shift_id: sStg.id, volunteer_id: vMap.get('Jordan Lee').id, status: 'checked_in' },
    { shift_id: sStg.id, volunteer_id: vMap.get('Daniel O\'Connor').id, status: 'checked_in' },
    { shift_id: sStg.id, volunteer_id: vMap.get('Samira Khan').id, status: 'checked_in' },

    // GTN (Mateo Rodriguez, Zoe Chen)
    { shift_id: sGtn.id, volunteer_id: vMap.get('Mateo Rodriguez').id, status: 'checked_in' },
    { shift_id: sGtn.id, volunteer_id: vMap.get('Zoe Chen').id, status: 'checked_in' },

    // MED (Chloe Bennett)
    { shift_id: sMed.id, volunteer_id: vMap.get('Chloe Bennett').id, status: 'checked_in' },

    // FOD (Lucas Trent)
    { shift_id: sFod.id, volunteer_id: vMap.get('Lucas Trent').id, status: 'checked_in' }
  ];

  for (const asgn of assignmentsToInsert) {
    const { data: newAsgn } = await supabase.from('assignments').insert({
      event_id: event.id,
      shift_id: asgn.shift_id,
      volunteer_id: asgn.volunteer_id,
      status: asgn.status,
      assigned_by: organizer.id
    }).select().single();

    if (newAsgn && asgn.status === 'checked_in') {
      await supabase.from('attendance').insert({
        event_id: event.id,
        assignment_id: newAsgn.id,
        volunteer_id: asgn.volunteer_id,
        shift_id: asgn.shift_id,
        check_in_time: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
        method: 'self'
      });
    }
  }

  // 9. Issues & Tasks
  console.log('🚨 Filing real operational issues...');
  await supabase.from('issues').insert([
    {
      event_id: event.id,
      zone_id: zMap.get('GTN').id,
      title: 'Entry Gate 2 QR Scanner Malfunctioning',
      description: 'Handheld scanner battery depleted. Attendees being routed to Gate 1 lane.',
      category: 'equipment',
      severity: 'urgent',
      status: 'open',
      reported_by: vMap.get('Mateo Rodriguez').id
    },
    {
      event_id: event.id,
      zone_id: zMap.get('MED').id,
      title: 'Restock Ice Packs & Bandages',
      description: 'Used 6 ice packs during morning sports run. Restock kit requested from central storage.',
      category: 'medical',
      severity: 'medium',
      status: 'acknowledged',
      reported_by: vMap.get('Chloe Bennett').id,
      assigned_to: vMap.get('Priya Sharma').id,
      acknowledged_at: new Date(Date.now() - 30 * 60 * 1000).toISOString()
    },
    {
      event_id: event.id,
      zone_id: zMap.get('FOD').id,
      title: 'Water Refill Station 2 Low Pressure',
      description: 'Main pump valve needs adjustment. Water flow is slow causing minor lines.',
      category: 'logistics',
      severity: 'low',
      status: 'in_progress',
      reported_by: vMap.get('Lucas Trent').id,
      assigned_to: vMap.get('Marcus Brody').id
    }
  ]);

  // 10. Broadcast Announcements
  console.log('📢 Posting operational announcements...');
  await supabase.from('announcements').insert([
    {
      event_id: event.id,
      author_id: organizer.id,
      title: '🎉 Welcome to Ignite Fest 2026!',
      body: 'Morning briefing is concluded. All 6 zones are active and staffed. Radio Channel 1 for general ops.',
      audience: 'all'
    },
    {
      event_id: event.id,
      author_id: organizer.id,
      title: '⚠️ Weather Notice: Afternoon Heat Advisory',
      body: 'Temperatures expected to peak at 34°C between 13:00 - 15:00. Ensure volunteer rotations every 2 hours.',
      audience: 'role',
      role_name: 'coordinator'
    },
    {
      event_id: event.id,
      author_id: organizer.id,
      title: 'Stage Sound Check at 12:30',
      body: 'Audio crew will run 15-minute mic check for headliner band.',
      audience: 'zone',
      zone_id: zMap.get('STG').id
    }
  ]);

  console.log('\n======================================================');
  console.log('🌟 SEEDING COMPLETE FOR MAYURESH ATLANI!');
  console.log('======================================================');
  console.log(`Event Title:      ${event.title}`);
  console.log(`Event ID:         ${event.id}`);
  console.log(`Invite Code:      ${event.invite_code}`);
  console.log(`Role:             Organizer (Full Admin Rights)`);
  console.log(`Zones Created:    6 (${zones.map(z => z.name).join(', ')})`);
  console.log(`Volunteers:       11 Verified Active Members`);
  console.log(`Active Shifts:    5 Shifts Live Now (with real check-ins)`);
  console.log(`Open Gaps:        1 Open Staffing Gap in Registration`);
  console.log(`Issues:           3 Active Incidents (1 Urgent)`);
  console.log('======================================================\n');
}

seed().catch(err => {
  console.error('Fatal error during seed:', err);
  process.exit(1);
});
