import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  MapPin,
  UserCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Send,
  Calendar,
  Sparkles,
  QrCode,
  ArrowRight,
  ShieldAlert,
  Award,
  Users,
  Edit3,
  X
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ReportIssueModal from '../components/issues/ReportIssueModal.jsx';

export default function VolunteerTodayPage() {
  const { currentUser, currentEvent, showToast } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [volunteerProfile, setVolunteerProfile] = useState(null);

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Personal emergency / cannot make shift');
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Volunteer Onboarding State
  const [skillsInput, setSkillsInput] = useState('');
  const [availStart, setAvailStart] = useState('');
  const [availEnd, setAvailEnd] = useState('');
  const [rolePreferences, setRolePreferences] = useState('');

  const loadData = useCallback(async () => {
    if (!currentEvent || !currentUser) return;
    try {
      const [sRes, aRes, annRes, vRes] = await Promise.all([
        api.getShifts(currentEvent.id),
        api.getAttendance(currentEvent.id, { volunteerId: currentUser.id }),
        api.getAnnouncements(currentEvent.id),
        api.getVolunteers(currentEvent.id, { query: currentUser.email })
      ]);

      setShifts(sRes.shifts || []);
      setAttendance(aRes.attendance || []);
      setAnnouncements(annRes.announcements || []);

      const myProf = (vRes.volunteers || []).find(v => v.id === currentUser.id);
      if (myProf) {
        setVolunteerProfile(myProf);
        setSkillsInput((myProf.skills || []).join(', '));
        if (myProf.availabilities && myProf.availabilities[0]) {
          setAvailStart(myProf.availabilities[0].start?.slice(0, 16) || '');
          setAvailEnd(myProf.availabilities[0].end?.slice(0, 16) || '');
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [currentEvent, currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Find user's active/upcoming assignments
  const userAssignments = [];
  for (const shift of shifts) {
    const userAsgn = (shift.assignments || []).find(
      a => a.volunteerId === currentUser.id && a.status !== 'canceled' && a.status !== 'absent'
    );
    if (userAsgn) {
      userAssignments.push({
        assignment: userAsgn,
        shift,
        zone: shift.zone
      });
    }
  }

  // Active or Next assignment
  const nextShiftItem = userAssignments[0] || null;
  const currentAttendance = attendance.find(
    a => a.assignmentId === nextShiftItem?.assignment?.id && !a.checkOutTime
  );

  const isCheckedIn = !!currentAttendance;
  const isCompleted = nextShiftItem?.assignment?.status === 'completed';

  // Calculate total attended hours from valid records
  let totalAttendedHours = 0;
  for (const att of attendance) {
    if (att.checkInTime && att.checkOutTime) {
      totalAttendedHours += (new Date(att.checkOutTime) - new Date(att.checkInTime)) / (1000 * 60 * 60);
    }
  }

  const handleCheckIn = async () => {
    if (!nextShiftItem) return;
    setSubmittingAction(true);
    try {
      await api.checkIn(currentEvent.id, {
        assignmentId: nextShiftItem.assignment.id,
        method: 'self'
      });
      showToast('Checked in successfully! Have a great shift.', 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCheckOut = async () => {
    if (!currentAttendance) return;
    setSubmittingAction(true);
    try {
      await api.checkOut(currentEvent.id, {
        attendanceId: currentAttendance.id,
        notes: 'Volunteer self checkout'
      });
      showToast('Checked out successfully. Thank you for your service!', 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCancelShift = async () => {
    if (!nextShiftItem) return;
    setSubmittingAction(true);
    try {
      await api.cancelAssignment(currentEvent.id, nextShiftItem.assignment.id, cancelReason);
      showToast('Shift cancelled. Coordinators have been alerted to backfill the gap.', 'info');
      setShowCancelModal(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  // Save Volunteer Skills & Availability
  const handleSaveOnboarding = async (e) => {
    e.preventDefault();
    setSubmittingAction(true);
    const skills = skillsInput.split(',').map(s => s.trim()).filter(Boolean);
    const availabilities = (availStart && availEnd)
      ? [{ start: new Date(availStart).toISOString(), end: new Date(availEnd).toISOString() }]
      : [];

    try {
      await api.updateVolunteer(currentEvent.id, currentUser.id, {
        skills,
        availabilities,
        bio: rolePreferences
      });
      showToast('Your availability and skills have been saved!', 'success');
      setShowOnboardingModal(false);
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6 pb-24 md:pb-8 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <span
            className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--action-lime)',
              color: 'var(--action-lime-text)'
            }}
          >
            Volunteer Workspace
          </span>
          <h1 className="text-2xl font-black mt-1" style={{ color: 'var(--text-heading)' }}>
            Hello, {currentUser?.fullName?.split(' ')[0] || 'Volunteer'}!
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Your live assignment portal, attendance check-in, and zone updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOnboardingModal(true)}
            className="px-3.5 py-2 rounded-xl border text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-heading)'
            }}
          >
            <Edit3 className="w-3.5 h-3.5 text-[#7054E8]" />
            <span>Update Availability & Skills</span>
          </button>

          <button
            onClick={() => setShowIssueModal(true)}
            className="px-3.5 py-2 rounded-xl border text-xs font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20 shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Report Problem</span>
          </button>
        </div>
      </div>

      {/* Prominent Next Shift Card or Exact Zero-Assignment State */}
      {nextShiftItem ? (
        <div
          className={`p-6 rounded-3xl border shadow-md transition-all ${
            isCheckedIn
              ? 'ring-2 ring-emerald-500/50'
              : ''
          }`}
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: isCheckedIn ? 'var(--emerald-success)' : 'var(--border-subtle)'
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded"
                  style={{
                    backgroundColor: 'var(--lilac-subtle)',
                    color: 'var(--lilac-accent)'
                  }}
                >
                  {nextShiftItem.shift.roleName}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase flex items-center gap-1 ${
                  isCheckedIn
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                    : isCompleted
                    ? 'bg-slate-200 text-slate-700'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                }`}>
                  {isCheckedIn && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                  {isCheckedIn ? 'Active On Shift' : isCompleted ? 'Completed' : 'Upcoming Shift'}
                </span>
              </div>

              <h2 className="text-xl font-editorial font-bold mt-2" style={{ color: 'var(--text-heading)' }}>
                {nextShiftItem.shift.title}
              </h2>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Zone</span>
              <span className="text-sm font-extrabold text-[#7054E8] block mt-0.5">
                {nextShiftItem.zone?.name || 'Assigned Zone'}
              </span>
            </div>
          </div>

          {/* Time & Attendance Breakdown: Required · Assigned · Checked In */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
            <div className="p-3 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Shift Window</span>
              <span className="font-bold text-xs mt-0.5 block" style={{ color: 'var(--text-heading)' }}>
                {new Date(nextShiftItem.shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —{' '}
                {new Date(nextShiftItem.shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            <div className="p-3 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Shift Staffing</span>
              <span className="font-bold text-xs mt-0.5 block" style={{ color: 'var(--text-heading)' }}>
                {nextShiftItem.shift.requiredHeadcount || 1} required · {nextShiftItem.shift.assignedCount || 1} assigned
              </span>
            </div>

            <div className="p-3 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Your Status</span>
              <span className="font-bold text-xs mt-0.5 block" style={{ color: isCheckedIn ? 'var(--emerald-text)' : 'var(--amber-warning)' }}>
                {isCheckedIn ? 'Checked in' : isCompleted ? 'Completed' : 'Awaiting check-in'}
              </span>
            </div>
          </div>

          {/* Check-In / Check-Out Actions */}
          <div className="pt-4 border-t flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              {!isCheckedIn && !isCompleted ? (
                <button
                  disabled={submittingAction}
                  onClick={handleCheckIn}
                  className="px-5 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--action-lime)',
                    color: 'var(--action-lime-text)'
                  }}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Check In for Shift</span>
                </button>
              ) : isCheckedIn ? (
                <button
                  disabled={submittingAction}
                  onClick={handleCheckOut}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Check Out of Shift</span>
                </button>
              ) : null}

              <button
                onClick={() => setShowIssueModal(true)}
                className="px-4 py-2.5 rounded-xl border text-xs font-bold transition-colors"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-heading)',
                  backgroundColor: 'var(--bg-surface-subtle)'
                }}
              >
                Report Problem
              </button>
            </div>

            {!isCompleted && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="text-xs font-bold text-red-600 hover:underline px-2 py-1"
              >
                Can’t attend
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Exact Required Zero-Assignment State */
        <div
          className="p-8 sm:p-10 text-center rounded-3xl border shadow-sm space-y-4 transition-colors"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-2 border"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--lilac-accent)'
            }}
          >
            <Calendar className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="font-editorial text-2xl sm:text-3xl font-bold" style={{ color: 'var(--text-heading)' }}>
              You have no assigned shifts yet.
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              Your availability has been saved.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowOnboardingModal(true)}
              className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
              style={{
                backgroundColor: 'var(--action-lime)',
                color: 'var(--action-lime-text)'
              }}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Update Availability & Skills</span>
            </button>
          </div>
        </div>
      )}

      {/* Contribution Hours and Announcements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Hours Logged */}
        <div
          className="p-5 rounded-3xl border shadow-xs transition-colors"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Service Record</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="font-editorial text-3xl font-bold" style={{ color: 'var(--text-heading)' }}>
              {totalAttendedHours.toFixed(1)}
            </span>
            <span className="text-xs text-slate-500 font-semibold">hours attended</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            Hours are calculated from verified check-in and checkout timestamps.
          </p>
        </div>

        {/* Saved Skills & Preferences */}
        <div
          className="p-5 rounded-3xl border shadow-xs transition-colors"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Registered Skills</span>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {volunteerProfile?.skills?.length > 0 ? (
              volunteerProfile.skills.map(s => (
                <span
                  key={s}
                  className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--lilac-subtle)',
                    color: 'var(--lilac-text)'
                  }}
                >
                  {s}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400 italic">No skills registered yet</span>
            )}
          </div>
        </div>
      </div>

      {/* Onboarding Availability Modal */}
      {showOnboardingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h3 className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>Volunteer Onboarding</h3>
                <p className="text-[11px] text-slate-500">Submit your skills and availability time slots</p>
              </div>
              <button onClick={() => setShowOnboardingModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveOnboarding} className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">
                  Skills <span className="text-[10px] text-slate-400 font-normal">(Comma-separated, e.g. First Aid, Crowd Control)</span>
                </label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="First Aid, Crowd Control, Stage Support"
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Available From</label>
                  <input
                    type="datetime-local"
                    value={availStart}
                    onChange={(e) => setAvailStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Available Until</label>
                  <input
                    type="datetime-local"
                    value={availEnd}
                    onChange={(e) => setAvailEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Zone or Role Preferences</label>
                <textarea
                  rows={2}
                  value={rolePreferences}
                  onChange={(e) => setRolePreferences(e.target.value)}
                  placeholder="Prefer entrance check-in or medical area..."
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button type="button" onClick={() => setShowOnboardingModal(false)} className="px-4 py-2 rounded-xl border text-xs">Cancel</button>
                <button type="submit" disabled={submittingAction} className="px-5 py-2 rounded-xl text-xs font-bold shadow-xs disabled:opacity-50" style={{ backgroundColor: 'var(--action-lime)', color: 'var(--action-lime-text)' }}>
                  {submittingAction ? 'Saving...' : 'Save Availability'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <h3 className="font-bold text-sm text-red-600">Cancel Shift Assignment</h3>
            <p className="text-xs text-slate-500">
              Coordinators will be notified immediately to review replacements for this staffing gap.
            </p>
            <div>
              <label className="text-xs font-bold block mb-1">Reason for cancellation</label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
              />
            </div>
            <div className="pt-3 flex items-center justify-end gap-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <button type="button" onClick={() => setShowCancelModal(false)} className="px-4 py-2 rounded-xl border text-xs">Keep Shift</button>
              <button type="button" onClick={handleCancelShift} disabled={submittingAction} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs">
                {submittingAction ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Issue Reporting Modal */}
      {showIssueModal && (
        <ReportIssueModal
          initialZoneId={nextShiftItem?.zone?.id || null}
          onClose={() => setShowIssueModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
