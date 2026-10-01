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
  Sparkles
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ReportIssueModal from '../components/issues/ReportIssueModal.jsx';
import { ISSUE_STATUSES } from '@shared/constants.js';

export default function TasksIssuesPage() {
  const { currentEvent, showToast, isOrganizer } = useAuth();
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

  const handleUpdateStatus = async (issueId, status) => {
    try {
      await api.updateIssue(currentEvent.id, issueId, { status });
      showToast(`Issue status updated to ${status.toUpperCase()}`, 'success');
      loadIssues();
      if (selectedIssue && selectedIssue.id === issueId) {
        setSelectedIssue(prev => ({ ...prev, status }));
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleEscalateCheck = async () => {
    try {
      const res = await api.escalateCheck(currentEvent.id);
      showToast(`Escalation check complete: ${res.escalatedCount} issues escalated.`, 'info');
      loadIssues();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const filteredIssues = issues.filter(i => {
    if (selectedZone !== 'all' && i.zoneId !== selectedZone) return false;
    if (selectedSeverity !== 'all' && i.severity !== selectedSeverity) return false;
    return true;
  });

  const columns = [
    { id: ISSUE_STATUSES.OPEN, label: 'Open', color: 'bg-red-500' },
    { id: ISSUE_STATUSES.ACKNOWLEDGED, label: 'Acknowledged', color: 'bg-amber-500' },
    { id: ISSUE_STATUSES.IN_PROGRESS, label: 'In Progress', color: 'bg-blue-500' },
    { id: ISSUE_STATUSES.RESOLVED, label: 'Resolved', color: 'bg-emerald-500' }
  ];

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">
              Tasks & Incidents
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Coordinator Auto-Routing & Persistent Escalation
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Field Issues & Tasks</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time incident response board. Unacknowledged urgent issues escalate automatically to organizers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isOrganizer && (
            <button
              onClick={handleEscalateCheck}
              className="px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors"
              title="Manually trigger urgent issue escalation engine"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
              Run Escalation Check
            </button>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 rounded-xl bg-[#7054E8] hover:bg-[#5B3FD4] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Report Issue
          </button>
        </div>
      </div>

      {/* Filter and View Toggle Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold">
            <span className="text-slate-400 font-normal">Zone:</span>
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="bg-transparent outline-hidden text-slate-800 font-bold"
            >
              <option value="all">All Zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold">
            <span className="text-slate-400 font-normal">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-transparent outline-hidden text-slate-800 font-bold uppercase"
            >
              <option value="all">All Severities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
          <button
            onClick={() => setViewMode('board')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              viewMode === 'board' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
            }`}
          >
            Board
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 rounded-lg transition-colors ${
              viewMode === 'list' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Kanban Board View */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {columns.map((col) => {
            const colIssues = filteredIssues.filter(i => i.status === col.id);

            return (
              <div key={col.id} className="flex flex-col gap-3">
                {/* Column Header */}
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                    <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
                      {col.label}
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                    {colIssues.length}
                  </span>
                </div>

                {/* Column Cards */}
                <div className="space-y-3 min-h-[300px] p-2 bg-slate-100/60 rounded-3xl border border-slate-200/60">
                  {colIssues.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400 italic">
                      No issues
                    </div>
                  ) : (
                    colIssues.map((issue) => {
                      const isUrgent = issue.severity === 'urgent';
                      const isEscalated = !!issue.escalatedAt;

                      return (
                        <div
                          key={issue.id}
                          onClick={() => setSelectedIssue(issue)}
                          className={`p-4 rounded-2xl bg-white border shadow-xs hover:border-[#7054E8] transition-all cursor-pointer space-y-2.5 ${
                            isEscalated
                              ? 'border-red-400 ring-2 ring-red-100'
                              : isUrgent
                              ? 'border-red-200'
                              : 'border-slate-200'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 text-slate-700">
                              {issue.zoneName}
                            </span>
                            <div className="flex items-center gap-1">
                              {isEscalated && (
                                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded font-black bg-red-600 text-white animate-pulse">
                                  ESCALATED
                                </span>
                              )}
                              <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-black ${
                                isUrgent
                                  ? 'bg-red-100 text-red-800'
                                  : issue.severity === 'high'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {issue.severity}
                              </span>
                            </div>
                          </div>

                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            {issue.title}
                          </h4>

                          <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                            {issue.description}
                          </p>

                          {/* Footer Info */}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                            <span>Rep: {issue.reporterName?.split(' ')[0]}</span>
                            <span>{new Date(issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
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
        /* Compact List View */
        <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
          {filteredIssues.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">No issues found.</div>
          ) : (
            filteredIssues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => setSelectedIssue(issue)}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                    issue.status === 'resolved' ? 'bg-emerald-500' : issue.severity === 'urgent' ? 'bg-red-500' : 'bg-amber-500'
                  }`} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-900 truncate">{issue.title}</h4>
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        {issue.zoneName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{issue.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-700">
                    {issue.status}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(issue.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Issue Detail & Status Transition Modal */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {selectedIssue.zoneName}
                  </span>
                  <span className={`text-[10px] uppercase px-2 py-0.5 rounded font-bold ${
                    selectedIssue.severity === 'urgent' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedIssue.severity}
                  </span>
                </div>
                <h3 className="text-base font-extrabold text-slate-900 mt-2">{selectedIssue.title}</h3>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-2xl border border-slate-200">
              {selectedIssue.description}
            </p>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Reported By</span>
                <span className="font-bold text-slate-800">{selectedIssue.reporterName}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Assigned Coordinator</span>
                <span className="font-bold text-slate-800">{selectedIssue.coordinatorName || 'Unassigned'}</span>
              </div>
            </div>

            {/* Status Transition Actions */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                Update Status Workflow
              </span>
              <div className="grid grid-cols-4 gap-1.5">
                {columns.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => handleUpdateStatus(selectedIssue.id, col.id)}
                    className={`py-2 rounded-xl text-xs font-bold uppercase transition-all border ${
                      selectedIssue.status === col.id
                        ? 'bg-[#7054E8] text-white border-[#5B3FD4]'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity History */}
            {selectedIssue.activities && selectedIssue.activities.length > 0 && (
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Audit History ({selectedIssue.activities.length})
                </span>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {selectedIssue.activities.map((act) => (
                    <div key={act.id} className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold uppercase text-slate-700">{act.action}</span>
                        <span>{new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {act.note && <p className="text-[11px] text-slate-600 mt-0.5">{act.note}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedIssue(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Issue Modal */}
      {showCreateModal && (
        <ReportIssueModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={loadIssues}
        />
      )}
    </div>
  );
}
