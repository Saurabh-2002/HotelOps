'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, fetcher } from '@/lib/api';
import { Loader2, Users, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import { TableSkeleton } from '@/components/Skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';

type StaffMember = {
  id: string;
  name: string;
  role: string;
  email: string;
};

type AttendanceRecord = {
  id?: string;
  userId: string;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'ON_LEAVE';
};

export function AttendanceTab() {
  const { user } = useAuth();
  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER';

  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: staffData, error: staffError } = useSWR('/staff', fetcher);
  const { data: attendanceData, error: attendanceError, mutate: mutateAttendance } = useSWR(`/attendance?date=${date}`, fetcher);

  const staff: StaffMember[] = staffData ? staffData.filter((s: StaffMember) => s.role !== 'OWNER') : [];
  const attendanceRecords: AttendanceRecord[] = attendanceData || [];
  const isLoading = (!staffData && !staffError) || (!attendanceData && !attendanceError);

  const handleStatusChange = async (userId: string, status: string) => {
    setError('');
    setSuccess('');
    
    try {
      const payload = { userId, date, status };
      const promise = apiFetch('/attendance', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      mutateAttendance(async (currentData: any) => {
        await promise;
        return undefined; // Let revalidate fetch the actual updated data
      }, {
        optimisticData: (currentData: any) => {
          if (!currentData) return currentData;
          const exists = currentData.find((r: AttendanceRecord) => r.userId === userId);
          if (exists) {
            return currentData.map((r: AttendanceRecord) => r.userId === userId ? { ...r, status } : r);
          }
          return [...currentData, payload];
        },
        rollbackOnError: true,
        revalidate: true
      });
      
      setSuccess('Attendance updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update attendance');
    }
  };

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const getAttendanceStatus = (userId: string) => {
    const record = attendanceRecords.find(r => r.userId === userId);
    return record?.status || '';
  };

  const formatRole = (role: string) => {
    return role.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Daily Attendance</h3>
          <p className="text-slate-500 text-sm mt-1">
            {isManager ? 'Manage staff attendance records.' : 'View your daily attendance.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-slate-400" />
          <Input 
            type="date" 
            value={date} 
            onChange={(e) => setDate(e.target.value)} 
            className="w-full sm:w-auto"
          />
        </div>
      </div>

      {error && (
        <div className="flex items-center p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <XCircle className="w-5 h-5 mr-3 text-red-500" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="flex items-center p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 shadow-sm animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-5 h-5 mr-3 text-emerald-500" />
          <p className="text-sm font-medium">{success}</p>
        </div>
      )}

      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col">
          {staff.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>No staff members found.</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View (< 640px) */}
              <div className="sm:hidden flex flex-col divide-y divide-slate-100">
                {staff.map((member) => (
                  <div key={member.id} className="p-4 flex flex-col space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-lg">{member.name}</span>
                        <span className="text-xs text-slate-500 mt-0.5">{member.email}</span>
                      </div>
                      <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                        {formatRole(member.role)}
                      </Badge>
                    </div>
                    <div className="pt-2">
                      <Select
                        className="w-full bg-white shadow-sm"
                        value={getAttendanceStatus(member.id)}
                        onChange={(e: any) => handleStatusChange(member.id, e.target.value)}
                        placeholder="Mark Attendance"
                      >
                        <option value="" disabled>Select Status</option>
                        <option value="PRESENT">Present</option>
                        <option value="ABSENT">Absent</option>
                        <option value="HALF_DAY">Half Day</option>
                        <option value="ON_LEAVE">On Leave</option>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= 640px) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200 whitespace-nowrap">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Email</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staff.map((member) => (
                      <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {member.name}
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {member.email}
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                            {formatRole(member.role)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Select
                            className="w-40 ml-auto bg-white shadow-sm"
                            value={getAttendanceStatus(member.id)}
                            onChange={(e: any) => handleStatusChange(member.id, e.target.value)}
                            placeholder="Mark..."
                          >
                            <option value="" disabled>Mark...</option>
                            <option value="PRESENT">Present</option>
                            <option value="ABSENT">Absent</option>
                            <option value="HALF_DAY">Half Day</option>
                            <option value="ON_LEAVE">On Leave</option>
                          </Select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
