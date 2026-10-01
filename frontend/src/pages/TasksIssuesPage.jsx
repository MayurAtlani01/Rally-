import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Plus,
  CheckCircle2,
  Clock,
  UserCheck,
  ShieldAlert,
  ArrowRight,
  Filter,
  Layers,
  Send,
  Sparkles,
  X,
  ChevronRight,
  MapPin,
  Users
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ReportIssueModal from '../components/issues/ReportIssueModal.jsx';
import { ISSUE_STATUSES } from '@shared/constants.js';

// Sample preview issues matching Rally Festival zones
const SAMPLE_ISSUES = [
  {
    id: 'issue-1',
    title: 'Registration desk 2 volunteers short for afternoon peak',
    description: 'Expected arrival surge of 1,200 attendees between 12:30 and 14:00 at East Entrance. Need 2 replacement volunteers immediately.',
    zoneName: 'Registration',
    zoneId: 'z-reg',
    severity: 'urgent',
    status: ISSUE_STATUSES.OPEN,
    reporterName: 'Priya Sharma',
    coordinatorName: 'Priya Sharma',
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    escalatedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    activities: [
      { id: 'act-1', action: 'reported', note: 'Issue logged via mobile portal', createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString() },
      { id: 'act-2', action: 'escalated', note: 'Auto-escalated: unacknowledged for >15 min', createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString() }
    ]
  },
  {
    id: 'issue-2',
    title: 'Restock cold bottled water supplies at Volunteer Hub',
    description: 'Pallet of 40 cases delivered to East Loading Bay. Need 2 hands with a trolley to transport to the Volunteer Hub tent.',
    zoneName: 'Registration',
    zoneId: 'z-reg',
    severity: 'high',
    status: ISSUE_STATUSES.OPEN,
    reporterName: 'Alex Miller',
    coordinatorName: 'Priya Sharma',
    createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
    activities: [
      { id: 'act-3', action: 'reported', note: 'Logged by Logistics coordinator', createdAt: new Date(Date.now() - 40 * 60 * 1000).toISOString() }
    ]
  },
  {
    id: 'issue-3',
    title: 'Medical tent requested additional ice packs & electrolyte packets',
    description: 'High heat index on the lawn. Medic Station 1 requesting 15 ice packs and 3 boxes of electrolyte powder from main warehouse.',
    zoneName: 'Medical',
    zoneId: 'z-med',
    severity: 'high',
    status: ISSUE_STATUSES.ACKNOWLEDGED,
    reporterName: 'Dr. Nathan Cole',
    coordinatorName: 'Nathan Cole',
    createdAt: new Date(Date.now() - 55 * 60 * 1000).toISOString(),
    activities: [
      { id: 'act-4', action: 'acknowledged', note: 'Courier dispatched to supply truck', createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString() }
    ]
  },
  {
    id: 'issue-4',
    title: 'Directional signage blown down near East Entrance pathway',
    description: 'Wind gust knocked over the Schedule & Map A-frame sign near footbridge. Ground crew notified to weigh down with sandbags.',
    zoneName: 'Registration',
    zoneId: 'z-reg',
    severity: 'medium',
    status: ISSUE_STATUSES.ACKNOWLEDGED,
    reporterName: 'Carlos Diaz',
    coordinatorName: 'Priya Sharma',
    createdAt: new Date(Date.now() - 70 * 60 * 1000).toISOString(),
    activities: [
      { id: 'act-5', action: 'acknowledged', note: 'Ground crew en route', createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString() }
    ]
  },
  {
    id: 'issue-5',
    title: 'Main stage sound check audio monitor cable replacement',
    description: 'Intermittent crackle on stage-left foldback monitor. Audio engineer replacing balanced XLR snake line before opening act.',
    zoneName: 'Main stage',
    zoneId: 'z-main',
    severity: 'high',
    status: ISSUE_STATUSES.IN_PROGRESS,
    reporterName: 'Audio Lead Dave',
    coordinatorName: 'Marcus Vance',
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
    activities: [
      { id: 'act-6', action: 'started', note: 'Technician on stage actively troubleshooting', createdAt: new Date(Date.now() - 60 * 60 * 1000).toISOString() }
    ]
  },
  {
    id: 'issue-6',
    title: 'Food court waste bins cleared before lunch rush',
    description: 'All 8 recycling stations and compost dumpsters in Food Court North emptied and relined.',
    zoneName: 'Food court',
    zoneId: 'z-food',
    severity: 'low',
    status: ISSUE_STATUSES.RESOLVED,
    reporterName: 'Sanitation Lead',
    coordinatorName: 'Marcus Vance',
    createdAt: new Date(Date.now() - 150 * 60 * 1000).toISOString(),
    activities: [
      { id: 'act-7', action: 'resolved', note: 'Bins verified empty and clean', createdAt: new Date(Date.now() - 80 * 60 * 1000).toISOString() }
    ]
  },
  {
    id: 'issue-7',
    title: 'Crowd control barrier positioned at Zone B entrance',
    description: 'Queue stanchions and retractable belt barriers locked into place for orderly queuing.',
    zoneName: 'Registration',
    zoneId: 'z-reg',
    severity: 'medium',
    status: ISSUE_STATUSES.RESOLVED,
    reporterName: 'Security Lead',
    coordinatorName: 'Priya Sharma',
    createdAt: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
    activities: [
      { id: 'act-8', action: 'resolved', note: 'Queuing lanes inspected and approved', createdAt: new Date(Date.now() - 110 * 60 * 1000).toISOString() }
    ]
  }
];

