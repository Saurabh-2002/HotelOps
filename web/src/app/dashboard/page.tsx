'use client';

import { useAuth } from '@/context/AuthContext';
import { BedDouble, CalendarDays, Users } from 'lucide-react';

export default function DashboardOverview() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-semibold text-slate-800">Welcome back, {user?.name}!</h3>
        <p className="text-slate-500 mt-1">Here's what's happening at {user?.tenantName} today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center">
          <div className="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
            <BedDouble className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Available Rooms</p>
            <p className="text-2xl font-bold text-slate-900">--</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center">
          <div className="p-3 rounded-full bg-emerald-50 text-emerald-600 mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Guests In-House</p>
            <p className="text-2xl font-bold text-slate-900">--</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center">
          <div className="p-3 rounded-full bg-indigo-50 text-indigo-600 mr-4">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Today's Arrivals</p>
            <p className="text-2xl font-bold text-slate-900">--</p>
          </div>
        </div>
      </div>
    </div>
  );
}
