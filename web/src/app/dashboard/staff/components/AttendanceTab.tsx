'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAuth } from '@/context/AuthContext';
import { apiFetch, fetcher } from '@/lib/api';
import { Loader2, Users, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
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
  checkInTime?: string;
  checkOutTime?: string;
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
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  
  const [editForm, setEditForm] = useState<{status: string, checkInTime: string, checkOutTime: string}>({
    status: '', checkInTime: '', checkOutTime: ''
  });

  const { data: staffData, error: staffError } = useSWR('/staff', fetcher);
  const { data: attendanceData, error: attendanceError, mutate: mutateAttendance } = useSWR(`/attendance?date=${date}`, fetcher);

  const staff: StaffMember[] = staffData ? staffData.filter((s: StaffMember) => s.role !== 'OWNER') : [];
  const attendanceRecords: AttendanceRecord[] = Array.isArray(attendanceData) ? attendanceData : [];
  const isLoading = (!staffData && !staffError) || (!attendanceData && !attendanceError);

  const openEditModal = (member: StaffMember) => {
    const record = attendanceRecords.find(r => r.userId === member.id);
    setEditingMember(member);
    setEditForm({
      status: record?.status || 'PRESENT',
      checkInTime: record?.checkInTime ? new Date(record.checkInTime).toISOString().slice(0,16) : '',
      checkOutTime: record?.checkOutTime ? new Date(record.checkOutTime).toISOString().slice(0,16) : ''
    });
  };

  const closeEditModal = () => {
    setEditingMember(null);
  };

  const handleUpdate = async () => {
    if (!editingMember) return;
    setError('');
    setSuccess('');
    setIsUpdating(true);
    
    try {
      const payload: any = { 
        userId: editingMember.id, 
        date, 
        status: editForm.status 
      };
      
      if (editForm.checkInTime) payload.checkInTime = new Date(editForm.checkInTime).toISOString();
      if (editForm.checkOutTime) payload.checkOutTime = new Date(editForm.checkOutTime).toISOString();
      
      const promise = apiFetch('/attendance', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      mutateAttendance(async (currentData: any) => {
        const updatedRecord = await promise;
        const current = Array.isArray(currentData) ? currentData : [];
        const exists = current.find((r: AttendanceRecord) => r.userId === editingMember.id);
        if (exists) {
          return current.map((r: AttendanceRecord) => r.userId === editingMember.id ? updatedRecord : r);
        }
        return [...current, updatedRecord];
      }, {
        optimisticData: (currentData: any) => {
          const current = Array.isArray(currentData) ? currentData : [];
          const exists = current.find((r: AttendanceRecord) => r.userId === editingMember.id);
          if (exists) {
            return current.map((r: AttendanceRecord) => r.userId === editingMember.id ? { ...r, ...payload } : r);
          }
          return [...current, payload];
        },
        rollbackOnError: true,
        revalidate: false
      });
      
      setSuccess('Attendance updated successfully');
      closeEditModal();
    } catch (err: any) {
      setError(err.message || 'Failed to update attendance');
    } finally {
      setIsUpdating(false);
    }
  };

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const getRecord = (userId: string) => attendanceRecords.find(r => r.userId === userId);

  const formatRole = (role: string) => {
    return role.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '-';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
                {staff.map((member) => {
                  const record = getRecord(member.id);
                  return (
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
                      
                      <div className="grid grid-cols-2 gap-2 text-sm bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div>
                          <p className="text-slate-400 text-xs uppercase font-medium">Status</p>
                          <p className="font-medium text-slate-700">{record?.status || 'NOT MARKED'}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs uppercase font-medium">In - Out</p>
                          <p className="text-slate-700">{formatTime(record?.checkInTime)} - {formatTime(record?.checkOutTime)}</p>
                        </div>
                      </div>

                      {isManager && (
                        <div className="pt-2">
                          <Button 
                            onClick={() => openEditModal(member)}
                            className="w-full"
                            variant="outline"
                          >
                            Update
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table View (>= 640px) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200 whitespace-nowrap">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Role</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Check In</th>
                      <th className="px-6 py-4">Check Out</th>
                      {isManager && <th className="px-6 py-4 text-right">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {staff.map((member) => {
                      const record = getRecord(member.id);
                      return (
                        <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-medium text-slate-900">{member.name}</p>
                            <p className="text-xs text-slate-500">{member.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                              {formatRole(member.role)}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 font-medium">
                            {record?.status ? (
                              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {record.status}
                              </Badge>
                            ) : (
                              <span className="text-slate-400 italic">Not Marked</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center text-slate-700">
                              <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                              {formatTime(record?.checkInTime)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center text-slate-700">
                              <Clock className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                              {formatTime(record?.checkOutTime)}
                            </div>
                          </td>
                          {isManager && (
                            <td className="px-6 py-4 text-right">
                              <Button 
                                onClick={() => openEditModal(member)}
                                size="sm" 
                                variant="outline"
                              >
                                Update
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {/* Edit Modal Overlay */}
      {editingMember && (
        <div className="fixed inset-0 z-[99] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-900">Update Attendance</h3>
              <button 
                onClick={closeEditModal}
                className="text-slate-400 hover:text-slate-500 transition-colors"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-1">Staff Member</p>
                <p className="text-slate-900 font-semibold">{editingMember.name}</p>
                <p className="text-slate-500 text-sm">{formatRole(editingMember.role)}</p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1 block">Status</label>
                  <Select
                    className="w-full"
                    value={editForm.status}
                    onChange={(e: any) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                  >
                    <option value="" disabled>Select Status</option>
                    <option value="PRESENT">Present</option>
                    <option value="ABSENT">Absent</option>
                    <option value="HALF_DAY">Half Day</option>
                    <option value="ON_LEAVE">On Leave</option>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Check In</label>
                    <Input 
                      type="datetime-local" 
                      value={editForm.checkInTime}
                      onChange={(e) => setEditForm(prev => ({ ...prev, checkInTime: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 mb-1 block">Check Out</label>
                    <Input 
                      type="datetime-local" 
                      value={editForm.checkOutTime}
                      onChange={(e) => setEditForm(prev => ({ ...prev, checkOutTime: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={closeEditModal} disabled={isUpdating}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={isUpdating || !editForm.status}>
                {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
