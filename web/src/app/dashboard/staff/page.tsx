'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import useSWR from 'swr';
import { apiFetch, fetcher } from '@/lib/api';
import { Plus, Pencil, Trash2, Shield, User, Users, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import AlertDialog from '@/components/AlertDialog';
import ConfirmDialog from '@/components/ConfirmDialog';
import { TableSkeleton } from '@/components/Skeletons';

type StaffMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  joiningDate?: string;
  endingDate?: string;
  createdAt: string;
};

const AVAILABLE_ROLES = [
  { label: 'Owner', value: 'OWNER' },
  { label: 'Manager', value: 'MANAGER' },
  { label: 'Front Desk', value: 'FRONT_DESK' },
  { label: 'Housekeeping', value: 'HOUSEKEEPING' },
  { label: 'Restaurant', value: 'RESTAURANT' },
  { label: 'Accountant', value: 'ACCOUNTANT' },
];

export default function StaffPage() {
  const { user, updateUser } = useAuth();
  const { data: staffData, error, mutate } = useSWR('/staff', fetcher);
  const isLoading = !staffData && !error;
  const staff: StaffMember[] = staffData || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'FRONT_DESK',
    avatarUrl: '',
    joiningDate: '',
    endingDate: '',
  });

  const [alertConfig, setAlertConfig] = useState<{ isOpen: boolean, title?: string, message: string, type: 'error' | 'success' | 'info' }>({ isOpen: false, message: '', type: 'info' });
  const [confirmConfig, setConfirmConfig] = useState<{ isOpen: boolean, title: string, message: string, action?: string, id?: string }>({ isOpen: false, title: '', message: '' });

  const handleOpenModal = (staffMember?: StaffMember) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setFormData({
        name: staffMember.name,
        email: staffMember.email,
        password: '', // Empty password for edit means no change
        role: staffMember.role,
        avatarUrl: staffMember.avatarUrl || '',
        joiningDate: staffMember.joiningDate ? staffMember.joiningDate.split('T')[0] : '',
        endingDate: staffMember.endingDate ? staffMember.endingDate.split('T')[0] : '',
      });
    } else {
      setEditingStaff(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'FRONT_DESK',
        avatarUrl: '',
        joiningDate: '',
        endingDate: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formDataPayload = new FormData();
    formDataPayload.append('file', file); // Multer usually expects 'file'

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/upload/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formDataPayload
      });
      const data = await response.json();
      if (data.url) {
        setFormData({ ...formData, avatarUrl: data.url });
      } else {
        setAlertConfig({ isOpen: true, title: 'Upload Failed', message: 'Invalid response from server.', type: 'error' });
      }
    } catch (err) {
      setAlertConfig({ isOpen: true, title: 'Upload Failed', message: 'Could not upload avatar.', type: 'error' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingStaff) {
        // Update
        const payload: any = {
          name: formData.name,
          email: formData.email,
          role: formData.role,
        };
        if (formData.avatarUrl) payload.avatarUrl = formData.avatarUrl;
        if (formData.joiningDate) payload.joiningDate = new Date(formData.joiningDate).toISOString();
        if (formData.endingDate) payload.endingDate = new Date(formData.endingDate).toISOString();
        if (formData.password) {
          if (formData.password.length < 6) {
            setAlertConfig({ isOpen: true, title: 'Validation Error', message: 'Password must be at least 6 characters long.', type: 'error' });
            setIsSubmitting(false);
            return;
          }
          payload.password = formData.password;
        }

        const promise = apiFetch(`/staff/${editingStaff.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });

        await mutate(async (currentData: any) => {
          await promise;
          return currentData.map((s: StaffMember) => s.id === editingStaff.id ? { ...s, ...payload } : s);
        }, {
          optimisticData: (currentData: any) => currentData.map((s: StaffMember) => s.id === editingStaff.id ? { ...s, ...payload } : s),
          rollbackOnError: true,
          revalidate: true,
        });

        // Update local storage if the user edited their own profile
        try {
          if (user && user.id === editingStaff.id) {
            updateUser({ name: payload.name, email: payload.email });
          }
        } catch (e) {
          console.error('Failed to update local user state', e);
        }

        setAlertConfig({ isOpen: true, title: 'Success', message: 'Staff updated successfully!', type: 'success' });
      } else {
        // Create
        if (!formData.password || formData.password.length < 6) {
          setAlertConfig({ isOpen: true, title: 'Validation Error', message: 'Password must be at least 6 characters long.', type: 'error' });
          setIsSubmitting(false);
          return;
        }
        const createPayload: any = { ...formData };
        if (createPayload.joiningDate) createPayload.joiningDate = new Date(createPayload.joiningDate).toISOString();
        else delete createPayload.joiningDate;
        if (createPayload.endingDate) createPayload.endingDate = new Date(createPayload.endingDate).toISOString();
        else delete createPayload.endingDate;
        if (!createPayload.avatarUrl) delete createPayload.avatarUrl;

        const promise = apiFetch('/staff', {
          method: 'POST',
          body: JSON.stringify(createPayload),
        });

        await mutate(async (currentData: any) => {
          await promise;
          return currentData; // Let revalidate fetch the new list to get the real ID
        }, {
          rollbackOnError: true,
          revalidate: true,
        });

        setAlertConfig({ isOpen: true, title: 'Success', message: 'Staff member added successfully!', type: 'success' });
      }

      setIsModalOpen(false);
    } catch (err: any) {
      setAlertConfig({ isOpen: true, title: 'Error', message: err.message || 'Failed to save staff member', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Staff',
      message: 'Are you sure you want to remove this staff member? This action cannot be undone.',
      id: id,
      action: 'delete'
    });
  };

  const confirmAction = async () => {
    setConfirmConfig({ ...confirmConfig, isOpen: false });
    if (confirmConfig.action === 'delete' && confirmConfig.id) {
      try {
        const promise = apiFetch(`/staff/${confirmConfig.id}`, { method: 'DELETE' });

        await mutate(async (currentData: any) => {
          await promise;
          if (!currentData) return currentData;
          return currentData.filter((s: StaffMember) => s.id !== confirmConfig.id);
        }, {
          optimisticData: (currentData: any) => {
            if (!currentData) return currentData;
            return currentData.filter((s: StaffMember) => s.id !== confirmConfig.id);
          },
          rollbackOnError: true,
          revalidate: true,
        });

        setAlertConfig({ isOpen: true, title: 'Success', message: 'Staff member removed successfully.', type: 'success' });
      } catch (err: any) {
        setAlertConfig({ isOpen: true, title: 'Error', message: err.message || 'Failed to delete staff member.', type: 'error' });
      }
    }
  };

  const formatRole = (role: string) => {
    return role.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' ');
  };

  if (error) return <div className="p-4 text-red-500 bg-red-50 rounded-lg">Failed to load staff members.</div>;

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Staff Management</h3>
          <p className="text-slate-500 text-sm mt-1">Manage employee accounts and roles.</p>
        </div>
        <Button onClick={() => handleOpenModal()} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Data View */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex-1">
        {isLoading ? (
          <div className="p-4"><TableSkeleton rows={4} /></div>
        ) : staff.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-500">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p>No staff members found.</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (< 640px) */}
            <div className="sm:hidden flex flex-col divide-y divide-slate-100">
              {staff.map((s) => (
                <div key={s.id} className="p-4 flex flex-col space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 overflow-hidden">
                        {s.avatarUrl ? (
                           <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${s.avatarUrl}`} alt="Avatar" className="h-full w-full object-cover" />
                        ) : s.role === 'OWNER' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{s.name}</span>
                        <span className="text-xs text-slate-500">{s.email}</span>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={
                        s.role === 'OWNER' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100' :
                        s.role === 'MANAGER' ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' :
                        'bg-slate-100 text-slate-700 hover:bg-slate-100'
                      }
                    >
                      {formatRole(s.role)}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs text-slate-400">
                      Added on {new Date(s.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleOpenModal(s)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                        onClick={() => handleDeleteClick(s.id)}
                        disabled={s.role === 'OWNER'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View (>= 640px) */}
            <div className="hidden sm:block overflow-x-auto h-full">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 bg-slate-50/80 uppercase font-semibold border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4">Added On</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {staff.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-800">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 overflow-hidden">
                            {s.avatarUrl ? (
                               <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${s.avatarUrl}`} alt="Avatar" className="h-full w-full object-cover" />
                            ) : s.role === 'OWNER' ? <Shield className="w-4 h-4" /> : <User className="w-4 h-4" />}
                          </div>
                          {s.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{s.email}</td>
                      <td className="px-6 py-4">
                        <Badge
                          variant="secondary"
                          className={
                            s.role === 'OWNER' ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-100' :
                            s.role === 'MANAGER' ? 'bg-purple-100 text-purple-700 hover:bg-purple-100' :
                            'bg-slate-100 text-slate-700 hover:bg-slate-100'
                          }
                        >
                          {formatRole(s.role)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs">
                        {new Date(s.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenModal(s)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                          onClick={() => handleDeleteClick(s.id)}
                          disabled={s.role === 'OWNER'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-semibold text-slate-800 text-lg">
                {editingStaff ? 'Edit Staff Member' : 'Add New Staff'}
              </h3>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex items-center space-x-4 mb-4">
                <div className="relative h-16 w-16 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                  {formData.avatarUrl ? (
                    <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}${formData.avatarUrl}`} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-8 w-8 text-slate-400" />
                  )}
                  <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 cursor-pointer transition-opacity">
                    <Camera className="h-5 w-5 text-white" />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700">Profile Picture</label>
                  <p className="text-xs text-slate-500">Click the avatar to upload an image.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Full Name</label>
                <Input
                  required
                  placeholder="e.g. Jane Doe"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Email Address</label>
                <Input
                  required
                  type="email"
                  placeholder="jane@hotelops.com"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Joining Date</label>
                  <Input
                    type="date"
                    value={formData.joiningDate}
                    onChange={e => setFormData({ ...formData, joiningDate: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Ending Date</label>
                  <Input
                    type="date"
                    value={formData.endingDate}
                    onChange={e => setFormData({ ...formData, endingDate: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
                  {editingStaff ? 'New Password (Optional)' : 'Password'}
                </label>
                <Input
                  required={!editingStaff}
                  type="password"
                  placeholder={editingStaff ? 'Leave blank to keep current password' : 'At least 6 characters'}
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">Role</label>
                <Select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value })}
                  disabled={editingStaff?.role === 'OWNER'}
                  className={editingStaff?.role === 'OWNER' ? 'bg-slate-50 cursor-not-allowed' : ''}
                >
                  {AVAILABLE_ROLES.map(role => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving...' : 'Save Staff'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <AlertDialog
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />
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
