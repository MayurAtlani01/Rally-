import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Download,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Award,
  Layers,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function ReportsPage() {
  const { currentEvent, showToast } = useAuth();
  const { isNight } = useTheme();
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    if (!currentEvent) return;
    try {
      const data = await api.getReport(currentEvent.id);
      setReportData(data);
    } catch (err) {
      showToast(err.message || 'Failed to load report data', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentEvent, showToast]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleDownloadCsv = () => {
    window.location.href = api.getCsvUrl(currentEvent.id);
    showToast('Downloading RALLY event CSV report...', 'success');
  };

  const metrics = reportData?.metrics || {};
  const zoneBreakdown = reportData?.zoneBreakdown || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div>
          <span
            className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--lilac-subtle)',
              color: 'var(--lilac-accent)'
            }}
          >
            Analytics & Auditing
          </span>
          <h1 className="text-2xl font-black mt-1" style={{ color: 'var(--text-heading)' }}>
            Operational Event Report
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Calculated strictly from verified stored records. Incomplete checkouts are flagged honestly.
          </p>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="px-4 py-2.5 rounded-xl text-xs font-bold shadow-xs flex items-center gap-2 transition-colors self-start sm:self-auto"
          style={{
            backgroundColor: 'var(--action-lime)',
            color: 'var(--action-lime-text)'
          }}
        >
          <Download className="w-4 h-4" />
          <span>Export Complete CSV Report</span>
        </button>
      </div>

      {/* Primary Metrics Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Computing real-time event analytics...</div>
      ) : !reportData || (metrics.totalAssignments === 0 && metrics.totalRequiredPositions === 0) ? (
        <div
          className="p-12 text-center rounded-3xl border shadow-sm space-y-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <h3 className="font-editorial text-2xl font-bold" style={{ color: 'var(--text-heading)' }}>
            No recorded operations data yet
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Reports reflect actual logged shifts and attendance. Once volunteers check in and perform shifts, real analytics will appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div
              className="p-5 rounded-3xl border shadow-xs transition-colors"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Attendance Rate
              </span>
              <p className="text-3xl font-black mt-1" style={{ color: 'var(--text-heading)' }}>
                {metrics.attendanceRatePercent || 0}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {metrics.completedOrCheckedInCount || 0} of {metrics.totalAssignments || 0} rostered showed up
              </p>
            </div>

            <div
              className="p-5 rounded-3xl border shadow-xs transition-colors"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Assigned vs Attended
              </span>
              <p className="text-3xl font-black mt-1" style={{ color: 'var(--text-heading)' }}>
                {metrics.totalAttendedHours || 0}{' '}
                <span className="text-sm font-semibold text-slate-400">/ {metrics.totalAssignedHours || 0}h</span>
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Verified hours from check-in/out records
              </p>
            </div>

            <div
              className="p-5 rounded-3xl border shadow-xs transition-colors"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Staffing Fill Rate
              </span>
              <p className="text-3xl font-black mt-1" style={{ color: 'var(--text-heading)' }}>
                {metrics.totalRequiredPositions > 0
                  ? Math.round(((metrics.totalRequiredPositions - (metrics.unfilledPositions || 0)) / metrics.totalRequiredPositions) * 100)
                  : 100}%
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                {metrics.unfilledPositions || 0} unfilled shifts currently open
              </p>
            </div>

            <div
              className="p-5 rounded-3xl border shadow-xs transition-colors"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Issue Response Time
              </span>
              <p className="text-3xl font-black mt-1" style={{ color: 'var(--text-heading)' }}>
                {metrics.avgAckTimeMinutes !== null ? `${metrics.avgAckTimeMinutes}m` : 'N/A'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Avg time from report to acknowledgment
              </p>
            </div>
          </div>

          {/* Honest Incomplete Data Callout */}
          {metrics.incompleteAttendanceRecords > 0 && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-700 dark:text-amber-300">
              <HelpCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Honest Data Reporting Notice:</span>
                <p className="mt-0.5 text-[11px] leading-relaxed">
                  {metrics.incompleteAttendanceRecords} attendance record(s) have verified check-ins without an official check-out. RALLY does not fabricate simulated checkout times; these records are marked pending review in the export.
                </p>
              </div>
            </div>
          )}

          {/* Zone Staffing Breakdown Chart */}
          {zoneBreakdown.length > 0 && (
            <div
              className="p-6 rounded-3xl border shadow-xs space-y-4 transition-colors"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-extrabold" style={{ color: 'var(--text-heading)' }}>
                    Zone Staffing Capacity Breakdown
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Required vs Filled volunteer positions by zone</p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={zoneBreakdown} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <XAxis
                      dataKey="zoneName"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isNight ? '#161226' : '#FFFFFF',
                        borderRadius: '16px',
                        border: '1px solid rgba(255,255,255,0.1)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        fontSize: '12px',
                        color: isNight ? '#FFFFFF' : '#0F172A'
                      }}
                    />
                    <Bar dataKey="requiredPositions" name="Required Headcount" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="filledPositions" name="Filled Headcount" fill="#C4F03A" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
