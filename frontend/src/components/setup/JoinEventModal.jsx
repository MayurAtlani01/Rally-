import React, { useState } from 'react';
import { X, KeyRound, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

export default function JoinEventModal({ onClose, onSuccess }) {
  const { selectEvent, showToast, refreshUserData } = useAuth();
  const navigate = useNavigate();
  const [inviteCode, setInviteCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) {
      showToast('Please enter an invitation code.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.joinEvent(inviteCode.trim());
      showToast(res.message || 'Successfully joined event!', 'success');
      await selectEvent(res.event);
      await refreshUserData();
      onSuccess?.();
      onClose();
      navigate('/volunteer/today');
    } catch (err) {
      showToast(err.message || 'Invalid invitation code.', 'error');
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
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-heading)' }}>
              Invitation Code
            </label>
            <input
              type="text"
              required
              maxLength={12}
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="e.g. INV-XXXXXX"
              className="w-full px-4 py-3 rounded-xl border text-center font-mono text-base font-extrabold tracking-widest uppercase outline-hidden"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-heading)'
              }}
            />
          </div>

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
            Joining via invitation code enrolls you as a verified Volunteer. Organizer access is never granted through invitation codes.
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
              style={{
                backgroundColor: 'var(--action-lime)',
                color: 'var(--action-lime-text)'
              }}
            >
              <span>{submitting ? 'Verifying Code...' : 'Join Event'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
