import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Clock,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ReplacementPreviewModal({
  data, // { volunteer, sourceShiftId, targetShift }
  onClose,
  onSuccess
}) {
  const { currentEvent, showToast } = useAuth();
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [committing, setCommitting] = useState(false);

  useEffect(() => {
    if (!data) return;
    loadPreview();
  }, [data]);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const res = await api.reassignPreview(currentEvent.id, {
        volunteerId: data.volunteer.id,
        sourceShiftId: data.sourceShiftId,
        targetShiftId: data.targetShift.id
      });
      setPreview(res.preview);
    } catch (err) {
      showToast?.(`Preview failed: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCommitMove = async () => {
    setCommitting(true);
    try {
      await api.reassignAtomic(currentEvent.id, {
        volunteerId: data.volunteer.id,
        sourceShiftId: data.sourceShiftId,
        targetShiftId: data.targetShift.id
      });
      showToast?.(
        `Atomic move confirmed! ${data.volunteer.name} reassigned to ${data.targetShift.title}.`,
        'success'
      );
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast?.(err.message, 'error');
    } finally {
      setCommitting(false);
    }
  };

  if (!data) return null;

  const { volunteer, targetShift } = data;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-body)'
        }}
      >
        {/* Header */}
        <div
          className="p-6 border-b flex items-start justify-between"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <div>
            <span
              className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded"
              style={{
                backgroundColor: 'var(--lilac-subtle)',
                color: 'var(--lilac-accent)'
              }}
            >
              Visual Signature · Replacement Preview
            </span>
            <h2
              className="text-lg font-extrabold mt-1"
              style={{ color: 'var(--text-heading)' }}
            >
              Preview Cross-Zone Reassignment
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Moving <span className="font-bold" style={{ color: 'var(--text-heading)' }}>{volunteer.name}</span> to{' '}
              <span className="font-bold" style={{ color: 'var(--text-heading)' }}>{targetShift.title}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-black/5 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Calculating before/after zone coverage and workload change...
            </div>
          ) : preview ? (
            <>
              {/* Warnings Banner */}
              {preview.warnings && preview.warnings.length > 0 && (
                <div
                  className="p-3.5 rounded-2xl border text-xs flex items-start gap-2.5"
                  style={{
                    backgroundColor: 'var(--amber-subtle)',
                    borderColor: 'var(--amber-warning)',
                    color: 'var(--amber-text)'
                  }}
                >
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    {preview.warnings.map((w, idx) => (
                      <p key={idx} className="font-medium leading-relaxed">
                        {w}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Before and After Coverage Comparison Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Source Zone Box */}
                <div
                  className="p-4 rounded-2xl border"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Source Zone
                  </span>
                  <h4 className="text-sm font-extrabold mt-0.5" style={{ color: 'var(--text-heading)' }}>
                    {preview.sourceZone.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {preview.sourceZone.shiftTitle}
                  </p>

                  <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Before</span>
                      <span className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                        {preview.sourceZone.beforeCount} / {preview.sourceZone.required}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">After</span>
                      <span className={`text-sm font-extrabold ${
                        preview.sourceZone.willBeUnderstaffed ? 'text-amber-500' : ''
                      }`} style={{ color: preview.sourceZone.willBeUnderstaffed ? undefined : 'var(--text-heading)' }}>
                        {preview.sourceZone.afterCount} / {preview.sourceZone.required}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Target Zone Box */}
                <div
                  className="p-4 rounded-2xl border"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider block text-violet-400">
                    Destination Zone
                  </span>
                  <h4 className="text-sm font-extrabold mt-0.5" style={{ color: 'var(--text-heading)' }}>
                    {preview.targetZone.name}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                    {preview.targetZone.shiftTitle}
                  </p>

                  <div className="mt-3 pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Before</span>
                      <span className="text-sm font-bold" style={{ color: 'var(--text-heading)' }}>
                        {preview.targetZone.beforeCount} / {preview.targetZone.required}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-violet-400" />
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">After</span>
                      <span className="text-sm font-extrabold text-emerald-500">
                        {preview.targetZone.afterCount} / {preview.targetZone.required}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Workload Impact */}
              <div
                className="p-3 rounded-xl border flex items-center justify-between text-xs"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <span className="text-slate-400 font-medium">Workload Impact on Volunteer:</span>
                <span className="font-bold" style={{ color: 'var(--text-heading)' }}>
                  {preview.workloadChangeHours.netChangeHours >= 0
                    ? `+${preview.workloadChangeHours.netChangeHours.toFixed(1)} hrs`
                    : `${preview.workloadChangeHours.netChangeHours.toFixed(1)} hrs`}
                </span>
              </div>

              {/* Eligibility Reasons */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Eligibility Evaluation
                </span>
                {preview.eligibility.reasons.map((r, i) => (
                  <p key={i} className="text-xs flex items-center gap-1.5 font-medium" style={{ color: 'var(--text-body)' }}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    {r}
                  </p>
                ))}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div
          className="p-4 border-t flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border text-xs font-semibold hover:opacity-90"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-heading)'
            }}
          >
            Cancel
          </button>

          <button
            disabled={committing || !preview?.isEligible}
            onClick={handleCommitMove}
            className="px-5 py-2 rounded-xl text-xs font-black shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            style={{
              backgroundColor: 'var(--action-lime)',
              color: 'var(--action-lime-text)'
            }}
          >
            <span>{committing ? 'Committing Atomic Move...' : 'Confirm Atomic Move'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
