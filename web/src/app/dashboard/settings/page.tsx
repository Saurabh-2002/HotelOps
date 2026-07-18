'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import TimePicker from '@/components/TimePicker';
import { useAuth } from '@/context/AuthContext';
import { Building2, Utensils, CheckCircle2 } from 'lucide-react';

interface PropertySettings {
  propertyName: string;
  legalName?: string;
  address?: string;
  city?: string;
  state?: string;
  pinCode?: string;
  country: string;
  phone?: string;
  email?: string;
  gstin?: string;
  checkInTime: string;
  checkOutTime: string;
  invoicePrefix: string;
  timezone: string;
  currency: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<PropertySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { user, updateUser } = useAuth();
  const [activeModules, setActiveModules] = useState<string[]>([]);
  const [savingModules, setSavingModules] = useState(false);

  useEffect(() => {
    if (user?.activeModules) {
      setActiveModules(user.activeModules);
    }
    fetchSettings();
  }, [user?.activeModules]);

  const fetchSettings = async () => {
    try {
      const data = await apiFetch('/settings');
      setSettings(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch('/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      setSuccess('Settings saved successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveModules = async () => {
    if (!user?.tenantId) return;
    setSavingModules(true);
    setError('');
    setSuccess('');
    try {
      await apiFetch(`/tenants/${user.tenantId}/modules`, {
        method: 'PATCH',
        body: JSON.stringify({ modules: activeModules }),
      });
      updateUser({ activeModules });
      setSuccess('Modules updated successfully!');
    } catch (err: any) {
      setError(err.message || 'Failed to update modules');
    } finally {
      setSavingModules(false);
    }
  };

  const toggleModule = (module: string) => {
    setActiveModules(prev => {
      if (prev.includes(module)) return prev.filter(m => m !== module);
      return [...prev, module];
    });
  };


  if (loading) return <div className="p-8 text-slate-500">Loading settings...</div>;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Property Settings</h1>
        <p className="text-slate-500 mt-1">Manage your property's details and configuration.</p>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6 text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl mb-6 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Property Name</label>
            <input 
              type="text" 
              value={settings?.propertyName || ''} 
              onChange={e => setSettings(s => s ? {...s, propertyName: e.target.value} : null)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm text-sm"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Legal Name</label>
            <input 
              type="text" 
              value={settings?.legalName || ''} 
              onChange={e => setSettings(s => s ? {...s, legalName: e.target.value} : null)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm text-sm"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-slate-700">Address</label>
            <input 
              type="text" 
              value={settings?.address || ''} 
              onChange={e => setSettings(s => s ? {...s, address: e.target.value} : null)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">City</label>
            <input 
              type="text" 
              value={settings?.city || ''} 
              onChange={e => setSettings(s => s ? {...s, city: e.target.value} : null)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">GSTIN</label>
            <input 
              type="text" 
              value={settings?.gstin || ''} 
              onChange={e => setSettings(s => s ? {...s, gstin: e.target.value} : null)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm text-sm uppercase placeholder:normal-case"
              placeholder="e.g. 27ABCDE1234F1Z5"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Check-In Time</label>
            <TimePicker
              value={settings?.checkInTime || '14:00'}
              onChange={(val) => setSettings(s => s ? {...s, checkInTime: val} : null)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Check-Out Time</label>
            <TimePicker
              value={settings?.checkOutTime || '11:00'}
              onChange={(val) => setSettings(s => s ? {...s, checkOutTime: val} : null)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Currency Code</label>
            <input 
              type="text" 
              value={settings?.currency || 'INR'} 
              onChange={e => setSettings(s => s ? {...s, currency: e.target.value} : null)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm text-sm uppercase"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Invoice Prefix</label>
            <input 
              type="text" 
              value={settings?.invoicePrefix || 'INV-'} 
              onChange={e => setSettings(s => s ? {...s, invoicePrefix: e.target.value} : null)}
              className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-sm text-sm uppercase"
            />
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-slate-100">
          <button 
            type="submit" 
            disabled={saving}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-100 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Modules Section */}
      {user?.role === 'OWNER' && (
        <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-sm space-y-6 mt-8">
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Active Modules</h2>
            <p className="text-sm text-slate-500 mt-1">Enable or disable features for your property.</p>
          </div>

          <div className="space-y-4">
            <div 
              onClick={() => toggleModule('HOTEL')}
              className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${activeModules.includes('HOTEL') ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-blue-300'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${activeModules.includes('HOTEL') ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Hotel Management</h4>
                  <p className="text-sm text-slate-500">Rooms, Bookings, Billing</p>
                </div>
              </div>
              {activeModules.includes('HOTEL') && <CheckCircle2 className="w-6 h-6 text-blue-600" />}
            </div>

            <div 
              onClick={() => toggleModule('RESTAURANT')}
              className={`p-4 border rounded-xl cursor-pointer transition-all flex items-center justify-between ${activeModules.includes('RESTAURANT') ? 'border-orange-600 bg-orange-50/50' : 'border-slate-200 hover:border-orange-300'}`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${activeModules.includes('RESTAURANT') ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  <Utensils className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900">Restaurant POS</h4>
                  <p className="text-sm text-slate-500">Menu, Orders, KOTs</p>
                </div>
              </div>
              {activeModules.includes('RESTAURANT') && <CheckCircle2 className="w-6 h-6 text-orange-600" />}
            </div>
          </div>

          <div className="flex justify-end pt-6 border-t border-slate-100">
            <button 
              onClick={handleSaveModules}
              disabled={savingModules}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-100 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingModules ? 'Saving...' : 'Update Modules'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
