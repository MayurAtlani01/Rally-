import React, { useState, useEffect } from 'react';
import { X, KeyRound, CheckCircle2, AlertCircle, MapPin, Calendar, Loader2 } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function JoinEventModal({ onClose, onSuccess }) {
  const { selectEvent, showToast, refreshUserData, setIsSamplePreview } = useAuth();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [previewEvent, setPreviewEvent] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Live preview check as user types
  useEffect(() => {
    const clean = inviteCode.trim().toUpperCase();
    if (clean.length < 3) {
      setPreviewEvent(null);
      setPreviewError('');
      return;
    }

    const timer = setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError('');
      try {
        const res = await api.previewInvite(clean);
        const ev = res?.event || res;
        if (ev && ev.title) {
          setPreviewEvent(ev);
        } else {
          setPreviewEvent(null);
          setPreviewError('No active event matches this code.');
        }
      } catch (err) {
        setPreviewEvent(null);
        setPreviewError(err.message || 'Invalid or expired invitation code.');
      } finally {
        setPreviewLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [inviteCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) {
      showToast('Please enter an invitation code.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.joinEvent(cleanCode);
      showToast(res.message || 'Successfully joined event!', 'success');
      setIsSamplePreview(false);
      if (res?.event) {
        await selectEvent(res.event);
      }
      await refreshUserData();
      onSuccess?.();
      onClose();
      navigate('/volunteer/today');
    } catch (err) {
      showToast(err.message || 'Invalid or expired invitation code.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-body)'
        }}
      >
        <div
          className="p-6 border-b flex items-start justify-between"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <div>
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center mb-2"
              style={{
                backgroundColor: 'var(--lilac-subtle)',
                color: 'var(--lilac-accent)'
              }}
            >
              <KeyRound className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-editorial font-bold" style={{ color: 'var(--text-heading)' }}>
              Join an Event
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter the invitation code provided by your event organizer.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-heading)' }}>
              Invitation Code
            </label>
            <div className="relative">
              <input
                type="text"
                required
                maxLength={32}
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                placeholder="e.g. RALLY-2026 or INV-XXXXXX"
                className="w-full px-4 py-3 rounded-xl border text-center font-mono text-base font-extrabold tracking-widest uppercase outline-hidden"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-heading)'
                }}
              />
              {previewLoading && (
                <div className="absolute right-3 top-3 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              )}
            </div>
          </div>

          {/* Live Preview Card */}
          {previewEvent && (
            <div
              className="p-3.5 rounded-xl border animate-in fade-in"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--emerald-success, #10b981)'
              }}
            >
              <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Event Found</span>
              </div>
              <h4 className="font-extrabold text-sm mb-1" style={{ color: 'var(--text-heading)' }}>
                {previewEvent.title}
              </h4>
              {previewEvent.venueName && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span>{previewEvent.venueName}</span>
                </div>
              )}
              {previewEvent.startDate && (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>{new Date(previewEvent.startDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              )}
            </div>
          )}

          {previewError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{previewError}</span>
            </div>
          )}

          <div
            className="p-3.5 rounded-xl border text-[11px] leading-relaxed"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)'
            }}
          >
            <strong className="block mb-0.5 font-bold" style={{ color: 'var(--text-heading)' }}>
              Role Scope Policy:
            </strong>
            Joining via invitation code enrolls you as a verified Volunteer. Organizer access is never granted through public invitation codes.
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border text-xs font-semibold"
              style={{
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-heading)'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
              style={{
                backgroundColor: 'var(--action-lime)',
                color: 'var(--action-lime-text)'
              }}
            >
              {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{submitting ? 'Verifying Code...' : 'Join Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
