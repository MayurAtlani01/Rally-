import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  Calendar,
  Compass,
  AlertTriangle,
  MessageSquare,
  Settings,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Sidebar({ onOpenPersonaModal }) {
  const location = useLocation();
  const { currentUser, userRole, isVolunteer, logout } = useAuth();

  const navItems = isVolunteer
    ? [
        { to: '/volunteer/today', label: 'Today', icon: Home, matchPaths: ['/volunteer/today'] },
        { to: '/shifts', label: 'My shifts', icon: Calendar, matchPaths: ['/shifts', '/schedule'] },
        { to: '/map', label: 'Venue', icon: Compass, matchPaths: ['/map'] },
        { to: '/announcements', label: 'Updates', icon: MessageSquare, matchPaths: ['/announcements', '/messages'] },
        { to: '/setup', label: 'Profile', icon: Users, matchPaths: ['/setup', '/settings'] }
      ]
    : [
        { to: '/overview', label: 'Overview', icon: Home, matchPaths: ['/overview', '/'] },
        { to: '/volunteers', label: 'People', icon: Users, matchPaths: ['/volunteers', '/people'] },
        { to: '/shifts', label: 'Schedule', icon: Calendar, matchPaths: ['/shifts', '/schedule'] },
        { to: '/map', label: 'Map', icon: Compass, matchPaths: ['/map'] },
        { to: '/issues', label: 'Issues', icon: AlertTriangle, matchPaths: ['/issues'] },
        { to: '/announcements', label: 'Updates', icon: MessageSquare, matchPaths: ['/announcements', '/messages'] },
        { to: '/setup', label: 'Settings', icon: Settings, matchPaths: ['/setup', '/settings'] }
      ];

  // Helper for short display name e.g. "Mayuresh A."
  const getShortName = (name) => {
    if (!name) return 'Mayuresh A.';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1][0]}.`;
  };

  return (
    <aside
      aria-label="Primary Navigation"
      className="w-[90px] shrink-0 border-r flex flex-col justify-between items-center py-5 select-none transition-colors hidden md:flex sticky top-0 h-screen z-30"
      style={{
        backgroundColor: '#0c0817',
        borderColor: 'rgba(255, 255, 255, 0.08)'
      }}
    >
      {/* Top: RALLY Wordmark */}
      <div className="flex flex-col items-center gap-5 w-full">
        <NavLink
          to={isVolunteer ? '/volunteer/today' : '/overview'}
          className="group flex items-center justify-center py-2 px-1 hover:scale-105 transition-transform"
          title="RALLY"
        >
          <span className="font-black italic text-2xl tracking-tight uppercase text-white font-sans">
            RALLY
          </span>
        </NavLink>

        {/* Navigation Items */}
        <nav className="flex flex-col items-center gap-3.5 w-full px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.matchPaths.some((p) =>
              p === '/' ? location.pathname === '/' : location.pathname.startsWith(p)
            );

            return (
              <NavLink
                key={item.to}
                to={item.to}
                id={`nav-rail-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className="group flex flex-col items-center gap-1 w-full focus:outline-none"
                title={item.label}
              >
                <div
                  className={`w-12 h-10 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isActive
                      ? 'shadow-md font-bold scale-105'
                      : 'hover:bg-white/5 text-slate-400'
                  }`}
                  style={{
                    backgroundColor: isActive ? 'var(--action-lime)' : 'transparent',
                    color: isActive ? 'var(--action-lime-text)' : 'inherit'
                  }}
                >
                  <Icon className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span
                  className={`text-[11px] font-semibold tracking-tight transition-colors text-center ${
                    isActive ? 'text-white font-bold' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Bottom: User Profile & Role */}
      <div className="flex flex-col items-center gap-1.5 w-full px-2 pt-3 border-t border-white/10">
        <button
          onClick={onOpenPersonaModal}
          className="group flex flex-col items-center gap-1 focus:outline-none hover:opacity-90 transition-opacity"
          title={`Active user: ${currentUser?.fullName || 'Mayuresh A.'} (${userRole}) — click to switch persona`}
          id="user-avatar-button"
        >
          <div className="relative">
            <img
              src={currentUser?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'}
              alt={currentUser?.fullName || 'User'}
              className="w-10 h-10 rounded-full object-cover border-2 border-white/20 shadow-sm transition-transform group-hover:scale-105"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#0c0817]" />
          </div>
          <span className="text-[11px] font-bold text-white tracking-tight truncate max-w-[80px] text-center">
            {getShortName(currentUser?.fullName || 'Mayuresh A.')}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-slate-400 font-bold -mt-0.5">
            {userRole}
          </span>
        </button>

        <button
          onClick={logout}
          className="mt-1 w-full py-1 px-1.5 rounded-xl flex items-center justify-center gap-1 text-[10px] font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
          title="Log out of RALLY"
          id="sidebar-logout-button"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}
