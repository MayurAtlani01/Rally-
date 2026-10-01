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
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Navbar({ onOpenCreateEvent, onOpenJoinEvent }) {
  const {
    currentEvent,
    userRole,
    personas,
    notifications,
    unreadNotifsCount,
    switchPersona,
    resetDemoState
  } = useAuth();

  const { toggleTheme, isNight } = useTheme();

  const [showEventMenu, setShowEventMenu] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  // Live ticking clock for event-local time (defaulting to 11:04 AM format)
  const [timeString, setTimeString] = useState('');
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  const handleCopyCode = () => {
    const code = currentEvent?.inviteCode || 'TECHFEST';
    navigator.clipboard?.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
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
            <Link to="/overview" className="flex items-center gap-2 group">
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
            {currentEvent && (
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
                  <span>{currentEvent.title || 'TechFest 2026'}</span>
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
                      Active Event
                    </div>
                    <div
                      className="px-3 py-2 rounded-xl mb-2"
                      style={{ backgroundColor: 'var(--bg-surface-subtle)' }}
                    >
                      <p className="font-bold text-xs" style={{ color: 'var(--text-heading)' }}>
                        {currentEvent.title}
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
            )}
          </div>

          {/* Right: Live indicator + Time + Theme Switcher + Notifications + Invite team */}
          <div className="flex items-center gap-2.5 sm:gap-4">
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
                {timeString || '11:04 AM'}
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

            {/* Persona Switcher Quick Pill */}
            <div className="relative hidden xl:block">
              <button
                onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-xs font-semibold shadow-2xs hover:opacity-90"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-heading)'
                }}
                title="Switch persona (Organizer / Coordinator / Volunteer)"
              >
                <Sparkles className="w-3.5 h-3.5 text-violet-500" />
                <span className="text-[11px] text-slate-500">Role:</span>
                <span className="text-[11px] font-bold uppercase">{userRole}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showPersonaMenu && (
                <div
                  className="absolute right-0 mt-2 w-72 rounded-2xl shadow-xl border p-2 z-50 animate-in fade-in duration-100"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)'
                  }}
                  onClick={() => setShowPersonaMenu(false)}
                >
                  <div className="px-3 py-1.5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span className="text-xs font-bold" style={{ color: 'var(--text-heading)' }}>
                      Switch Persona
                    </span>
                    <button
                      onClick={resetDemoState}
                      className="text-[10px] text-violet-500 hover:underline flex items-center gap-1"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      Reset demo
                    </button>
                  </div>
                  <div className="py-1 max-h-60 overflow-y-auto">
                    {personas.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => switchPersona(p.id)}
                        className="w-full text-left px-3 py-2 rounded-xl flex items-center gap-2.5 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <img
                          src={p.avatarUrl}
                          alt={p.name}
                          className="w-7 h-7 rounded-full object-cover border"
                          style={{ borderColor: 'var(--border-strong)' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate" style={{ color: 'var(--text-heading)' }}>
                            {p.name}
                          </p>
                          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">
                            {p.role}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
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

            {/* Lime "Invite team ↗" Button */}
            <button
              onClick={() => setShowInviteModal(true)}
              id="invite-team-button"
              className="px-4 py-2 rounded-full font-bold text-xs flex items-center gap-1.5 shadow-sm hover:opacity-90 active:scale-95 transition-all"
              style={{
                backgroundColor: 'var(--action-lime)',
                color: 'var(--action-lime-text)'
              }}
            >
              <span>Invite team</span>
              <span className="text-xs leading-none">↗</span>
            </button>
          </div>
        </div>
      </header>

      {/* Invite Team Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl border animate-in zoom-in-95"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-violet-500" />
                <h3 className="text-base font-extrabold" style={{ color: 'var(--text-heading)' }}>
                  Invite Team Members
                </h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Share this invite code or link with coordinators and volunteers. They can join {currentEvent?.title} directly without needing pre-created accounts.
            </p>

            <div className="mt-4 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-surface-subtle)', borderColor: 'var(--border-subtle)' }}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Event Invite Code
              </span>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-xl font-black tracking-widest" style={{ color: 'var(--text-heading)' }}>
                  {currentEvent?.inviteCode || 'TECHFEST'}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
                  style={{
                    backgroundColor: copiedCode ? 'var(--emerald-success)' : 'var(--action-lime)',
                    color: copiedCode ? '#FFFFFF' : 'var(--action-lime-text)'
                  }}
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border hover:bg-slate-100 dark:hover:bg-slate-800"
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
