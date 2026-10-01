import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarDays,
  Clock,
  Users,
  AlertTriangle,
  UserPlus,
  UserX,
  ArrowRightLeft,
  Sparkles,
  CheckCircle2,
  Filter,
  Plus,
  X,
  UserMinus,
  ArrowUpRight
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import CandidateMatchModal from '../components/shifts/CandidateMatchModal.jsx';
import ReplacementPreviewModal from '../components/shifts/ReplacementPreviewModal.jsx';

export default function ShiftPlannerPage() {
  const { currentEvent, showToast, isOrganizer, isCoordinator } = useAuth();
  const [shifts, setShifts] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedZoneId, setSelectedZoneId] = useState('all');
  const [loading, setLoading] = useState(true);

  // Modals
  const [matchShift, setMatchShift] = useState(null);
  const [reassignData, setReassignData] = useState(null);
  const [cancelModalAsgn, setCancelModalAsgn] = useState(null);
  const [cancelReason, setCancelReason] = useState('Volunteer cannot attend');
  const [absentModalAsgn, setAbsentModalAsgn] = useState(null);
  const [absentReason, setAbsentReason] = useState('No show / marked absent by coordinator');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Shift Form State
  const [newShiftZoneId, setNewShiftZoneId] = useState('');
  const [newShiftTitle, setNewShiftTitle] = useState('');
  const [newShiftRole, setNewShiftRole] = useState('Volunteer');
  const [newShiftStart, setNewShiftStart] = useState('');
  const [newShiftEnd, setNewShiftEnd] = useState('');
  const [newShiftHeadcount, setNewShiftHeadcount] = useState(2);
  const [newShiftReqSkills, setNewShiftReqSkills] = useState('');
  const [newShiftPrefSkills, setNewShiftPrefSkills] = useState('');

  const loadShifts = useCallback(async () => {
    if (!currentEvent) return;
    try {
      const [sRes, zRes] = await Promise.all([
        api.getShifts(currentEvent.id),
        api.getZones(currentEvent.id)
      ]);
      setShifts(sRes.shifts || []);
      setZones(zRes.zones || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [currentEvent, showToast]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  useEffect(() => {
    if (zones.length > 0 && !newShiftZoneId) {
      setNewShiftZoneId(zones[0].id);
    }
    if (currentEvent && !newShiftStart) {
      const s = new Date(currentEvent.startDate);
      const e = new Date(s.getTime() + 4 * 3600 * 1000);
      setNewShiftStart(s.toISOString().slice(0, 16));
      setNewShiftEnd(e.toISOString().slice(0, 16));
    }
  }, [zones, currentEvent, newShiftZoneId, newShiftStart]);

  // Cancel Assignment
  const handleCancelAssignment = async () => {
    if (!cancelModalAsgn) return;
    try {
      await api.cancelAssignment(currentEvent.id, cancelModalAsgn.id, cancelReason);
      showToast('Assignment canceled. Staffing gap created and alerted to organizers.', 'info');
      setCancelModalAsgn(null);
      loadShifts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Mark Absent
  const handleMarkAbsent = async () => {
    if (!absentModalAsgn) return;
    try {
      await api.markAbsent(currentEvent.id, absentModalAsgn.id, absentReason);
      showToast('Volunteer marked absent. Staffing gap alerted to organizers.', 'info');
      setAbsentModalAsgn(null);
      loadShifts();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Create Shift
  const handleCreateShift = async (e) => {
    e.preventDefault();
    if (!newShiftZoneId || !newShiftTitle.trim() || !newShiftStart || !newShiftEnd) {
      showToast('Zone, title, start time, and end time are required.', 'error');
      return;
    }

    const start = new Date(newShiftStart);
    const end = new Date(newShiftEnd);
    if (end <= start) {
      showToast('End time must be after start time.', 'error');
      return;
    }

    try {
      await api.createShift(currentEvent.id, {
        zoneId: newShiftZoneId,
        title: newShiftTitle.trim(),
        roleName: newShiftRole.trim() || 'Volunteer',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        requiredHeadcount: Number(newShiftHeadcount) || 1,
        requiredSkills: newShiftReqSkills.split(',').map(s => s.trim()).filter(Boolean),
        preferredSkills: newShiftPrefSkills.split(',').map(s => s.trim()).filter(Boolean)
      });
      showToast(`Shift "${newShiftTitle}" created!`, 'success');
      setShowCreateModal(false);
      setNewShiftTitle('');
      loadShifts();
    } catch (err) {
      showToast(err.message || 'Failed to create shift', 'error');
    }
  };

  const filteredShifts = selectedZoneId === 'all'
    ? shifts
    : shifts.filter(s => s.zoneId === selectedZoneId);

  // Group shifts by zone
  const shiftsByZone = new Map();
  for (const shift of filteredShifts) {
    const zoneName = shift.zone?.name || 'Unassigned Zone';
    if (!shiftsByZone.has(zoneName)) {
      shiftsByZone.set(zoneName, []);
    }
    shiftsByZone.get(zoneName).push(shift);
  }

  // Summary Metrics
  const totalPositions = useMemo(() => shifts.reduce((acc, s) => acc + (s.requiredHeadcount || 0), 0), [shifts]);
  const totalAssigned = useMemo(() => shifts.reduce((acc, s) => acc + (s.assignedCount || 0), 0), [shifts]);
  const totalGaps = useMemo(() => shifts.filter(s => (s.assignedCount || 0) < (s.requiredHeadcount || 1)).length, [shifts]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 transition-colors">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <div className="flex items-center gap-2">
            <span
              className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--lilac-subtle)',
                color: 'var(--lilac-accent)'
              }}
            >
              Operations & Rostering
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Timezone: {currentEvent?.timezone || 'UTC'}
            </span>
          </div>
          <h1 className="text-2xl font-black mt-1" style={{ color: 'var(--text-heading)' }}>
            Shift Planner & Rostering
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage volunteer assignments, track staffing gaps, and preview replacements before committing moves.
          </p>
        </div>

        {/* Filter & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedZoneId}
              onChange={(e) => setSelectedZoneId(e.target.value)}
              className="bg-transparent outline-hidden font-bold"
              style={{ color: 'var(--text-heading)' }}
            >
              <option value="all">All Zones ({zones.length})</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          {(isOrganizer || isCoordinator) && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              style={{
                backgroundColor: 'var(--action-lime)',
                color: 'var(--action-lime-text)'
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Shift</span>
            </button>
          )}
        </div>
      </div>

      {/* Roster Summary Strip */}
      <div
        className="p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-4 text-xs"
        style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="flex items-center gap-6">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Required Positions</span>
            <strong className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>{totalPositions}</strong>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Positions</span>
            <strong className="text-sm font-bold" style={{ color: 'var(--emerald-text)' }}>{totalAssigned}</strong>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase block">Staffing Gaps</span>
            <strong className="text-sm font-bold" style={{ color: totalGaps > 0 ? 'var(--amber-warning)' : 'var(--text-heading)' }}>{totalGaps}</strong>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 italic">
          Deterministic matching evaluates volunteer availability, active double-booking, and skill certificates.
        </span>
      </div>

      {/* Shifts Grouped by Zone */}
      <div className="space-y-6">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading rostered shifts...</div>
        ) : shiftsByZone.size === 0 ? (
          <div
            className="p-12 text-center rounded-3xl border shadow-sm space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <CalendarDays className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-editorial text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
                No shifts rostered yet
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Create shifts with role names, time windows, and required headcounts to begin rostering.
              </p>
            </div>
            {(isOrganizer || isCoordinator) && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 mx-auto shadow-sm"
                style={{
                  backgroundColor: 'var(--action-lime)',
                  color: 'var(--action-lime-text)'
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Create Shift</span>
              </button>
            )}
          </div>
        ) : (
          Array.from(shiftsByZone.entries()).map(([zoneName, zShifts]) => (
            <div
              key={zoneName}
              className="p-6 rounded-3xl border shadow-xs space-y-4"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2.5">
                  <span
                    className="w-3.5 h-3.5 rounded-full"
                    style={{ backgroundColor: zShifts[0]?.zone?.color || '#7054E8' }}
                  />
                  <h3 className="text-base font-bold" style={{ color: 'var(--text-heading)' }}>
                    {zoneName}
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    ({zShifts.length} shift{zShifts.length !== 1 ? 's' : ''})
                  </span>
                </div>
              </div>

              {/* Shifts List in Zone */}
              <div className="space-y-4">
                {zShifts.map((shift) => {
                  const isUnderstaffed = (shift.assignedCount || 0) < (shift.requiredHeadcount || 1);
                  const isCritical = (shift.assignedCount || 0) === 0 && shift.requiredHeadcount > 0;

                  return (
                    <div
                      key={shift.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCritical
                          ? 'border-red-500/40 bg-red-500/5'
                          : isUnderstaffed
                          ? 'border-amber-500/40 bg-amber-500/5'
                          : ''
                      }`}
                      style={{
                        backgroundColor: !isCritical && !isUnderstaffed ? 'var(--bg-surface-subtle)' : undefined,
                        borderColor: !isCritical && !isUnderstaffed ? 'var(--border-subtle)' : undefined
                      }}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded"
                              style={{
                                backgroundColor: 'var(--lilac-subtle)',
                                color: 'var(--lilac-accent)'
                              }}
                            >
                              {shift.roleName}
                            </span>
                            <h4 className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                              {shift.title}
                            </h4>
                          </div>

                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} —{' '}
                              {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {/* Skills */}
                          {(shift.requiredSkills?.length > 0 || shift.preferredSkills?.length > 0) && (
                            <div className="flex flex-wrap items-center gap-1.5 mt-2">
                              {shift.requiredSkills?.map(s => (
                                <span key={s} className="text-[9px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                                  Required: {s}
                                </span>
                              ))}
                              {shift.preferredSkills?.map(s => (
                                <span key={s} className="text-[9px] font-medium px-2 py-0.5 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
                                  Preferred: {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Headcount Status & Suggest Volunteers Action */}
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-xs font-bold block" style={{ color: 'var(--text-heading)' }}>
                              {shift.assignedCount || 0} of {shift.requiredHeadcount} assigned
                            </span>
                            <span className={`text-[10px] font-bold ${
                              isUnderstaffed ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                            }`}>
                              {isUnderstaffed ? `${shift.requiredHeadcount - (shift.assignedCount || 0)} position(s) unfilled` : 'Fully staffed'}
                            </span>
                          </div>

                          {isUnderstaffed && (isOrganizer || isCoordinator) && (
                            <button
                              onClick={() => setMatchShift(shift)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs hover:opacity-95"
                              style={{
                                backgroundColor: 'var(--action-lime)',
                                color: 'var(--action-lime-text)'
                              }}
                            >
                              <UserPlus className="w-3.5 h-3.5" />
                              <span>Suggest volunteers</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Assigned Volunteers List */}
                      <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: 'var(--border-subtle)' }}>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                          Assigned Volunteers ({shift.assignments?.length || 0})
                        </span>

                        {shift.assignments && shift.assignments.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {shift.assignments.map((asgn) => (
                              <div
                                key={asgn.id}
                                className="p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs"
                                style={{
                                  backgroundColor: 'var(--bg-surface)',
                                  borderColor: 'var(--border-subtle)'
                                }}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={asgn.volunteerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80'}
                                    alt=""
                                    className="w-7 h-7 rounded-full object-cover border"
                                    style={{ borderColor: 'var(--border-strong)' }}
                                  />
                                  <div className="min-w-0">
                                    <span className="font-bold block truncate" style={{ color: 'var(--text-heading)' }}>
                                      {asgn.volunteerName}
                                    </span>
                                    <span className="text-[10px] text-slate-400 block truncate">
                                      {asgn.status}
                                    </span>
                                  </div>
                                </div>

                                {(isOrganizer || isCoordinator) && (
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => setCancelModalAsgn(asgn)}
                                      className="text-red-500 hover:text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30"
                                      title="Cancel assignment"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      onClick={() => setAbsentModalAsgn(asgn)}
                                      className="text-amber-600 hover:text-amber-800 text-[10px] font-bold px-1.5 py-0.5 rounded hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                      title="Mark absent"
                                    >
                                      Absent
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-3 rounded-xl border border-dashed text-xs text-slate-400" style={{ borderColor: 'var(--border-subtle)' }}>
                            <span>Zero volunteers assigned to this shift.</span>
                            {(isOrganizer || isCoordinator) && (
                              <button
                                onClick={() => setMatchShift(shift)}
                                className="font-bold text-[#7054E8] hover:underline text-xs inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>Find replacement</span>
                                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Shift Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-3xl border shadow-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>Create New Shift</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCreateShift} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold block mb-1">Target Zone *</label>
                  <select
                    required
                    value={newShiftZoneId}
                    onChange={(e) => setNewShiftZoneId(e.target.value)}
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
                    value={newShiftRole}
                    onChange={(e) => setNewShiftRole(e.target.value)}
                    placeholder="e.g. Entrance Lead"
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
                  value={newShiftTitle}
                  onChange={(e) => setNewShiftTitle(e.target.value)}
                  placeholder="e.g. Morning Access Control"
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
                    value={newShiftStart}
                    onChange={(e) => setNewShiftStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1">End Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newShiftEnd}
                    onChange={(e) => setNewShiftEnd(e.target.value)}
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
                  value={newShiftHeadcount}
                  onChange={(e) => setNewShiftHeadcount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">
                  Required Skills <span className="text-[10px] text-slate-400 font-normal">(Comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={newShiftReqSkills}
                  onChange={(e) => setNewShiftReqSkills(e.target.value)}
                  placeholder="e.g. First Aid, Crowd Control"
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">
                  Preferred Skills <span className="text-[10px] text-slate-400 font-normal">(Comma-separated)</span>
                </label>
                <input
                  type="text"
                  value={newShiftPrefSkills}
                  onChange={(e) => setNewShiftPrefSkills(e.target.value)}
                  placeholder="e.g. Radio Certified"
                  className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                  style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 rounded-xl border text-xs">Cancel</button>
                <button type="submit" className="px-5 py-2 rounded-xl text-xs font-bold shadow-xs" style={{ backgroundColor: 'var(--action-lime)', color: 'var(--action-lime-text)' }}>Create Shift</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalAsgn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <h3 className="font-bold text-sm text-red-600">Cancel Assignment</h3>
            <p className="text-xs text-slate-500">
              Cancelling creates a staffing gap on this shift. Coordinators will be notified to review replacements.
            </p>
            <div>
              <label className="text-xs font-bold block mb-1">Reason</label>
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
              />
            </div>
            <div className="pt-3 flex items-center justify-end gap-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <button type="button" onClick={() => setCancelModalAsgn(null)} className="px-4 py-2 rounded-xl border text-xs">Back</button>
              <button type="button" onClick={handleCancelAssignment} className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs">Confirm Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Absent Modal */}
      {absentModalAsgn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            <h3 className="font-bold text-sm text-amber-600">Mark Volunteer Absent</h3>
            <p className="text-xs text-slate-500">
              Records an absence in the attendance audit trail. Staffing gap alerted to coordinators.
            </p>
            <div>
              <label className="text-xs font-bold block mb-1">Absence Reason</label>
              <textarea
                rows={2}
                value={absentReason}
                onChange={(e) => setAbsentReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border text-xs outline-hidden"
                style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)', color: 'var(--text-heading)' }}
              />
            </div>
            <div className="pt-3 flex items-center justify-end gap-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <button type="button" onClick={() => setAbsentModalAsgn(null)} className="px-4 py-2 rounded-xl border text-xs">Back</button>
              <button type="button" onClick={handleMarkAbsent} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs">Mark Absent</button>
            </div>
          </div>
        </div>
      )}

      {/* Candidate Match Modal */}
      {matchShift && (
        <CandidateMatchModal
          shift={matchShift}
          onClose={() => setMatchShift(null)}
          onSuccess={loadShifts}
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
          onSuccess={loadShifts}
        />
      )}
    </div>
  );
}
