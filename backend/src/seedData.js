import { ROLES, ASSIGNMENT_STATUSES, ISSUE_STATUSES, ISSUE_SEVERITIES, ISSUE_CATEGORIES, ANNOUNCEMENT_AUDIENCES } from '../../shared/constants.js';

export function generateSeedData(baseDate = new Date()) {
  const d = new Date(baseDate);
  // Normalize to today at midnight UTC for clean shift times
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const day = d.getUTCDate();

  const makeIso = (hour, minute = 0) => {
    return new Date(Date.UTC(year, month, day, hour, minute, 0)).toISOString();
  };

  const makeTomorrowIso = (hour, minute = 0) => {
    return new Date(Date.UTC(year, month, day + 1, hour, minute, 0)).toISOString();
  };

  const eventId = 'ev-ignite-2026';

  // 1. Profiles
  const profiles = [
    {
      id: 'usr-organizer-elena',
      fullName: 'Elena Vance',
      email: 'elena@rally.demo',
      phone: '+1 (555) 234-5678',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      bio: 'Head of Student Activities and Festival Director'
    },
    {
      id: 'usr-coord-marcus',
      fullName: 'Marcus Brody',
      email: 'marcus@rally.demo',
      phone: '+1 (555) 345-6789',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
      bio: 'Coordinator: Entry Gate, Registration, Logistics'
    },
    {
      id: 'usr-coord-priya',
      fullName: 'Priya Sharma',
      email: 'priya@rally.demo',
      phone: '+1 (555) 456-7890',
      avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80',
      bio: 'Coordinator: Main Stage, First Aid, Safety'
    },
    {
      id: 'usr-vol-maya',
      fullName: 'Maya Lin',
      email: 'maya@rally.demo',
      phone: '+1 (555) 567-8901',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
      bio: 'Junior, Computer Science. Experienced in registration & crowd management.'
    },
    {
      id: 'usr-vol-lucas',
      fullName: 'Lucas Trent',
      email: 'lucas@rally.demo',
      phone: '+1 (555) 678-9012',
      avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&auto=format&fit=crop&q=80',
      bio: 'Sophomore, Hospitality Management. Certified food handling.'
    },
    {
      id: 'usr-vol-jordan',
      fullName: 'Jordan Lee',
      email: 'jordan@rally.demo',
      phone: '+1 (555) 789-0123',
      avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&auto=format&fit=crop&q=80',
      bio: 'Senior, Electrical Engineering. Live sound and stage crew lead.'
    },
    {
      id: 'usr-vol-chloe',
      fullName: 'Chloe Bennett',
      email: 'chloe@rally.demo',
      phone: '+1 (555) 890-1234',
      avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&auto=format&fit=crop&q=80',
      bio: 'Senior, Nursing. Certified EMT, CPR/AED and triage.'
    },
    {
      id: 'usr-vol-samira',
      fullName: 'Samira Khan',
      email: 'samira@rally.demo',
      phone: '+1 (555) 901-2345',
      avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&auto=format&fit=crop&q=80',
      bio: 'Freshman, Communications. Multilingual guide & usher.'
    },
    {
      id: 'usr-vol-daniel',
      fullName: 'Daniel O\'Connor',
      email: 'daniel@rally.demo',
      phone: '+1 (555) 012-3456',
      avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&auto=format&fit=crop&q=80',
      bio: 'Junior, Media Arts. Stage lighting and runner.'
    },
    {
      id: 'usr-vol-aisha',
      fullName: 'Aisha Patel',
      email: 'aisha@rally.demo',
      phone: '+1 (555) 123-9876',
      avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=120&auto=format&fit=crop&q=80',
      bio: 'Sophomore, Business. Registration desk and attendee assistance.'
    },
    {
      id: 'usr-vol-liam',
      fullName: 'Liam Walker',
      email: 'liam@rally.demo',
      phone: '+1 (555) 234-8765',
      avatarUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=120&auto=format&fit=crop&q=80',
      bio: 'Senior, Athletics. Parking marshal and transit guide.'
    },
    {
      id: 'usr-vol-zoe',
      fullName: 'Zoe Martinez',
      email: 'zoe@rally.demo',
      phone: '+1 (555) 345-7654',
      avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&auto=format&fit=crop&q=80',
      bio: 'Junior, Psychology. First aid support and attendee de-escalation.'
    }
  ];

  // 2. Events
  const events = [
    {
      id: eventId,
      title: 'TechFest 2026',
      description: 'Annual Collegiate Tech & Cultural Festival. Over 4,500 attendees across 6 campus zones featuring live stages, hackathons, and exhibitions.',
      venueName: 'Central Campus Quad & Amphitheater',
      startDate: makeIso(8, 0),
      endDate: makeTomorrowIso(2, 0),
      timezone: 'America/New_York',
      inviteCode: 'TECHFEST',
      maxHoursPerVolunteer: 10.0,
      urgentEscalationMinutes: 15,
      createdBy: 'usr-organizer-elena',
      createdAt: makeIso(6, 0)
    }
  ];

  // 3. Memberships
  const memberships = [
    { id: 'mem-elena', eventId, userId: 'usr-organizer-elena', role: ROLES.ORGANIZER, status: 'active' },
    { id: 'mem-marcus', eventId, userId: 'usr-coord-marcus', role: ROLES.COORDINATOR, status: 'active', assignedZones: ['zone-entry', 'zone-reg', 'zone-parking'] },
    { id: 'mem-priya', eventId, userId: 'usr-coord-priya', role: ROLES.COORDINATOR, status: 'active', assignedZones: ['zone-stage', 'zone-med', 'zone-food'] },
    { id: 'mem-maya', eventId, userId: 'usr-vol-maya', role: ROLES.VOLUNTEER, status: 'active' },
    { id: 'mem-lucas', eventId, userId: 'usr-vol-lucas', role: ROLES.VOLUNTEER, status: 'active' },
    { id: 'mem-jordan', eventId, userId: 'usr-vol-jordan', role: ROLES.VOLUNTEER, status: 'active' },
    { id: 'mem-chloe', eventId, userId: 'usr-vol-chloe', role: ROLES.VOLUNTEER, status: 'active' },
    { id: 'mem-samira', eventId, userId: 'usr-vol-samira', role: ROLES.VOLUNTEER, status: 'active' },
    { id: 'mem-daniel', eventId, userId: 'usr-vol-daniel', role: ROLES.VOLUNTEER, status: 'active' },
    { id: 'mem-aisha', eventId, userId: 'usr-vol-aisha', role: ROLES.VOLUNTEER, status: 'active' },
    { id: 'mem-liam', eventId, userId: 'usr-vol-liam', role: ROLES.VOLUNTEER, status: 'active' },
    { id: 'mem-zoe', eventId, userId: 'usr-vol-zoe', role: ROLES.VOLUNTEER, status: 'active' }
  ];

  // 4. Zones with relative coordinates for schematic map
  const zones = [
    {
      id: 'zone-entry',
      eventId,
      name: 'Entry Gate',
      code: 'ENTRY GATE',
      description: 'Main campus security checkpoint, ticket scanning, and attendee welcome flow.',
      color: '#F59E0B',
      posX: 22,
      posY: 58,
      requiredHeadcount: 3
    },
    {
      id: 'zone-reg',
      eventId,
      name: 'Registration',
      code: 'REGISTRATION',
      description: 'Help with attendee check-in, wristbands and info desk.',
      color: '#F59E0B',
      posX: 41,
      posY: 44,
      requiredHeadcount: 4
    },
    {
      id: 'zone-stage',
      eventId,
      name: 'Main Stage',
      code: 'MAIN STAGE',
      description: 'Stage support, artist coordination and crowd flow.',
      color: '#A855F7',
      posX: 52,
      posY: 28,
      requiredHeadcount: 3
    },
    {
      id: 'zone-food',
      eventId,
      name: 'Refreshments',
      code: 'REFRESHMENTS',
      description: 'Vendor coordination, food supplies, and hydration points.',
      color: '#C4F03A',
      posX: 66,
      posY: 38,
      requiredHeadcount: 3
    },
    {
      id: 'zone-med',
      eventId,
      name: 'First Aid',
      code: 'FIRST AID',
      description: 'Medical response, CPR/AED triage, and calm space.',
      color: '#C4F03A',
      posX: 48,
      posY: 63,
      requiredHeadcount: 2
    },
    {
      id: 'zone-parking',
      eventId,
      name: 'Parking',
      code: 'PARKING',
      description: 'Transit shuttle liaison, parking marshals, and vehicle flow.',
      color: '#C4F03A',
      posX: 65,
      posY: 64,
      requiredHeadcount: 2
    }
  ];

  // 5. Skills
  const skills = [
    'Crowd Control',
    'Registration',
    'First Aid',
    'Hospitality',
    'Audio/Visual',
    'Stage Support',
    'Logistics',
    'Traffic Management',
    'Conflict De-escalation'
  ];

  // Volunteer Skills mapping
  const volunteerSkills = [
    { userId: 'usr-vol-maya', skills: ['Crowd Control', 'Registration', 'Hospitality'] },
    { userId: 'usr-vol-lucas', skills: ['Hospitality', 'Logistics'] },
    { userId: 'usr-vol-jordan', skills: ['Audio/Visual', 'Stage Support', 'Crowd Control'] },
    { userId: 'usr-vol-chloe', skills: ['First Aid', 'Conflict De-escalation', 'Crowd Control', 'Registration'] },
    { userId: 'usr-vol-samira', skills: ['Registration', 'Hospitality', 'Crowd Control'] },
    { userId: 'usr-vol-daniel', skills: ['Audio/Visual', 'Stage Support', 'Logistics'] },
    { userId: 'usr-vol-aisha', skills: ['Registration', 'Hospitality'] },
    { userId: 'usr-vol-liam', skills: ['Traffic Management', 'Logistics', 'Crowd Control'] },
    { userId: 'usr-vol-zoe', skills: ['First Aid', 'Conflict De-escalation'] }
  ];

  // Availabilities (covers full festival day)
  const volunteerAvailabilities = [
    { userId: 'usr-vol-maya', availabilities: [{ startTime: makeIso(8, 0), endTime: makeIso(20, 0) }] },
    { userId: 'usr-vol-lucas', availabilities: [{ startTime: makeIso(10, 0), endTime: makeIso(22, 0) }] },
    { userId: 'usr-vol-jordan', availabilities: [{ startTime: makeIso(12, 0), endTime: makeIso(23, 0) }] },
    { userId: 'usr-vol-chloe', availabilities: [{ startTime: makeIso(8, 0), endTime: makeIso(22, 0) }] },
    { userId: 'usr-vol-samira', availabilities: [{ startTime: makeIso(12, 0), endTime: makeIso(20, 0) }] },
    { userId: 'usr-vol-daniel', availabilities: [{ startTime: makeIso(14, 0), endTime: makeIso(23, 0) }] },
    { userId: 'usr-vol-aisha', availabilities: [{ startTime: makeIso(8, 0), endTime: makeIso(16, 0) }] },
    { userId: 'usr-vol-liam', availabilities: [{ startTime: makeIso(8, 0), endTime: makeIso(18, 0) }] },
    { userId: 'usr-vol-zoe', availabilities: [{ startTime: makeIso(12, 0), endTime: makeIso(22, 0) }] }
  ];

  // 6. Shifts across zones for Today
  // Slot A: 09:00 - 13:00 (Morning)
  // Slot B: 13:00 - 17:00 (Afternoon - Current Active)
  // Slot C: 17:00 - 21:00 (Evening - Upcoming)
  const shifts = [
    // Entry Gate
    {
      id: 'shift-entry-morning',
      eventId,
      zoneId: 'zone-entry',
      title: 'Morning Access & Bag Check',
      roleName: 'Access Marshal',
      startTime: makeIso(9, 0),
      endTime: makeIso(13, 0),
      requiredHeadcount: 3,
      requiredSkills: ['Crowd Control'],
      preferredSkills: ['Registration'],
      notes: 'Wristband distribution and metal detector flow monitoring.'
    },
    {
      id: 'shift-entry-afternoon',
      eventId,
      zoneId: 'zone-entry',
      title: 'Peak Entry & Crowd Control',
      roleName: 'Access Marshal',
      startTime: makeIso(13, 0),
      endTime: makeIso(17, 0),
      requiredHeadcount: 3,
      requiredSkills: ['Crowd Control'],
      preferredSkills: ['Conflict De-escalation'],
      notes: 'High volume period before headliner shows.'
    },
    // Registration
    {
      id: 'shift-reg-morning',
      eventId,
      zoneId: 'zone-reg',
      title: 'Attendee Packet & Badge Desk',
      roleName: 'Registration Specialist',
      startTime: makeIso(9, 0),
      endTime: makeIso(13, 0),
      requiredHeadcount: 3,
      requiredSkills: ['Registration'],
      preferredSkills: ['Hospitality'],
      notes: 'Handle pre-registered QR code scanner terminals.'
    },
    {
      id: 'shift-reg-afternoon',
      eventId,
      zoneId: 'zone-reg',
      title: 'General Inquiries & VIP Hospitality',
      roleName: 'Registration Specialist',
      startTime: makeIso(13, 0),
      endTime: makeIso(17, 0),
      requiredHeadcount: 3,
      requiredSkills: ['Registration'],
      preferredSkills: ['Hospitality'],
      notes: 'Manage VIP pass handoffs and sponsor check-ins.'
    },
    // Main Stage
    {
      id: 'shift-stage-afternoon',
      eventId,
      zoneId: 'zone-stage',
      title: 'Stage Production & Pit Management',
      roleName: 'Stage Crew',
      startTime: makeIso(13, 0),
      endTime: makeIso(17, 0),
      requiredHeadcount: 4,
      requiredSkills: ['Crowd Control'],
      preferredSkills: ['Audio/Visual', 'Stage Support'],
      notes: 'Keep front-of-house barrier clear; coordinate backstage water.'
    },
    {
      id: 'shift-stage-evening',
      eventId,
      zoneId: 'zone-stage',
      title: 'Headline Concert Pit Security',
      roleName: 'Stage Crew',
      startTime: makeIso(17, 0),
      endTime: makeIso(21, 0),
      requiredHeadcount: 4,
      requiredSkills: ['Crowd Control'],
      preferredSkills: ['Audio/Visual'],
      notes: 'High-energy headline slot. Coordinate directly with Priya.'
    },
    // First Aid
    {
      id: 'shift-med-afternoon',
      eventId,
      zoneId: 'zone-med',
      title: 'Medical Triage & Dehydration Care',
      roleName: 'First Aid Responder',
      startTime: makeIso(13, 0),
      endTime: makeIso(17, 0),
      requiredHeadcount: 2,
      requiredSkills: ['First Aid'],
      preferredSkills: ['Conflict De-escalation'],
      notes: 'Paramedic support desk, basic triage, ice packs, water restock.'
    },
    // Refreshments
    {
      id: 'shift-food-afternoon',
      eventId,
      zoneId: 'zone-food',
      title: 'Hydration & Food Court Logistics',
      roleName: 'Hospitality Marshal',
      startTime: makeIso(13, 0),
      endTime: makeIso(17, 0),
      requiredHeadcount: 2,
      requiredSkills: ['Hospitality'],
      preferredSkills: ['Logistics'],
      notes: 'Maintain free water refilling stations and line queue dividers.'
    },
    // Parking & Transit
    {
      id: 'shift-park-afternoon',
      eventId,
      zoneId: 'zone-parking',
      title: 'Shuttle Dispatch & Traffic Marshalling',
      roleName: 'Transit Guide',
      startTime: makeIso(13, 0),
      endTime: makeIso(17, 0),
      requiredHeadcount: 2,
      requiredSkills: ['Traffic Management'],
      preferredSkills: ['Crowd Control'],
      notes: 'Direct campus shuttle buses and guide incoming traffic.'
    }
  ];

  // 7. Initial Assignments
  // Notice: For the central demo workflow:
  // "shift-entry-afternoon" requires 3. Currently assigned: Maya Lin, Samira Khan.
  // When Maya cancels (or is canceled by demo button), Entry Gate becomes understaffed (1/3)!
  // Chloe Bennett (usr-vol-chloe) has Crowd Control, First Aid, Registration, is free at 13:00-17:00, 0 hours!
  // Chloe is the top suggested replacement!
  const assignments = [
    // Entry Gate morning
    {
      id: 'asgn-entry-m-1',
      eventId,
      shiftId: 'shift-entry-morning',
      volunteerId: 'usr-vol-aisha',
      status: ASSIGNMENT_STATUSES.COMPLETED,
      assignedBy: 'usr-organizer-elena',
      createdAt: makeIso(7, 30)
    },
    // Entry Gate afternoon (The core demo shift!)
    {
      id: 'asgn-entry-a-maya',
      eventId,
      shiftId: 'shift-entry-afternoon',
      volunteerId: 'usr-vol-maya',
      status: ASSIGNMENT_STATUSES.ASSIGNED,
      assignedBy: 'usr-organizer-elena',
      createdAt: makeIso(8, 0)
    },
    {
      id: 'asgn-entry-a-samira',
      eventId,
      shiftId: 'shift-entry-afternoon',
      volunteerId: 'usr-vol-samira',
      status: ASSIGNMENT_STATUSES.CHECKED_IN,
      assignedBy: 'usr-organizer-elena',
      createdAt: makeIso(8, 0)
    },
    // Registration afternoon
    {
      id: 'asgn-reg-a-1',
      eventId,
      shiftId: 'shift-reg-afternoon',
      volunteerId: 'usr-vol-aisha',
      status: ASSIGNMENT_STATUSES.ASSIGNED,
      assignedBy: 'usr-organizer-elena',
      createdAt: makeIso(8, 0)
    },
    // Main Stage afternoon
    {
      id: 'asgn-stage-a-jordan',
      eventId,
      shiftId: 'shift-stage-afternoon',
      volunteerId: 'usr-vol-jordan',
      status: ASSIGNMENT_STATUSES.CHECKED_IN,
      assignedBy: 'usr-organizer-elena',
      createdAt: makeIso(8, 0)
    },
    {
      id: 'asgn-stage-a-daniel',
      eventId,
      shiftId: 'shift-stage-afternoon',
      volunteerId: 'usr-vol-daniel',
      status: ASSIGNMENT_STATUSES.ASSIGNED,
      assignedBy: 'usr-organizer-elena',
      createdAt: makeIso(8, 0)
    },
    // Food Plaza afternoon
    {
      id: 'asgn-food-a-lucas',
      eventId,
      shiftId: 'shift-food-afternoon',
      volunteerId: 'usr-vol-lucas',
      status: ASSIGNMENT_STATUSES.CHECKED_IN,
      assignedBy: 'usr-organizer-elena',
      createdAt: makeIso(8, 0)
    },
    // Parking afternoon
    {
      id: 'asgn-park-a-liam',
      eventId,
      shiftId: 'shift-park-afternoon',
      volunteerId: 'usr-vol-liam',
      status: ASSIGNMENT_STATUSES.CHECKED_IN,
      assignedBy: 'usr-organizer-elena',
      createdAt: makeIso(8, 0)
    },
    // First Aid afternoon
    {
      id: 'asgn-med-a-zoe',
      eventId,
      shiftId: 'shift-med-afternoon',
      volunteerId: 'usr-vol-zoe',
      status: ASSIGNMENT_STATUSES.CHECKED_IN,
      assignedBy: 'usr-organizer-elena',
      createdAt: makeIso(8, 0)
    }
  ];

  // 8. Attendance records
  const attendance = [
    {
      id: 'att-entry-m-1',
      eventId,
      assignmentId: 'asgn-entry-m-1',
      volunteerId: 'usr-vol-aisha',
      shiftId: 'shift-entry-morning',
      checkInTime: makeIso(8, 55),
      checkOutTime: makeIso(13, 0),
      method: 'coordinator',
      verifiedBy: 'usr-coord-marcus',
      isFlagged: false,
      notes: 'Completed full morning shift on schedule.'
    },
    {
      id: 'att-entry-a-samira',
      eventId,
      assignmentId: 'asgn-entry-a-samira',
      volunteerId: 'usr-vol-samira',
      shiftId: 'shift-entry-afternoon',
      checkInTime: makeIso(12, 58),
      checkOutTime: null,
      method: 'qr',
      verifiedBy: 'usr-coord-marcus',
      isFlagged: false,
      notes: 'Active shift in progress.'
    },
    {
      id: 'att-stage-a-jordan',
      eventId,
      assignmentId: 'asgn-stage-a-jordan',
      volunteerId: 'usr-vol-jordan',
      shiftId: 'shift-stage-afternoon',
      checkInTime: makeIso(12, 50),
      checkOutTime: null,
      method: 'self',
      isFlagged: false,
      notes: 'Checked in at front-of-house sound booth.'
    },
    {
      id: 'att-food-a-lucas',
      eventId,
      assignmentId: 'asgn-food-a-lucas',
      volunteerId: 'usr-vol-lucas',
      shiftId: 'shift-food-afternoon',
      checkInTime: makeIso(13, 2),
      checkOutTime: null,
      method: 'coordinator',
      verifiedBy: 'usr-coord-priya',
      isFlagged: false
    },
    {
      id: 'att-park-a-liam',
      eventId,
      assignmentId: 'asgn-park-a-liam',
      volunteerId: 'usr-vol-liam',
      shiftId: 'shift-park-afternoon',
      checkInTime: makeIso(12, 55),
      checkOutTime: null,
      method: 'self',
      isFlagged: false
    },
    {
      id: 'att-med-a-zoe',
      eventId,
      assignmentId: 'asgn-med-a-zoe',
      volunteerId: 'usr-vol-zoe',
      shiftId: 'shift-med-afternoon',
      checkInTime: makeIso(12, 45),
      checkOutTime: null,
      method: 'coordinator',
      verifiedBy: 'usr-coord-priya',
      isFlagged: false
    }
  ];

  // 9. Tasks & Issues
  const issues = [
    {
      id: 'iss-1',
      eventId,
      zoneId: 'zone-entry',
      title: 'Barcode scanners battery low at Turnstile B',
      description: 'Two handheld scanners showing <15% battery. Need replacement battery packs from Logistics.',
      category: ISSUE_CATEGORIES.EQUIPMENT,
      severity: ISSUE_SEVERITIES.MEDIUM,
      status: ISSUE_STATUSES.ACKNOWLEDGED,
      reportedBy: 'usr-vol-samira',
      coordinatorId: 'usr-coord-marcus',
      assignedTo: 'usr-vol-maya',
      acknowledgedAt: makeIso(13, 10),
      createdAt: makeIso(13, 5)
    },
    {
      id: 'iss-2',
      eventId,
      zoneId: 'zone-stage',
      title: 'Surge at Stage Right barrier',
      description: 'Crowd density increasing rapidly before the 14:30 set. Requesting 2 additional marshals to assist with line diversion.',
      category: ISSUE_CATEGORIES.CROWD,
      severity: ISSUE_SEVERITIES.URGENT,
      status: ISSUE_STATUSES.OPEN,
      reportedBy: 'usr-vol-jordan',
      coordinatorId: 'usr-coord-priya',
      acknowledgedAt: null,
      escalatedAt: null,
      createdAt: makeIso(13, 20)
    },
    {
      id: 'iss-3',
      eventId,
      zoneId: 'zone-food',
      title: 'Water refill station 3 empty',
      description: '5-gallon reservoir needs replacement. 20 attendees queued.',
      category: ISSUE_CATEGORIES.LOGISTICS,
      severity: ISSUE_SEVERITIES.LOW,
      status: ISSUE_STATUSES.RESOLVED,
      reportedBy: 'usr-vol-lucas',
      coordinatorId: 'usr-coord-priya',
      assignedTo: 'usr-vol-lucas',
      acknowledgedAt: makeIso(12, 10),
      resolvedAt: makeIso(12, 35),
      createdAt: makeIso(12, 5)
    }
  ];

  // 10. Issue Activity
  const issueActivity = [
    {
      id: 'act-1',
      issueId: 'iss-1',
      userId: 'usr-coord-marcus',
      action: 'acknowledged',
      note: 'Logistics dispatched with 4 fresh battery packs.',
      createdAt: makeIso(13, 10)
    },
    {
      id: 'act-2',
      issueId: 'iss-3',
      userId: 'usr-vol-lucas',
      action: 'resolved',
      note: 'Replaced tank from storage pallet B. Flow restored.',
      createdAt: makeIso(12, 35)
    }
  ];

  // 11. Announcements
  const announcements = [
    {
      id: 'ann-1',
      eventId,
      authorId: 'usr-organizer-elena',
      title: 'Gates are officially open! Welcome Ignite Fest 2026',
      body: 'All teams report to designated zones. Remember: stay hydrated and report any crowd bottlenecks immediately.',
      audience: ANNOUNCEMENT_AUDIENCES.ALL,
      createdAt: makeIso(8, 45)
    },
    {
      id: 'ann-2',
      eventId,
      authorId: 'usr-coord-priya',
      title: 'Main Stage Sound Check Complete',
      body: 'Sound levels approved by campus safety. Backstage pass holders only past the pit entrance.',
      audience: ANNOUNCEMENT_AUDIENCES.ZONE,
      zoneId: 'zone-stage',
      createdAt: makeIso(12, 15)
    }
  ];

  // 12. Notifications
  const notifications = [
    {
      id: 'notif-1',
      eventId,
      userId: 'usr-vol-maya',
      type: 'shift_assigned',
      title: 'New Shift Assignment',
      message: 'You are assigned to "Peak Entry & Crowd Control" at North Entry Gate (13:00 - 17:00).',
      link: '/volunteer/today',
      isRead: false,
      createdAt: makeIso(8, 0)
    },
    {
      id: 'notif-2',
      eventId,
      userId: 'usr-coord-marcus',
      type: 'issue_reported',
      title: 'New Equipment Issue Reported',
      message: 'Barcode scanners battery low at Turnstile B in North Entry Gate.',
      link: '/issues',
      isRead: true,
      createdAt: makeIso(13, 5)
    },
    {
      id: 'notif-3',
      eventId,
      userId: 'usr-organizer-elena',
      type: 'system_alert',
      title: 'Ignite Fest Active',
      message: '5 of 6 zones currently have active coverage. 6 volunteers checked in.',
      link: '/overview',
      isRead: false,
      createdAt: makeIso(13, 0)
    }
  ];

  // 13. Handover Notes
  const handoverNotes = [
    {
      id: 'handover-1',
      eventId,
      zoneId: 'zone-entry',
      shiftId: 'shift-entry-morning',
      authorId: 'usr-vol-aisha',
      summary: 'Smooth morning flow. Approx 1,200 attendees processed without incident.',
      openIssues: 'Scanner 4 has a loose charging port. Marked with yellow tape.',
      notes: 'Afternoon crew: keep bag check queue 2 lanes wide during the 14:00 rush.',
      createdAt: makeIso(13, 0)
    }
  ];

  // 14. Audit Events
  const auditEvents = [
    {
      id: 'audit-1',
      eventId,
      actorId: 'usr-organizer-elena',
      action: 'event_initialized',
      entityType: 'event',
      entityId: eventId,
      details: { title: 'Ignite Fest 2026', zonesCount: 6, shiftsCount: 9 },
      createdAt: makeIso(6, 0)
    }
  ];

  return {
    profiles,
    events,
    memberships,
    zones,
    skills,
    volunteerSkills,
    volunteerAvailabilities,
    shifts,
    assignments,
    attendance,
    issues,
    issueActivity,
    announcements,
    notifications,
    handoverNotes,
    auditEvents
  };
}
