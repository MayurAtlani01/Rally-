import React, { useState, useEffect, useCallback } from 'react';
import { Megaphone, Plus, Users, MapPin, Send, X, Clock } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ANNOUNCEMENT_AUDIENCES } from '@shared/constants.js';

const SAMPLE_ANNOUNCEMENTS = [
  {
    id: 'ann-1',
    title: 'Meet at the volunteer hub before your shift.',
    body: 'Quick team huddle at the volunteer hub (near Registration) 15 minutes before your shift. We will cover key info, radio channels, and answer any questions.',
    authorName: 'Priya Sharma',
    audience: 'all',
    createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString()
  },
  {
    id: 'ann-2',
    title: 'Medical team fully staffed for afternoon shift.',
    body: 'Medic Station 1 and mobile first-aid trios are fully staffed with certified volunteers. Direct any heat exhaustion inquiries to the tent by the river.',
    authorName: 'Dr. Nathan Cole',
    audience: 'all',
    createdAt: new Date(Date.now() - 95 * 60 * 1000).toISOString()
  },
  {
    id: 'ann-3',
    title: '2 new volunteers assigned to Registration desk.',
    body: 'Welcoming Mayuresh and Chloe to East Entrance Zone B. Registration queues are moving smoothly.',
    authorName: 'Priya Sharma',
    audience: 'zone',
    zoneName: 'Registration',
    createdAt: new Date(Date.now() - 140 * 60 * 1000).toISOString()
  }
];

export default function AnnouncementsPage() {
  const { currentEvent, showToast, isOrganizer, isCoordinator, isSamplePreview } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState(ANNOUNCEMENT_AUDIENCES.ALL);
  const [zoneId, setZoneId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentEvent) {
      setLoading(false);
      return;
    }
    try {
      const [aRes, zRes] = await Promise.all([
        api.getAnnouncements(currentEvent.id),
        api.getZones(currentEvent.id)
      ]);
      setAnnouncements(aRes.announcements || []);
      setZones(zRes.zones || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [currentEvent, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const effectiveAnnouncements = (isSamplePreview || announcements.length === 0)
    ? (announcements.length > 0 ? announcements : SAMPLE_ANNOUNCEMENTS)
    : announcements;

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      showToast('Title and message are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (!currentEvent || isSamplePreview) {
        const newAnn = {
          id: `ann-${Date.now()}`,
          title,
          body,
          authorName: 'Mayuresh A.',
          audience,
          zoneName: audience === ANNOUNCEMENT_AUDIENCES.ZONE ? 'Selected Zone' : 'All',
          createdAt: new Date().toISOString()
        };
        setAnnouncements(prev => [newAnn, ...prev]);
        showToast('Announcement broadcast to target audience.', 'success');
        setShowCreateModal(false);
        setTitle('');
        setBody('');
        return;
      }

      await api.createAnnouncement(currentEvent.id, {
        title,
        body,
        audience,
        zoneId: audience === ANNOUNCEMENT_AUDIENCES.ZONE ? zoneId : null
      });
      showToast('Announcement broadcast to target audience.', 'success');
      setShowCreateModal(false);
      setTitle('');
      setBody('');
      loadData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/30">
            Communications & Updates
          </span>
          <h1 className="text-3xl sm:text-4xl font-black italic tracking-tight text-white uppercase mt-1.5">
            Announcements & Briefings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Broadcast operational updates across the entire event or targeted to specific zones and roles.
          </p>
        </div>

        {(isOrganizer || isCoordinator) && (
          <button
            onClick={() => setShowCreateModal(true)}
            id="post-announcement-button"
            className="px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
            style={{
              backgroundColor: 'var(--action-lime)',
              color: 'var(--action-lime-text)'
            }}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Post Announcement</span>
          </button>
        )}
      </div>

      {/* Announcements Feed */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading announcements...</div>
      ) : effectiveAnnouncements.length === 0 ? (
        <div
          className="p-12 text-center rounded-3xl border shadow-xl"
          style={{
            backgroundColor: '#120b22',
            borderColor: 'rgba(255, 255, 255, 0.08)'
          }}
        >
          <p className="text-xs text-slate-400">No announcements posted yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {effectiveAnnouncements.map((ann) => (
            <div
              key={ann.id}
              className="p-5 sm:p-6 rounded-3xl border shadow-xl space-y-3.5 transition-all hover:border-purple-400/40"
              style={{
                backgroundColor: '#120b22',
                borderColor: 'rgba(255, 255, 255, 0.08)'
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-900/60 border border-purple-500/30 flex items-center justify-center text-purple-300 font-bold text-xs shrink-0">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">{ann.title}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Posted by <strong className="text-slate-300">{ann.authorName}</strong> ·{' '}
                      {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-500/20 whitespace-nowrap">
                  Target: {ann.audience === 'all' ? 'All Event' : ann.zoneName || 'Zone'}
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed bg-[#1a1130] p-4 rounded-2xl border border-white/5">
                {ann.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create Announcement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg rounded-3xl border p-6 space-y-4 shadow-2xl"
            style={{
              backgroundColor: '#120b22',
              borderColor: 'rgba(255, 255, 255, 0.12)'
            }}
          >
            <div className="flex items-start justify-between pb-2 border-b border-white/10">
              <div>
                <h3 className="font-black text-lg text-white">Post Announcement</h3>
                <p className="text-xs text-slate-400 mt-0.5">Send instant in-app update to volunteers</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weather update: Light rain expected at 16:00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/15 text-xs text-white bg-[#1a1130] focus:border-purple-400 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Target Audience</label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-white/15 text-xs text-white bg-[#1a1130] focus:border-purple-400 outline-none cursor-pointer"
                  >
                    <option value={ANNOUNCEMENT_AUDIENCES.ALL} className="bg-[#120b22]">All Volunteers & Staff</option>
                    <option value={ANNOUNCEMENT_AUDIENCES.ZONE} className="bg-[#120b22]">Specific Zone</option>
                  </select>
                </div>

                {audience === ANNOUNCEMENT_AUDIENCES.ZONE && (
                  <div>
                    <label className="text-xs font-bold text-slate-300 block mb-1">Zone</label>
                    <select
                      value={zoneId}
                      onChange={(e) => setZoneId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-white/15 text-xs text-white bg-[#1a1130] focus:border-purple-400 outline-none cursor-pointer"
                    >
                      <option value="" className="bg-[#120b22]">Select Zone</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id} className="bg-[#120b22]">{z.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Message</label>
                <textarea
                  required
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Write clear, actionable briefing details..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-white/15 text-xs text-white bg-[#1a1130] focus:border-purple-400 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold shadow-md flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 transition-all cursor-pointer"
                  style={{
                    backgroundColor: 'var(--action-lime)',
                    color: 'var(--action-lime-text)'
                  }}
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Broadcasting...' : 'Broadcast'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