export default function TasksIssuesPage() {
  const { currentEvent, showToast, isOrganizer, isSamplePreview } = useAuth();
  const [issues, setIssues] = useState([]);
  const [zones, setZones] = useState([]);
  const [selectedZone, setSelectedZone] = useState('all');
  const [selectedSeverity, setSelectedSeverity] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'list'

  const loadIssues = useCallback(async () => {
    if (!currentEvent) return;
    try {
      const [iRes, zRes] = await Promise.all([
        api.getIssues(currentEvent.id),
        api.getZones(currentEvent.id)
      ]);
      setIssues(iRes.issues || []);
      setZones(zRes.zones || []);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }, [currentEvent, showToast]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  // Use sample issues if preview mode is on or if no issues exist in live database
  const effectiveIssues = (isSamplePreview || issues.length === 0)
    ? (issues.length > 0 ? issues : SAMPLE_ISSUES)
    : issues;

  const handleUpdateStatus = async (issueId, status) => {
    // If it's a sample issue, update in memory
    const isSample = SAMPLE_ISSUES.some(s => s.id === issueId);
    if (isSample || !currentEvent) {
      setIssues(prev => {
        const base = prev.length > 0 ? prev : SAMPLE_ISSUES;
        return base.map(i => i.id === issueId ? { ...i, status } : i);
      });
      showToast(`Issue status moved to ${status.toUpperCase().replace('_', ' ')}`, 'success');
      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue(prev => ({ ...prev, status }));
      }
      return;
    }

    try {
      await api.updateIssue(currentEvent.id, issueId, { status });
      showToast(`Issue status updated to ${status.toUpperCase().replace('_', ' ')}`, 'success');
      loadIssues();
      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue(prev => ({ ...prev, status }));
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEscalateCheck = async () => {
    if (!currentEvent || isSamplePreview) {
      showToast('Escalation check complete: 1 urgent unacknowledged issue flagged.', 'info');
      return;
    }
    try {
      const res = await api.escalateCheck(currentEvent.id);
      showToast(`Escalation check complete: ${res.escalatedCount} issues escalated.`, 'info');
      loadIssues();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredIssues = effectiveIssues.filter(i => {
    if (selectedZone !== 'all') {
      const matchName = i.zoneName?.toLowerCase() === selectedZone.toLowerCase();
      const matchId = i.zoneId === selectedZone;
      if (!matchName && !matchId) return false;
    }
    if (selectedSeverity !== 'all' && i.severity !== selectedSeverity) return false;
    return true;
  });

  const columns = [
    {
      id: ISSUE_STATUSES.OPEN,
      label: 'OPEN',
      dotColor: '#ef4444',
      badgeClass: 'bg-rose-950/60 text-rose-300 border-rose-500/30'
    },
    {
      id: ISSUE_STATUSES.ACKNOWLEDGED,
      label: 'ACKNOWLEDGED',
      dotColor: '#f59e0b',
      badgeClass: 'bg-amber-950/60 text-amber-300 border-amber-500/30'
    },
    {
      id: ISSUE_STATUSES.IN_PROGRESS,
      label: 'IN PROGRESS',
      dotColor: '#3b82f6',
      badgeClass: 'bg-blue-950/60 text-blue-300 border-blue-500/30'
    },
    {
      id: ISSUE_STATUSES.RESOLVED,
      label: 'RESOLVED',
      dotColor: '#10b981',
      badgeClass: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
    }
  ];

  const zoneOptions = [
    { id: 'all', label: 'All Zones' },
    { id: 'Registration', label: 'Registration' },
    { id: 'Food court', label: 'Food court' },
    { id: 'Main stage', label: 'Main stage' },
    { id: 'Medical', label: 'Medical' }
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1720px] mx-auto space-y-6 select-none">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-500/30 shadow-2xs">
              TASKS & INCIDENTS
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Coordinator Auto-Routing & Persistent Escalation
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black italic tracking-tight text-white uppercase mt-1.5">
            Field Issues & Tasks
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time incident response board. Unacknowledged urgent issues escalate automatically to organizers.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleEscalateCheck}
            className="px-3.5 py-2.5 rounded-xl bg-[#1a1130] border border-white/10 hover:border-white/20 text-xs font-bold text-slate-200 shadow-sm flex items-center gap-2 transition-all hover:bg-white/5 active:scale-95 cursor-pointer"
            title="Manually trigger urgent issue escalation engine"
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Run Escalation Check</span>
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            id="report-issue-header-btn"
            className="px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg hover:opacity-90 active:scale-95 transition-all cursor-pointer"
            style={{
              backgroundColor: 'var(--action-lime)',
              color: 'var(--action-lime-text)'
            }}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Report Issue</span>
          </button>
        </div>
      </div>

      {/* 2. Filter and View Toggle Bar (Sleek Dark Container) */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl border shadow-xl"
        style={{
          backgroundColor: '#120b22',
          borderColor: 'rgba(255, 255, 255, 0.08)'
        }}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Zone Filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-[#1a1130] text-xs font-semibold text-slate-300">
            <span className="text-slate-400 font-normal">Zone:</span>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-transparent outline-none text-white font-bold cursor-pointer"
            >
              {zoneOptions.map((z) => (
                <option key={z.id} value={z.id} className="bg-[#120b22] text-white">
                  {z.label}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-[#1a1130] text-xs font-semibold text-slate-300">
            <span className="text-slate-400 font-normal">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-transparent outline-none text-white font-bold uppercase cursor-pointer"
            >
              <option value="all" className="bg-[#120b22] text-white">ALL SEVERITIES</option>
              <option value="urgent" className="bg-[#120b22] text-rose-400 font-bold">URGENT</option>
              <option value="high" className="bg-[#120b22] text-amber-400 font-bold">HIGH</option>
              <option value="medium" className="bg-[#120b22] text-purple-400 font-bold">MEDIUM</option>
              <option value="low" className="bg-[#120b22] text-slate-300">LOW</option>
            </select>
          </div>
        </div>

        {/* View Toggle: Board / List */}
        <div className="flex items-center bg-[#1a1130] p-1 rounded-xl border border-white/5 text-xs font-bold">
          <button
            onClick={() => setViewMode('board')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'board'
                ? 'bg-[#7c3aed] text-white shadow-sm font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-[#7c3aed] text-white shadow-sm font-extrabold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* 3. Kanban Board View */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {columns.map((col) => {
            const colIssues = filteredIssues.filter(i => i.status === col.id);

            return (
              <div
                key={col.id}
                className="rounded-3xl border p-4 flex flex-col gap-3.5 shadow-xl min-h-[540px]"
                style={{
                  backgroundColor: '#120b22',
                  borderColor: 'rgba(255, 255, 255, 0.08)'
                }}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between px-1 pb-1 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: col.dotColor }}
                    />
                    <h3 className="font-black text-xs uppercase tracking-wider text-slate-200">
                      {col.label}
                    </h3>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${col.badgeClass}`}>
                    {colIssues.length}
                  </span>
                </div>

                {/* Column Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto pr-0.5">
                  {colIssues.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-500 italic">
                      No issues in this column
                    </div>
                  ) : (
                    colIssues.map((issue) => {
                      const isUrgent = issue.severity === 'urgent';
                      const isEscalated = !!issue.escalatedAt;

                      return (
                        <div
                          key={issue.id}
                          onClick={() => setSelectedIssue(issue)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 group hover:scale-[1.01] ${
                            isEscalated
                              ? 'bg-[#1e1026] border-rose-500/60 shadow-lg ring-1 ring-rose-500/40'
                              : isUrgent
                              ? 'bg-[#1b1028] border-rose-500/40 hover:border-rose-400'
                              : 'bg-[#1a1130] border-white/10 hover:border-purple-400/60 shadow-md'
                          }`}
                        >
                          {/* Card Top: Zone & Severity Badges */}
                          <div className="flex items-start justify-between gap-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-500/20">
                              {issue.zoneName}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {isEscalated && (
                                <span className="text-[9px] uppercase px-1.5 py-0.5 rounded font-black bg-rose-600 text-white animate-pulse">
                                  ESCALATED
                                </span>
                              )}
                              <span className={`text-[9px] uppercase px-2 py-0.5 rounded font-black border ${
                                isUrgent
                                  ? 'bg-rose-950/60 text-rose-300 border-rose-500/40'
                                  : issue.severity === 'high'
                                  ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                                  : 'bg-purple-950/60 text-purple-300 border-purple-500/20'
                              }`}>
                                {issue.severity}
                              </span>
                            </div>
                          </div>

                          {/* Issue Title */}
                          <h4 className="text-xs font-bold text-white group-hover:text-purple-200 transition-colors leading-snug">
                            {issue.title}
                          </h4>

                          {/* Description */}
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {issue.description}
                          </p>

                          {/* Footer Info */}
                          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-400">
                            <span className="truncate max-w-[130px]">
                              Rep: <strong className="text-slate-300">{issue.reporterName?.split(' ')[0]}</strong>
                            </span>
                            <div className="flex items-center gap-1 shrink-0 text-slate-400">
                              <Clock className="w-3 h-3" />
                              <span>
                                {new Date(issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Compact List View in Dark Theme */
        <div
          className="rounded-3xl border divide-y overflow-hidden shadow-xl"
          style={{
            backgroundColor: '#120b22',
            borderColor: 'rgba(255, 255, 255, 0.08)',
            divideColor: 'rgba(255, 255, 255, 0.05)'
          }}
        >
          {filteredIssues.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400 italic">No issues match the filters.</div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => setSelectedIssue(issue)}
                className="p-4 hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    issue.status === ISSUE_STATUSES.RESOLVED
                      ? 'bg-emerald-400'
                      : issue.severity === 'urgent'
                      ? 'bg-rose-400'
                      : 'bg-amber-400'
                  }`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-white truncate">{issue.title}</h4>
                      <span className="text-[10px] uppercase font-bold text-purple-400 bg-purple-950/60 border border-purple-500/20 px-1.5 py-0.2 rounded">
                        {issue.zoneName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{issue.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded font-bold bg-[#1a1130] text-slate-300 border border-white/10">
                    {issue.status.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 4. Issue Detail & Status Transition Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg rounded-3xl border p-6 space-y-4 max-h-[90vh] overflow-y-auto shadow-2xl"
            style={{
              backgroundColor: '#120b22',
              borderColor: 'rgba(255, 255, 255, 0.12)'
            }}
          >
            {/* Modal Top Bar */}
            <div className="flex items-start justify-between pb-2 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30">
                    {selectedIssue.zoneName}
                  </span>
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold border ${
                    selectedIssue.severity === 'urgent'
                      ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                      : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                  }`}>
                    {selectedIssue.severity}
                  </span>
                </div>
                <h3 className="text-base font-black text-white mt-2 leading-snug">{selectedIssue.title}</h3>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Description Box */}
            <div className="text-xs text-slate-300 leading-relaxed bg-[#1a1130] p-3.5 rounded-2xl border border-white/5">
              {selectedIssue.description}
            </div>

            {/* Assignment Details */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl bg-[#1a1130] border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Reported By</span>
                <span className="font-bold text-white block mt-0.5">{selectedIssue.reporterName}</span>
              </div>
              <div className="p-3 rounded-xl bg-[#1a1130] border border-white/5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Coordinator</span>
                <span className="font-bold text-white block mt-0.5">{selectedIssue.coordinatorName || 'Priya Sharma'}</span>
              </div>
            </div>

            {/* Status Transition Workflow Buttons */}
            <div>
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-2">
                Move Status
              </span>
              <div className="grid grid-cols-4 gap-2">
                {columns.map((col) => {
                  const isActive = selectedIssue.status === col.id;
                  return (
                    <button
                      key={col.id}
                      onClick={() => handleUpdateStatus(selectedIssue.id, col.id)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold uppercase transition-all border cursor-pointer ${
                        isActive
                          ? 'bg-[#7c3aed] text-white border-purple-400 shadow-md font-black'
                          : 'bg-[#1a1130] border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {col.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Activity Audit History */}
            {selectedIssue.activities && selectedIssue.activities.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                  Audit History ({selectedIssue.activities.length})
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedIssue.activities.map((act) => (
                    <div key={act.id} className="p-2.5 rounded-xl bg-[#1a1130] border border-white/5 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold uppercase text-purple-300">{act.action}</span>
                        <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {act.note && <p className="text-[11px] text-slate-300 mt-1">{act.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedIssue(null)}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Create Issue Modal */}
      {showCreateModal && (
        <ReportIssueModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadIssues}
        />
      )}
    </div>
  );
}
