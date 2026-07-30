'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { fetcher } from '@/lib/api';
import { BarChart3, TrendingUp, Users, CalendarDays, UserCheck, UserX, Clock, AlertCircle } from 'lucide-react';
import { TableSkeleton } from '@/components/Skeletons';
import { Badge } from '@/components/ui/badge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

type StaffSummary = {
  userId: string;
  userName: string;
  userEmail: string;
  role: string;
  present: number;
  absent: number;
  halfDay: number;
  onLeave: number;
  totalWorkingDays: number;
  totalMarked: number;
  attendanceRate: number;
};

type SummaryData = {
  range: string;
  startDate: string;
  endDate: string;
  totalWorkingDays: number;
  overall: {
    present: number;
    absent: number;
    halfDay: number;
    onLeave: number;
    total: number;
    attendanceRate: number;
  };
  staffSummaries: StaffSummary[];
};

const COLORS = {
  present: '#10b981',
  absent: '#ef4444',
  halfDay: '#f59e0b',
  onLeave: '#3b82f6',
};

const CHART_DATA_KEYS = [
  { key: 'present', label: 'Present', color: COLORS.present },
  { key: 'absent', label: 'Absent', color: COLORS.absent },
  { key: 'halfDay', label: 'Half Day', color: COLORS.halfDay },
  { key: 'onLeave', label: 'On Leave', color: COLORS.onLeave },
];

const formatRole = (role: string) =>
  role.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');

const formatDateRange = (start: string, end: string) => {
  const s = new Date(start + 'T00:00:00');
  const e = new Date(end + 'T00:00:00');
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return `${s.toLocaleDateString('en-IN', opts)} — ${e.toLocaleDateString('en-IN', opts)}`;
};

// Custom label for donut center
function CenterLabel({ viewBox, value }: { viewBox?: { cx: number; cy: number }; value: number }) {
  if (!viewBox) return null;
  const { cx, cy } = viewBox;
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="central" className="fill-slate-900 text-3xl font-bold">
        {value}%
      </text>
      <text x={cx} y={cy + 16} textAnchor="middle" dominantBaseline="central" className="fill-slate-500 text-xs">
        Attendance Rate
      </text>
    </g>
  );
}

