import React from 'react';
import {
  X,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserPlus,
  PlusCircle,
  ArrowRightLeft,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';

export default function ZoneDetailDrawer({
  zone,
  shifts = [],
  issues = [],
  onClose,
  onOpenCandidateMatch,
  onReportIssue,
  onOpenHandover
}) {
  if (!zone) return null;

  const zoneShifts = shifts.filter((s) => s.zoneId === zone.id);
  const zoneIssues = issues.filter((i) => i.zoneId === zone.id && i.status !== 'resolved');

  return (
    <div
      className="fixed inset-y-0 right-0 w-full sm:w-[440px] shadow-2xl z-50 flex flex-col border-l animate-in slide-in-from-right duration-200 transition-colors"
      style={{
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-subtle)',
        color: 'var(--text-body)'
      }}
    >
      {/* Drawer Header */}
      <div
        className="p-5 border-b flex items-start justify-between"
        style={{
          backgroundColor: 'var(--bg-surface-subtle)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div>
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full ring-2 shadow-xs"
              style={{
                backgroundColor: zone.color || 'var(--action-lime)',
                borderColor: 'var(--bg-surface)'
              }}
            />
            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
              Zone · {zone.code}
            </span>
          </div>
          <h2
            className="text-lg font-extrabold mt-1"
            style={{ color: 'var(--text-heading)' }}
          >
            {zone.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{zone.description}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-black/5 rounded-xl transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Metrics Row */}
      <div
        className="grid grid-cols-3 gap-2 p-4 border-b text-center"
        style={{
          backgroundColor: 'var(--bg-canvas)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        <div
          className="p-2.5 rounded-xl border shadow-2xs"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Required</span>
          <span
            className="text-base font-extrabold mt-0.5 block"
            style={{ color: 'var(--text-heading)' }}
          >
            {zone.requiredHeadcount}
          </span>
        </div>
        <div
          className="p-2.5 rounded-xl border shadow-2xs"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Assigned</span>
          <span
            className={`text-base font-extrabold mt-0.5 block ${
              zone.assignedHeadcount < zone.requiredHeadcount ? 'text-amber-500' : ''
            }`}
            style={{
              color:
                zone.assignedHeadcount < zone.requiredHeadcount
                  ? undefined
                  : 'var(--text-heading)'
            }}
          >
            {zone.assignedHeadcount}
          </span>
        </div>
        <div
          className="p-2.5 rounded-xl border shadow-2xs"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Checked In</span>
          <span className="text-base font-extrabold text-emerald-500 mt-0.5 block flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            {zone.checkedInHeadcount}
          </span>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div
        className="p-4 border-b flex items-center gap-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <button
          onClick={() => onReportIssue(zone.id)}
          className="flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs hover:bg-black/5"
          style={{
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-heading)'
          }}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          Report Issue
        </button>
        <button
          onClick={() => onOpenHandover(zone.id)}
          className="flex-1 py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-2xs hover:bg-black/5"
          style={{
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-heading)'
          }}
        >
          <ArrowRightLeft className="w-3.5 h-3.5 text-violet-500" />
          Shift Handover
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {/* Shifts Section */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Zone Shifts ({zoneShifts.length})
            </h3>
          </div>

          <div className="space-y-3">
            {zoneShifts.map((shift) => {
              const activeCount = shift.assignedCount || 0;
              const isUnderstaffed = activeCount < shift.requiredHeadcount;

              return (
                <div
                  key={shift.id}
                  className="p-3.5 rounded-2xl border transition-all"
                  style={{
                    backgroundColor: isUnderstaffed ? 'var(--amber-subtle)' : 'var(--bg-surface-subtle)',
                    borderColor: isUnderstaffed ? 'var(--amber-warning)' : 'var(--border-subtle)'
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-violet-500 block">
                        {shift.roleName}
                      </span>
                      <h4
                        className="text-xs font-bold mt-0.5"
                        style={{ color: 'var(--text-heading)' }}
                      >
                        {shift.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(shift.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {' - '}
                        {new Date(shift.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                          isUnderstaffed
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-emerald-500/20 text-emerald-500'
                        }`}
                      >
                        {activeCount} / {shift.requiredHeadcount} Filled
                      </span>
                    </div>
                  </div>

                  {/* Assigned Volunteers on this shift */}
                  {shift.assignments && shift.assignments.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                        Rostered Volunteers
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {shift.assignments.map((asgn) => (
                          <div
                            key={asgn.id}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs"
                            style={{
                              backgroundColor: 'var(--bg-surface)',
                              borderColor: 'var(--border-subtle)'
                            }}
                          >
                            <img
                              src={asgn.volunteerAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=60&auto=format&fit=crop&q=80'}
                              alt=""
                              className="w-4 h-4 rounded-full object-cover"
                            />
                            <span
                              className="font-semibold text-[11px]"
                              style={{ color: 'var(--text-heading)' }}
                            >
                              {asgn.volunteerName}
                            </span>
                            {asgn.status === 'checked_in' && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Checked In" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Find Replacement Button if understaffed */}
                  {isUnderstaffed && (
                    <div className="mt-3 pt-2 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                      <span className="text-[11px] font-semibold flex items-center gap-1 text-amber-500">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Staffing gap detected
                      </span>
                      <button
                        onClick={() => onOpenCandidateMatch(shift)}
                        className="px-2.5 py-1 rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs transition-colors"
                        style={{
                          backgroundColor: 'var(--action-lime)',
                          color: 'var(--action-lime-text)'
                        }}
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        Find Replacement
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Active Issues Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              Active Issues ({zoneIssues.length})
            </h3>
          </div>

          {zoneIssues.length === 0 ? (
            <div
              className="p-4 rounded-xl border text-center text-xs text-slate-400 flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--bg-surface-subtle)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              No active issues in this zone. All clear.
            </div>
          ) : (
            <div className="space-y-2">
              {zoneIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="p-3 rounded-xl border text-xs"
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold" style={{ color: 'var(--text-heading)' }}>
                      {issue.title}
                    </p>
                    <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold ${
                      issue.severity === 'urgent'
                        ? 'bg-red-500 text-white'
                        : issue.severity === 'high'
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-500 text-white'
                    }`}>
                      {issue.severity}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-1 leading-relaxed text-[11px]">{issue.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
