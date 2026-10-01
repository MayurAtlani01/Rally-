import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Calendar,
  Compass,
  AlertTriangle,
  MessageSquare,
  Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Sidebar({ onOpenPersonaModal }) {
  const location = useLocation();
  const { currentUser, userRole, isVolunteer } = useAuth();

  const navItems = isVolunteer
    ? [
        { to: '/volunteer/today', label: 'Today', icon: Calendar, matchPaths: ['/volunteer/today'] },
        { to: '/issues', label: 'Tasks', icon: AlertTriangle, matchPaths: ['/issues'] },
        { to: '/announcements', label: 'Updates', icon: MessageSquare, matchPaths: ['/announcements', '/messages'] },
        { to: '/setup', label: 'Profile', icon: Settings, matchPaths: ['/setup', '/settings'] }
      ]
    : [
        { to: '/overview', label: 'Overview', icon: Home, matchPaths: ['/overview', '/'] },
        { to: '/volunteers', label: 'People', icon: Users, matchPaths: ['/volunteers', '/people'] },
        { to: '/shifts', label: 'Schedule', icon: Calendar, matchPaths: ['/shifts', '/schedule'] },
        { to: '/map', label: 'Map', icon: Compass, matchPaths: ['/map'] },
        { to: '/issues', label: 'Issues', icon: AlertTriangle, matchPaths: ['/issues'] },
        { to: '/announcements', label: 'Messages', icon: MessageSquare, matchPaths: ['/announcements', '/messages'] },
        { to: '/setup', label: 'Settings', icon: Settings, matchPaths: ['/setup', '/settings'] }
      ];

  // Helper for short display name e.g. "Priya S."
  const getShortName = (name) => {
    if (!name) return 'User';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0]}.`;
  };

  return (
    <aside
      aria-label="Primary Navigation"
      className="w-[88px] shrink-0 border-r flex flex-col justify-between items-center py-5 select-none transition-colors hidden md:flex sticky top-0 h-screen z-30"
      style={{
        backgroundColor: 'var(--nav-rail-bg)',
        borderColor: 'var(--border-subtle)'
      }}
    >
      {/* Top: Serif R Monogram */}
      <div className="flex flex-col items-center gap-6 w-full">
        <NavLink
          to="/overview"
          className="group flex items-center justify-center w-12 h-12 rounded-2xl hover:scale-105 transition-transform"
          title="RALLY — Home"
        >
          <span
            className="font-editorial text-4xl font-bold tracking-tight transition-colors"
            style={{ color: 'var(--text-heading)' }}
          >
            R
          </span>
        </NavLink>

        {/* Navigation Items with icon + readable label */}
        <nav className="flex flex-col items-center gap-4 w-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.matchPaths.some((p) =>
              p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
            );

            return (
              <NavLink
                key={item.to}
                to={item.to}
                id={`nav-rail-${item.label.toLowerCase()}`}
                className="group flex flex-col items-center gap-1.5 w-full focus:outline-none"
                title={item.label}
              >
                <div
                  className={`w-11 h-9 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'shadow-xs font-bold scale-105'
                      : 'hover:bg-[var(--bg-surface-subtle)]'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--nav-pill-active)' : 'transparent',
                    color: isActive ? 'var(--nav-pill-active-text)' : 'var(--text-muted)'
                  }}
                >
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span
                  className="text-[11px] font-semibold tracking-tight transition-colors text-center"
                  style={{
                    color: isActive ? 'var(--text-heading)' : 'var(--text-muted)'
                  }}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom: User Avatar */}
      <div className="flex flex-col items-center gap-1.5 w-full px-2 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <button
          onClick={onOpenPersonaModal}
          className="group flex flex-col items-center gap-1 focus:outline-none hover:opacity-90 transition-opacity"
          title={`Active user: ${currentUser?.fullName} (${userRole}) — click to switch persona`}
          id="user-avatar-button"
        >
          <div className="relative">
            <img
              src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=120&auto=format&fit=crop&q=80'}
              alt={currentUser?.fullName || 'User'}
              className="w-10 h-10 rounded-full object-cover border-2 shadow-sm transition-transform group-hover:scale-105"
              style={{ borderColor: 'var(--border-strong)' }}
            />
            <span
              className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2"
              style={{
                backgroundColor: 'var(--emerald-success)',
                borderColor: 'var(--bg-canvas)'
              }}
            />
          </div>
          <span
            className="text-[10px] font-bold tracking-tight truncate max-w-[76px] text-center"
            style={{ color: 'var(--text-heading)' }}
          >
            {getShortName(currentUser?.fullName || 'Priya Sharma')}
          </span>
        </button>
      </div>
    </aside>
  );
}
