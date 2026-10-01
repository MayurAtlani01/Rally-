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
  Minus,
  X,
  ExternalLink,
  ShieldAlert,
  ArrowUpRight,
  Calendar,
  Layers,
  Hexagon,
  MessageSquare,
  Utensils,
  MapPin
} from 'lucide-react';
import ZoneDetailDrawer from '../components/map/ZoneDetailDrawer.jsx';
import CandidateMatchModal from '../components/shifts/CandidateMatchModal.jsx';
import ReplacementPreviewModal from '../components/shifts/ReplacementPreviewModal.jsx';
import ReportIssueModal from '../components/issues/ReportIssueModal.jsx';
import ShiftHandoverModal from '../components/shifts/ShiftHandoverModal.jsx';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

// Sample preview data matching Image 3 precisely
const SAMPLE_PREVIEW_DATA = {
  stats: {
    assigned: 24,
    checkedIn: 20,
    openPositions: 4
  },
  pins: [
    {
      id: 'pin-main-stage',
      name: 'Main stage',
      ratio: '8/8',
      status: 'full', // 'full' or 'needs_volunteers'
      x: 32, // percentage on map
      y: 28,
      zoneId: 'z-main'
    },
    {
      id: 'pin-food-court',
      name: 'Food court',
      ratio: '8/10',
      status: 'full',
      x: 62,
      y: 29,
      zoneId: 'z-food'
    },
    {
      id: 'pin-registration',
      name: 'Registration',
      ratio: '4/6',
      status: 'needs_volunteers',
      x: 47,
      y: 45,
      zoneId: 'z-reg'
    },
    {
      id: 'pin-medical',
      name: 'Medical',
      ratio: '4/4',
      status: 'full',
      x: 72,
      y: 54,
      zoneId: 'z-med'
    }
  ],
  upcomingShifts: [
    {
      id: 'shift-1',
      time: '12:00 – 14:00',
      name: 'Registration desk',
      count: '4/6',
      dotColor: '#a855f7' // purple
    },
    {
      id: 'shift-2',
      time: '14:00 – 16:00',
      name: 'Food court',
      count: '8/10',
      dotColor: '#eab308' // yellow
    }
  ],
  latestUpdates: [
    {
      id: 'upd-1',
      time: '11:32 AM',
      text: 'Medical team fully staffed for afternoon shift.',
      dotColor: '#a855f7'
    },
    {
      id: 'upd-2',
      time: '10:15 AM',
      text: '2 new volunteers assigned to Registration.',
      dotColor: '#eab308'
    },
    {
      id: 'upd-3',
      time: '09:41 AM',
      text: 'Food court is 2 volunteers short for next shift.',
      dotColor: '#a855f7'
    }
  ],
  needsAttention: [
    {
      id: 'attn-1',
      title: 'Registration',
      openCount: 2,
      icon: Users,
      shiftTitle: 'Registration desk'
    },
    {
      id: 'attn-2',
      title: 'Food court',
      openCount: 2,
      icon: Utensils,
      shiftTitle: 'Food court staff'
    }
  ]
};

