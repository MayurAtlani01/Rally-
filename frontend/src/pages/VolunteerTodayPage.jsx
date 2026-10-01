import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  MapPin,
  UserCheck,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Calendar,
  Sparkles,
  QrCode,
  ArrowRight,
  ShieldAlert,
  Users,
  Edit3,
  X,
  Plus,
  Minus,
  MessageSquare,
  Megaphone
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ReportIssueModal from '../components/issues/ReportIssueModal.jsx';

export default function VolunteerTodayPage() {
  const { currentUser, currentEvent, showToast, isSamplePreview } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [volunteerProfile, setVolunteerProfile] = useState(null);

  // Modals & Interactive States
  const [showShiftDetailsModal, setShowShiftDetailsModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1.15);
  const [submittingAction, setSubmittingAction] = useState(false);

  // Volunteer Onboarding / Skills State
  const [skillsInput, setSkillsInput] = useState('Event operations, Guest support, Crowd management');
  const [availStart, setAvailStart] = useState('');
  const [availEnd, setAvailEnd] = useState('');

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
        if (myProf.skills && myProf.skills.length > 0) {
          setSkillsInput(myProf.skills.join(', '));
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
      a => a.volunteerId === currentUser?.id && a.status !== 'canceled' && a.status !== 'absent'
    );
    if (userAsgn) {
      userAssignments.push({
        assignment: userAsgn,
        shift,
        zone: shift.zone
      });
    }
  }

  const nextShiftItem = userAssignments[0] || null;
  const currentAttendance = attendance.find(
    a => a.assignmentId === nextShiftItem?.assignment?.id && !a.checkOutTime
  );
  const isCheckedIn = !!currentAttendance;

  const handleCheckIn = async () => {
    if (!nextShiftItem && !isSamplePreview) return;
    setSubmittingAction(true);
    try {
      if (nextShiftItem) {
        await api.checkIn(currentEvent.id, {
          assignmentId: nextShiftItem.assignment.id,
          method: 'self'
        });
      }
      showToast('Checked in successfully! Have a great shift.', 'success');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleZoomIn = () => setZoomLevel(z => Math.min(z + 0.25, 2.0));
  const handleZoomOut = () => setZoomLevel(z => Math.max(z - 0.25, 1.0));

  // Registered skills list for display matching Image 3
  const skillsList = [
    { name: 'Event operations', active: true },
    { name: 'Guest support', active: true },
    { name: 'Crowd management', active: true },
    { name: 'First aid (basic)', active: false }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1720px] mx-auto space-y-6 select-none">
      {/* 1. Hero Section: YOU MAKE IT HAPPEN. */}
      <section className="pb-2">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black italic tracking-tight text-white uppercase leading-[0.95]">
          YOU MAKE IT HAPPEN.
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-medium mt-2">
          Your shifts, your team, your next move.
        </p>
      </section>

      {/* 2. Top Row (Two Cards): Next Shift & Assigned Zone Map */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Card: YOUR NEXT SHIFT */}
        <div
          className="lg:col-span-5 rounded-3xl border p-6 flex flex-col justify-between shadow-xl"
          style={{
            backgroundColor: '#120b22',
            borderColor: 'rgba(255, 255, 255, 0.08)'
          }}
        >
          <div className="space-y-4">
            {/* Eyebrow Header */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-400" />
              <span className="text-[11px] font-bold uppercase tracking-widest text-purple-400">
                YOUR NEXT SHIFT
              </span>
            </div>

            {/* Shift Title */}
            <div>
              <h2 className="text-3xl font-black text-white tracking-tight">
                {nextShiftItem?.shift?.title || 'Registration desk'}
              </h2>
            </div>

            {/* Shift Details (Clock, Location Pin, Coordinator) */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center gap-3 text-slate-300 text-xs font-semibold">
                <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  {nextShiftItem ? (
                    `${new Date(nextShiftItem.shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – ${new Date(nextShiftItem.shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  ) : (
                    '12:00 – 14:00'
                  )}
                </span>
              </div>

              <div className="flex items-center gap-3 text-slate-300 text-xs font-semibold">
                <MapPin className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  {nextShiftItem?.zone?.name || 'East entrance • Zone B'}
                </span>
              </div>

              <div className="flex items-center gap-3 text-slate-300 text-xs font-semibold">
                <Users className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  Coordinator: Priya
                </span>
              </div>
            </div>

            {/* Check-in status pill */}
            <div className="pt-2">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-purple-300 text-xs font-bold">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span>{isCheckedIn ? 'Checked in • Active' : 'Check-in opens at 11:45'}</span>
              </div>
            </div>
          </div>

          {/* Action Button: View shift details -> */}
          <div className="pt-6 mt-4">
            <button
              onClick={() => setShowShiftDetailsModal(true)}
              id="view-shift-details-button"
              className="w-full py-3.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer"
              style={{
                backgroundColor: 'var(--action-lime)',
                color: 'var(--action-lime-text)'
              }}
            >
              <span>View shift details</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Right Card: Your assigned zone (Focused Isometric Map) */}
        <div
          className="lg:col-span-7 rounded-3xl border p-5 flex flex-col justify-between shadow-xl relative overflow-hidden"
          style={{
            backgroundColor: '#120b22',
            borderColor: 'rgba(255, 255, 255, 0.08)'
          }}
        >
          {/* Card Header */}
          <div className="flex items-center justify-between pb-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-purple-400" />
              <h3 className="font-bold text-sm text-white">Your assigned zone</h3>
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleZoomIn}
                className="w-7 h-7 rounded-lg bg-slate-900 border border-white/20 flex items-center justify-center text-white hover:bg-slate-800 transition-colors"
                title="Zoom in"
                aria-label="Zoom in"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleZoomOut}
                className="w-7 h-7 rounded-lg bg-slate-900 border border-white/20 flex items-center justify-center text-white hover:bg-slate-800 transition-colors"
                title="Zoom out"
                aria-label="Zoom out"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Isometric Map Focused on Registration Tent */}
          <div className="relative w-full aspect-[16/9] sm:aspect-[2/1] rounded-2xl overflow-hidden border border-white/10 bg-slate-950">
            <div
              className="w-full h-full transition-transform duration-300 ease-out origin-center"
              style={{
                transform: `scale(${zoomLevel}) translate(-3%, -2%)`
              }}
            >
              <img
                src="/venue-map.jpg"
                alt="Assigned Zone Map"
                className="w-full h-full object-cover select-none pointer-events-none"
              />

              {/* Yellow Dashed Boundary Box around Registration Tent */}
              <div
                className="absolute border-2 border-dashed border-[#eab308] bg-[#eab308]/15 rounded-xl pointer-events-none shadow-2xl animate-pulse"
                style={{
                  top: '38%',
                  left: '36%',
                  width: '28%',
                  height: '28%',
                  transform: 'rotate(-5deg)'
                }}
              />

              {/* Zone Pin Marker */}
              <div
                className="absolute z-10 flex flex-col items-center pointer-events-none"
                style={{ top: '48%', left: '49%' }}
              >
                <div className="relative flex items-center justify-center filter drop-shadow-xl">
                  <div className="w-6 h-6 rounded-full rounded-br-none -rotate-45 bg-[#eab308] flex items-center justify-center shadow-md">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-900 rotate-45" />
                  </div>
                </div>

                <div className="mt-1 flex flex-col items-center px-2.5 py-1 rounded-md bg-slate-950/95 border border-yellow-400/40 text-[10px] text-white shadow-xl backdrop-blur-xs whitespace-nowrap">
                  <span className="font-bold text-white">Registration desk</span>
                  <span className="text-[9px] font-bold text-yellow-400">Your assigned zone</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Bottom Row (Three Cards side by side) */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Skills & availability */}
        <div
          className="rounded-3xl border p-5 flex flex-col justify-between shadow-xl"
          style={{
            backgroundColor: '#120b22',
            borderColor: 'rgba(255, 255, 255, 0.08)'
          }}
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-white">Skills & availability</h3>
              </div>
              <button
                onClick={() => setShowOnboardingModal(true)}
                className="text-xs font-bold text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-white/10 hover:bg-white/5 transition-colors cursor-pointer"
              >
                Edit availability
              </button>
            </div>

            <div className="space-y-3 pt-4">
              {skillsList.map((skill) => (
                <div key={skill.name} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-purple-900/40 border border-purple-500/20 flex items-center justify-center text-purple-300">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-medium text-slate-200">
                      {skill.name}
                    </span>
                  </div>

                  {skill.active ? (
                    <CheckCircle2 className="w-5 h-5 text-[#C4F03A] fill-[#C4F03A]/20" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Today's schedule */}
        <div
          className="rounded-3xl border p-5 flex flex-col justify-between shadow-xl"
          style={{
            backgroundColor: '#120b22',
            borderColor: 'rgba(255, 255, 255, 0.08)'
          }}
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-white">Today's schedule</h3>
              </div>
              <Link
                to="/shifts"
                className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Vertical timeline matching Image 3 */}
            <div className="relative pl-6 pt-4 space-y-4">
              {/* Vertical connector line */}
              <div className="absolute left-[7px] top-6 bottom-4 w-0.5 bg-purple-900/40" />

              {/* Step 1: 11:45 Check-in opens */}
              <div className="relative flex items-center justify-between text-xs">
                <div className="absolute -left-6 w-3.5 h-3.5 rounded-full border-2 border-purple-400 bg-[#120b22]" />
                <span className="text-slate-400 font-bold">11:45</span>
                <span className="text-slate-300">Check-in opens</span>
              </div>

              {/* Step 2: 12:00 – 14:00 Registration desk (Active highlighted yellow/lime) */}
              <div className="relative flex items-center justify-between text-xs font-bold">
                <div className="absolute -left-6 w-3.5 h-3.5 rounded-full bg-[#eab308] ring-4 ring-yellow-500/20" />
                <span className="text-[#eab308]">12:00 – 14:00</span>
                <span className="text-white">Registration desk</span>
              </div>

              {/* Step 3: 14:30 – 16:30 Food court */}
              <div className="relative flex items-center justify-between text-xs">
                <div className="absolute -left-6 w-3.5 h-3.5 rounded-full bg-purple-500" />
                <span className="text-slate-400">14:30 – 16:30</span>
                <span className="text-slate-300">Food court</span>
              </div>

              {/* Step 4: 17:00 – 19:00 Main stage */}
              <div className="relative flex items-center justify-between text-xs">
                <div className="absolute -left-6 w-3.5 h-3.5 rounded-full bg-purple-500" />
                <span className="text-slate-400">17:00 – 19:00</span>
                <span className="text-slate-300">Main stage</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Team updates */}
        <div
          className="rounded-3xl border p-5 flex flex-col justify-between shadow-xl"
          style={{
            backgroundColor: '#120b22',
            borderColor: 'rgba(255, 255, 255, 0.08)'
          }}
        >
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-sm text-white">Team updates</h3>
              </div>
              <Link
                to="/announcements"
                className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {/* Announcement Card matching Image 3 */}
            <div className="mt-4 p-4 rounded-2xl bg-[#1b1233] border border-white/5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-900/60 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-white leading-snug">
                    Meet at the volunteer hub before your shift.
                  </h4>
                  <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">
                    10:12 AM
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                Quick team huddle at the volunteer hub (near Registration) 15 minutes before your shift. We'll cover key info and answer any questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Shift Details Modal */}
      {showShiftDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-lg rounded-3xl border p-6 space-y-5 shadow-2xl"
            style={{
              backgroundColor: '#120b22',
              borderColor: 'rgba(255, 255, 255, 0.12)'
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-lg text-white">Shift Details</h3>
              </div>
              <button
                onClick={() => setShowShiftDetailsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Position</span>
                <h4 className="text-xl font-black text-white">Registration desk</h4>
                <p className="text-xs text-slate-400 mt-0.5">Welcome attendees, distribute badges, and check ticketing credentials.</p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Time</span>
                  <span className="text-xs font-bold text-white block mt-0.5">12:00 – 14:00</span>
                </div>
                <div className="p-3 rounded-2xl bg-white/5 border border-white/5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Zone</span>
                  <span className="text-xs font-bold text-white block mt-0.5">East entrance • Zone B</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-purple-300 uppercase font-bold block">Coordinator</span>
                  <span className="text-xs font-bold text-white block mt-0.5">Priya Sharma</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                  On Duty
                </span>
              </div>
            </div>

            {/* Check in / Check out Action */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  handleCheckIn();
                  setShowShiftDetailsModal(false);
                }}
                className="w-full py-3 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all cursor-pointer"
                style={{
                  backgroundColor: 'var(--action-lime)',
                  color: 'var(--action-lime-text)'
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Check In</span>
              </button>

              <button
                onClick={() => {
                  setShowShiftDetailsModal(false);
                  setShowIssueModal(true);
                }}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-rose-400 hover:bg-rose-500/10 border border-rose-500/30 transition-colors cursor-pointer"
              >
                Report Issue / Cannot Attend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Onboarding / Edit Availability Modal */}
      {showOnboardingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl"
            style={{
              backgroundColor: '#120b22',
              borderColor: 'rgba(255, 255, 255, 0.12)'
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="font-bold text-base text-white">Edit Skills & Availability</h3>
              <button
                onClick={() => setShowOnboardingModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Skills (comma separated)
                </label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/15 bg-white/5 text-white text-xs font-semibold focus:outline-none focus:border-purple-400"
                  placeholder="Event operations, Guest support, Crowd management"
                />
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    showToast('Skills and availability updated successfully!', 'success');
                    setShowOnboardingModal(false);
                  }}
                  className="w-full py-3 rounded-xl font-black text-xs shadow-lg hover:opacity-90 transition-all cursor-pointer"
                  style={{
                    backgroundColor: 'var(--action-lime)',
                    color: 'var(--action-lime-text)'
                  }}
                >
                  Save Availability
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Issue Modal */}
      {showIssueModal && (
        <ReportIssueModal
          initialZoneId={null}
          onClose={() => setShowIssueModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
