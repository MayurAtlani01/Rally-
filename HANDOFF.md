# RALLY — Live Operations & Venue Coordination Platform
## Visual Redesign Implementation & Handoff

### 1. Overview & Visual Redesign
This release implements the high-contrast daytime and nighttime editorial visual system for **RALLY** (as specified in the reference designs). The product provides real-time event volunteer and crowd operations for multi-zone venues (festivals, conferences, hackathons, charity runs).

#### Design Tokens & Themes
- **Day Theme**: Warm ivory base (`#FAF8F5`), crisp white cards (`#FFFFFF`), deep navy typography (`#0F172A`), acid-lime primary action elements (`#C4F03A`), and lilac accents (`#A855F7`). Includes clean sunlit venue illustration.
- **Night Theme**: Deep ink-black / aubergine surfaces (`#0D0B14`, `#140F22`), bone-white text (`#F8FAFC`), illuminated festival night artwork with purple/magenta concert stage lighting and lantern pathways.
- **Theme Switching**: Managed via `ThemeContext.jsx` with real-time Day/Night toggle button in the top bar. Detects OS system preference (`prefers-color-scheme`) on initial load and persists user preference to `localStorage ('rally_theme')`.
- **Editorial Typography**: Headings styled with high-contrast editorial serif (`Instrument Serif` / `Playfair Display`), paired with clean, accessible sans-serif (`Plus Jakarta Sans`) for operational data and controls.

---

### 2. Desktop & Responsive Composition
- **Left Navigation Rail (~88px)**:
  - Serif `R` Monogram brand mark at the top.
  - Vertically stacked icon + text navigation items: `Overview`, `People`, `Schedule`, `Map`, `Issues`, `Messages`, `Settings`.
  - Active item features an acid-lime squircle background (`#C4F03A`) with dark icon and bold label.
  - Active user profile avatar (e.g. `Priya S.`) with live online presence dot at the bottom of the rail.
- **Top Bar**:
  - `RALLY / LIVE OPERATIONS` tracking header.
  - Event context dropdown (`TechFest 2026`) with event switcher, code copy, and event creation modal triggers.
  - Live indicator badge with ticking event-local time (`● LIVE • 11:04 AM`).
  - Visible theme toggle (Sun/Moon icon).
  - Notifications bell with unread badge counter.
  - Acid-lime `Invite team ↗` pill button opening the team invitation workflow.
- **Hero Section**:
  - Dramatic editorial heading: *"Make every moment count."*
  - Supporting copy: *"6 zones. 30 volunteers. One shared rhythm."*
  - Three typography-led operational metrics: `Checked in (24/30)` (green indicator bar), `Coverage gaps (02)` (amber indicator bar), `Open issues (03)` (lilac indicator bar).
- **Interactive Venue Map**:
  - Clean day and night illustrations rendered without baked-in text or controls.
  - Markers positioned via normalized relative coordinates (`posX`, `posY`) inside the same transformed layer as the artwork, ensuring zero marker drift under zoom or pan.
  - Floating top-left `VENUE PULSE` mode segmented control (`Now` vs `Next shift`).
  - Floating bottom-right controls: Zoom `+` / `-`, zoom reset button, and coverage lens toggle (`Scheduled` vs `Checked in`).
  - Zone markers feature distinct status colors matching reference: Purple for Main Stage (3/3), Amber for Registration (2/4) and Entry Gate (2/3), Acid-Lime for Refreshments (3/3), First Aid (2/2), and Parking (2/2).
- **Context Inspector Panel (~340px)**:
  - Top dismissible amber staffing-gap badge: `● Registration • 2 volunteers missing ✕`.
  - Heading: *"Close the gap."* with subtitle *"Find the right people for the next move."*
  - Eligible candidate cards with avatar, available hours, `Available` chip, `Skill matched` chip, and quick assignment button.
  - Full-width acid-lime `Review replacements ↗` button triggering the cross-zone replacement review modal.
  - Live *"On the ground"* activity feed showing field check-ins and station updates.
- **Bottom Contrasting Strip**:
  - Upcoming shift window header: *"Up next / 11:00 — 13:00"* with *"Open planner ↗"* action.
  - Interactive zone rows with live status dots, zone names, headcount ratios (`3 of 4`, `3 of 3`), overlapping volunteer avatar stacks (`+1` overflow indicator), and role descriptions.

