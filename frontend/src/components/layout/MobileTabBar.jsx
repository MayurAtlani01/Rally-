import React from 'react';
import { NavLink } from 'react-router-dom';
import { CheckSquare, AlertCircle, MessageSquare, Compass, Users, Clock, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function MobileTabBar() {
  const { isVolunteer } = useAuth();

  const tabs = isVolunteer
    ? [
        { to: '/volunteer/today', label: 'Today', icon: CheckSquare },
        { to: '/issues', label: 'Tasks', icon: AlertCircle },
        { to: '/announcements', label: 'Updates', icon: MessageSquare },
        { to: '/setup', label: 'Profile', icon: User }
      ]
    : [
        { to: '/overview', label: 'Overview', icon: Compass },
        { to: '/shifts', label: 'Schedule', icon: Clock },
        { to: '/volunteers', label: 'People', icon: Users },
        { to: '/issues', label: 'Issues', icon: AlertCircle },
        { to: '/announcements', label: 'Messages', icon: MessageSquare }
      ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t px-2 py-1 flex items-center justify-around shadow-lg transition-colors"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)'
      }}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-2.5 rounded-xl transition-all ${
                isActive ? 'scale-105' : 'opacity-70 hover:opacity-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className="p-1 rounded-xl"
                  style={{
                    backgroundColor: isActive ? 'var(--action-lime)' : 'transparent',
                    color: isActive ? 'var(--action-lime-text)' : 'var(--text-muted)'
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className="text-[10px] tracking-tight font-bold mt-0.5"
                  style={{
                    color: isActive ? 'var(--text-heading)' : 'var(--text-muted)'
                  }}
                >
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
