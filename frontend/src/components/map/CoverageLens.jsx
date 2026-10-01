import React from 'react';
import { Clock, Eye, CheckCircle2 } from 'lucide-react';

export const LENS_MODES = {
  NOW: 'now',
  AFTERNOON: 'afternoon', // 13:00 - 17:00
  EVENING: 'evening',     // 17:00 - 21:00
  FULL_DAY: 'full_day'
};

export default function CoverageLens({ selectedLens, onSelectLens }) {
  const lenses = [
    {
      id: LENS_MODES.NOW,
      label: 'Now (Live Attendance)',
      badge: 'Actual',
      desc: 'Real-time verified check-ins and active issues on site.'
    },
    {
      id: LENS_MODES.AFTERNOON,
      label: 'Peak Period (13:00 - 17:00)',
      badge: 'Scheduled',
      desc: 'Scheduled roster coverage for current peak afternoon block.'
    },
    {
      id: LENS_MODES.EVENING,
      label: 'Evening Headliner (17:00 - 21:00)',
      badge: 'Scheduled',
      desc: 'Scheduled roster coverage for evening stages & exits.'
    }
  ];

  return (
    <div className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-2 shadow-xs mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-2 py-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-violet-100 text-[#7054E8] flex items-center justify-center">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-900 block leading-tight">
              Coverage Lens
            </span>
            <span className="text-[10px] text-slate-500 block">
              Toggle between verified live check-ins and future scheduled rosters
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl overflow-x-auto">
          {lenses.map((lens) => {
            const isSelected = selectedLens === lens.id;
            const isNow = lens.id === LENS_MODES.NOW;
            return (
              <button
                key={lens.id}
                onClick={() => onSelectLens(lens.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-white text-slate-900 font-bold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                {isNow && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
                <span>{lens.label}</span>
                <span
                  className={`text-[9px] px-1 py-0.2 rounded font-bold uppercase ${
                    isNow ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  {lens.badge}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
