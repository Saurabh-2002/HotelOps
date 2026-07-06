'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { BedDouble, CalendarDays, Users } from 'lucide-react';

export default function DashboardOverview() {
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [bookings, rooms, orders] = await Promise.all([
          apiFetch('/bookings').catch(() => []),
          apiFetch('/rooms').catch(() => []),
          apiFetch('/pos/orders').catch(() => [])
        ]);

        const today = new Date().toISOString().split('T')[0];
        
        const checkedInBookings = bookings.filter((b: any) => b.status === 'CHECKED_IN');
        const occupiedRoomIds = checkedInBookings.map((b: any) => b.room.id);
        
        const availableRooms = rooms.length - occupiedRoomIds.length;
        const guestsInHouse = checkedInBookings.length;
        const todaysArrivals = bookings.filter((b: any) => b.checkInDate.startsWith(today) && b.status === 'RESERVED').length;
        
        // Find unsettled guests (checked-in but no settled folio)
        const unsettledGuests = checkedInBookings.filter((b: any) => !b.folios || !b.folios.some((f: any) => f.status === 'SETTLED')).length;
        
        // Find restaurant orders awaiting settlement (UNPAID)
        const pendingOrders = orders.filter((o: any) => o.paymentStatus === 'UNPAID').length;

        setStats({
          availableRooms,
          guestsInHouse,
          todaysArrivals,
          unsettledGuests,
          pendingOrders
        });
      } catch (err) {
        console.error('Failed to load dashboard stats', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

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
            <p className="text-2xl font-bold text-slate-900">{isLoading ? '--' : stats?.availableRooms}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center">
          <div className="p-3 rounded-full bg-emerald-50 text-emerald-600 mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Guests In-House</p>
            <p className="text-2xl font-bold text-slate-900">{isLoading ? '--' : stats?.guestsInHouse}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center">
          <div className="p-3 rounded-full bg-indigo-50 text-indigo-600 mr-4">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Today's Arrivals</p>
            <p className="text-2xl font-bold text-slate-900">{isLoading ? '--' : stats?.todaysArrivals}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center">
          <div className="p-3 rounded-full bg-amber-50 text-amber-600 mr-4">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Unsettled Accounts</p>
            <p className="text-2xl font-bold text-slate-900">{isLoading ? '--' : stats?.unsettledGuests}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center">
          <div className="p-3 rounded-full bg-orange-50 text-orange-600 mr-4">
            <CalendarDays className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Pending KOTs (Unpaid)</p>
            <p className="text-2xl font-bold text-slate-900">{isLoading ? '--' : stats?.pendingOrders}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
