'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { BedDouble } from 'lucide-react';
import { apiFetch, fetcher } from '@/lib/api';
import AlertDialog from '@/components/AlertDialog';
import { CardGridSkeleton } from '@/components/Skeletons';

interface RoomType {
  id: string;
  name: string;
  description?: string;
  baseOccupancy: number;
  maxAdults: number;
  maxChildren: number;
  baseRate: number;
  extraAdultRate: number;
  extraChildRate: number;
  isActive: boolean;
}

export default function RoomTypesPage() {
  const { data: typesData, error: typesError, mutate: mutateTypes } = useSWR('/room-types', fetcher);
  const types: RoomType[] = typesData || [];
  const loading = !typesData && !typesError;
  const [isEditing, setIsEditing] = useState<RoomType | null>(null);
  
  const [alertConfig, setAlertConfig] = useState<{isOpen: boolean, title?: string, message: string, type: 'error'|'success'|'info'}>({ isOpen: false, message: '', type: 'info' });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing) return;
    
    try {
      const endpoint = isEditing.id ? `/room-types/${isEditing.id}` : '/room-types';
      const method = isEditing.id ? 'PATCH' : 'POST';
      
      const payload = {
        name: isEditing.name,
        description: isEditing.description,
        baseOccupancy: Number(isEditing.baseOccupancy),
        maxAdults: Number(isEditing.maxAdults),
        maxChildren: Number(isEditing.maxChildren),
        baseRate: Number(isEditing.baseRate),
        extraAdultRate: Number(isEditing.extraAdultRate),
        extraChildRate: Number(isEditing.extraChildRate),
        isActive: isEditing.isActive,
      };

      const promise = apiFetch(endpoint, {
        method,
        body: JSON.stringify(payload),
      });
      
      mutateTypes(async () => {
        await promise;
        return undefined;
      }, {
        optimisticData: (currentData: any) => {
          if (!currentData) return currentData;
          if (isEditing.id) {
            return currentData.map((rt: any) => rt.id === isEditing.id ? { ...rt, ...payload } : rt);
          } else {
            return [{ id: `temp-${Date.now()}`, ...payload }, ...currentData];
          }
        },
        rollbackOnError: true,
        revalidate: true
      });
      
      setIsEditing(null);
    } catch (err: any) {
      setAlertConfig({ isOpen: true, title: 'Error', message: err.message || 'Failed to save', type: 'error' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Room Types</h1>
          <p className="text-slate-500 mt-1">Define categories for your rooms — rates, occupancy limits, and extras.</p>
        </div>
        <button 
          onClick={() => setIsEditing({
            id: '', name: '', description: '', baseOccupancy: 2, maxAdults: 3, maxChildren: 2,
            baseRate: 0, extraAdultRate: 0, extraChildRate: 0, isActive: true
          })}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add Room Type
        </button>
      </div>

      {loading ? (
        <CardGridSkeleton count={3} />
      ) : types.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <BedDouble className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No room types defined yet. Add your first room type to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {types.map(rt => (
            <div key={rt.id} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-slate-900">{rt.name}</h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${rt.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {rt.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-slate-500 text-sm mb-4">{rt.description || 'No description provided.'}</p>
              
              <div className="space-y-2 text-sm mb-5 bg-slate-50 rounded-lg p-3 border border-slate-100">
                <div className="flex justify-between"><span className="text-slate-500">Base Rate</span> <span className="font-semibold text-slate-900">₹{Number(rt.baseRate).toLocaleString()}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Base Occupancy</span> <span className="text-slate-700">{rt.baseOccupancy} guests</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Max Adults / Children</span> <span className="text-slate-700">{rt.maxAdults} / {rt.maxChildren}</span></div>
                {Number(rt.extraAdultRate) > 0 && (
                  <div className="flex justify-between"><span className="text-slate-500">Extra Adult</span> <span className="text-slate-700">₹{Number(rt.extraAdultRate).toLocaleString()}</span></div>
                )}
                {Number(rt.extraChildRate) > 0 && (
                  <div className="flex justify-between"><span className="text-slate-500">Extra Child</span> <span className="text-slate-700">₹{Number(rt.extraChildRate).toLocaleString()}</span></div>
                )}
              </div>
              
              <button 
                onClick={() => setIsEditing(rt)}
                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors"
              >
                Edit Details
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 p-8 rounded-xl shadow-xl max-w-2xl w-full">
            <h2 className="text-xl font-bold text-slate-900 mb-6">
              {isEditing.id ? 'Edit Room Type' : 'New Room Type'}
            </h2>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Name</label>
                  <input type="text" required value={isEditing.name} onChange={e => setIsEditing({...isEditing, name: e.target.value})} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Base Rate (₹)</label>
                  <input type="number" required value={isEditing.baseRate} onChange={e => setIsEditing({...isEditing, baseRate: Number(e.target.value)})} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Description</label>
                  <input type="text" value={isEditing.description || ''} onChange={e => setIsEditing({...isEditing, description: e.target.value})} placeholder="e.g. Spacious room with city view" className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Base Occupancy</label>
                  <input type="number" required value={isEditing.baseOccupancy} onChange={e => setIsEditing({...isEditing, baseOccupancy: Number(e.target.value)})} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Max Adults</label>
                  <input type="number" required value={isEditing.maxAdults} onChange={e => setIsEditing({...isEditing, maxAdults: Number(e.target.value)})} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Max Children</label>
                  <input type="number" required value={isEditing.maxChildren ?? 2} onChange={e => setIsEditing({...isEditing, maxChildren: Number(e.target.value)})} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Extra Adult Rate (₹)</label>
                  <input type="number" required value={isEditing.extraAdultRate} onChange={e => setIsEditing({...isEditing, extraAdultRate: Number(e.target.value)})} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">Extra Child Rate (₹)</label>
                  <input type="number" required value={isEditing.extraChildRate} onChange={e => setIsEditing({...isEditing, extraChildRate: Number(e.target.value)})} className="w-full bg-white border border-slate-300 rounded-lg p-2.5 text-slate-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isActive" checked={isEditing.isActive} onChange={e => setIsEditing({...isEditing, isActive: e.target.checked})} className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                <label htmlFor="isActive" className="text-sm text-slate-700">Active</label>
              </div>
              <div className="flex justify-end gap-3 pt-5 border-t border-slate-100">
                <button type="button" onClick={() => setIsEditing(null)} className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">Save Room Type</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AlertDialog 
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
      />
    </div>
  );
}
