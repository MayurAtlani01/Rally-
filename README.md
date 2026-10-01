# RALLY · Event Volunteer and Crowd Coordination Platform

**RALLY** is an event volunteer and crowd coordination web application designed for college fests, charity events, marathons, and conferences.

---

## 🎯 Product Overview

RALLY bridges the real-time gap between organizers, zone coordinators, and volunteers on the ground:

### Key Questions Answered
* **For Organizers:**
  * *Where are we understaffed?* Visual venue map with live attendance vs scheduled roster status.
  * *Who is available and eligible to help?* Deterministic, explainable matching engine ranking volunteers by hours, skills, and zone preferences.
  * *Who has actually checked in?* Real-time attendance tracking distinguishing scheduled coverage from verified on-site check-ins.
  * *Which issues need attention?* Field tasks and issues board with automatic coordinator routing and persistent organizer escalation.
  * *What happens when someone cancels?* The central product experience: staffing gap appears → replacement suggestions previewed with source/target zone impact → confirmed atomically.
* **For Volunteers:**
  * *Where do I need to go?* Prominent next-shift card with zone location and venue map reference.
  * *When is my shift?* Exact start and end times in event timezone with live countdown.
  * *What should I do?* Role specifications and zone operational instructions.
  * *Who is coordinating my zone?* Direct coordinator point-of-contact details.
  * *How do I report a problem?* One-tap problem reporting with immediate coordinator alerting.

---

## 🌟 The Central Product Workflow

```
Volunteer Cancels
       ↓
Staffing Gap Appears on Venue Map (Understaffed Alert)
       ↓
Eligible Replacements Deterministically Suggested (Ranked by Hours & Skills)
       ↓
Organizer Previews Reassignment Impact (Source & Destination Coverage)
       ↓
Organizer Confirms Move (Atomic Database / Store Transaction)
       ↓
New Volunteer Sees Shift in Their Portal
```

---

## 🛠️ Architecture & Tech Stack

* **Frontend:**
  * React 19, Vite, JavaScript (ES modules)
  * Tailwind CSS v4 design system with custom warm off-white palette:
    * Workspace background: `#FAF9F6`
    * Deep navy typography: `#0F172A`
    * Violet primary actions: `#7054E8`
    * Lime accents: `#D5ED95`
    * Warning amber: `#F59E0B`
    * Urgent red: `#EF4444`
  * Lucide React icons
  * Recharts for attendance and zone fill rate analytics
* **Backend:**
  * Node.js (v24 native test runner, ES modules) & Express 5
  * Helmet security headers & CORS origin validation
  * Deterministic Matching Engine (`shared/matching.js`)
  * Background Escalation Engine (`backend/src/worker.js` and periodic server loop)
* **Data & Persistence:**
  * **Device-Local Demo Mode (`RALLY_MODE=demo`):** Fully working zero-setup mode persisted to `backend/data/demo.json` with seed data relative to current date.
  * **Live Supabase Mode (`RALLY_MODE=supabase`):** Full Postgres schema with foreign keys, constraints, and Row Level Security (RLS) policies in `supabase/migrations/20261001000000_rally_schema.sql`.

---

## 👥 Roles and Access Scoping

Roles are strictly scoped per event:
1. **Organizer:** Full administrative access (event setup, zone coordinates, shifts, memberships, broadcasts, report exports). Cannot be self-selected via public join code.
2. **Zone Coordinator:** Scoped access to assigned zones (attendance management, tasks/issues, zone broadcasts, shift handovers).
3. **Volunteer:** Scoped to personal availability, active assignments, self check-in/out, and reporting issues.

---

## 🚀 Quickstart & Local Setup

### 1. Prerequisites
* Node.js v20+ or v24+
* npm v10+

### 2. Install Dependencies
```bash
npm install
```

### 3. Seed Demo Dataset
```bash
npm run seed
```
This populates the fictional college fest **"Ignite Fest 2026"** with 6 zones (Entry Gate, Registration, Main Stage, Food Plaza, First Aid, Parking), 9 shifts, 12 volunteer profiles, and initial assignments centered around "Today".