export function AttendanceAnalyticsTab() {
  const { user } = useAuth();
  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER';

  const [range, setRange] = useState<'week' | 'month' | 'year'>('month');

  const { data, error } = useSWR<SummaryData>(
    `/attendance/summary?range=${range}`,
    fetcher
  );

  const isLoading = !data && !error;

  const getDonutData = (summary: SummaryData['overall'] | StaffSummary) => {
    return CHART_DATA_KEYS
      .map(({ key, label, color }) => ({
        name: label,
        value: summary[key as keyof typeof summary] as number,
        color,
      }))
      .filter(d => d.value > 0);
  };

  const getRateColor = (rate: number) => {
    if (rate >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (rate >= 70) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-6">
      {/* Header with Range Toggle */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Attendance Analytics</h3>
          <p className="text-slate-500 text-sm mt-1">
            {isManager
              ? 'Cumulative attendance overview for all staff.'
              : 'Your attendance summary.'}
          </p>
        </div>
        <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
          {(['week', 'month', 'year'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                range === r
                  ? 'bg-white shadow-sm text-blue-600'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {r === 'week' ? 'This Week' : r === 'month' ? 'This Month' : 'This Year'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-center p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 shadow-sm">
          <AlertCircle className="w-5 h-5 mr-3 text-red-500" />
          <p className="text-sm font-medium">Failed to load analytics. Please try again.</p>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : data ? (
        <>
          {/* Date Range Info */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <CalendarDays className="w-4 h-4" />
            <span>{formatDateRange(data.startDate, data.endDate)}</span>
            <span className="text-slate-300">•</span>
            <span>{data.totalWorkingDays} working days</span>
          </div>

          {/* Stats Cards + Donut Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Donut Chart */}
            <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center">
              <h4 className="text-sm font-semibold text-slate-700 mb-4 self-start">
                {isManager ? 'Overall Breakdown' : 'Your Breakdown'}
              </h4>
              {data.overall.total === 0 ? (
                <div className="flex flex-col items-center justify-center h-[220px] text-slate-400">
                  <BarChart3 className="w-10 h-10 mb-2 text-slate-300" />
                  <p className="text-sm">No attendance data yet</p>
                </div>
              ) : (
                <div className="w-full h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getDonutData(data.overall)}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {getDonutData(data.overall).map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                        <CenterLabel value={data.overall.attendanceRate} />
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          borderRadius: '8px',
                          border: 'none',
                          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                          fontSize: '13px',
                        }}
                        formatter={(value) => [`${value} days`, '']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* Legend */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-4 w-full">
                {CHART_DATA_KEYS.map(({ label, color }) => (
                  <div key={label} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-slate-600">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stat Cards */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                icon={<UserCheck className="w-5 h-5 text-emerald-600" />}
                bg="bg-emerald-50"
                label="Present"
                value={data.overall.present}
              />
              <StatCard
                icon={<UserX className="w-5 h-5 text-red-600" />}
                bg="bg-red-50"
                label="Absent"
                value={data.overall.absent}
              />
              <StatCard
                icon={<Clock className="w-5 h-5 text-amber-600" />}
                bg="bg-amber-50"
                label="Half Day"
                value={data.overall.halfDay}
              />
              <StatCard
                icon={<CalendarDays className="w-5 h-5 text-blue-600" />}
                bg="bg-blue-50"
                label="On Leave"
                value={data.overall.onLeave}
              />

              {/* Overall Rate Card - spans full width */}
              <div className="col-span-2 sm:col-span-4 bg-white rounded-xl shadow-sm border border-slate-200 p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-indigo-50">
                    <TrendingUp className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Overall Attendance Rate</p>
                    <p className="text-2xl font-bold text-slate-900 mt-0.5">{data.overall.attendanceRate}%</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-500">{data.staffSummaries.length} staff tracked</span>
                </div>
              </div>
            </div>
          </div>

          {/* Staff-wise Table (Management Only) */}
          {isManager && data.staffSummaries.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="p-6 border-b border-slate-100">
                <h4 className="font-semibold text-slate-800">Staff-wise Summary</h4>
                <p className="text-xs text-slate-500 mt-1">Individual attendance breakdown for the selected period</p>
              </div>

              {/* Mobile Card View */}
              <div className="sm:hidden flex flex-col divide-y divide-slate-100">
                {data.staffSummaries.map((staff) => (
                  <div key={staff.userId} className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-slate-900">{staff.userName}</p>
                        <Badge variant="secondary" className="bg-slate-100 text-slate-700 mt-1">
                          {formatRole(staff.role)}
                        </Badge>
                      </div>
                      <div className={`px-3 py-1.5 rounded-lg border font-bold text-lg ${getRateColor(staff.attendanceRate)}`}>
                        {staff.attendanceRate}%
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center bg-slate-50 rounded-lg p-3 border border-slate-100">
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">Present</p>
                        <p className="text-lg font-bold text-emerald-600">{staff.present}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">Absent</p>
                        <p className="text-lg font-bold text-red-600">{staff.absent}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">Half</p>
                        <p className="text-lg font-bold text-amber-600">{staff.halfDay}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase">Leave</p>
                        <p className="text-lg font-bold text-blue-600">{staff.onLeave}</p>
                      </div>
                    </div>
                    {/* Mini progress bar */}
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      {staff.present > 0 && (
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{ width: `${(staff.present / staff.totalWorkingDays) * 100}%` }}
                        />
                      )}
                      {staff.halfDay > 0 && (
                        <div
                          className="h-full bg-amber-500 transition-all"
                          style={{ width: `${(staff.halfDay / staff.totalWorkingDays) * 100}%` }}
                        />
                      )}
                      {staff.onLeave > 0 && (
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${(staff.onLeave / staff.totalWorkingDays) * 100}%` }}
                        />
                      )}
                      {staff.absent > 0 && (
                        <div
                          className="h-full bg-red-500 transition-all"
                          style={{ width: `${(staff.absent / staff.totalWorkingDays) * 100}%` }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200 whitespace-nowrap">
                    <tr>
                      <th className="px-6 py-4">Staff Member</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4 text-center">Present</th>
                      <th className="px-6 py-4 text-center">Absent</th>
                      <th className="px-6 py-4 text-center">Half Day</th>
                      <th className="px-6 py-4 text-center">On Leave</th>
                      <th className="px-6 py-4 text-center">Rate</th>
                      <th className="px-6 py-4">Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.staffSummaries.map((staff) => (
                      <tr key={staff.userId} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <p className="font-medium text-slate-900">{staff.userName}</p>
                          <p className="text-xs text-slate-500">{staff.userEmail}</p>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                            {formatRole(staff.role)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 font-bold text-sm">
                            {staff.present}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-red-50 text-red-700 font-bold text-sm">
                            {staff.absent}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-amber-50 text-amber-700 font-bold text-sm">
                            {staff.halfDay}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm">
                            {staff.onLeave}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border font-bold text-sm ${getRateColor(staff.attendanceRate)}`}>
                            {staff.attendanceRate}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden flex">
                            {staff.present > 0 && (
                              <div
                                className="h-full bg-emerald-500"
                                style={{ width: `${(staff.present / staff.totalWorkingDays) * 100}%` }}
                              />
                            )}
                            {staff.halfDay > 0 && (
                              <div
                                className="h-full bg-amber-500"
                                style={{ width: `${(staff.halfDay / staff.totalWorkingDays) * 100}%` }}
                              />
                            )}
                            {staff.onLeave > 0 && (
                              <div
                                className="h-full bg-blue-500"
                                style={{ width: `${(staff.onLeave / staff.totalWorkingDays) * 100}%` }}
                              />
                            )}
                            {staff.absent > 0 && (
                              <div
                                className="h-full bg-red-500"
                                style={{ width: `${(staff.absent / staff.totalWorkingDays) * 100}%` }}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Personal Stats for Non-Management */}
          {!isManager && data.staffSummaries.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 space-y-4">
              <h4 className="font-semibold text-slate-800">Your Attendance Details</h4>
              {data.staffSummaries.map((staff) => (
                <div key={staff.userId} className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100 text-center">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Present</p>
                      <p className="text-3xl font-bold text-emerald-700 mt-1">{staff.present}</p>
                      <p className="text-[10px] text-emerald-500 mt-1">of {staff.totalWorkingDays} days</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 border border-red-100 text-center">
                      <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider">Absent</p>
                      <p className="text-3xl font-bold text-red-700 mt-1">{staff.absent}</p>
                      <p className="text-[10px] text-red-500 mt-1">of {staff.totalWorkingDays} days</p>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 text-center">
                      <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Half Day</p>
                      <p className="text-3xl font-bold text-amber-700 mt-1">{staff.halfDay}</p>
                      <p className="text-[10px] text-amber-500 mt-1">of {staff.totalWorkingDays} days</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 text-center">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">On Leave</p>
                      <p className="text-3xl font-bold text-blue-700 mt-1">{staff.onLeave}</p>
                      <p className="text-[10px] text-blue-500 mt-1">of {staff.totalWorkingDays} days</p>
                    </div>
                  </div>
                  {/* Full-width progress bar */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-slate-500">Attendance Progress</span>
                      <span className={`text-sm font-bold ${staff.attendanceRate >= 90 ? 'text-emerald-600' : staff.attendanceRate >= 70 ? 'text-amber-600' : 'text-red-600'}`}>
                        {staff.attendanceRate}%
                      </span>
                    </div>
                    <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                      {staff.present > 0 && (
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${(staff.present / staff.totalWorkingDays) * 100}%` }} />
                      )}
                      {staff.halfDay > 0 && (
                        <div className="h-full bg-amber-500 transition-all" style={{ width: `${(staff.halfDay / staff.totalWorkingDays) * 100}%` }} />
                      )}
                      {staff.onLeave > 0 && (
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${(staff.onLeave / staff.totalWorkingDays) * 100}%` }} />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

function StatCard({ icon, bg, label, value }: { icon: React.ReactNode; bg: string; label: string; value: number }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex items-center">
      <div className={`p-3 rounded-full ${bg} mr-3 shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
