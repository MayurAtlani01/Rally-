import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  Bell,
  Sun,
  Moon,
  ChevronDown,
  ExternalLink,
  Plus,
  UserCheck,
  Check,
  Copy,
  Sparkles,
  RotateCcw,
  Users,
  LogOut,
  ArrowUpRight,
  X,
  AlertTriangle,
  Link2,
  Share2,
  Mail,
  MessageSquare,
  ShieldCheck
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ReportIssueModal from '../issues/ReportIssueModal.jsx';

export default function Navbar({ onOpenCreateEvent, onOpenJoinEvent }) {
  const {
    currentEvent,
    userEvents,
    userRole,
    isVolunteer,
    personas,
    notifications,
    unreadNotifsCount,
    switchPersona,
    resetDemoState,
    logout,
    isSamplePreview,
    setIsSamplePreview,
    toggleUserRole,
    refreshUserData
  } = useAuth();

  const navigate = useNavigate();
  const { toggleTheme, isNight } = useTheme();

  const [showEventMenu, setShowEventMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showReportIssue, setShowReportIssue] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Live ticking clock for event-local time (e.g. 11:30 AM)
  const [timeString, setTimeString] = useState(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  const effectiveInviteCode = (
    currentEvent?.inviteCode ||
    (isSamplePreview ? 'RALLY-2026' : (userEvents?.[0]?.inviteCode || 'IGNITE-JKI1U'))
  );
  const inviteUrl = `${window.location.origin}/?invite=${effectiveInviteCode}`;

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(effectiveInviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard?.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b px-4 lg:px-6 py-3 transition-colors backdrop-blur-md"
        style={{
          backgroundColor: 'var(--bg-canvas)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div className="max-w-[1720px] mx-auto flex items-center justify-between gap-4">
          {/* Left: Brand + Section Breadcrumb + Event Selector */}
          <div className="flex items-center gap-3 md:gap-5">
            <Link to={isVolunteer ? "/volunteer/today" : "/overview"} className="flex items-center gap-2 group">
              <span
                className="font-black text-sm tracking-widest uppercase transition-colors"
                style={{ color: 'var(--text-heading)' }}
              >
                RALLY
              </span>
              <span className="text-slate-400 font-light text-sm">/</span>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                LIVE OPERATIONS
              </span>
            </Link>

            {/* Event Selector Pill */}
            <div className="relative">
              <button
                onClick={() => setShowEventMenu(!showEventMenu)}
                id="event-selector-button"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold transition-all shadow-2xs hover:opacity-90"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-heading)'
                }}
              >
                <span>{isSamplePreview ? 'Rally Festival' : (currentEvent?.title || 'Rally Festival')}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {showEventMenu && (
                <div
                  className="absolute left-0 mt-2 w-72 rounded-2xl shadow-xl border p-2 z-50 animate-in fade-in duration-100"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)'
                  }}
                  onClick={() => setShowEventMenu(false)}
                >
                  <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Select Event
                  </div>
                  <div
                    className="px-3 py-2 rounded-xl mb-2 cursor-pointer hover:bg-white/5"
                    style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
                    onClick={() => setIsSamplePreview(true)}
                  >
                    <p className="font-bold text-xs" style={{ color: 'var(--text-heading)' }}>
                      Rally Festival (Sample Preview)
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Isometric Map • 4 Zones • 24 Volunteers</p>
                  </div>
                  {currentEvent && (
                    <div
                      className="px-3 py-2 rounded-xl mb-2 cursor-pointer hover:bg-white/5"
                      style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
                      onClick={() => setIsSamplePreview(false)}
                    >
                      <p className="font-bold text-xs" style={{ color: 'var(--text-heading)' }}>
                        {currentEvent.title} (Live Event)
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{currentEvent.venueName}</p>
                      <div className="mt-2 flex items-center gap-2 text-xs">
                        <span
                          className="font-mono px-2 py-0.5 rounded text-[11px] font-bold border"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-heading)'
                          }}
                        >
                          Code: {currentEvent.inviteCode}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="border-t pt-1 flex flex-col gap-1" style={{ borderColor: 'var(--border-subtle)' }}>
                    <button
                      onClick={onOpenJoinEvent}
                      className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                      style={{ color: 'var(--text-heading)' }}
                    >
                      <UserCheck className="w-4 h-4 text-violet-500" />
                      Join another event
                    </button>
                    <button
                      onClick={onOpenCreateEvent}
                      className="w-full text-left px-3 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                      style={{ color: 'var(--text-heading)' }}
                    >
                      <Plus className="w-4 h-4 text-emerald-500" />
                      Create new event
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* DESIGN PREVIEW • SAMPLE EVENT Pill */}
            <button
              onClick={() => setIsSamplePreview(!isSamplePreview)}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border border-purple-500/30 bg-purple-950/40 text-purple-300 hover:bg-purple-900/50 transition-all cursor-pointer shadow-2xs"
              title="Click to toggle sample event preview mode"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isSamplePreview ? 'bg-purple-400 animate-pulse' : 'bg-slate-500'}`} />
              <span>DESIGN PREVIEW • SAMPLE EVENT</span>
            </button>
          </div>

          {/* Right: Live indicator + Time + Theme Switcher + Role Switcher + Notifications + Action Button */}
          <div className="flex items-center gap-2.5 sm:gap-3.5">
            {/* Live Connection & Event Time */}
            <div
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border shadow-2xs"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-heading)'
              }}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-bold tracking-tight text-[11px] text-emerald-600 dark:text-emerald-400">
                LIVE
              </span>
              <span className="text-slate-400 text-[10px]">•</span>
              <span className="tabular-nums text-xs font-bold text-slate-700 dark:text-slate-300">
                {timeString || '11:30 AM'}
              </span>
            </div>

            {/* Day / Night Theme Toggle */}
            <button
              onClick={toggleTheme}
              id="theme-toggle-button"
              className="p-2 rounded-full border transition-all hover:scale-105 shadow-2xs focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: isNight ? '#FBBF24' : '#475569'
              }}
              title={isNight ? 'Switch to Day theme (Warm Ivory)' : 'Switch to Night theme (Aubergine)'}
              aria-label="Toggle daytime/nighttime theme"
            >
              {isNight ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Role Switcher Button (Matching purple badge in Image 3) */}
            <div className="relative">
              <button
                onClick={() => {
                  const nextRole = userRole === 'volunteer' ? 'organizer' : 'volunteer';
                  toggleUserRole();
                  if (nextRole === 'volunteer') {
                    navigate('/volunteer/today');
                  } else {
                    navigate('/overview');
                  }
                }}
                id="role-switch-button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer hover:opacity-90 active:scale-95 border border-purple-500/50 bg-[#2e1065] text-purple-200"
                title="Click to switch between ORGANIZER and VOLUNTEER dashboard views"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-300" />
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  ROLE: {userRole}
                </span>
                <ChevronDown className="w-3 h-3 text-purple-300 opacity-60" />
              </button>
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifs(!showNotifs)}
                id="notifications-button"
                className="relative p-2 rounded-full border transition-all hover:scale-105 shadow-2xs"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-heading)'
                }}
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifsCount > 0 && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
                )}
              </button>

              {showNotifs && (
                <div
                  className="absolute right-0 mt-2 w-80 rounded-2xl shadow-xl border p-2 z-50 animate-in fade-in duration-100"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)'
                  }}
                  onClick={() => setShowNotifs(false)}
                >
                  <div className="px-3 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--text-heading)' }}>
                      Notifications
                    </span>
                    <span className="text-[11px] text-slate-400">{unreadNotifsCount} unread</span>
                  </div>
                  <div className="py-1 max-h-72 overflow-y-auto divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                    {notifications.length === 0 ? (
                      <div className="py-6 text-center text-xs text-slate-400">
                        No notifications at this time.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          className="p-3 text-xs hover:bg-slate-100/60 dark:hover:bg-slate-800/60 rounded-xl"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-bold" style={{ color: 'var(--text-heading)' }}>
                              {n.title}
                            </p>
                            <span className="text-[10px] text-slate-400 whitespace-nowrap">
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-slate-500 mt-1 leading-relaxed text-[11px]">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Action Button: "Invite team" (Organizer) vs "Report issue" (Volunteer) */}
            {isVolunteer ? (
              <button
                onClick={() => setShowReportIssue(true)}
                id="navbar-report-issue-button"
                className="px-3.5 py-1.5 rounded-full font-bold text-xs flex items-center gap-1.5 border border-rose-500/40 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                <span>Report issue</span>
              </button>
            ) : (
              <button
                onClick={() => setShowInviteModal(true)}
                id="invite-team-button"
                className="px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                style={{
                  backgroundColor: 'var(--action-lime)',
                  color: 'var(--action-lime-text)'
                }}
              >
                <span>Invite team</span>
                <ArrowUpRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </button>
            )}

            {/* Direct Logout Button */}
            <button
              onClick={logout}
              id="navbar-direct-logout"
              className="p-2 rounded-full border transition-all hover:scale-105 shadow-2xs hover:border-rose-300 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)'
              }}
              title="Log out of RALLY"
              aria-label="Log out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Volunteer Report Issue Modal */}
      {showReportIssue && (
        <ReportIssueModal
          initialZoneId={null}
          onClose={() => setShowReportIssue(false)}
          onSuccess={refreshUserData}
        />
      )}

      {/* Invite Team Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-lg rounded-3xl p-6 shadow-2xl border animate-in zoom-in-95 space-y-5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    backgroundColor: 'var(--lilac-subtle)',
                    color: 'var(--lilac-accent)'
                  }}
                >
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold" style={{ color: 'var(--text-heading)' }}>
                    Invite Crew & Volunteers
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {currentEvent?.title || 'Event Team Onboarding'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 flex items-center justify-center cursor-pointer rounded-lg"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Anyone with this invitation link or code can join this event directly. When they sign up or log in, they will be automatically enrolled as a Volunteer.
            </p>

            {/* Direct Invitation Link */}
            <div
              className="p-3.5 rounded-2xl border space-y-2"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5" />
                  Direct Invitation Link
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Auto-enrolling</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteUrl}
                  className="flex-1 px-3 py-2 text-xs font-mono rounded-xl border bg-black/10 dark:bg-black/30 border-slate-700/30 text-slate-300 select-all outline-hidden truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 cursor-pointer shadow-xs"
                  style={{
                    backgroundColor: copiedLink ? 'var(--emerald-success)' : 'var(--action-lime)',
                    color: copiedLink ? '#FFFFFF' : 'var(--action-lime-text)'
                  }}
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            {/* Event Code Section */}
            <div
              className="p-3.5 rounded-2xl border"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                    Manual Join Code
                  </span>
                  <span className="font-mono text-lg font-black tracking-widest" style={{ color: 'var(--text-heading)' }}>
                    {effectiveInviteCode}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer hover:bg-slate-500/10"
                  style={{
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-heading)'
                  }}
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            {/* Quick Share Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Join our team for ${currentEvent?.title || 'the festival'} on RALLY: ${inviteUrl}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold hover:bg-slate-500/10 transition-colors"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-heading)'
                }}
              >
                <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                <span>WhatsApp</span>
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(`Join ${currentEvent?.title || 'Event'} Crew on RALLY`)}&body=${encodeURIComponent(`You have been invited to join the volunteer crew for ${currentEvent?.title || 'our event'}.\n\nClick this link to join directly:\n${inviteUrl}\n\nInvite Code: ${effectiveInviteCode}`)}`}
                className="flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-xs font-semibold hover:bg-slate-500/10 transition-colors"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-heading)'
                }}
              >
                <Mail className="w-3.5 h-3.5 text-violet-400" />
                <span>Email</span>
              </a>
            </div>

            {/* Security Notice */}
            <div
              className="p-3 rounded-xl border flex items-start gap-2.5 text-[11px] leading-relaxed"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)'
              }}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>
                <strong>Volunteer Security:</strong> Joining via this invite grants Volunteer access only. Organizer and administrative controls are protected.
              </span>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowInviteModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold border hover:bg-slate-500/10 transition-colors cursor-pointer"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-heading)'
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
