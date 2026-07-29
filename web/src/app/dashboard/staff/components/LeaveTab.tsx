'use client';

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { apiFetch, fetcher } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Loader2, Plus, CalendarDays, CheckCircle2, XCircle, FileText, Check, X } from 'lucide-react';
import { TableSkeleton } from '@/components/Skeletons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import ConfirmDialog from '@/components/ConfirmDialog';

type LeaveRequest = {
  id: string;
  userId: string;
  user: { name: string; role: string };
  startDate: string;
  endDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
};

export function LeaveTab() {
  const { user } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  const { data: leaveData, error: leaveError, mutate: mutateLeave } = useSWR('/leave', fetcher);
  const leaves: LeaveRequest[] = leaveData || [];
  const isLoading = !leaveData && !leaveError;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    reason: ''
  });

  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean,
    title: string,
    message: string,
    action?: 'APPROVE' | 'REJECT',
    id?: string
  }>({ isOpen: false, title: '', message: '' });

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleRequestLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
        reason: formData.reason
      };

      const promise = apiFetch('/leave', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      mutateLeave(async (currentData: any) => {
        await promise;
        return undefined;
      }, {
        rollbackOnError: true,
        revalidate: true
      });

      setIsModalOpen(false);
      setFormData({ startDate: '', endDate: '', reason: '' });
      setSuccess('Leave requested successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to request leave');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleActionClick = (id: string, action: 'APPROVE' | 'REJECT') => {
    setConfirmConfig({
      isOpen: true,
      title: action === 'APPROVE' ? 'Approve Leave' : 'Reject Leave',
      message: `Are you sure you want to ${action.toLowerCase()} this leave request?`,
      id,
      action
    });
  };

  const confirmAction = async () => {
    const { id, action } = confirmConfig;
    setConfirmConfig({ ...confirmConfig, isOpen: false });
    
    if (!id || !action) return;
    setError('');
    setSuccess('');
    
    try {
      const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const promise = apiFetch(`/leave/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status })
      });

      mutateLeave(async (currentData: any) => {
        await promise;
        return undefined;
      }, {
        optimisticData: (currentData: any) => {
          if (!currentData) return currentData;
          return currentData.map((l: LeaveRequest) => l.id === id ? { ...l, status } : l);
        },
        rollbackOnError: true,
        revalidate: true
      });

      setSuccess(`Leave request ${action.toLowerCase()}d successfully`);
    } catch (err: any) {
      setError(err.message || `Failed to ${action.toLowerCase()} leave request`);
    }
  };

  const isManager = user?.role === 'OWNER' || user?.role === 'MANAGER';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Leave Management</h3>
          <p className="text-slate-500 text-sm mt-1">
            {isManager ? 'Manage staff leave requests.' : 'Request and track your leave.'}
          </p>
        </div>
        {user?.role !== 'OWNER' && (
          <Button onClick={() => setIsModalOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Request Leave
          </Button>
        )}
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
          {leaves.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p>No leave requests found.</p>
            </div>
          ) : (
            <>
              {/* Mobile Card View (< 640px) */}
              <div className="sm:hidden flex flex-col divide-y divide-slate-100">
                {leaves.map((leave) => (
                  <div key={leave.id} className="p-4 flex flex-col space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-lg">{leave.user?.name || 'Unknown'}</span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                        </span>
                      </div>
                      <Badge className={
                        leave.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                        leave.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }>
                        {leave.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-500 text-xs uppercase block mb-1">Reason</span>
                      {leave.reason}
                    </div>
                    {isManager && leave.status === 'PENDING' && leave.userId !== user?.id && (
                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-50 mt-2">
                        <Button variant="outline" size="sm" className="text-emerald-600 border-emerald-200 hover:bg-emerald-50" onClick={() => handleActionClick(leave.id, 'APPROVE')}>
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button variant="outline" size="sm" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => handleActionClick(leave.id, 'REJECT')}>
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop Table View (>= 640px) */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 text-xs uppercase font-semibold border-b border-slate-200 whitespace-nowrap">
                    <tr>
                      <th className="px-6 py-4">Staff Member</th>
                      <th className="px-6 py-4">Duration</th>
                      <th className="px-6 py-4 w-1/3">Reason</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leaves.map((leave) => (
                      <tr key={leave.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {leave.user?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {new Date(leave.startDate).toLocaleDateString()} <span className="text-slate-400">to</span> {new Date(leave.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <p className="truncate max-w-xs" title={leave.reason}>{leave.reason}</p>
                        </td>
                        <td className="px-6 py-4">
                          <Badge className={
                            leave.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            leave.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                            'bg-amber-100 text-amber-800'
                          }>
                            {leave.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {isManager && leave.status === 'PENDING' && leave.userId !== user?.id ? (
                            <>
                              <Button variant="ghost" size="icon" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={() => handleActionClick(leave.id, 'APPROVE')} title="Approve">
                                <Check className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => handleActionClick(leave.id, 'REJECT')} title="Reject">
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-slate-400 text-xs">—</span>
                          )}
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

      {/* Request Leave Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Request Leave</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleRequestLeave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Start Date</label>
                  <Input 
                    type="date" 
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">End Date</label>
                  <Input 
                    type="date" 
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason</label>
                <textarea
                  required
                  rows={4}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm transition-shadow shadow-sm"
                  placeholder="Please specify the reason for your leave request..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Action Dialog */}
      <ConfirmDialog
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        onConfirm={confirmAction}
        onCancel={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
      />
    </div>
  );
}
