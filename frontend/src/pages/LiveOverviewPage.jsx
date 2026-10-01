import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  ArrowRight,
  ChevronRight,
  Plus,
  X,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  Calendar,
  Layers
} from 'lucide-react';
import InteractiveVenueMap, { SHIFT_TIME_MODES, COVERAGE_MODES } from '../components/map/InteractiveVenueMap.jsx';
import ZoneDetailDrawer from '../components/map/ZoneDetailDrawer.jsx';
import CandidateMatchModal from '../components/shifts/CandidateMatchModal.jsx';
import ReplacementPreviewModal from '../components/shifts/ReplacementPreviewModal.jsx';
import ReportIssueModal from '../components/issues/ReportIssueModal.jsx';
import ShiftHandoverModal from '../components/shifts/ShiftHandoverModal.jsx';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function LiveOverviewPage() {
  const { currentEvent, showToast } = useAuth();
  const [zones, setZones] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [issues, setIssues] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [volunteers, setVolunteers] = useState([]);

  // Interactive Map State
  const [selectedZone, setSelectedZone] = useState(null);
  const [shiftMode, setShiftMode] = useState(SHIFT_TIME_MODES.NOW);
  const [coverageMode, setCoverageMode] = useState(COVERAGE_MODES.SCHEDULED);
  const [gapDismissed, setGapDismissed] = useState(false);

  // Modals
  const [matchShift, setMatchShift] = useState(null);
  const [reassignData, setReassignData] = useState(null);
  const [reportIssueZone, setReportIssueZone] = useState(null);
  const [handoverZone, setHandoverZone] = useState(null);

  const loadData = useCallback(async () => {
    if (!currentEvent) return;
    try {
      const [zRes, sRes, iRes, aRes, vRes] = await Promise.all([
        api.getZones(currentEvent.id),
        api.getShifts(currentEvent.id),
        api.getIssues(currentEvent.id),
        api.getAttendance(currentEvent.id),
        api.getVolunteers(currentEvent.id)
      ]);
      setZones(zRes.zones || []);
      setShifts(sRes.shifts || []);
      setIssues(iRes.issues || []);
      setAttendance(aRes.attendance || []);
      setVolunteers(vRes.volunteers || []);
    } catch (err) {
      console.error('Failed to load overview data:', err);
    }
  }, [currentEvent]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Operational metrics calculated strictly from real persisted data
  const totalRequired = useMemo(() => {
    if (shifts.length > 0) {
      return shifts.reduce((acc, s) => acc + (Number(s.requiredHeadcount) || 0), 0);
    }
    return zones.reduce((acc, z) => acc + (Number(z.requiredHeadcount) || 0), 0);
  }, [shifts, zones]);

  const totalAssigned = useMemo(() => {
    return shifts.reduce((acc, s) => acc + (Number(s.assignedCount) || 0), 0);
  }, [shifts]);

  const totalCheckedIn = useMemo(() => {
    return zones.reduce((acc, z) => acc + (Number(z.checkedInHeadcount) || 0), 0);
  }, [zones]);

  const understaffedCount = useMemo(() => {
    return zones.filter((z) => (z.assignedHeadcount || 0) < (z.requiredHeadcount || 1)).length;
  }, [zones]);

  const openIssuesCount = useMemo(() => {
    return issues.filter((i) => i.status !== 'resolved').length;
  }, [issues]);

  // Find the critical/understaffed shift
  const understaffedShift = useMemo(() => {
    return shifts.find((s) => (s.assignedCount || 0) < (s.requiredHeadcount || 0)) || shifts[0] || null;
  }, [shifts]);

  // Open candidate match or replacement preview modal
  const handleReviewReplacements = () => {
    if (understaffedShift) {
      setMatchShift(understaffedShift);
    } else if (shifts.length > 0) {
      setMatchShift(shifts[0]);
    } else {
      showToast('No shifts have been created yet. Open Shift Planner to add shifts.', 'info');
    }
  };

  // Quick assign candidate directly to understaffed shift
  const handleQuickAssign = async (volunteerId) => {
    if (!understaffedShift || !currentEvent) return;
    try {
      await api.assignVolunteer(currentEvent.id, understaffedShift.id, volunteerId);
      showToast('Volunteer assigned to shift!', 'success');
      await loadData();
    } catch (err) {
      showToast(err.message || 'Failed to assign candidate', 'error');
    }
  };

  // Real eligible volunteers from actual event membership
  const eligibleCandidates = useMemo(() => {
    if (!volunteers || volunteers.length === 0) return [];
    // Filter actual volunteers
    return volunteers.slice(0, 3).map(v => ({
      id: v.id,
      name: v.name || v.fullName,
      hours: `${v.assignedHours || 0} hrs assigned`,
      avatar: v.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      available: true,
      skills: v.skills || []
    }));
  }, [volunteers]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1720px] mx-auto space-y-7 transition-colors">
      {/* 1. Hero Section: Editorial Headline + Supporting Text + 3 Typography-Led Metrics */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pt-1 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        {/* Left: Editorial Serif Heading + Subtitle */}
        <div className="flex flex-col md:flex-row md:items-end gap-6 lg:gap-10">
          <div>
            <h1
              className="font-editorial text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[0.92]"
              style={{ color: 'var(--text-heading)' }}
            >
              Make every<br />moment count.
            </h1>
          </div>
          <div className="pb-1 max-w-xs">
            <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-500">
              {zones.length} zone{zones.length !== 1 ? 's' : ''}. {volunteers.length} volunteer{volunteers.length !== 1 ? 's' : ''}.<br />
              One shared rhythm.
            </p>
          </div>
        </div>

        {/* Right: Three Typography-Led Metrics */}
        <div className="flex items-center gap-6 sm:gap-10 lg:gap-14 pt-2">
          {/* Metric 1: Checked In vs Required */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span
                className="font-editorial text-4xl sm:text-5xl font-bold tracking-tight"
                style={{ color: 'var(--text-heading)' }}
              >
                {String(totalCheckedIn).padStart(2, '0')}
              </span>
              <span className="text-xl sm:text-2xl text-slate-400 font-editorial">/</span>
              <span className="text-xl sm:text-2xl text-slate-400 font-editorial">
                {totalRequired}
              </span>
            </div>
            <div
              className="h-1 w-full rounded-full mt-1.5 mb-1"
              style={{ backgroundColor: 'var(--emerald-success)' }}
            />
            <span className="text-[11px] font-semibold text-slate-500">
              {totalRequired} required · {totalAssigned} assigned · {totalCheckedIn} checked in
            </span>
          </div>

          {/* Metric 2: Coverage Gaps */}
          <div className="flex flex-col">
            <div className="flex items-baseline">
              <span
                className="font-editorial text-4xl sm:text-5xl font-bold tracking-tight"
                style={{ color: 'var(--text-heading)' }}
              >
                {String(understaffedCount).padStart(2, '0')}
              </span>
            </div>
            <div
              className="h-1 w-full rounded-full mt-1.5 mb-1"
              style={{ backgroundColor: 'var(--amber-warning)' }}
            />
            <span className="text-[11px] font-semibold text-slate-500">Coverage gaps</span>
          </div>

          {/* Metric 3: Open Issues */}
          <div className="flex flex-col">
            <div className="flex items-baseline">
              <span
                className="font-editorial text-4xl sm:text-5xl font-bold tracking-tight"
                style={{ color: 'var(--text-heading)' }}
              >
                {String(openIssuesCount).padStart(2, '0')}
              </span>
            </div>
            <div
              className="h-1 w-full rounded-full mt-1.5 mb-1"
              style={{ backgroundColor: 'var(--lilac-accent)' }}
            />
            <span className="text-[11px] font-semibold text-slate-500">Open issues</span>
          </div>
        </div>
      </section>

      {/* 2. Main Work Area: Venue Scene (Left) + Context Inspector Panel (Right) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Venue Scene Container */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4">
          <InteractiveVenueMap
            event={currentEvent}
            zones={zones}
            shifts={shifts}
            issues={issues}
            selectedZone={selectedZone}
            onSelectZone={(zone) => setSelectedZone(zone)}
            shiftMode={shiftMode}
            onShiftModeChange={setShiftMode}
            coverageMode={coverageMode}
            onCoverageModeChange={setCoverageMode}
          />
        </div>

        {/* Right: Context Inspector Panel */}
        <div
          className="lg:col-span-4 xl:col-span-3 rounded-3xl border p-5 flex flex-col justify-between shadow-lg transition-colors min-h-[460px]"
          style={{
            backgroundColor: 'var(--bg-inspector)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <div className="space-y-4">
            {/* Top Amber Staffing-Gap Pill (if an actual understaffed shift exists) */}
            {!gapDismissed && understaffedShift && (understaffedShift.assignedCount || 0) < (understaffedShift.requiredHeadcount || 1) && (
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 shadow-2xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                  <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 truncate">
                    {understaffedShift.title} • {(understaffedShift.requiredHeadcount || 1) - (understaffedShift.assignedCount || 0)} needed
                  </span>
                </div>
                <button
                  onClick={() => setGapDismissed(true)}
                  className="text-amber-800 dark:text-amber-300 hover:opacity-75 text-xs font-bold shrink-0 p-0.5"
                  title="Dismiss warning"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Editorial Heading: "Close the gap." */}
            <div>
              <h2
                className="font-editorial text-3xl sm:text-4xl font-bold tracking-tight"
                style={{ color: 'var(--text-heading)' }}
              >
                Close the gap.
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Find the right people for the next move.
              </p>
            </div>

            {/* Eligible Volunteers List */}
            <div className="space-y-3 pt-1">
              {eligibleCandidates.length === 0 ? (
                <div
                  className="p-5 text-center rounded-2xl border text-xs"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-body)'
                  }}
                >
                  <p className="font-bold text-slate-700 dark:text-slate-300">
                    No eligible volunteers
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Share your event invitation code to onboard volunteers and register their availability.
                  </p>
                </div>
              ) : (
                eligibleCandidates.map((cand) => (
                  <div
                    key={cand.id}
                    className="p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 hover:shadow-xs"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      borderColor: 'var(--border-subtle)'
                    }}
                  >
                    {/* Left: Avatar + Details */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={cand.avatar}
                        alt={cand.name}
                        className="w-9 h-9 rounded-full object-cover border"
                        style={{ borderColor: 'var(--border-strong)' }}
                      />
                      <div className="min-w-0">
                        <p
                          className="text-xs font-bold truncate"
                          style={{ color: 'var(--text-heading)' }}
                        >
                          {cand.name}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {cand.hours}
                        </p>
                        {cand.skills.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {cand.skills.slice(0, 2).map(sk => (
                              <span
                                key={sk}
                                className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full"
                                style={{
                                  backgroundColor: 'var(--lilac-subtle)',
                                  color: 'var(--lilac-text)'
                                }}
                              >
                                {sk}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Quick Assign Button */}
                    {understaffedShift && (
                      <button
                        onClick={() => handleQuickAssign(cand.id)}
                        className="w-7 h-7 rounded-full border flex items-center justify-center text-slate-600 hover:text-slate-950 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shadow-2xs shrink-0"
                        style={{
                          borderColor: 'var(--border-subtle)',
                          backgroundColor: 'var(--bg-surface)'
                        }}
                        title={`Assign ${cand.name} to ${understaffedShift.title}`}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Lime Action Button: "Review replacements ↗" */}
            <button
              onClick={handleReviewReplacements}
              id="review-replacements-button"
              className="w-full py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 shadow-sm hover:opacity-90 active:scale-[0.99] transition-all"
              style={{
                backgroundColor: 'var(--action-lime)',
                color: 'var(--action-lime-text)'
              }}
            >
              <span>Review replacements</span>
              <span className="text-xs font-bold">↗</span>
            </button>
          </div>

          {/* Bottom Section: Real "On the ground" Activity Feed */}
          <div className="pt-5 mt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <Link
              to="/reports"
              className="group flex items-center justify-between mb-3 text-xs font-bold"
              style={{ color: 'var(--text-heading)' }}
            >
              <span>On the ground</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            <div className="space-y-3">
              {attendance && attendance.length > 0 ? (
                attendance.slice(0, 2).map((item, idx) => (
                  <div key={item.id || idx} className="flex items-start gap-2.5 text-xs">
                    <img
                      src={item.volunteerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover shrink-0 mt-0.5 border"
                      style={{ borderColor: 'var(--border-strong)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: 'var(--emerald-success)' }}
                        />
                        <span className="text-[10px] text-slate-400">
                          {new Date(item.checkInTime || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium leading-tight mt-0.5 truncate" style={{ color: 'var(--text-heading)' }}>
                        {item.volunteerName} checked in at {item.zoneName || 'Assigned Zone'}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-slate-400 italic">
                  No attendance activity recorded yet.
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Bottom Contrasting Strip: Scheduled Upcoming Shifts */}
      <section
        className="rounded-3xl border p-5 sm:p-6 shadow-md transition-colors"
        style={{
          backgroundColor: 'var(--bg-strip)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        {/* Strip Header */}
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <h3
              className="font-editorial text-2xl sm:text-3xl font-bold tracking-tight"
              style={{ color: 'var(--text-heading)' }}
            >
              Upcoming shifts
            </h3>
            <span className="text-xl sm:text-2xl text-slate-400 font-editorial">/</span>
            <span className="text-sm sm:text-base font-medium text-slate-500">
              Operations Schedule
            </span>
          </div>

          <Link
            to="/shifts"
            id="open-planner-button"
            className="px-4 py-1.5 rounded-full border text-xs font-bold flex items-center gap-1.5 transition-all hover:bg-slate-100 dark:hover:bg-slate-800 shadow-2xs"
            style={{
              borderColor: 'var(--border-strong)',
              color: 'var(--text-heading)'
            }}
          >
            <span>Open planner</span>
            <span className="text-xs">↗</span>
          </Link>
        </div>

        {/* Real Zone / Shift Rows */}
        <div className="divide-y pt-1" style={{ borderColor: 'var(--border-subtle)' }}>
          {shifts.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No shifts scheduled yet. Open the Shift Planner to create shifts.
            </div>
          ) : (
            shifts.slice(0, 4).map((shift) => {
              const zone = zones.find(z => z.id === shift.zoneId);
              const isUnderstaffed = (shift.assignedCount || 0) < (shift.requiredHeadcount || 1);

              return (
                <div
                  key={shift.id}
                  onClick={() => {
                    if (zone) setSelectedZone(zone);
                  }}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer group hover:opacity-90"
                >
                  {/* Zone Name + Headcount */}
                  <div className="flex items-center gap-3 w-64 shrink-0">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${isUnderstaffed ? 'bg-amber-500' : 'bg-[#C4F03A]'}`}
                    />
                    <span className="font-bold text-sm truncate" style={{ color: 'var(--text-heading)' }}>
                      {zone?.name || shift.title}
                    </span>
                    <span className="text-xs font-bold tabular-nums text-slate-500 ml-auto md:ml-4">
                      {shift.assignedCount || 0} of {shift.requiredHeadcount}
                    </span>
                  </div>

                  {/* Role & Time Info */}
                  <div className="flex-1 min-w-0 md:px-4">
                    <p className="text-xs font-medium text-slate-500 truncate">
                      <strong className="text-slate-700 dark:text-slate-300">{shift.roleName}</strong> ·{' '}
                      {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —{' '}
                      {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0 hidden md:block" />
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Contextual Zone Detail Drawer */}
      {selectedZone && (
        <ZoneDetailDrawer
          zone={selectedZone}
          shifts={shifts}
          issues={issues}
          onClose={() => setSelectedZone(null)}
          onOpenCandidateMatch={(shift) => setMatchShift(shift)}
          onReportIssue={(zoneId) => setReportIssueZone(zoneId)}
          onOpenHandover={(zoneId) => setHandoverZone(zoneId)}
        />
      )}

      {/* Candidate Match Modal */}
      {matchShift && (
        <CandidateMatchModal
          shift={matchShift}
          onClose={() => setMatchShift(null)}
          onSuccess={loadData}
          onRequestReassignPreview={(payload) => {
            setReassignData(payload);
            setMatchShift(null);
          }}
        />
      )}

      {/* Replacement Preview Modal */}
      {reassignData && (
        <ReplacementPreviewModal
          data={reassignData}
          onClose={() => setReassignData(null)}
          onSuccess={loadData}
        />
      )}

      {/* Report Issue Modal */}
      {reportIssueZone && (
        <ReportIssueModal
          initialZoneId={reportIssueZone}
          onClose={() => setReportIssueZone(null)}
          onSuccess={loadData}
        />
      )}

      {/* Shift Handover Modal */}
      {handoverZone && (
        <ShiftHandoverModal
          zoneId={handoverZone}
          onClose={() => setHandoverZone(null)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
