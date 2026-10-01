import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api, setApiSession, clearApiSession, getApiSession } from '../services/api.js';
import { supabaseAuth, isSupabaseConfigured } from '../services/supabase.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [userEvents, setUserEvents] = useState([]);
  const [userRole, setUserRole] = useState('organizer');
  const [personas, setPersonas] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [pendingInviteCode, setPendingInviteCode] = useState(() => {
    // Check URL or localStorage for pending invite code
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get('invite');
    if (fromUrl) {
      localStorage.setItem('rally_pending_invite', fromUrl.toUpperCase());
      return fromUrl.toUpperCase();
    }
    return localStorage.getItem('rally_pending_invite') || null;
  });
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => {
      setToast(curr => (curr && curr.id === Date.now() ? null : null));
    }, 4500);
  }, []);

  const refreshUserData = useCallback(async () => {
    try {
      const session = getApiSession();
      if (!session.userId && !session.token) {
        // Check if Supabase has an active session
        if (isSupabaseConfigured) {
          const s = await supabaseAuth.getSession();
          if (s?.user) {
            setApiSession(s.user.id, null, s.access_token);
          } else {
            setCurrentUser(null);
            setCurrentEvent(null);
            setUserEvents([]);
            setLoading(false);
            return;
          }
        } else {
          setCurrentUser(null);
          setCurrentEvent(null);
          setUserEvents([]);
          setLoading(false);
          return;
        }
      }

      // Try fetching current profile & memberships
      const me = await api.getMe();
      setCurrentUser(me.user);

      const eventsList = (me.events || []).map(m => ({
        ...m.event,
        membership: m,
        role: m.role
      })).filter(e => !!e.id);

      setUserEvents(eventsList);

      // Determine active event
      const storedEventId = getApiSession().eventId;
      let activeEv = eventsList.find(e => e.id === storedEventId);

      if (!activeEv && eventsList.length > 0) {
        activeEv = eventsList[0];
      }

      if (activeEv) {
        setCurrentEvent(activeEv);
        setApiSession(me.user.id, activeEv.id, getApiSession().token);
        setUserRole(activeEv.role || 'volunteer');

        // Load notifications for active event
        try {
          const notifData = await api.getNotifications(activeEv.id);
          setNotifications(notifData.notifications || []);
        } catch {
          // Non-blocking
        }
      } else {
        setCurrentEvent(null);
        setApiSession(me.user.id, null, getApiSession().token);
        setUserRole('volunteer');
        setNotifications([]);
      }

      // Optional personas list for demo/testing
      try {
        const { personas: pList } = await api.getPersonas();
        setPersonas(pList || []);
      } catch {
        // Ignored in strict mode
      }
    } catch (err) {
      console.warn('Session refresh notice:', err.message);
      if (err.status === 401) {
        clearApiSession();
        setCurrentUser(null);
        setCurrentEvent(null);
        setUserEvents([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Supabase Auth state listener
  useEffect(() => {
    let unsubscribe = () => {};
    if (isSupabaseConfigured) {
      unsubscribe = supabaseAuth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          setApiSession(session.user.id, null, session.access_token);
          await refreshUserData();
        } else if (event === 'SIGNED_OUT') {
          clearApiSession();
          setCurrentUser(null);
          setCurrentEvent(null);
          setUserEvents([]);
        }
      });
    }
    return () => unsubscribe();
  }, [refreshUserData]);

  // Initial mount load
  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  // Login action
  const login = async (email, password) => {
    setLoading(true);
    setEmailConfirmationRequired(false);
    try {
      if (isSupabaseConfigured) {
        const result = await supabaseAuth.signIn({ email, password });
        if (result?.user) {
          setApiSession(result.user.id, null, result.session?.access_token);
          await api.syncProfile({
            id: result.user.id,
            email: result.user.email,
            fullName: result.user.user_metadata?.full_name || email.split('@')[0],
            phone: result.user.user_metadata?.phone || ''
          });
        }
      } else {
        // Device-local authentication fallback
        const res = await api.login({ email, password });
        setApiSession(res.user.id, null, res.token);
      }
      await refreshUserData();
      showToast('Signed in successfully.', 'success');
      return true;
    } catch (err) {
      showToast(err.message || 'Login failed', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Signup action
  const signup = async ({ fullName, email, password, phone = '', bio = '' }) => {
    setLoading(true);
    setEmailConfirmationRequired(false);
    try {
      if (isSupabaseConfigured) {
        const result = await supabaseAuth.signUp({
          email,
          password,
          fullName,
          phone
        });

        // Respect email confirmation setting
        if (result?.user && !result.session) {
          setEmailConfirmationRequired(true);
          showToast('Account created. Please check your email to confirm your account.', 'info');
          setLoading(false);
          return { requiresEmailConfirmation: true };
        }

        if (result?.user) {
          setApiSession(result.user.id, null, result.session?.access_token);
          await api.syncProfile({
            id: result.user.id,
            email: result.user.email,
            fullName,
            phone,
            bio
          });
        }
      } else {
        const res = await api.signup({ fullName, email, phone, bio });
        setApiSession(res.user.id, null, res.token);
      }

      await refreshUserData();
      showToast('Account registered successfully!', 'success');
      return { success: true };
    } catch (err) {
      showToast(err.message || 'Registration failed', 'error');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Logout action
  const logout = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabaseAuth.signOut();
      }
    } catch (e) {
      console.warn('Sign out notice:', e.message);
    } finally {
      clearApiSession();
      setCurrentUser(null);
      setCurrentEvent(null);
      setUserEvents([]);
      setUserRole('volunteer');
      showToast('Signed out of RALLY.', 'info');
    }
  };

  // Password reset action
  const resetPassword = async (email) => {
    if (isSupabaseConfigured) {
      await supabaseAuth.resetPassword(email);
      showToast('Password reset instructions sent to your email.', 'success');
    } else {
      await api.resetPassword(email);
      showToast('Password reset email dispatched.', 'success');
    }
  };

  const selectEvent = async (eventObj) => {
    if (!eventObj) return;
    setApiSession(currentUser?.id, eventObj.id, getApiSession().token);
    setCurrentEvent(eventObj);
    try {
      const evData = await api.getEvent(eventObj.id);
      if (evData.userRole) setUserRole(evData.userRole);
      const notifs = await api.getNotifications(eventObj.id);
      setNotifications(notifs.notifications || []);
    } catch (err) {
      console.error('Failed to select event:', err);
    }
  };

  const switchPersona = async (personaId) => {
    const selected = personas.find(p => p.id === personaId);
    if (!selected) return;

    setApiSession(selected.id, currentEvent?.id || null, `demo-token-${selected.id}`);
    setCurrentUser(selected);
    setUserRole(selected.role);

    if (currentEvent) {
      try {
        const notifs = await api.getNotifications(currentEvent.id);
        setNotifications(notifs.notifications || []);
      } catch {
        // Ignore
      }
    }

    showToast(`Switched persona to ${selected.name} (${selected.role.toUpperCase()})`, 'info');
    await refreshUserData();
  };

  const clearPendingInvite = () => {
    setPendingInviteCode(null);
    localStorage.removeItem('rally_pending_invite');
  };

  const value = {
    currentUser,
    currentEvent,
    userEvents,
    userRole,
    isOrganizer: userRole === 'organizer',
    isCoordinator: userRole === 'coordinator',
    isVolunteer: userRole === 'volunteer',
    personas,
    notifications,
    unreadNotifsCount: notifications.filter(n => !n.isRead).length,
    loading,
    toast,
    showToast,
    login,
    signup,
    logout,
    resetPassword,
    switchPersona,
    selectEvent,
    refreshUserData,
    pendingInviteCode,
    setPendingInviteCode,
    clearPendingInvite,
    emailConfirmationRequired
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all animate-bounce-subtle bg-slate-900 text-white border-slate-700">
          <span className={`w-2 h-2 rounded-full ${toast.type === 'error' ? 'bg-red-400' : toast.type === 'success' ? 'bg-lime-400' : 'bg-violet-400'}`} />
          {toast.message}
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            ×
          </button>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
