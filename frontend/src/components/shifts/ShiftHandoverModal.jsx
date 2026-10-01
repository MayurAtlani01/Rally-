import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, Send, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function ShiftHandoverModal({ zoneId = null, onClose, onSuccess }) {
  const { currentEvent, showToast } = useAuth();
  const [zones, setZones] = useState([]);
  const [shifts, setShifts] = useState([]);
  const [selectedZone, setSelectedZone] = useState(zoneId || '');
  const [selectedShift, setSelectedShift] = useState('');
  const [summary, setSummary] = useState('');
  const [openIssues, setOpenIssues] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getZones(currentEvent.id).then(res => {
      setZones(res.zones);
      if (!selectedZone && res.zones.length > 0) setSelectedZone(res.zones[0].id);
    });
  }, [currentEvent]);

  useEffect(() => {
    if (!selectedZone) return;
    api.getShifts(currentEvent.id, selectedZone).then(res => {
      setShifts(res.shifts);
      if (res.shifts.length > 0) setSelectedShift(res.shifts[0].id);
    });
  }, [selectedZone, currentEvent]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedZone || !selectedShift || !summary.trim()) {
      showToast('Zone, shift, and shift summary are required.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await api.createHandoverNote(currentEvent.id, {
        zoneId: selectedZone,
        shiftId: selectedShift,
        summary,
        openIssues,
        notes
      });
      showToast('Shift handover note recorded for the incoming team.', 'success');
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
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-violet-50/50">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-violet-100 text-violet-800">
              Visual Signature · Shift Handover
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 mt-1">Shift Handover Log</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Leaves clear status notes and outstanding tasks for the incoming team.
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Zone</label>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-[#7054E8] outline-hidden bg-white"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Ending Shift</label>
              <select
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:border-[#7054E8] outline-hidden bg-white"
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Shift Operational Summary</label>
            <textarea
              required
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="e.g. Processed 1,400 attendees smoothly. Crowd pace steady."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#7054E8] outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Outstanding Tasks & Open Issues</label>
            <textarea
              rows={2}
              value={openIssues}
              onChange={(e) => setOpenIssues(e.target.value)}
              placeholder="e.g. Turnstile scanner B battery needs charging; radio channel 4."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs focus:border-[#7054E8] outline-hidden"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Tips for Incoming Crew</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Expect surge at 14:30 right before headliner set."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:border-[#7054E8] outline-hidden"
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
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving...' : 'Save Handover Note'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
