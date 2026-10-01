import React, { useState, useEffect, useCallback } from 'react';
import { Megaphone, Plus, Users, MapPin, Send, X, Clock } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { ANNOUNCEMENT_AUDIENCES } from '@shared/constants.js';

export default function AnnouncementsPage() {
  const { currentEvent, showToast, isOrganizer, isCoordinator } = useAuth();
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
    if (!currentEvent) return;
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

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      showToast('Title and message are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
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
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-violet-100 text-violet-800">
            Communications
          </span>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Announcements & Briefings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Broadcast operational updates across the entire event or targeted to specific zones and roles.
          </p>
        </div>

        {(isOrganizer || isCoordinator) && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-[#7054E8] hover:bg-[#5B3FD4] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Post Announcement
          </button>
        )}
      </div>

      {/* Announcements Feed */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <p className="text-xs text-slate-500">No announcements posted yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className="p-5 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-violet-100 text-[#7054E8] flex items-center justify-center font-bold text-xs">
                    {ann.authorName?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">{ann.title}</h3>
                    <p className="text-[11px] text-slate-500">
                      Posted by {ann.authorName} ·{' '}
                      {new Date(ann.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                  Target: {ann.audience === 'all' ? 'All Event' : ann.zoneName || 'Zone'}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed bg-[#FAF9F6] p-3.5 rounded-2xl border border-slate-100">
                {ann.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create Announcement Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Post Announcement</h3>
                <p className="text-xs text-slate-500">Send instant in-app update to volunteers</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weather update: Light rain expected at 16:00"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#7054E8] outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Target Audience</label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-[#7054E8] outline-hidden bg-white"
                  >
                    <option value={ANNOUNCEMENT_AUDIENCES.ALL}>All Volunteers & Staff</option>
                    <option value={ANNOUNCEMENT_AUDIENCES.ZONE}>Specific Zone</option>
                  </select>
                </div>

                {audience === ANNOUNCEMENT_AUDIENCES.ZONE && (
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Zone</label>
                    <select
                      value={zoneId}
                      onChange={(e) => setZoneId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-[#7054E8] outline-hidden bg-white"
                    >
                      <option value="">Select Zone</option>
                      {zones.map((z) => (
                        <option key={z.id} value={z.id}>{z.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Message</label>
                <textarea
                  required
                  rows={3}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Type briefing or update for teams on site..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#7054E8] outline-hidden"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-[#7054E8] hover:bg-[#5B3FD4] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Broadcasting...' : 'Broadcast Announcement'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
