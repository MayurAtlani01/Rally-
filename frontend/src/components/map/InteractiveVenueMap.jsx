import React, { useState, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  Plus,
  Minus,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Sparkles,
  MapPin,
  Users,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

export const SHIFT_TIME_MODES = {
  NOW: 'now',
  NEXT: 'next'
};

export const COVERAGE_MODES = {
  SCHEDULED: 'scheduled',
  CHECKED_IN: 'checked_in'
};

export default function InteractiveVenueMap({
  event = null,
  zones = [],
  shifts = [],
  issues = [],
  selectedZone = null,
  onSelectZone,
  shiftMode = SHIFT_TIME_MODES.NOW,
  onShiftModeChange,
  coverageMode = COVERAGE_MODES.SCHEDULED,
  onCoverageModeChange
}) {
  const { isNight } = useTheme();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [imageError, setImageError] = useState(false);

  const containerRef = useRef(null);

  // Check if we have an uploaded layout or are running the demo event
  const hasUploadedLayout = Boolean(event?.layoutImageUrl);
  const isDemoFestival = event?.id === 'ev-ignite-2026';
  const showMapCanvas = hasUploadedLayout || isDemoFestival;

  const artworkSrc = event?.layoutImageUrl || (isNight ? '/venue/rally-night.jpg' : '/venue/rally-day.png');

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(2.2, +(z + 0.25).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(1, +(z - 0.25).toFixed(2)));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Mouse pan handlers when zoomed in
  const handleMouseDown = (e) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Keyboard navigation for zoom
  const handleKeyDown = (e) => {
    if (e.key === '+' || e.key === '=') handleZoomIn();
    if (e.key === '-' || e.key === '_') handleZoomOut();
    if (e.key === '0') handleResetZoom();
  };

  // Helper for pin visual color & badge
  const getZonePinStyle = (zone) => {
    const isSelected = selectedZone?.id === zone.id;
    const isUnderstaffed = (zone.assignedHeadcount || 0) < (zone.requiredHeadcount || 1);
    const hasUrgent = (zone.urgentIssuesCount || 0) > 0;

    let bg = '#C4F03A'; // lime
    let textColor = '#0F172A';
    let dotColor = '#0F172A';

    if (hasUrgent) {
      bg = '#EF4444'; // red
      textColor = '#FFFFFF';
      dotColor = '#FFFFFF';
    } else if (isUnderstaffed) {
      bg = '#F59E0B'; // amber
      textColor = '#0F172A';
      dotColor = '#78350F';
    } else if (zone.color) {
      bg = zone.color;
      textColor = '#FFFFFF';
      dotColor = '#FFFFFF';
    }

    return {
      bg,
      textColor,
      dotColor,
      ring: isSelected ? '0 0 0 3px #FFFFFF, 0 0 0 6px #7054E8' : '0 2px 8px rgba(0,0,0,0.18)'
    };
  };

  // Polished Zone-List view when no venue layout is uploaded
  if (!showMapCanvas) {
    return (
      <div
        className="w-full rounded-3xl border shadow-md p-6 space-y-5 transition-colors"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          minHeight: '440px'
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300">
                Zone Operations Grid
              </span>
              <span className="text-xs text-slate-500">Accessible Zone-List Mode</span>
            </div>
            <h3 className="font-editorial text-2xl font-bold mt-1" style={{ color: 'var(--text-heading)' }}>
              Venue Zones & Staffing Pulse
            </h3>
          </div>

          <div
            className="flex items-center gap-1.5 p-1 rounded-full border shadow-2xs backdrop-blur-md self-start"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <button
              onClick={() => onShiftModeChange(SHIFT_TIME_MODES.NOW)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                shiftMode === SHIFT_TIME_MODES.NOW ? 'shadow-xs font-black' : 'text-slate-500'
              }`}
              style={{
                backgroundColor: shiftMode === SHIFT_TIME_MODES.NOW ? 'var(--action-lime)' : 'transparent',
                color: shiftMode === SHIFT_TIME_MODES.NOW ? 'var(--action-lime-text)' : 'inherit'
              }}
            >
              Now
            </button>
            <button
              onClick={() => onShiftModeChange(SHIFT_TIME_MODES.NEXT)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                shiftMode === SHIFT_TIME_MODES.NEXT ? 'shadow-xs font-black' : 'text-slate-500'
              }`}
              style={{
                backgroundColor: shiftMode === SHIFT_TIME_MODES.NEXT ? 'var(--action-lime)' : 'transparent',
                color: shiftMode === SHIFT_TIME_MODES.NEXT ? 'var(--action-lime-text)' : 'inherit'
              }}
            >
              Next shift
            </button>
          </div>
        </div>

        {zones.length === 0 ? (
          <div
            className="p-12 text-center rounded-2xl border space-y-2"
            style={{
              backgroundColor: 'var(--bg-surface-subtle)',
              borderColor: 'var(--border-subtle)'
            }}
          >
            <Layers className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <h4 className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>
              No zones created yet
            </h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Define named zones in Event Setup to monitor live positions and staffing levels.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {zones.map((zone) => {
              const isSelected = selectedZone?.id === zone.id;
              const isUnderstaffed = (zone.assignedHeadcount || 0) < (zone.requiredHeadcount || 1);
              const isCheckedInUnder = (zone.checkedInHeadcount || 0) < (zone.requiredHeadcount || 1);

              return (
                <div
                  key={zone.id}
                  onClick={() => onSelectZone(zone)}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-md flex flex-col justify-between gap-4 ${
                    isSelected ? 'ring-2 ring-[#7054E8]' : ''
                  }`}
                  style={{
                    backgroundColor: 'var(--bg-surface-subtle)',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs"
                        style={{ backgroundColor: zone.color || '#7054E8' }}
                      />
                      <div>
                        <h4 className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>
                          {zone.name}
                        </h4>
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          Code: {zone.code}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                        isUnderstaffed
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                      }`}
                    >
                      {isUnderstaffed ? 'Understaffed' : 'Staffed'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y text-center text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Required</span>
                      <strong className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>
                        {zone.requiredHeadcount || 0}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Assigned</span>
                      <strong className="font-bold text-sm" style={{ color: 'var(--text-heading)' }}>
                        {zone.assignedHeadcount || 0}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Checked In</span>
                      <strong className="font-bold text-sm" style={{ color: isCheckedInUnder ? 'var(--amber-warning)' : 'var(--emerald-text)' }}>
                        {zone.checkedInHeadcount || 0}
                      </strong>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[11px] text-slate-500">
                      {zone.activeIssuesCount ? `${zone.activeIssuesCount} active issues` : 'No issues'}
                    </span>
                    <span className="font-bold text-[#7054E8] flex items-center gap-1 text-[11px]">
                      Inspect <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Interactive Venue Layout Image Map View
  return (
    <div
      className="w-full relative overflow-hidden rounded-3xl border shadow-md focus:outline-hidden transition-colors"
      style={{
        backgroundColor: 'var(--bg-map-container)',
        borderColor: 'var(--border-subtle)',
        aspectRatio: '16 / 9.5',
        minHeight: '440px'
      }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Top Floating Controls: VENUE PULSE | Now / Next Shift */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
        <div
          className="flex items-center gap-1.5 p-1 rounded-full border shadow-sm backdrop-blur-md"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.88)',
            borderColor: 'rgba(15, 23, 42, 0.1)'
          }}
        >
          <span className="text-[11px] font-black tracking-wider uppercase px-3 py-1 text-slate-800">
            VENUE PULSE
          </span>
          <button
            onClick={() => onShiftModeChange(SHIFT_TIME_MODES.NOW)}
            className={`px-3 py-1 rounded-full text-xs font-black transition-all ${
              shiftMode === SHIFT_TIME_MODES.NOW ? 'shadow-xs' : 'text-slate-600 hover:text-slate-950'
            }`}
            style={{
              backgroundColor: shiftMode === SHIFT_TIME_MODES.NOW ? '#C4F03A' : 'transparent',
              color: '#0F172A'
            }}
          >
            Now
          </button>
          <button
            onClick={() => onShiftModeChange(SHIFT_TIME_MODES.NEXT)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              shiftMode === SHIFT_TIME_MODES.NEXT ? 'shadow-xs' : 'text-slate-600 hover:text-slate-950'
            }`}
            style={{
              backgroundColor: shiftMode === SHIFT_TIME_MODES.NEXT ? '#C4F03A' : 'transparent',
              color: '#0F172A'
            }}
          >
            Next shift
          </button>
        </div>
      </div>

      {/* Coordinate-Transformed Scene Layer */}
      <div
        className="w-full h-full relative origin-center transition-transform duration-150 ease-out cursor-grab active:cursor-grabbing"
        style={{
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`
        }}
      >
        {!imageError ? (
          <img
            src={artworkSrc}
            alt="Venue Layout"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover select-none pointer-events-none transition-opacity duration-300"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-900 text-white font-mono text-xs">
            Venue Layout Canvas
          </div>
        )}

        {/* Normalized Interactive Zone Pins Overlay */}
        {zones.map((zone) => {
          const pinStyle = getZonePinStyle(zone);
          const isSelected = selectedZone?.id === zone.id;

          const count = coverageMode === COVERAGE_MODES.CHECKED_IN
            ? `${zone.checkedInHeadcount || 0}/${zone.requiredHeadcount || 1}`
            : `${zone.assignedHeadcount || 0}/${zone.requiredHeadcount || 1}`;

          return (
            <div
              key={zone.id}
              style={{
                left: `${zone.posX || 50}%`,
                top: `${zone.posY || 50}%`,
                transform: 'translate(-50%, -50%)'
              }}
              className="absolute z-20"
            >
              <button
                onClick={() => onSelectZone(zone)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectZone(zone);
                  }
                }}
                className={`group flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold shadow-md transition-all duration-150 hover:scale-105 active:scale-95 ${
                  isSelected ? 'scale-110' : ''
                }`}
                style={{
                  backgroundColor: pinStyle.bg,
                  color: pinStyle.textColor,
                  boxShadow: pinStyle.ring
                }}
                title={`${zone.name} (${count})`}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: pinStyle.dotColor }}
                />
                <span className="tracking-wide uppercase text-[11px] whitespace-nowrap">
                  {zone.code || zone.name}
                </span>
                <span className="text-[10px] font-bold opacity-80 pl-0.5 whitespace-nowrap">
                  {count}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Floating Bottom Left: Scheduled vs Checked-In Pill */}
      <div className="absolute bottom-4 left-4 z-30 flex items-center gap-1.5 p-1 rounded-full border shadow-sm backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 text-xs">
        <button
          onClick={() => onCoverageModeChange(COVERAGE_MODES.SCHEDULED)}
          className={`px-3 py-1 rounded-full font-bold transition-all ${
            coverageMode === COVERAGE_MODES.SCHEDULED
              ? 'bg-[#C4F03A] text-slate-950 font-black shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Scheduled
        </button>
        <button
          onClick={() => onCoverageModeChange(COVERAGE_MODES.CHECKED_IN)}
          className={`px-3 py-1 rounded-full font-bold transition-all ${
            coverageMode === COVERAGE_MODES.CHECKED_IN
              ? 'bg-[#C4F03A] text-slate-950 font-black shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          Checked In
        </button>
      </div>

      {/* Floating Zoom & Pan Controls (Bottom-Right) */}
      <div className="absolute bottom-4 right-4 z-30 flex items-center gap-1.5 p-1 rounded-full border shadow-sm backdrop-blur-md bg-white/90 dark:bg-slate-900/90 border-slate-200 dark:border-slate-800">
        <button
          onClick={handleZoomIn}
          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Zoom in (+)"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleZoomOut}
          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Zoom out (-)"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={handleResetZoom}
          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          title="Reset zoom and center (0)"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
