import React, { useState } from 'react';
import { X, AlertTriangle, Send } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { ISSUE_CATEGORIES, ISSUE_SEVERITIES } from '@shared/constants.js';

export default function ReportIssueModal({ zoneId = null, onClose, onSuccess }) {
  const { currentEvent, showToast } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(ISSUE_CATEGORIES.GENERAL);
  const [severity, setSeverity] = useState(ISSUE_SEVERITIES.MEDIUM);
  const [selectedZone, setSelectedZone] = useState(zoneId || '');
  const [zones, setZones] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  React.useEffect(() => {
    api.getZones(currentEvent.id).then(res => setZones(res.zones)).catch(() => {});
  }, [currentEvent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showToast('Title and description are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.createIssue(currentEvent.id, {
        title,
        description,
        category,
        severity,
        zoneId: selectedZone || null
      });
      showToast('Issue reported and routed to zone coordinator.', 'success');
      onSuccess();
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-100 text-amber-900">
              Crowd & Operations
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 mt-1">Report an Issue</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Automatically routes to the responsible zone coordinator and organizers.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Issue Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Bottleneck at wristband scanning line"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#7054E8] focus:ring-1 focus:ring-[#7054E8] outline-hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Zone Location</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-[#7054E8] outline-hidden bg-white"
              >
                <option value="">All Event / Floating</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-[#7054E8] outline-hidden bg-white uppercase font-medium"
              >
                {Object.values(ISSUE_CATEGORIES).map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Severity</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.values(ISSUE_SEVERITIES).map((s) => {
                const isSelected = severity === s;
                return (
                  <button
                    type="button"
                    key={s}
                    onClick={() => setSeverity(s)}
                    className={`py-2 rounded-xl text-xs font-bold uppercase transition-all border ${
                      isSelected
                        ? s === 'urgent'
                          ? 'bg-red-500 text-white border-red-600'
                          : s === 'high'
                          ? 'bg-amber-500 text-white border-amber-600'
                          : 'bg-[#7054E8] text-white border-[#5B3FD4]'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Description & Immediate Observations</label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the situation clearly. If reporting crowd flow, state observed conditions."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#7054E8] outline-hidden"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
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
              <span>{submitting ? 'Submitting...' : 'Submit Issue'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
