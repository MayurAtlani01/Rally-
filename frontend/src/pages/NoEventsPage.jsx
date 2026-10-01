import React, { useState, useEffect } from 'react';
import { Calendar, Plus, KeyRound, LogOut, Sparkles, MapPin, Clock, ArrowRight, UserCheck, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { api } from '../services/api.js';

export default function NoEventsPage({ onCreateEvent, onJoinEvent }) {
  const { currentUser, logout, pendingInviteCode, clearPendingInvite, selectEvent, showToast, refreshUserData, setIsSamplePreview } = useAuth();
  const { isNight, toggleTheme } = useTheme();

  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!pendingInviteCode) return;
    setLoadingPreview(true);
    const clean = pendingInviteCode.trim().toUpperCase();
    api.previewInvite(clean)
      .then(data => setPreviewData(data?.event || data))
      .catch(err => {
        console.warn('Invite preview notice:', err.message);
        setPreviewData(null);
      })
      .finally(() => setLoadingPreview(false));
  }, [pendingInviteCode]);

  const handleConfirmJoin = async () => {
    if (!pendingInviteCode) return;
    setJoining(true);
    try {
      const clean = pendingInviteCode.trim().toUpperCase();
      const res = await api.joinEvent(clean);
      showToast(res.message || 'Joined event successfully!', 'success');
      clearPendingInvite();
      setIsSamplePreview(false);
      if (res?.event) {
        await selectEvent(res.event);
      }
      await refreshUserData();
    } catch (err) {
      showToast(err.message || 'Failed to join event', 'error');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col justify-between p-4 sm:p-8 transition-colors"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      {/* Top Navbar */}
      <div className="flex items-center justify-between pb-6 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center font-editorial text-2xl font-bold shadow-sm"
            style={{
              backgroundColor: 'var(--action-lime)',
              color: 'var(--action-lime-text)'
            }}
          >
            R
          </div>
          <div>
            <span className="font-editorial text-xl font-bold tracking-tight" style={{ color: 'var(--text-heading)' }}>
              RALLY
            </span>
            <span className="text-[10px] text-slate-400 block tracking-widest font-mono uppercase">
              Operations Hub
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="px-3 py-1.5 rounded-full border text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5"
            style={{
              borderColor: 'var(--border-subtle)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-heading)'
            }}
          >
            {isNight ? (
              <>
                <Moon className="w-3.5 h-3.5 text-violet-400" />
                <span>Night mode</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                <span>Day mode</span>
              </>
            )}
          </button>

          <div
            className="flex items-center gap-2 pl-3 border-l"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <span className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>
              {currentUser?.fullName || currentUser?.email}
            </span>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-lg border text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-2xl mx-auto w-full my-auto py-12 text-center space-y-8">
        {/* Pending Invitation Join Preview */}
        {pendingInviteCode && previewData && (
          <div
            className="p-6 rounded-3xl border shadow-lg text-left space-y-4 animate-in fade-in transition-all"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--lilac-accent)'
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--lilac-subtle)',
                  color: 'var(--lilac-text)'
                }}
              >
                Event Invitation
              </span>
              <span className="font-mono text-xs font-bold text-[#7054E8] bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded border border-violet-200 dark:border-violet-800">
                {previewData.inviteCode}
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-editorial font-bold" style={{ color: 'var(--text-heading)' }}>
                {previewData.title}
              </h2>
              {previewData.description && (
                <p className="text-xs text-slate-500 mt-1">{previewData.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div
                className="p-3 rounded-xl border flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <MapPin className="w-4 h-4 text-slate-400" />
                <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                  {previewData.venueName}
                </span>
              </div>
              <div
                className="p-3 rounded-xl border flex items-center gap-2"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <Clock className="w-4 h-4 text-slate-400" />
                <span className="font-semibold" style={{ color: 'var(--text-heading)' }}>
                  {previewData.timezone || 'UTC'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between gap-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-[11px] text-slate-500">
                Organizer: <strong className="text-slate-700 dark:text-slate-300">{previewData.organizerName}</strong>
              </span>
              <button
                onClick={handleConfirmJoin}
                disabled={joining}
                className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--action-lime)',
                  color: 'var(--action-lime-text)'
                }}
              >
                <UserCheck className="w-4 h-4" />
                <span>{joining ? 'Joining...' : 'Confirm & Join Event'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Zero Events Exact Headline */}
        <div className="space-y-3">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 border shadow-sm"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--lilac-accent)'
            }}
          >
            <Calendar className="w-8 h-8" />
          </div>

          <h1
            className="font-editorial text-4xl sm:text-5xl font-bold tracking-tight"
            style={{ color: 'var(--text-heading)' }}
          >
            You haven’t joined any events yet.
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
            Create an event to start coordinating staff, zones, and schedules, or enter an invitation code to join an existing festival.
          </p>
        </div>

        {/* Exact Actions Required: "Create an event" and "Join an event" */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
          <button
            onClick={onCreateEvent}
            id="create-event-action-button"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] hover:opacity-95"
            style={{
              backgroundColor: 'var(--action-lime)',
              color: 'var(--action-lime-text)'
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Create an event</span>
          </button>

          <button
            onClick={onJoinEvent}
            id="join-event-action-button"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border shadow-2xs transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{
              borderColor: 'var(--border-strong)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-heading)'
            }}
          >
            <KeyRound className="w-4 h-4 text-[#7054E8]" />
            <span>Join an event</span>
          </button>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-6 border-t text-center text-[11px] text-slate-400" style={{ borderColor: 'var(--border-subtle)' }}>
        RALLY Operations Platform · Event coordination with zero placeholder records
      </div>
    </div>
  );
}
