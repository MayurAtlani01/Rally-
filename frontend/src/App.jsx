import React, { useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar.jsx';
import Sidebar from './components/layout/Sidebar.jsx';
import MobileTabBar from './components/layout/MobileTabBar.jsx';
import LandingPage from './pages/LandingPage.jsx';
import AuthPage from './pages/AuthPage.jsx';
import NoEventsPage from './pages/NoEventsPage.jsx';
import LiveOverviewPage from './pages/LiveOverviewPage.jsx';
import ShiftPlannerPage from './pages/ShiftPlannerPage.jsx';
import VolunteerDirectoryPage from './pages/VolunteerDirectoryPage.jsx';
import VolunteerTodayPage from './pages/VolunteerTodayPage.jsx';
import TasksIssuesPage from './pages/TasksIssuesPage.jsx';
import AnnouncementsPage from './pages/AnnouncementsPage.jsx';
import HandoverNotesPage from './pages/HandoverNotesPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import EventSetupPage from './pages/EventSetupPage.jsx';
import EventSetupModal from './components/setup/EventSetupModal.jsx';
import JoinEventModal from './components/setup/JoinEventModal.jsx';
import { LogOut, X } from 'lucide-react';
import { useAuth } from './context/AuthContext.jsx';

export default function App() {
  const location = useLocation();
  const { loading, refreshUserData, personas, currentUser, userEvents, userRole, switchPersona, logout } = useAuth();
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [showJoinEvent, setShowJoinEvent] = useState(false);
  const [showPersonaModal, setShowPersonaModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const isLandingPath = location.pathname === '/' || location.pathname === '/landing';
  const hasInviteParam = location.search.includes('invite') || location.pathname.startsWith('/join');

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        <div className="w-12 h-12 rounded-2xl bg-[#C4F03A] flex items-center justify-center text-slate-950 font-editorial text-3xl font-bold animate-bounce shadow-md">
          R
        </div>
        <p className="text-xs font-semibold text-slate-400">Loading RALLY platform...</p>
      </div>
    );
  }

  // Not authenticated
  if (!currentUser) {
    if (isLandingPath && !hasInviteParam) {
      return (
        <>
          <LandingPage
            onOpenCreateEvent={() => setShowAuthModal(true)}
            onOpenJoinEvent={() => setShowAuthModal(true)}
            onLogin={() => setShowAuthModal(true)}
          />
          {showAuthModal && (
            <div className="fixed inset-0 z-50 overflow-y-auto">
              <AuthPage onAuthSuccess={refreshUserData} />
            </div>
          )}
        </>
      );
    }
    return <AuthPage onAuthSuccess={refreshUserData} />;
  }

  // Authenticated user directly visiting /landing
  if (location.pathname === '/landing') {
    return (
      <>
        <LandingPage
          onOpenCreateEvent={() => setShowCreateEvent(true)}
          onOpenJoinEvent={() => setShowJoinEvent(true)}
          onLogin={() => {}}
        />
        {showCreateEvent && (
          <EventSetupModal
            onClose={() => setShowCreateEvent(false)}
            onSuccess={refreshUserData}
          />
        )}
        {showJoinEvent && (
          <JoinEventModal
            onClose={() => setShowJoinEvent(false)}
            onSuccess={refreshUserData}
          />
        )}
      </>
    );
  }

  // Authenticated user with ZERO events
  if (userEvents.length === 0) {
    return (
      <>
        <NoEventsPage
          onCreateEvent={() => setShowCreateEvent(true)}
          onJoinEvent={() => setShowJoinEvent(true)}
        />
        {showCreateEvent && (
          <EventSetupModal
            onClose={() => setShowCreateEvent(false)}
            onSuccess={refreshUserData}
          />
        )}
        {showJoinEvent && (
          <JoinEventModal
            onClose={() => setShowJoinEvent(false)}
            onSuccess={refreshUserData}
          />
        )}
      </>
    );
  }

  // Normal Authenticated Workspace
  return (
    <div
      className="min-h-screen flex w-full transition-colors"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      {/* Desktop Left Rail (approx 88px) */}
      <Sidebar onOpenPersonaModal={() => setShowPersonaModal(true)} />

      {/* Main Content Area: Top Bar + Scrollable Content */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        <Navbar
          onOpenCreateEvent={() => setShowCreateEvent(true)}
          onOpenJoinEvent={() => setShowJoinEvent(true)}
        />

        <main className="flex-1 min-w-0 pb-16 md:pb-6 overflow-y-auto">
          <Routes>
            <Route path="/overview" element={<LiveOverviewPage />} />
            <Route path="/shifts" element={<ShiftPlannerPage />} />
            <Route path="/schedule" element={<ShiftPlannerPage />} />
            <Route path="/volunteers" element={<VolunteerDirectoryPage />} />
            <Route path="/people" element={<VolunteerDirectoryPage />} />
            <Route path="/volunteer/today" element={<VolunteerTodayPage />} />
            <Route path="/map" element={<LiveOverviewPage />} />
            <Route path="/issues" element={<TasksIssuesPage />} />
            <Route path="/announcements" element={<AnnouncementsPage />} />
            <Route path="/messages" element={<AnnouncementsPage />} />
            <Route path="/handover" element={<HandoverNotesPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/setup" element={<EventSetupPage />} />
            <Route path="/settings" element={<EventSetupPage />} />
            <Route
              path="/landing"
              element={
                <LandingPage
                  onOpenCreateEvent={() => setShowCreateEvent(true)}
                  onOpenJoinEvent={() => setShowJoinEvent(true)}
                />
              }
            />
            <Route
              path="*"
              element={
                <Navigate
                  to={userRole === 'volunteer' ? '/volunteer/today' : '/overview'}
                  replace
                />
              }
            />
          </Routes>
        </main>
      </div>

      <MobileTabBar />

      {/* Global Modals */}
      {showCreateEvent && (
        <EventSetupModal
          onClose={() => setShowCreateEvent(false)}
          onSuccess={refreshUserData}
        />
      )}
      {showJoinEvent && (
        <JoinEventModal
          onClose={() => setShowJoinEvent(false)}
          onSuccess={refreshUserData}
        />
      )}

      {/* Switch Persona Modal (Demo/Testing Identity Switching) */}
      {showPersonaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-body)'
            }}
          >
            <div className="flex items-center justify-between pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h3 className="font-editorial text-lg font-bold" style={{ color: 'var(--text-heading)' }}>
                  Switch Test Persona
                </h3>
                <p className="text-xs text-slate-500">
                  Switch roles instantly between Elena, Marcus, and volunteers
                </p>
              </div>
              <button
                onClick={() => setShowPersonaModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 flex items-center justify-center cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {personas.map((p) => {
                const isCurrent = currentUser?.id === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      switchPersona(p.id);
                      setShowPersonaModal(false);
                    }}
                    className={`w-full p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      isCurrent ? 'ring-2 ring-[#7054E8]' : 'hover:opacity-90'
                    }`}
                    style={{
                      backgroundColor: isCurrent ? 'var(--bg-surface-subtle)' : 'var(--bg-surface)',
                      borderColor: 'var(--border-subtle)'
                    }}
                  >
                    <img
                      src={p.avatarUrl}
                      alt={p.name}
                      className="w-10 h-10 rounded-full object-cover border"
                      style={{ borderColor: 'var(--border-strong)' }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs" style={{ color: 'var(--text-heading)' }}>
                          {p.name}
                        </span>
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded font-bold border" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
                          {p.role}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{p.email}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="pt-3 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                onClick={() => {
                  setShowPersonaModal(false);
                  logout();
                }}
                className="w-full py-2.5 px-4 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out of account</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
