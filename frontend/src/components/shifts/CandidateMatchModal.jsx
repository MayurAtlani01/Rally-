import React, { useState, useEffect } from 'react';
import {
  X,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Award
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function CandidateMatchModal({
  shift,
  onClose,
  onSuccess,
  onRequestReassignPreview
}) {
  const { currentEvent, showToast } = useAuth();
  const [loading, setLoading] = useState(true);
  const [candidatesData, setCandidatesData] = useState(null);
  const [assigningId, setAssigningId] = useState(null);
  const [tab, setTab] = useState('eligible');

  useEffect(() => {
    if (!shift) return;
    loadCandidates();
  }, [shift]);

  const loadCandidates = async () => {
    setLoading(true);
    try {
      const data = await api.getCandidates(currentEvent.id, shift.id);
      setCandidatesData(data);
    } catch (err) {
      showToast?.(`Failed to load candidates: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (volunteerId) => {
    setAssigningId(volunteerId);
    try {
      await api.assignVolunteer(currentEvent.id, shift.id, volunteerId);
      showToast?.('Volunteer successfully assigned to shift!', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setAssigningId(null);
    }
  };

  if (!shift) return null;

  const eligible = candidatesData?.eligible || [];
  const ineligible = candidatesData?.ineligible || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh] transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-body)'
        }}
      >
        {/* Modal Header */}
        <div
          className="p-6 border-b flex items-start justify-between"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded"
                style={{
                  backgroundColor: 'var(--lilac-subtle)',
                  color: 'var(--lilac-accent)'
                }}
              >
                Staffing Engine
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Deterministic Explainable Matching
              </span>
            </div>
            <h2
              className="text-lg font-extrabold mt-1"
              style={{ color: 'var(--text-heading)' }}
            >
              Find Replacement: {shift.title}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Role: <span className="font-semibold text-slate-300">{shift.roleName}</span> ·{' '}
              {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
              {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-black/5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Controls */}
        <div
          className="px-6 pt-3 border-b flex items-center gap-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <button
            onClick={() => setTab('eligible')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'eligible'
                ? 'border-[#C4F03A] text-[var(--text-heading)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Eligible Candidates ({eligible.length})
          </button>
          <button
            onClick={() => setTab('ineligible')}
            className={`pb-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'ineligible'
                ? 'border-[#C4F03A] text-[var(--text-heading)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-slate-400" />
            Ineligible Candidates ({ineligible.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Evaluating volunteer skills, schedules, and workloads...
            </div>
          ) : tab === 'eligible' ? (
            eligible.length === 0 ? (
              <div
                className="p-8 text-center rounded-2xl border"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                <h4 className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>
                  No eligible volunteers
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                  All active event volunteers either lack the required skills, have conflicting shift assignments, or their submitted availability does not cover this window. Invite additional volunteers or adjust the shift requirements.
                </p>
              </div>
            ) : (
              eligible.map((item, index) => {
                const v = item.volunteer;
                const hasExistingAssignment = v.assignments && v.assignments.length > 0;

                return (
                  <div
                    key={v.id}
                    className="p-4 rounded-2xl border shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      borderColor: 'var(--border-subtle)'
                    }}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="relative">
                        <img
                          src={v.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover border"
                          style={{ borderColor: 'var(--border-strong)' }}
                        />
                        {index === 0 && (
                          <span
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center text-[10px] font-black"
                            title="Top Ranked Candidate"
                          >
                            ★
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold truncate" style={{ color: 'var(--text-heading)' }}>
                            {v.name}
                          </h4>
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded font-semibold border"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)',
                              color: 'var(--text-body)'
                            }}
                          >
                            {item.currentAssignedHours}h logged
                          </span>
                        </div>

                        {/* Explainable reasons */}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {item.reasons.map((r, i) => (
                            <span
                              key={i}
                              className="text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1"
                              style={{
                                backgroundColor: 'var(--emerald-subtle)',
                                color: 'var(--emerald-text)'
                              }}
                            >
                              <CheckCircle2 className="w-2.5 h-2.5" />
                              {r}
                            </span>
                          ))}
                        </div>

                        {/* Skills badges */}
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {(v.skills || []).map((sk) => (
                            <span
                              key={sk}
                              className="text-[9px] px-1.5 py-0.2 rounded border"
                              style={{
                                backgroundColor: 'var(--bg-surface)',
                                borderColor: 'var(--border-subtle)',
                                color: 'var(--text-muted)'
                              }}
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <div className="flex items-center gap-2 shrink-0">
                      {hasExistingAssignment ? (
                        <button
                          onClick={() => {
                            const sourceShiftId = v.assignments[0].shiftId;
                            onRequestReassignPreview?.({
                              volunteer: v,
                              sourceShiftId,
                              targetShift: shift
                            });
                          }}
                          className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors"
                          style={{
                            borderColor: 'var(--border-strong)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-heading)'
                          }}
                        >
                          <span>Preview Reassignment</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          disabled={assigningId === v.id}
                          onClick={() => handleAssign(v.id)}
                          className="px-3.5 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                          style={{
                            backgroundColor: 'var(--action-lime)',
                            color: 'var(--action-lime-text)'
                          }}
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>{assigningId === v.id ? 'Assigning...' : 'Assign'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )
          ) : (
            ineligible.map((item) => {
              const v = item.volunteer;
              return (
                <div
                  key={v.id}
                  className="p-4 rounded-2xl border flex flex-col gap-2"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={v.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80'}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover"
                      />
                      <span className="text-xs font-bold" style={{ color: 'var(--text-heading)' }}>
                        {v.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-red-500 font-bold bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded">
                      Not Eligible
                    </span>
                  </div>

                  <div className="space-y-1">
                    {item.ineligibilityReasons.map((reason, i) => (
                      <p key={i} className="text-[11px] text-slate-400 flex items-start gap-1.5">
                        <XCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                        <span>{reason}</span>
                      </p>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="p-4 border-t flex items-center justify-between text-xs text-slate-400"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <span>Ranking factors: 1. Fewest assigned hours · 2. Preferred skills · 3. Zone preference</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border font-semibold hover:opacity-90"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-heading)'
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
