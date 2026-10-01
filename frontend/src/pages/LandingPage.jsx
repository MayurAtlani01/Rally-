import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass,
  Users,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Eye,
  KeyRound,
  RotateCcw
} from 'lucide-react';
export default function LandingPage({ onOpenCreateEvent, onOpenJoinEvent }) {

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col">
      {/* Hero Navigation */}
      <nav className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#7054E8] flex items-center justify-center text-white font-extrabold text-xl shadow-sm">
            R
          </div>
          <div>
            <span className="font-black text-xl tracking-tight text-slate-900 block leading-tight">
              RALLY
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">
              Event Volunteer & Crowd Coordination
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenJoinEvent}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-800 shadow-2xs transition-colors"
          >
            Join with Code
          </button>
          <Link
            to="/overview"
            className="px-4 py-2 rounded-xl bg-[#7054E8] hover:bg-[#5B3FD4] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>Open Live Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 pt-12 pb-20 flex-1 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-violet-200/80 text-xs font-bold text-[#7054E8] mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Real-Time Staffing, Coverage Lens, and Atomic Replacement</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-950 max-w-4xl leading-[1.1]">
          Bring your people together. Coordinate crowds without confusion.
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mt-5 leading-relaxed">
          RALLY is built for college fests, marathons, charity events, and conferences.
          Know where you are understaffed, who is available, who checked in, and resolve volunteer cancellations with explainable replacement preview.
        </p>

        {/* Primary CTAs */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Link
            to="/overview"
            className="px-6 py-3 rounded-2xl bg-[#7054E8] hover:bg-[#5B3FD4] text-white text-sm font-bold shadow-md transition-all hover:scale-[1.02] flex items-center gap-2"
          >
            <span>Explore Ignite Fest 2026</span>
            <ArrowRight className="w-4 h-4" />
          </Link>

          <button
            onClick={onOpenJoinEvent}
            className="px-6 py-3 rounded-2xl bg-white border border-slate-300 hover:border-slate-400 text-slate-900 text-sm font-bold shadow-2xs transition-colors flex items-center gap-2"
          >
            <KeyRound className="w-4 h-4 text-slate-500" />
            <span>Join an Event</span>
          </button>

          <button
            onClick={onOpenCreateEvent}
            className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold transition-colors"
          >
            Organize an Event
          </button>
        </div>

        {/* Central Product Workflow Showcase Box */}
        <div className="mt-14 w-full max-w-4xl p-6 rounded-3xl bg-white border border-slate-200 shadow-xl text-left">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-violet-100 text-violet-800">
                The Central Product Workflow
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-1">
                From Cancellation to Instant Replacement
              </h3>
            </div>
            <Link
              to="/shifts"
              className="text-xs font-bold text-[#7054E8] hover:underline flex items-center gap-1"
            >
              Try in Shift Planner
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] font-black text-slate-400 block mb-1">STEP 1</span>
              <p className="text-xs font-bold text-slate-900">Volunteer Cancels</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Volunteer taps "Cannot Attend" on mobile card. Cancellation reason is logged.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-[10px] font-black text-amber-600 block mb-1">STEP 2</span>
              <p className="text-xs font-bold text-amber-900">Staffing Gap Appears</p>
              <p className="text-[11px] text-amber-800/80 mt-1">
                Zone shifts into understaffed status on the interactive venue map and alerts coordinators.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200">
              <span className="text-[10px] font-black text-[#7054E8] block mb-1">STEP 3</span>
              <p className="text-xs font-bold text-violet-950">Deterministic Suggestions</p>
              <p className="text-[11px] text-violet-800/80 mt-1">
                Matching engine ranks eligible volunteers by fewest hours, skills, and zone preferences.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] font-black text-emerald-600 block mb-1">STEP 4</span>
              <p className="text-xs font-bold text-emerald-950">Replacement Preview</p>
              <p className="text-[11px] text-emerald-800/80 mt-1">
                Organizer previews before/after coverage for both zones and confirms atomic assignment.
              </p>
            </div>
          </div>
        </div>

        {/* Feature Grid: Staffing, Coordination, Volunteer Experience */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl text-left">
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-violet-100 text-[#7054E8] flex items-center justify-center mb-4">
              <Compass className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">Interactive Venue Coverage Map</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Preset schematic campus grounds layout. Pins display required vs assigned vs checked-in headcount. Toggle the Coverage Lens to view verified attendance now versus upcoming rosters.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">Explainable Volunteer Matching</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              No black-box AI. Deterministic checks for availability windows, required skills, non-overlapping adjacent shifts, and workload fairness with clear explanations for every candidate.
            </p>
          </div>

          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h3 className="font-extrabold text-sm text-slate-900">Volunteer Mobile View & Check-In</h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Dedicated mobile-friendly view with next-shift countdown card, one-tap check-in/out, coordinator contact, shift handover notes, and issue reporting.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 px-6 text-center text-xs text-slate-400">
        RALLY · Event volunteer and crowd coordination platform · Running device-local demo with real persistence
      </footer>
    </div>
  );
}