export default function LiveOverviewPage() {
  const { currentEvent, showToast, isSamplePreview } = useAuth();
  const [zones, setZones] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [issues, setIssues] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [volunteers, setVolunteers] = useState([]);

  // Map Controls State
  const [activeTab, setActiveTab] = useState('map'); // 'map' | 'zone_list'
  const [shiftMode, setShiftMode] = useState('now'); // 'now' | 'next'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedZone, setSelectedZone] = useState(null);

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

  // Determine if we should show sample festival data or real data
  const useSample = isSamplePreview || zones.length === 0;

  // Real or Sample metrics
  const totalAssigned = useMemo(() => {
    if (useSample) return SAMPLE_PREVIEW_DATA.stats.assigned;
    return shifts.reduce((acc, s) => acc + (Number(s.assignedCount) || 0), 0);
  }, [shifts, useSample]);

  const totalCheckedIn = useMemo(() => {
    if (useSample) return SAMPLE_PREVIEW_DATA.stats.checkedIn;
    return zones.reduce((acc, z) => acc + (Number(z.checkedInHeadcount) || 0), 0);
  }, [zones, useSample]);

  const openPositionsCount = useMemo(() => {
    if (useSample) return SAMPLE_PREVIEW_DATA.stats.openPositions;
    return shifts.reduce((acc, s) => {
      const diff = (Number(s.requiredHeadcount) || 0) - (Number(s.assignedCount) || 0);
      return acc + Math.max(0, diff);
    }, 0);
  }, [shifts, useSample]);

  // First understaffed shift for candidate matching
  const understaffedShift = useMemo(() => {
    return shifts.find((s) => (s.assignedCount || 0) < (s.requiredHeadcount || 0)) || shifts[0] || null;
  }, [shifts]);

  const handleOpenFindVolunteers = (targetShift) => {
    if (targetShift) {
      setMatchShift(targetShift);
    } else if (understaffedShift) {
      setMatchShift(understaffedShift);
    } else if (shifts.length > 0) {
      setMatchShift(shifts[0]);
    } else {
      // Fallback mock shift for immediate matching demonstration
      setMatchShift({
        id: 'shift-registration-desk',
        title: 'Registration desk',
        roleName: 'Guest Support',
        requiredHeadcount: 6,
        assignedCount: 4,
        startTime: new Date().toISOString(),
        endTime: new Date(Date.now() + 7200000).toISOString()
      });
    }
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 2.0));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 1.0));

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1720px] mx-auto space-y-6 select-none">
      {/* 1. Hero Section: Large Typography Heading + 3 Metric Stats */}
      <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2">
        <div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black italic tracking-tight text-white uppercase leading-[0.95]">
            YOUR EVENT. IN SYNC.
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-2">
            A shared view of your people, shifts and venue.
          </p>
        </div>

        {/* 3 Metric Stats with colored indicator bars */}
        <div className="flex items-center gap-6 sm:gap-10">
          {/* Stat 1: Assigned */}
          <div className="flex flex-col">
            <span className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
              {totalAssigned}
            </span>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-slate-400">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Assigned</span>
            </div>
          </div>

          {/* Stat 2: Checked in */}
          <div className="flex flex-col">
            <span className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
              {totalCheckedIn}
            </span>
            <div className="h-1 w-full rounded-full bg-[#C4F03A] mt-2 mb-1" />
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#C4F03A]" />
              <span>Checked in</span>
            </div>
          </div>

          {/* Stat 3: Open positions */}
          <div className="flex flex-col">
            <span className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">
              {openPositionsCount}
            </span>
            <div className="h-1 w-full rounded-full bg-pink-500 mt-2 mb-1" />
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
              <AlertTriangle className="w-3.5 h-3.5 text-pink-400" />
              <span>Open positions</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Main Two-Column Layout (Left 8 cols, Right 4 cols) */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Wide) */}
        <div className="lg:col-span-8 xl:col-span-8 flex flex-col gap-6">
          {/* Card: Venue Coverage (Isometric Map) */}
          <div
            className="rounded-3xl border p-5 flex flex-col shadow-xl"
            style={{
              backgroundColor: '#120b22',
              borderColor: 'rgba(255, 255, 255, 0.08)'
            }}
          >
            {/* Card Header with tabs */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Hexagon className="w-5 h-5 text-purple-400 fill-purple-400/20" />
                  <h2 className="font-bold text-sm text-white">Venue coverage</h2>
                </div>

                {/* Tabs: [Map] [Zone list] */}
                <div className="flex items-center bg-[#1d1233] p-1 rounded-xl border border-white/5">
                  <button
                    onClick={() => setActiveTab('map')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'map'
                        ? 'bg-[#7c3aed] text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Map
                  </button>
                  <button
                    onClick={() => setActiveTab('zone_list')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'zone_list'
                        ? 'bg-[#7c3aed] text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Zone list
                  </button>
                </div>
              </div>

              {/* Time Toggle: [Now] [Next shift] */}
              <div className="flex items-center bg-[#1d1233] p-1 rounded-xl border border-white/5">
                <button
                  onClick={() => setShiftMode('now')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    shiftMode === 'now'
                      ? 'bg-[#C4F03A] text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Now
                </button>
                <button
                  onClick={() => setShiftMode('next')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    shiftMode === 'next'
                      ? 'bg-[#C4F03A] text-black shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Next shift
                </button>
              </div>
            </div>

            {/* Map Canvas / Zone List View */}
            {activeTab === 'map' ? (
              <div className="relative w-full aspect-[16/9] rounded-2xl overflow-hidden border border-white/10 bg-slate-950">
                {/* 3D Isometric Festival Venue Map Image */}
                <div
                  className="w-full h-full transition-transform duration-300 ease-out origin-center"
                  style={{
                    transform: `scale(${zoomLevel})`
                  }}
                >
                  <img
                    src="/venue-map.jpg"
                    alt="Festival Venue Map"
                    className="w-full h-full object-cover select-none pointer-events-none"
                    onError={(e) => {
                      // Fallback SVG if image not yet cached
                      e.target.style.display = 'none';
                    }}
                  />

                  {/* Interactive Zone Pins matching Image 3 */}
                  {SAMPLE_PREVIEW_DATA.pins.map((pin) => (
                    <div
                      key={pin.id}
                      style={{ top: `${pin.y}%`, left: `${pin.x}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center group cursor-pointer"
                      onClick={() => {
                        const realZone = zones.find(z => z.name.toLowerCase().includes(pin.name.toLowerCase()));
                        if (realZone) setSelectedZone(realZone);
                        else setSelectedZone({ id: pin.zoneId, name: pin.name, requiredHeadcount: 8, assignedHeadcount: 6 });
                      }}
                    >
                      {/* Teardrop Pin Marker */}
                      <div className="relative flex items-center justify-center filter drop-shadow-lg transition-transform group-hover:scale-110">
                        <div
                          className="w-6 h-6 rounded-full rounded-br-none -rotate-45 flex items-center justify-center shadow-md border border-black/20"
                          style={{
                            backgroundColor: pin.status === 'needs_volunteers' ? '#eab308' : '#eab308'
                          }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full bg-slate-900 rotate-45" />
                        </div>
                      </div>

                      {/* Tag pill with Name and Staff Ratio */}
                      <div className="mt-1 flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-slate-950/90 border border-white/20 text-[10px] font-bold text-white shadow-xl backdrop-blur-xs whitespace-nowrap group-hover:border-lime-400">
                        <span>{pin.name}</span>
                        <span
                          className={`font-black ${
                            pin.status === 'needs_volunteers' ? 'text-pink-400' : 'text-[#C4F03A]'
                          }`}
                        >
                          {pin.ratio}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Top-Right Zoom Controls */}
                <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-20">
                  <button
                    onClick={handleZoomIn}
                    className="w-8 h-8 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-white/20 flex items-center justify-center text-white transition-all shadow-md active:scale-95 cursor-pointer"
                    title="Zoom in"
                    aria-label="Zoom in"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="w-8 h-8 rounded-lg bg-slate-950/80 hover:bg-slate-900 border border-white/20 flex items-center justify-center text-white transition-all shadow-md active:scale-95 cursor-pointer"
                    title="Zoom out"
                    aria-label="Zoom out"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom Legend */}
                <div className="absolute bottom-3 left-3 flex items-center gap-4 px-3 py-1.5 rounded-full bg-slate-950/80 border border-white/10 text-[11px] font-bold text-white backdrop-blur-xs z-20">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
                    <span>Fully staffed</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                    <span>Needs volunteers</span>
                  </div>
                </div>
              </div>
            ) : (
              /* Zone list view */
              <div className="divide-y divide-white/5 py-2">
                {SAMPLE_PREVIEW_DATA.pins.map((pin) => (
                  <div key={pin.id} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#C4F03A]" />
                      <span className="font-bold text-sm text-white">{pin.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400 font-mono font-bold">{pin.ratio} Staffed</span>
                      <button
                        onClick={() => setSelectedZone({ id: pin.zoneId, name: pin.name, requiredHeadcount: 8, assignedHeadcount: 6 })}
                        className="text-xs text-purple-400 hover:text-purple-300 font-bold"
                      >
                        Inspect
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Row of 2 Cards: Upcoming shifts & Latest updates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card: Upcoming shifts */}
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
                    <h3 className="font-bold text-sm text-white">Upcoming shifts</h3>
                  </div>
                  <Link
                    to="/shifts"
                    className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <span>View all</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="divide-y divide-white/5 pt-2">
                  {SAMPLE_PREVIEW_DATA.upcomingShifts.map((shift) => (
                    <div key={shift.id} className="py-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: shift.dotColor }}
                        />
                        <span className="text-xs font-bold text-slate-300 whitespace-nowrap">
                          {shift.time}
                        </span>
                        <span className="text-xs text-white font-medium truncate ml-1">
                          {shift.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-bold text-pink-400 shrink-0">
                        <Users className="w-3.5 h-3.5" />
                        <span>{shift.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Card: Latest updates */}
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
                    <h3 className="font-bold text-sm text-white">Latest updates</h3>
                  </div>
                  <Link
                    to="/announcements"
                    className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    <span>View all</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                <div className="divide-y divide-white/5 pt-2">
                  {SAMPLE_PREVIEW_DATA.latestUpdates.map((item) => (
                    <div key={item.id} className="py-2.5 flex items-start gap-2.5 text-xs">
                      <span
                        className="w-2 h-2 rounded-full shrink-0 mt-1"
                        style={{ backgroundColor: item.dotColor }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">
                            {item.time}
                          </span>
                          <p className="text-slate-300 leading-snug truncate">
                            {item.text}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (Narrow): Needs attention */}
        <div className="lg:col-span-4 xl:col-span-4 flex flex-col gap-6">
          <div
            className="rounded-3xl border p-5 sm:p-6 flex flex-col justify-between shadow-xl"
            style={{
              backgroundColor: '#120b22',
              borderColor: 'rgba(255, 255, 255, 0.08)'
            }}
          >
            <div>
              {/* Card Header */}
              <div className="flex items-center gap-2 pb-5 border-b border-white/5">
                <AlertTriangle className="w-5 h-5 text-purple-400" />
                <h3 className="font-bold text-sm text-white">Needs attention</h3>
              </div>

              {/* Items List */}
              <div className="space-y-3 pt-4">
                {SAMPLE_PREVIEW_DATA.needsAttention.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleOpenFindVolunteers(understaffedShift)}
                      className="p-3.5 rounded-2xl border border-white/5 bg-[#1a1130] hover:bg-[#221640] transition-all flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-900/50 border border-purple-500/20 flex items-center justify-center text-purple-300">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white group-hover:text-purple-200 transition-colors">
                            {item.title}
                          </p>
                          <p className="text-[11px] font-bold text-pink-400 mt-0.5">
                            {item.openCount} open positions
                          </p>
                        </div>
                      </div>

                      <ChevronRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Button: Find eligible volunteers */}
            <div className="pt-6 mt-4">
              <button
                onClick={() => handleOpenFindVolunteers(understaffedShift)}
                id="find-eligible-volunteers-button"
                className="w-full py-3.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                style={{
                  backgroundColor: 'var(--action-lime)',
                  color: 'var(--action-lime-text)'
                }}
              >
                <span>Find eligible volunteers</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>
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