### 4. Run Development Servers
```bash
# Runs backend on http://127.0.0.1:3001 and frontend on http://127.0.0.1:5173
npm run dev
```
Open **[http://127.0.0.1:5173](http://127.0.0.1:5173)** in your browser.

---

## 🧪 Testing and Verification

Run all automated unit, integration, and access tests:
```bash
npm test
```

### Test Suites Included (25/25 Passing):
1. **`tests/matching.test.js`**:
   * Adjacent shifts treated as non-overlapping
   * Overlapping shifts detection
   * Missing required skills rejection
   * Availability window coverage validation
   * Fair workload distribution (fewer assigned hours prioritized)
   * Canceled shifts disregarded from coverage and workload
   * Reassignment preview calculation with understaffing alerts
2. **`tests/reassignment.test.js`**:
   * Atomic move between source and target shifts
   * Transaction rollback / error when source assignment is missing
3. **`tests/attendance.test.js`**:
   * Check-in records and assignment status updates
   * Duplicate active check-in prevention
   * Check-out completion and attended hours calculation
4. **`tests/access.test.js`**:
   * Public invite code joins strictly as volunteer (never organizer)
   * Coordinator zone scope restrictions
   * Cross-event data isolation
5. **`tests/escalation.test.js`**:
   * Automatic escalation of unacknowledged urgent issues after threshold
   * Duplicate alert deduplication
   * Suppression of escalation for acknowledged issues
6. **`tests/e2e_scenario.test.js`**:
   * Complete 8-step product lifecycle simulation

Linting and build verification:
```bash
npm run lint    # ESLint across frontend, backend, shared, tests
npm run build   # Production Vite bundle
```

---

## 🎬 Demo Walkthrough Guide

To experience the central product workflow in the UI:

1. **Open the App:** Navigate to `http://127.0.0.1:5173/` and click **"Explore Ignite Fest 2026"**.
2. **Inspect the Venue Map:**
   * Notice the 6 zones on the schematic campus map.
   * Toggle the **Coverage Lens** between *"Now (Live Attendance)"* and *"Peak Period (13:00 - 17:00)"*.
   * Click **North Entry Gate** to open the Zone Drawer and see rostered volunteers (Maya Lin and Samira Khan).
3. **Simulate a Cancellation:**
   * Switch persona using the top bar switcher to **Maya Lin (Volunteer)**.
   * Go to **Volunteer Today** (`/volunteer/today`).
   * Tap **"Cannot Attend (Cancel Shift)"**, select a reason, and confirm.
4. **Observe the Staffing Gap:**
   * Switch persona back to **Elena Vance (Organizer)**.
   * Return to **Live Overview** or **Shift Planner** (`/shifts`).
   * Notice **North Entry Gate** now displays **1 / 3 Staffed** with an **Amber Understaffed** warning badge.
5. **Find Replacement:**
   * Click **"Find Replacement"** on that shift.
   * The deterministic candidate matching dialog opens: **Chloe Bennett** is ranked **#1** (possesses required First Aid / Crowd Control skills and has 0 assigned hours).
   * Click **"Assign"** to backfill the gap.
6. **Verify the Resolution:**
   * The shift updates to **2 / 3 Staffed**.
   * Switch persona to **Chloe Bennett (Volunteer)**: navigate to **Volunteer Today** to see her newly assigned shift with full instructions and check-in button ready!
7. **Reset Anytime:**
   * Click the **Reset Demo** button (circular arrow icon in the top navbar) to restore the initial test state anytime.

---

## ⚖️ Honest Limitations & Design Decisions

* **Sensor Data / Crowd Monitoring:** RALLY displays reported field observations submitted by coordinators and volunteers. It does not fabricate simulated IoT crowd sensors where physical hardware does not exist.
* **Attendance Hours:** Incomplete attendance records (checked in without checking out) are honestly flagged for coordinator audit rather than fabricating an arbitrary checkout timestamp.
* **Email & Push Delivery:** Configured for persistent in-app notifications and webhooks; external SMTP / SMS gateways require environment configuration.
