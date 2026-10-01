import React, { useState, useEffect, useCallback } from 'react';
import { ArrowRightLeft, Plus, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import ShiftHandoverModal from '../components/shifts/ShiftHandoverModal.jsx';

const SAMPLE_HANDOVER_NOTES = [
  {
    id: 'hand-1',
    zoneName: 'Registration',
    shiftTitle: 'Morning Check-In Crew',
    authorName: 'Priya Sharma',
    summary: 'Handled over 950 badge pickups. Fast-track lanes A and B ran at peak throughput. Wristband stock replenished.',
    openIssues: 'Afternoon surge expected at 13:00. 2 extra scanners placed in charging cradle behind Desk 4.',
    notes: 'Keep the barrier lane clear on East side for courier drop-offs.',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  },
  {
    id: 'hand-2',
    zoneName: 'Main stage',
    shiftTitle: 'Opening Stage Prep',
    authorName: 'Marcus Vance',
    summary: 'Sound check completed for headliner and first two support bands. Barrier security briefing held.',
    openIssues: 'Monitor cable on stage left was replaced. Keep an ear on foldback channel 3.',
    notes: 'Earplugs bucket located under mixer desk.',
    createdAt: new Date(Date.now() - 85 * 60 * 1000).toISOString()
  }
];

export default function HandoverNotesPage() {
  const { currentEvent, showToast, isOrganizer, isCoordinator, isSamplePreview } = useAuth();
  const [handoverNotes, setHandoverNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentEvent) {
      setLoading(false);
      return;
    }
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

  const effectiveNotes = (isSamplePreview || handoverNotes.length === 0)
    ? (handoverNotes.length > 0 ? handoverNotes : SAMPLE_HANDOVER_NOTES)
    : handoverNotes;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-500/30">
              Inter-Shift Continuity
            </span>
            <span className="text-xs text-slate-400 font-medium">Shift Handover Log</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black italic tracking-tight text-white uppercase mt-1.5">
            Shift Handover Log
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Outgoing teams leave operational summaries and outstanding tasks so incoming shifts start seamlessly.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all self-start sm:self-auto cursor-pointer"
          style={{
            backgroundColor: 'var(--action-lime)',
            color: 'var(--action-lime-text)'
          }}
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Log Handover Note</span>
        </button>
      </div>

      {/* Notes Feed */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading handover notes...</div>
      ) : effectiveNotes.length === 0 ? (
        <div
          className="p-12 text-center rounded-3xl border shadow-xl"
          style={{
            backgroundColor: '#120b22',
            borderColor: 'rgba(255, 255, 255, 0.08)'
          }}
        >
          <p className="text-xs text-slate-400">No shift handover notes logged yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {effectiveNotes.map((note) => (
            <div
              key={note.id}
              className="p-6 rounded-3xl border shadow-xl space-y-4"
              style={{
                backgroundColor: '#120b22',
                borderColor: 'rgba(255, 255, 255, 0.08)'
              }}
            >
              <div className="flex items-start justify-between gap-4 border-b border-white/5 pb-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-500/20">
                      {note.zoneName}
                    </span>
                    <span className="text-xs font-bold text-white">{note.shiftTitle}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Logged by <strong className="text-slate-300">{note.authorName}</strong> ·{' '}
                    {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* Operational Summary */}
              <div>
                <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wider block mb-1">
                  Shift Operational Summary
                </span>
                <p className="text-xs text-slate-300 leading-relaxed bg-[#1a1130] p-3.5 rounded-2xl border border-white/5">
                  {note.summary}
                </p>
              </div>

              {/* Outstanding issues */}
              {note.openIssues && (
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                    Open Issues & Follow-Ups
                  </span>
                  <p className="text-xs text-amber-200 leading-relaxed bg-amber-950/40 p-3.5 rounded-2xl border border-amber-500/30">
                    {note.openIssues}
                  </p>
                </div>
              )}

              {/* Notes */}
              {note.notes && (
                <p className="text-[11px] text-slate-400 italic">
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
