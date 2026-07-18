'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { BedDouble, CalendarDays, Users, UtensilsCrossed } from 'lucide-react';
import { DashboardStatsSkeleton } from '@/components/Skeletons';

export default function DashboardOverview() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const fetchPromises = [];
        if (user?.activeModules?.includes('HOTEL')) {
          fetchPromises.push(apiFetch('/bookings').catch(() => []));
          fetchPromises.push(apiFetch('/rooms').catch(() => []));
        } else {
          fetchPromises.push(Promise.resolve([]));
          fetchPromises.push(Promise.resolve([]));
        }
        
        if (user?.activeModules?.includes('RESTAURANT')) {
          fetchPromises.push(apiFetch('/pos/orders').catch(() => []));
        } else {
          fetchPromises.push(Promise.resolve([]));
        }

        const [bookings, rooms, orders] = await Promise.all(fetchPromises);

        const today = new Date().toISOString().split('T')[0];
        
        const checkedInBookings = bookings.filter((b: any) => b.status === 'CHECKED_IN');
        const occupiedRoomIds = checkedInBookings.map((b: any) => b.room?.id).filter(Boolean);
        
        const safeRoomsLength = Array.isArray(rooms) 
          ? rooms.filter((r: any) => r.status !== 'OUT_OF_ORDER').length 
          : 0;
        const safeOccupiedLength = Array.isArray(occupiedRoomIds) ? occupiedRoomIds.length : 0;
        const availableRooms = safeRoomsLength - safeOccupiedLength;
        const guestsInHouse = Array.isArray(checkedInBookings) ? checkedInBookings.length : 0;
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

      {isLoading ? (
        <DashboardStatsSkeleton />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {user?.activeModules?.includes('HOTEL') && (
            <>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center">
                <div className="p-3 rounded-full bg-blue-50 text-blue-600 mr-4">
                  <BedDouble className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Available Rooms</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.availableRooms}</p>
                </div>
              </div>
              
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center">
                <div className="p-3 rounded-full bg-emerald-50 text-emerald-600 mr-4">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Guests In-House</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.guestsInHouse}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center">
                <div className="p-3 rounded-full bg-indigo-50 text-indigo-600 mr-4">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Today's Arrivals</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.todaysArrivals}</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center">
                <div className="p-3 rounded-full bg-amber-50 text-amber-600 mr-4">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Unsettled Accounts</p>
                  <p className="text-2xl font-bold text-slate-900">{stats?.unsettledGuests}</p>
                </div>
              </div>
            </>
          )}

          {user?.activeModules?.includes('RESTAURANT') && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center">
              <div className="p-3 rounded-full bg-rose-50 text-rose-600 mr-4">
                <UtensilsCrossed className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Pending Orders</p>
                <p className="text-2xl font-bold text-slate-900">{stats?.pendingOrders}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
