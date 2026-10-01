import React, { useState } from 'react';
import { X, Calendar, MapPin, Layers, Sparkles, Check, ArrowRight, ArrowLeft, Globe, Clock, Plus, Trash2 } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';

const COMMON_TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney'
];

export default function EventSetupModal({ onClose, onSuccess }) {
  const { selectEvent, showToast, refreshUserData } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // Form State - strictly zero dummy data
  const [title, setTitle] = useState('');
  const [venueName, setVenueName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [timezone, setTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  });
  const [inviteCode, setInviteCode] = useState('');
  const [maxHours, setMaxHours] = useState('12.0');

  // Zones start completely empty (No dummy data)
  const [zones, setZones] = useState([]);

  const handleAddZone = () => {
    setZones([
      ...zones,
      {
        name: `Zone ${zones.length + 1}`,
        code: `Z${zones.length + 1}`,
        requiredHeadcount: 2,
        posX: 50,
        posY: 50,
        color: '#7054E8'
      }
    ]);
  };

  const handleUpdateZone = (index, key, val) => {
    const updated = [...zones];
    updated[index][key] = val;
    setZones(updated);
  };

  const handleRemoveZone = (index) => {
    setZones(zones.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !venueName.trim()) {
      showToast('Event title and venue are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.createEvent({
        title: title.trim(),
        venueName: venueName.trim(),
        description: description.trim(),
        startDate: new Date(`${startDate}T08:00:00Z`).toISOString(),
        endDate: new Date(`${endDate}T23:00:00Z`).toISOString(),
        timezone,
        inviteCode: inviteCode.trim() ? inviteCode.trim().toUpperCase() : undefined,
        maxHoursPerVolunteer: Number(maxHours) || 12.0,
        zones
      });

      showToast(`Event "${res.event.title}" created successfully!`, 'success');
      await selectEvent(res.event);
      await refreshUserData();
      onSuccess?.();
      onClose();
      navigate('/setup');
    } catch (err) {
      showToast(err.message || 'Failed to create event', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="w-full max-w-2xl rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-body)'
        }}
      >
        {/* Header */}
        <div
          className="p-6 border-b flex items-start justify-between"
          style={{
            backgroundColor: 'var(--bg-surface-subtle)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <div>
            <div className="flex items-center gap-2">
              <span
                className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded"
                style={{
                  backgroundColor: 'var(--lilac-subtle)',
                  color: 'var(--lilac-accent)'
                }}
              >
                Create Event
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Step {step} of 2
              </span>
            </div>
            <h2
              className="text-xl font-editorial font-bold mt-1"
              style={{ color: 'var(--text-heading)' }}
            >
              {step === 1 ? 'Event Essentials' : 'Zones (Optional)'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-heading)' }}>
                  Event Name *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. IGNITE Music Festival 2026"
                  className="w-full px-4 py-2.5 rounded-xl border text-xs font-medium outline-hidden"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-heading)'
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-heading)' }}>
                    Venue Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={venueName}
                    onChange={(e) => setVenueName(e.target.value)}
                    placeholder="e.g. Waterfront Park"
                    className="w-full px-4 py-2.5 rounded-xl border text-xs font-medium outline-hidden"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-heading)'
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-heading)' }}>
                    Timezone *
                  </label>
                  <select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border text-xs font-bold outline-hidden"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-heading)'
                    }}
                  >
                    {!COMMON_TIMEZONES.includes(timezone) && (
                      <option value={timezone}>{timezone}</option>
                    )}
                    {COMMON_TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-heading)' }}>
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief summary of event mission, attendee flow, and staff guidelines..."
                  className="w-full px-4 py-2 rounded-xl border text-xs font-medium outline-hidden"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-heading)'
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-heading)' }}>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border text-xs font-medium outline-hidden"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-heading)'
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-heading)' }}>
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border text-xs font-medium outline-hidden"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-heading)'
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-heading)' }}>
                    Custom Invite Code <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    maxLength={12}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    placeholder="Auto-generated if empty"
                    className="w-full px-4 py-2.5 rounded-xl border text-xs font-mono font-bold tracking-wider outline-hidden uppercase"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-heading)'
                    }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-1" style={{ color: 'var(--text-heading)' }}>
                    Max Hours / Volunteer Limit
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="48"
                    value={maxHours}
                    onChange={(e) => setMaxHours(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border text-xs font-medium outline-hidden"
                    style={{
                      backgroundColor: 'var(--bg-surface-subtle)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-heading)'
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold" style={{ color: 'var(--text-heading)' }}>
                    Named Zones ({zones.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Add zones now or configure them on the setup screen.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddZone}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors border"
                  style={{
                    backgroundColor: 'var(--action-lime)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--action-lime-text)'
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Zone
                </button>
              </div>

              {zones.length === 0 ? (
                <div
                  className="p-8 text-center rounded-2xl border"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold" style={{ color: 'var(--text-heading)' }}>
                    No zones defined yet
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Click "Add Zone" or configure them later on the setup screen.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {zones.map((zone, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl border flex items-center gap-3"
                      style={{
                        backgroundColor: 'var(--bg-surface-subtle)',
                        borderColor: 'var(--border-subtle)'
                      }}
                    >
                      <input
                        type="color"
                        value={zone.color}
                        onChange={(e) => handleUpdateZone(idx, 'color', e.target.value)}
                        className="w-7 h-7 rounded-lg border-0 cursor-pointer shrink-0"
                      />
                      <input
                        type="text"
                        value={zone.name}
                        onChange={(e) => handleUpdateZone(idx, 'name', e.target.value)}
                        placeholder="Zone name (e.g. Entrance Gate)"
                        className="flex-1 px-3 py-1.5 rounded-lg border text-xs font-medium outline-hidden"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-heading)'
                        }}
                      />
                      <input
                        type="number"
                        min="1"
                        value={zone.requiredHeadcount}
                        onChange={(e) => handleUpdateZone(idx, 'requiredHeadcount', Number(e.target.value))}
                        title="Required headcount"
                        className="w-16 px-2 py-1.5 rounded-lg border text-xs text-center font-bold outline-hidden"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          borderColor: 'var(--border-subtle)',
                          color: 'var(--text-heading)'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveZone(idx)}
                        className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer Actions */}
          <div
            className="pt-4 border-t flex items-center justify-between gap-3"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl border text-xs font-semibold"
                style={{
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-heading)'
                }}
              >
                Back
              </button>
            ) : (
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
            )}

            {step === 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (!title.trim() || !venueName.trim()) {
                    showToast('Event title and venue are required.', 'error');
                    return;
                  }
                  setStep(2);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs"
                style={{
                  backgroundColor: 'var(--action-lime)',
                  color: 'var(--action-lime-text)'
                }}
              >
                <span>Continue to Zones</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                style={{
                  backgroundColor: 'var(--action-lime)',
                  color: 'var(--action-lime-text)'
                }}
              >
                <Check className="w-4 h-4" />
                <span>{submitting ? 'Creating Event...' : 'Complete & Open Setup'}</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
