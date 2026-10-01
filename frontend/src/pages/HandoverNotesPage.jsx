import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRightLeft, Plus, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ShiftHandoverModal from '../components/shifts/ShiftHandoverModal.jsx';

export default function HandoverNotesPage() {
  const { currentEvent, showToast } = useAuth();
  const [handoverNotes, setHandoverNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentEvent) return;
    try {
      const res = await api.getHandoverNotes(currentEvent.id);
      setHandoverNotes(res.handoverNotes || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [currentEvent, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-violet-100 text-violet-800">
              Visual Signature Feature
            </span>
            <span className="text-xs text-slate-500 font-medium">Inter-Shift Continuity</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-1">Shift Handover Log</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Outgoing teams leave operational summaries and outstanding tasks so incoming shifts start seamlessly.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 rounded-xl bg-[#7054E8] hover:bg-[#5B3FD4] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Log Handover Note
        </button>
      </div>

      {/* Notes Feed */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading handover notes...</div>
      ) : handoverNotes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200">
          <p className="text-xs text-slate-500">No shift handover notes logged yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {handoverNotes.map((note) => (
            <div
              key={note.id}
              className="p-6 rounded-3xl border border-slate-200 bg-white shadow-xs space-y-4"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded bg-violet-50 text-[#7054E8] border border-violet-100">
                      {note.zoneName}
                    </span>
                    <span className="text-xs font-bold text-slate-700">{note.shiftTitle}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Logged by {note.authorName} ·{' '}
                    {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Operational Summary */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Shift Operational Summary
                </span>
                <p className="text-xs text-slate-800 leading-relaxed bg-[#FAF9F6] p-3 rounded-2xl border border-slate-100">
                  {note.summary}
                </p>
              </div>

              {/* Outstanding issues */}
              {note.openIssues && (
                <div>
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block mb-1">
                    Open Issues & Follow-Ups
                  </span>
                  <p className="text-xs text-amber-900 leading-relaxed bg-amber-50/60 p-3 rounded-2xl border border-amber-200">
                    {note.openIssues}
                  </p>
                </div>
              )}

              {/* Notes */}
              {note.notes && (
                <p className="text-[11px] text-slate-500 italic">
                  Tip for next crew: {note.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Handover Modal */}
      {showModal && (
        <ShiftHandoverModal
          onClose={() => setShowModal(false)}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
