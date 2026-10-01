import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Sliders,
  Plus,
  MapPin,
  Calendar,
  Clock,
  Layers,
  Sparkles,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Copy,
  RefreshCw,
  Slash,
  Trash2,
  Edit2,
  X,
  ShieldAlert,
  ChevronRight,
  Info
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import EventSetupModal from '../components/setup/EventSetupModal.jsx';

export default function EventSetupPage() {
  const { currentEvent, showToast, isOrganizer, selectEvent, refreshUserData } = useAuth();
  const { isNight } = useTheme();

  const [zones, setZones] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals / sub-forms
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [showAddShiftModal, setShowAddShiftModal] = useState(false);
  const [activePlacementZone, setActivePlacementZone] = useState(null);

  // New Zone Form
  const [zoneName, setZoneName] = useState('');
  const [zoneCode, setZoneCode] = useState('');
  const [zoneColor, setZoneColor] = useState('#7054E8');
  const [zoneHeadcount, setZoneHeadcount] = useState(2);
  const [zonePosX, setZonePosX] = useState(50);
  const [zonePosY] = useState(50);

  // New Shift Form
  const [shiftZoneId, setShiftZoneId] = useState('');
  const [shiftTitle, setShiftTitle] = useState('');
  const [shiftRoleName, setShiftRoleName] = useState('Volunteer');
  const [shiftStartTime, setShiftStartTime] = useState('');
  const [shiftEndTime, setShiftEndTime] = useState('');
  const [shiftHeadcount, setShiftHeadcount] = useState(3);
  const [shiftRequiredSkills, setShiftRequiredSkills] = useState('');
  const [shiftPreferredSkills, setShiftPreferredSkills] = useState('');

  const imageContainerRef = useRef(null);

  const loadData = useCallback(async () => {
    if (!currentEvent) return;
    try {
      const [zRes, sRes, aRes] = await Promise.all([
        api.getZones(currentEvent.id),
        api.getShifts(currentEvent.id),
        api.getAttendance(currentEvent.id)
      ]);
      setZones(zRes.zones || []);
      setShifts(sRes.shifts || []);
      setAssignments(aRes.attendance || []);
    } catch (err) {
      showToast(err.message || 'Failed to load setup data', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentEvent, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Default shift times based on event dates
  useEffect(() => {
    if (currentEvent && !shiftStartTime) {
      const s = new Date(currentEvent.startDate);
      const e = new Date(s.getTime() + 4 * 3600 * 1000);
      setShiftStartTime(s.toISOString().slice(0, 16));
      setShiftEndTime(e.toISOString().slice(0, 16));
    }
    if (zones.length > 0 && !shiftZoneId) {
      setShiftZoneId(zones[0].id);
    }
  }, [currentEvent, zones, shiftStartTime, shiftZoneId]);

  // Requirement calculation:
  // Calculate requirements from saved shifts. For example, if shifts require 4, 3, and 2 people:
  // 9 required positions and X assigned.
  const totalRequiredPositions = useMemo(() => {
    return shifts.reduce((sum, s) => sum + (Number(s.requiredHeadcount) || 0), 0);
  }, [shifts]);

  const totalAssignedPositions = useMemo(() => {
    return shifts.reduce((sum, s) => sum + (Number(s.assignedCount) || 0), 0);
  }, [shifts]);

  // Incomplete Remaining Setup Steps Checklist
  const setupSteps = useMemo(() => {
    return [
      {
        id: 'essentials',
        title: 'Event Essentials',
        desc: `${currentEvent?.title || 'Event'} at ${currentEvent?.venueName || 'Venue'} (${currentEvent?.timezone || 'UTC'})`,
        isComplete: Boolean(currentEvent?.title && currentEvent?.venueName)
      },
      {
        id: 'layout',
        title: 'Venue Layout',
        desc: currentEvent?.layoutImageUrl ? 'Custom layout diagram uploaded' : 'Optional layout image (clean zone-list active)',
        isComplete: Boolean(currentEvent?.layoutImageUrl),
        isOptional: true
      },
      {
        id: 'zones',
        title: 'Define Zones',
        desc: zones.length > 0 ? `${zones.length} zone${zones.length !== 1 ? 's' : ''} established` : 'Add named zones to organize festival areas',
        isComplete: zones.length > 0
      },
      {
        id: 'shifts',
        title: 'Define Shifts & Headcounts',
        desc: shifts.length > 0 ? `${shifts.length} shift${shifts.length !== 1 ? 's' : ''} configured (${totalRequiredPositions} required positions)` : 'Define shifts, required headcounts, and required skills',
        isComplete: shifts.length > 0
      },
      {
        id: 'invites',
        title: 'Invite Volunteers',
        desc: currentEvent?.inviteCode ? `Invite code: ${currentEvent.inviteCode}` : 'Generate code and share join link',
        isComplete: Boolean(currentEvent?.inviteCode)
      }
    ];
  }, [currentEvent, zones, shifts, totalRequiredPositions]);

  const remainingStepsCount = setupSteps.filter(s => !s.isComplete && !s.isOptional).length;

  // Handle Venue Layout Image Upload
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image size exceeds 5MB limit.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      try {
        const res = await api.updateEvent(currentEvent.id, { layoutImageUrl: dataUrl });
        showToast('Venue layout image uploaded successfully!', 'success');
        selectEvent(res.event);
        await refreshUserData();
      } catch (err) {
        showToast(err.message || 'Failed to save layout image', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = async () => {
    try {
      const res = await api.updateEvent(currentEvent.id, { layoutImageUrl: null });
      showToast('Venue layout image removed. Operating in clean zone-list mode.', 'info');
      selectEvent(res.event);
      await refreshUserData();
    } catch (err) {
      showToast(err.message || 'Failed to remove image', 'error');
    }
  };

  // Place Marker on Layout Image
  const handleImageClick = async (e) => {
    if (!activePlacementZone || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    try {
      await api.updateZone(currentEvent.id, activePlacementZone.id, {
        posX: clampedX,
        posY: clampedY
      });
      showToast(`Marker for "${activePlacementZone.name}" placed at ${clampedX}%, ${clampedY}%`, 'success');
      setActivePlacementZone(null);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update marker', 'error');
    }
  };

  // Create Zone
  const handleCreateZone = async (e) => {
    e.preventDefault();
    if (!zoneName.trim()) {
      showToast('Zone name is required', 'error');
      return;
    }

    try {
      await api.createZone(currentEvent.id, {
        name: zoneName.trim(),
        code: zoneCode.trim() ? zoneCode.trim().toUpperCase() : zoneName.slice(0, 4).toUpperCase(),
        color: zoneColor,
        requiredHeadcount: Number(zoneHeadcount) || 2,
        posX: Number(zonePosX) || 50,
        posY: Number(zonePosY) || 50
      });
      showToast(`Zone "${zoneName}" created successfully!`, 'success');
      setShowAddZoneModal(false);
      setZoneName('');
      setZoneCode('');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to create zone', 'error');
    }
  };

  // Create Shift with Validation
  const handleCreateShift = async (e) => {
    e.preventDefault();
    if (!shiftZoneId || !shiftTitle.trim() || !shiftStartTime || !shiftEndTime) {
      showToast('Zone, title, start time, and end time are required.', 'error');
      return;
    }

    const start = new Date(shiftStartTime);
    const end = new Date(shiftEndTime);
    if (end <= start) {
      showToast('Shift end time must be after start time.', 'error');
      return;
    }

    // Validate against event dates
    const evStart = new Date(currentEvent.startDate);
    const evEnd = new Date(currentEvent.endDate);
    if (start < evStart || end > evEnd) {
      showToast(`Shift must be scheduled within event dates (${evStart.toLocaleDateString()} — ${evEnd.toLocaleDateString()}).`, 'error');
      return;
    }

    const reqSkills = shiftRequiredSkills.split(',').map(s => s.trim()).filter(Boolean);
    const prefSkills = shiftPreferredSkills.split(',').map(s => s.trim()).filter(Boolean);

    try {
      await api.createShift(currentEvent.id, {
        zoneId: shiftZoneId,
        title: shiftTitle.trim(),
        roleName: shiftRoleName.trim() || 'Volunteer',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        requiredHeadcount: Number(shiftHeadcount) || 1,
        requiredSkills: reqSkills,
        preferredSkills: prefSkills
      });
      showToast(`Shift "${shiftTitle}" created successfully!`, 'success');
      setShowAddShiftModal(false);
      setShiftTitle('');
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to create shift', 'error');
    }
  };

  // Invite actions
  const handleCopyInviteLink = () => {
    const url = `${window.location.origin}/?invite=${currentEvent.inviteCode}`;
    navigator.clipboard.writeText(url);
    showToast('Invitation link copied to clipboard!', 'success');
  };

  const handleRegenerateInvite = async () => {
    try {
      const res = await api.regenerateInviteCode(currentEvent.id);
      showToast(`New invitation code generated: ${res.inviteCode}`, 'success');
      selectEvent(res.event);
    } catch (err) {
      showToast(err.message || 'Failed to regenerate code', 'error');
    }
  };

  const handleRevokeInvite = async () => {
    try {
      const res = await api.revokeInviteCode(currentEvent.id);
      showToast('Invitation code revoked.', 'info');
      selectEvent(res.event);
    } catch (err) {
      showToast(err.message || 'Failed to revoke code', 'error');
    }
  };

  // Close Event
  const handleCloseEvent = async () => {
    if (!window.confirm('Are you sure you want to close this event? Unfinished tasks and issues will remain in their recorded status.')) {
      return;
    }
    try {
      const res = await api.closeEvent(currentEvent.id);
      showToast(res.message, 'success');
      selectEvent(res.event);
    } catch (err) {
      showToast(err.message || 'Failed to close event', 'error');
    }
  };

  if (!currentEvent) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        No active event selected.
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 transition-colors">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <span
            className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--lilac-subtle)',
              color: 'var(--lilac-accent)'
            }}
          >
            Organizer Administration
          </span>
          <h1
            className="font-editorial text-3xl sm:text-4xl font-bold tracking-tight mt-1"
            style={{ color: 'var(--text-heading)' }}
          >
            Event Setup & Parameters
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure venue layout, placement markers, zone boundaries, shifts, and invitation links.
          </p>
        </div>

        {isOrganizer && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSetupModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
              style={{
                backgroundColor: 'var(--action-lime)',
                color: 'var(--action-lime-text)'
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Create Another Event</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Remaining Steps Checklist Banner */}
      <div
        className="p-6 rounded-3xl border shadow-sm transition-colors space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: remainingStepsCount > 0 ? 'var(--amber-warning)' : 'var(--border-subtle)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${remainingStepsCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}
              />
              <h2
                className="text-base font-bold"
                style={{ color: 'var(--text-heading)' }}
              >
                {remainingStepsCount > 0
                  ? `Setup Incomplete (${remainingStepsCount} step${remainingStepsCount !== 1 ? 's' : ''} remaining)`
                  : 'Event Setup Complete'}
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {remainingStepsCount > 0
                ? 'Complete remaining items below to make your festival ready for live operations.'
                : 'All foundational steps completed. Shifts are ready for candidate matching.'}
            </p>
          </div>

          {currentEvent.status === 'closed' && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
              Event Closed
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {setupSteps.map((step, idx) => (
            <div
              key={step.id}
              className="p-3.5 rounded-2xl border flex items-start gap-2.5"
              style={{
                backgroundColor: step.isComplete ? 'var(--emerald-subtle)' : 'var(--bg-surface-subtle)',
                borderColor: step.isComplete ? 'var(--border-subtle)' : 'var(--border-strong)'
              }}
            >
              <div className="mt-0.5 shrink-0">
                {step.isComplete ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <span className="w-4 h-4 rounded-full border flex items-center justify-center text-[10px] font-bold text-slate-400">
                    {idx + 1}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold block truncate" style={{ color: 'var(--text-heading)' }}>
                  {step.title}
                </span>
                <span className="text-[10px] text-slate-500 block truncate mt-0.5">
                  {step.desc}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Event Details & Calculated Requirements Card */}
      <div
        className="p-6 rounded-3xl border shadow-sm space-y-5"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Event Name</span>
            <h2 className="text-xl font-editorial font-bold mt-0.5" style={{ color: 'var(--text-heading)' }}>
              {currentEvent.title}
            </h2>
            {currentEvent.description && (
              <p className="text-xs text-slate-500 mt-1 max-w-xl">{currentEvent.description}</p>
            )}
          </div>

          {/* Invitation Link Box */}
          <div className="p-3.5 rounded-2xl border space-y-2 min-w-[280px]" style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Volunteer Invitation</span>
              {currentEvent.inviteCode ? (
                <span className="font-mono text-xs font-extrabold text-[#7054E8] bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded border border-violet-200 dark:border-violet-800">
                  {currentEvent.inviteCode}
                </span>
              ) : (
                <span className="text-xs font-semibold text-red-500">Revoked</span>
              )}
            </div>

            {currentEvent.inviteCode && (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={`${window.location.origin}/?invite=${currentEvent.inviteCode}`}
                  className="flex-1 px-2.5 py-1 text-[11px] font-mono rounded-lg border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 outline-hidden select-all"
                />
                <button
                  onClick={handleCopyInviteLink}
                  title="Copy join link"
                  className="p-1.5 rounded-lg border hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {isOrganizer && (
              <div className="flex items-center justify-between text-[10px] pt-1">
                <button
                  onClick={handleRegenerateInvite}
                  className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-semibold"
                >
                  Regenerate code
                </button>
                {currentEvent.inviteCode && (
                  <button
                    onClick={handleRevokeInvite}
                    className="text-red-500 hover:text-red-700 font-semibold"
                  >
                    Revoke code
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Operational Metrics (Calculated from saved shifts) */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Venue</span>
            <span className="font-bold text-sm mt-0.5 block" style={{ color: 'var(--text-heading)' }}>
              {currentEvent.venueName}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Timezone</span>
            <span className="font-bold text-sm mt-0.5 block" style={{ color: 'var(--text-heading)' }}>
              {currentEvent.timezone || 'UTC'}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Required Positions</span>
            <span className="font-editorial text-2xl font-bold mt-0.5 block" style={{ color: 'var(--text-heading)' }}>
              {totalRequiredPositions}
            </span>
            <span className="text-[10px] text-slate-400">calculated from {shifts.length} shifts</span>
          </div>

          <div className="p-3.5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Positions</span>
            <span className="font-editorial text-2xl font-bold mt-0.5 block" style={{ color: 'var(--emerald-text)' }}>
              {totalAssignedPositions} / {totalRequiredPositions}
            </span>
            <span className="text-[10px] text-slate-400">{totalRequiredPositions - totalAssignedPositions} unfilled slots</span>
          </div>
        </div>
      </div>

      {/* 4. Venue Layout & Marker Placement Area */}
      <div
        className="p-6 rounded-3xl border shadow-sm space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>
              Venue Layout Map & Markers
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload an actual floor plan or map diagram. Click on the layout to place zone markers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <label className="cursor-pointer px-3.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-2xs hover:opacity-90" style={{ borderColor: 'var(--border-strong)', color: 'var(--text-heading)', backgroundColor: 'var(--bg-surface)' }}>
              <Upload className="w-3.5 h-3.5 text-[#7054E8]" />
              <span>{currentEvent.layoutImageUrl ? 'Replace Layout Image' : 'Upload Layout Image'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </label>
            {currentEvent.layoutImageUrl && (
              <button
                onClick={handleRemoveImage}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                Remove
              </button>
            )}
          </div>
        </div>

        {currentEvent.layoutImageUrl ? (
          <div className="space-y-3">
            {activePlacementZone && (
              <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/30 text-xs text-violet-700 dark:text-violet-300 flex items-center justify-between">
                <span>Click anywhere on the layout map below to place marker for: <strong>{activePlacementZone.name}</strong></span>
                <button onClick={() => setActivePlacementZone(null)} className="font-bold underline text-[11px]">Cancel</button>
              </div>
            )}

            <div
              ref={imageContainerRef}
              onClick={handleImageClick}
              className={`relative rounded-2xl overflow-hidden border shadow-inner transition-all select-none ${activePlacementZone ? 'cursor-crosshair ring-2 ring-violet-500' : ''}`}
              style={{
                borderColor: 'var(--border-subtle)',
                aspectRatio: '16 / 9',
                maxHeight: '520px'
              }}
            >
              <img
                src={currentEvent.layoutImageUrl}
                alt="Venue Layout"
                className="w-full h-full object-contain bg-slate-950/20"
                draggable={false}
              />

              {/* Render Zone Pins */}
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  style={{
                    left: `${zone.posX || 50}%`,
                    top: `${zone.posY || 50}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  className="absolute z-10 flex flex-col items-center"
                >
                  <div
                    className="px-2.5 py-1 rounded-full text-[10px] font-black shadow-md flex items-center gap-1.5 border"
                    style={{
                      backgroundColor: zone.color || '#7054E8',
                      color: '#FFFFFF',
                      borderColor: 'rgba(255,255,255,0.4)'
                    }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    <span>{zone.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="p-10 text-center rounded-2xl border border-dashed space-y-3"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              borderColor: 'var(--border-strong)'
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <ImageIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: 'var(--text-heading)' }}>
                Venue Layout Image is Optional
              </p>
              <p className="text-[11px] text-slate-500 mt-1 max-w-md mx-auto">
                Without an uploaded image, RALLY renders a polished zone-list alternative and coverage grid. Upload an architectural map or hand-drawn plan at any time.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 5. Zones Definition Section */}
      <div
        className="p-6 rounded-3xl border shadow-sm space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>
              Zones ({zones.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Physical or functional zones where shifts take place.
            </p>
          </div>

          <button
            onClick={() => setShowAddZoneModal(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-2xs transition-colors"
            style={{
              backgroundColor: 'var(--action-lime)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--action-lime-text)'
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Zone</span>
          </button>
        </div>

        {zones.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}>
            <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold" style={{ color: 'var(--text-heading)' }}>
              Zero zones configured
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Click "Add Zone" to create your first festival zone.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="p-4 rounded-2xl border shadow-2xs flex flex-col justify-between gap-3"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: zone.color }}
                    />
                    <div>
                      <h4 className="text-xs font-bold" style={{ color: 'var(--text-heading)' }}>
                        {zone.name}
                      </h4>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        Code: {zone.code}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-bold px-2 py-0.5 rounded border" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}>
                    {zone.requiredHeadcount} target
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span className="text-slate-400">
                    Pos: {zone.posX || 50}%, {zone.posY || 50}%
                  </span>
                  {currentEvent.layoutImageUrl && (
                    <button
                      onClick={() => setActivePlacementZone(zone)}
                      className="font-bold text-[#7054E8] hover:underline"
                    >
                      Reposition Pin
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 6. Shifts Definition & Headcounts Section */}
      <div
        className="p-6 rounded-3xl border shadow-sm space-y-4"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>
              Configured Shifts ({shifts.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Specific time slots, role expectations, and required headcount.
            </p>
          </div>

          <button
            onClick={() => setShowAddShiftModal(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border shadow-2xs transition-colors"
            style={{
              backgroundColor: 'var(--action-lime)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--action-lime-text)'
            }}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Shift</span>
          </button>
        </div>

        {shifts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}>
            <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold" style={{ color: 'var(--text-heading)' }}>
              Zero shifts configured
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Click "Create Shift" to define duty windows and headcount requirements.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shifts.map((shift) => {
              const zone = zones.find(z => z.id === shift.zoneId);
              return (
                <div
                  key={shift.id}
                  className="p-4 rounded-2xl border shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0 mt-1"
                      style={{ backgroundColor: zone?.color || '#7054E8' }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.2 rounded" style={{ backgroundColor: 'var(--lilac-subtle)', color: 'var(--lilac-accent)' }}>
                          {shift.roleName || 'Volunteer'}
                        </span>
                        <h4 className="text-xs font-bold truncate" style={{ color: 'var(--text-heading)' }}>
                          {shift.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Zone: <strong className="text-slate-700 dark:text-slate-300">{zone?.name || 'Unassigned'}</strong> ·{' '}
                        {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —{' '}
                        {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>

                      {/* Required / Preferred skills */}
                      {(shift.requiredSkills?.length > 0 || shift.preferredSkills?.length > 0) && (
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {shift.requiredSkills?.map(s => (
                            <span key={s} className="text-[9px] font-bold px-2 py-0.2 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              Req: {s}
                            </span>
                          ))}
                          {shift.preferredSkills?.map(s => (
                            <span key={s} className="text-[9px] font-medium px-2 py-0.2 rounded bg-slate-500/10 text-slate-500 border border-slate-500/20">
                              Pref: {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <span className="text-xs font-bold block" style={{ color: 'var(--text-heading)' }}>
                        {shift.assignedCount || 0} / {shift.requiredHeadcount} assigned
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {shift.requiredHeadcount - (shift.assignedCount || 0) <= 0 ? 'Fully staffed' : `${shift.requiredHeadcount - (shift.assignedCount || 0)} needed`}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 7. Close Event Section (Organizer only) */}
      {isOrganizer && currentEvent.status !== 'closed' && (
        <div
          className="p-6 rounded-3xl border border-red-500/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          style={{ backgroundColor: 'var(--bg-surface)' }}
        >
          <div>
            <h4 className="text-sm font-bold text-red-600 dark:text-red-400">Close Event</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Conclude operations. Records and audit trail remain preserved; unfinished tasks will not be silently resolved.
            </p>
          </div>
          <button
            onClick={handleCloseEvent}
            className="px-4 py-2 rounded-xl border border-red-500 text-red-600 hover:bg-red-500/10 text-xs font-bold shrink-0 transition-colors"
          >
            Close Event
          </button>
        </div>
      )}

      {/* Add Zone Modal */}
      {showAddZoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>Add Named Zone</h3>
              <button onClick={() => setShowAddZoneModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCreateZone} className="space-y-3">
              <div>
                <label className="text-xs font-bold block mb-1">Zone Name *</label>
                <input
                  type="text"
                  required
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="e.g. Main Entrance & Security"
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={zoneCode}
                    onChange={(e) => setZoneCode(e.target.value.toUpperCase())}
                    placeholder="e.g. GATE"
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden uppercase font-mono"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Target Headcount</label>
                  <input
                    type="number"
                    min="1"
                    value={zoneHeadcount}
                    onChange={(e) => setZoneHeadcount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Color Marker</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={zoneColor}
                    onChange={(e) => setZoneColor(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-0"
                  />
                  <span className="text-xs font-mono text-slate-500">{zoneColor}</span>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button type="button" onClick={() => setShowAddZoneModal(false)} className="px-4 py-2 rounded-xl border text-xs">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold shadow-xs" style={{ backgroundColor: 'var(--action-lime)', color: 'var(--action-lime-text)' }}>Create Zone</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Shift Modal */}
      {showAddShiftModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border shadow-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>Create New Shift</h3>
              <button onClick={() => setShowAddShiftModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCreateShift} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Target Zone *</label>
                  <select
                    required
                    value={shiftZoneId}
                    onChange={(e) => setShiftZoneId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs font-bold outline-hidden"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                  >
                    {zones.map(z => (
                      <option key={z.id} value={z.id}>{z.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">Role Title</label>
                  <input
                    type="text"
                    required
                    value={shiftRoleName}
                    onChange={(e) => setShiftRoleName(e.target.value)}
                    placeholder="e.g. Check-In Lead"
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Shift Title *</label>
                <input
                  type="text"
                  required
                  value={shiftTitle}
                  onChange={(e) => setShiftTitle(e.target.value)}
                  placeholder="e.g. Morning Wristband Verification"
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Start Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={shiftStartTime}
                    onChange={(e) => setShiftStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={shiftEndTime}
                    onChange={(e) => setShiftEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">Required Headcount</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={shiftHeadcount}
                  onChange={(e) => setShiftHeadcount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">
                  Required Skills <span className="text-[10px] text-slate-400 font-normal">(Comma-separated, strictly verified)</span>
                </label>
                <input
                  type="text"
                  value={shiftRequiredSkills}
                  onChange={(e) => setShiftRequiredSkills(e.target.value)}
                  placeholder="e.g. First Aid, Crowd Control"
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">
                  Preferred Skills <span className="text-[10px] text-slate-400 font-normal">(Comma-separated, boosts ranking)</span>
                </label>
                <input
                  type="text"
                  value={shiftPreferredSkills}
                  onChange={(e) => setShiftPreferredSkills(e.target.value)}
                  placeholder="e.g. Spanish, Radio Certified"
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button type="button" onClick={() => setShowAddShiftModal(false)} className="px-4 py-2 rounded-xl border text-xs">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold shadow-xs" style={{ backgroundColor: 'var(--action-lime)', color: 'var(--action-lime-text)' }}>Save Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Event Setup Modal */}
      {showSetupModal && (
        <EventSetupModal
          onClose={() => setShowSetupModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