---

### 3. Venue Artwork & Assets
The venue artwork consists of clean, isolated scene illustrations without any UI elements, text, or buttons:
- **Daytime Illustration**: `frontend/public/venue/rally-day.png` (High-resolution aerial view featuring the Main Stage amphitheater at upper-center, Welcome & Registration pavilion mid-left, North Entry Gate lower-left, lakeside food tents mid-right, First Aid tent lower-center, and parking lot lower-right).
- **Nighttime Illustration**: `frontend/public/venue/rally-night.jpg` (Exact matching geometry, layout, and perspective transformed into illuminated festival night with concert stage lighting, lanterns, and night sky).
- **Fallback**: Built-in schematic campus SVG fallback rendered gracefully if asset loading is interrupted.

---

### 4. Verified Workflows & Functional Interactions
All UI components are bound to the backend REST APIs and local/Supabase storage layer:
1. **Theme Switcher**: Day (`#FAF8F5`) and Night (`#0D0B14`) switch instantaneously without layout shift or losing zoom/pan coordinates.
2. **Navigation Rail**: Links directly to `/overview`, `/people` (`/volunteers`), `/schedule` (`/shifts`), `/map`, `/issues`, `/messages` (`/announcements`), and `/settings` (`/setup`).
3. **Map Zoom & Pan**: Interactive `+` and `-` zoom controls, reset zoom, and drag-to-pan when zoomed in.
4. **Shift & Coverage Toggles**:
   - `Now` vs `Next shift` switches the active time window.
   - `Scheduled` vs `Checked in` switches between planned rosters and verified on-site check-ins.
5. **Replacement Review Flow**:
   - Clicking `Review replacements ↗` or any understaffed zone opens the explainable candidate matching modal.
   - Deterministic matching ranks candidates by fair workload (fewest hours logged) and required skill matches.
   - Cross-zone reassignment opens the `ReplacementPreviewModal`, displaying before/after coverage for both source and destination zones with understaffing alerts.
   - Atomic move execution commits the reassignment in a single transaction.
6. **Field Attendance & Issues**:
   - Check-in/check-out updates zone counts and live activity feed.
   - Urgent issue escalation detects unacknowledged incidents and triggers coordinator alerts.

---

### 5. Run & Test Commands

#### Run Development Servers
```bash
# Start backend (Port 3001)
npm run dev -w backend

# Start frontend (Port 5173)
npm run dev -w frontend
```

#### Run Automated Test Suite
```bash
# Backend unit, integration, concurrency, and lifecycle tests (57/57 passing)
npm test
# Or run with node test runner:
node --test tests/*.test.js
```

#### Code Quality & Production Build
```bash
# Run ESLint on backend, shared code, tests, and scripts (0 errors, 0 warnings)
npx eslint backend/src shared tests scripts

# Run Vite Production Bundle Build
npm run build -w frontend
```

---

### 6. Persistence & Live Operations Architecture
- **Real Supabase PostgreSQL Persistence**: All normal operations execute against PostgreSQL via Supabase PostgREST and transactional RPC functions (`create_event_with_organizer`, `assign_volunteer_atomic`, `reassign_volunteer_atomic`, `record_check_in_atomic`, `record_check_out_atomic`, `claim_urgent_issues_for_escalation`). Silent JSON demo fallbacks and fake headers have been removed.
- **Strict Verification & Permissions**: All API routes verify the Supabase JWT Bearer token using official Supabase verification. Non-members cannot access event routes; coordinators are strictly bounded to their assigned zones; reporters cannot alter issue status/assignees.
- **Transactional Assignment & Concurrency Safety**: Row-level locking on shift records prevents capacity overflow under concurrent requests, prevents double-booking across shifts, and revalidates availability and membership atomically.
- **Automated Issue Escalation**: Background escalation queries shared Postgres state and uses atomic row-level claiming (`claim_urgent_issues_for_escalation`) to prevent duplicate alerts when multiple workers or server instances are running.
- **Contract & Handoff Reference**: For all API request/response specifications and frontend integration guidelines, see `backend-contract.md`.
