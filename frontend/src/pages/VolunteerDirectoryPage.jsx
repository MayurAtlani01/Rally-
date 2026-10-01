import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Phone,
  Mail,
  Award,
  Sparkles,
  Copy,
  Shield,
  X
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';

export default function VolunteerDirectoryPage() {
  const { currentEvent, showToast, isOrganizer, isSamplePreview } = useAuth();
  const [volunteers, setVolunteers] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);

  // Appoint Coordinator Form State
  const [appointRole, setAppointRole] = useState('volunteer');
  const [appointedZones, setAppointedZones] = useState([]);
  const [savingRole, setSavingRole] = useState(false);

  const inviteCode = currentEvent?.inviteCode || (isSamplePreview ? 'RALLY-2026' : 'IGNITE-JKI1U');

  const loadData = useCallback(async () => {
    if (!currentEvent) return;
    try {
      const [vRes, zRes] = await Promise.all([
        api.getVolunteers(currentEvent.id, {
          query: searchQuery,
          skill: selectedSkill
        }),
        api.getZones(currentEvent.id)
      ]);
      setVolunteers(vRes.volunteers || []);
      setZones(zRes.zones || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [currentEvent, searchQuery, selectedSkill, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // When a volunteer is selected for modal
  const handleOpenDetail = (vol) => {
    setSelectedVolunteer(vol);
    setAppointRole(vol.role || 'volunteer');
    setAppointedZones(vol.assignedZones || []);
  };

  const handleSaveRole = async () => {
    if (!selectedVolunteer || !currentEvent) return;
    setSavingRole(true);
    try {
      await api.updateMemberRole(currentEvent.id, selectedVolunteer.id, {
        role: appointRole,
        assignedZones: appointRole === 'coordinator' ? appointedZones : []
      });
      showToast(`Role updated for ${selectedVolunteer.name}!`, 'success');
      setSelectedVolunteer(null);
      loadData();
    } catch (err) {
      showToast(err.message || 'Failed to update role', 'error');
    } finally {
      setSavingRole(false);
    }
  };

  const handleCopyInviteLink = () => {
    const url = `${window.location.origin}/?invite=${inviteCode}`;
    navigator.clipboard?.writeText(url);
    showToast(`Volunteer invitation link copied (${inviteCode})!`, 'success');
  };

  // Unique list of skills for filtering
  const allSkills = Array.from(
    new Set(volunteers.flatMap(v => v.skills || []))
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <span
            className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--lilac-subtle)',
              color: 'var(--lilac-accent)'
            }}
          >
            Personnel & Talents
          </span>
          <h1 className="text-2xl font-black mt-1" style={{ color: 'var(--text-heading)' }}>
            Volunteer Directory ({volunteers.length})
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Search active volunteers, inspect skills, availability windows, and appoint zone coordinators.
          </p>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs shadow-2xs"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, skill, or email..."
              className="bg-transparent outline-hidden w-44 sm:w-56"
              style={{ color: 'var(--text-heading)' }}
            />
          </div>

          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="bg-transparent outline-hidden font-bold"
              style={{ color: 'var(--text-heading)' }}
            >
              <option value="">All Skills</option>
              {allSkills.map((sk) => (
                <option key={sk} value={sk}>{sk}</option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleCopyInviteLink}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            style={{
              backgroundColor: 'var(--action-lime)',
              color: 'var(--action-lime-text)'
            }}
            title="Copy volunteer invitation link"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Invite Volunteers</span>
          </button>
        </div>
      </div>

      {/* Volunteer Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading volunteer profiles...</div>
      ) : volunteers.length === 0 ? (
        <div
          className="p-12 text-center rounded-3xl border shadow-sm space-y-4"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-editorial text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
              No volunteers joined yet
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Invite volunteers to your festival using your invite link or code. Real volunteers will appear here as they register.
            </p>
          </div>
          {currentEvent?.inviteCode && (
            <div className="pt-2">
              <button
                onClick={handleCopyInviteLink}
                className="px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 mx-auto shadow-sm"
                style={{
                  backgroundColor: 'var(--action-lime)',
                  color: 'var(--action-lime-text)'
                }}
              >
                <Copy className="w-4 h-4" />
                <span>Copy Invitation Link</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {volunteers.map((vol) => {
            const isAssigned = vol.assignmentsCount > 0;
            const isCoordinator = vol.role === 'coordinator';

            return (
              <div
                key={vol.id}
                onClick={() => handleOpenDetail(vol)}
                className="p-5 rounded-3xl border shadow-xs transition-all cursor-pointer flex flex-col justify-between hover:shadow-md"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: isCoordinator ? 'var(--lilac-accent)' : 'var(--border-subtle)'
                }}
              >
                <div>
                  <div className="flex items-start gap-3">
                    <img
                      src={vol.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                      alt=""
                      className="w-12 h-12 rounded-2xl object-cover border"
                      style={{ borderColor: 'var(--border-strong)' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h3 className="font-extrabold text-sm truncate" style={{ color: 'var(--text-heading)' }}>
                          {vol.name}
                        </h3>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-black ${
                            isCoordinator
                              ? 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300'
                              : isAssigned
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {isCoordinator ? 'Coordinator' : isAssigned ? 'Assigned' : 'Available'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{vol.email}</p>
                      {vol.phone && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{vol.phone}</p>
                      )}
                    </div>
                  </div>

                  {vol.bio && (
                    <p
                      className="text-xs mt-3 line-clamp-2 leading-relaxed p-2.5 rounded-xl border"
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-body)'
                      }}
                    >
                      {vol.bio}
                    </p>
                  )}

                  {/* Skills tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(vol.skills || []).map((sk) => (
                      <span
                        key={sk}
                        className="text-[9px] px-2 py-0.5 rounded-md font-semibold"
                        style={{
                          backgroundColor: 'var(--bg-surface-subtle)',
                          color: 'var(--text-body)'
                        }}
                      >
                        {sk}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Metrics */}
                <div className="mt-4 pt-3 border-t flex items-center justify-between text-[11px]" style={{ borderColor: 'var(--border-subtle)' }}>
                  <span className="text-slate-400 font-medium">Workload</span>
                  <span className="font-extrabold flex items-center gap-1" style={{ color: 'var(--text-heading)' }}>
                    <Clock className="w-3 h-3 text-[#7054E8]" />
                    {(vol.assignedHours || 0).toFixed(1)} hrs assigned
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Volunteer Detail & Coordinator Appointment Modal */}
      {selectedVolunteer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="w-full max-w-lg rounded-3xl border shadow-2xl p-6 space-y-5"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-body)'
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={selectedVolunteer.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80'}
                  alt=""
                  className="w-14 h-14 rounded-2xl object-cover border"
                  style={{ borderColor: 'var(--border-strong)' }}
                />
                <div>
                  <h3 className="font-extrabold text-lg" style={{ color: 'var(--text-heading)' }}>
                    {selectedVolunteer.name}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedVolunteer.email}</p>
                  {selectedVolunteer.phone && (
                    <p className="text-xs text-slate-400 mt-0.5">{selectedVolunteer.phone}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedVolunteer(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 flex items-center justify-center cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedVolunteer.bio && (
              <p
                className="text-xs leading-relaxed p-3 rounded-2xl border"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                {selectedVolunteer.bio}
              </p>
            )}

            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1.5">
                Skills & Capabilities
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(selectedVolunteer.skills || []).map((sk) => (
                  <span
                    key={sk}
                    className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'var(--lilac-subtle)',
                      color: 'var(--lilac-text)'
                    }}
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>

            {/* Coordinator Appointment (Organizer Only) */}
            {isOrganizer && (
              <div
                className="p-4 rounded-2xl border space-y-3"
                style={{
                  backgroundColor: 'var(--bg-surface-subtle)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <div className="flex items-center gap-2 font-bold text-xs" style={{ color: 'var(--text-heading)' }}>
                  <Shield className="w-4 h-4 text-[#7054E8]" />
                  <span>Manage Role & Zone Scope</span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-4 text-xs font-semibold">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="appointRole"
                        value="volunteer"
                        checked={appointRole === 'volunteer'}
                        onChange={() => setAppointRole('volunteer')}
                      />
                      <span>Volunteer</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="appointRole"
                        value="coordinator"
                        checked={appointRole === 'coordinator'}
                        onChange={() => setAppointRole('coordinator')}
                      />
                      <span>Zone Coordinator</span>
                    </label>
                  </div>

                  {appointRole === 'coordinator' && (
                    <div className="pt-2 space-y-1.5">
                      <span className="text-[11px] font-bold text-slate-500 block">
                        Assigned Zones (Scope of Attendance & Issues):
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {zones.map((z) => {
                          const checked = appointedZones.includes(z.id);
                          return (
                            <label
                              key={z.id}
                              className={`p-2 rounded-xl border text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                                checked ? 'bg-violet-500/10 border-violet-500 font-bold' : ''
                              }`}
                              style={{ borderColor: checked ? 'var(--lilac-accent)' : 'var(--border-subtle)' }}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setAppointedZones([...appointedZones, z.id]);
                                  } else {
                                    setAppointedZones(appointedZones.filter(id => id !== z.id));
                                  }
                                }}
                              />
                              <span className="truncate">{z.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={handleSaveRole}
                    disabled={savingRole}
                    className="px-4 py-2 rounded-xl text-xs font-bold shadow-xs disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--action-lime)',
                      color: 'var(--action-lime-text)'
                    }}
                  >
                    {savingRole ? 'Saving...' : 'Update Member Role'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
