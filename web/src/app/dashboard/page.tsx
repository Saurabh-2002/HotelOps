'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { IndianRupee, BedDouble, CalendarDays, Users, UtensilsCrossed, TrendingUp, BarChart3, Activity } from 'lucide-react';
import { DashboardStatsSkeleton } from '@/components/Skeletons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';

export default function DashboardOverview() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [range, setRange] = useState('month');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const result = await apiFetch(`/analytics/dashboard?range=${range}`);
        setData(result);
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [range]);

  if (isLoading && !data) return <DashboardStatsSkeleton />;
  if (!data) return <div className="p-8 text-center text-slate-500">Failed to load dashboard data. Please try again.</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header with Range Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h3 className="text-xl font-semibold text-slate-800">Welcome back, {user?.name}!</h3>
          <p className="text-slate-500 mt-1 text-sm">Here's your {range}ly performance at {user?.tenantName}.</p>
        </div>
        <div className="mt-4 sm:mt-0 flex bg-slate-100 p-1 rounded-lg shrink-0">
          <button onClick={() => setRange('month')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${range === 'month' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>This Month</button>
          <button onClick={() => setRange('year')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${range === 'year' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>This Year</button>
        </div>
      </div>

      {/* Operational Metrics */}
      <section>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Operational Metrics</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {user?.activeModules?.includes('HOTEL') && (
              <>
                <MetricCard icon={<BedDouble className="w-5 h-5 text-blue-600" />} bg="bg-blue-50" label="Available Rooms" value={data.operational.availableRooms} />
                <MetricCard icon={<Users className="w-5 h-5 text-emerald-600" />} bg="bg-emerald-50" label="Guests In-House" value={data.operational.guestsInHouse} />
                <MetricCard icon={<CalendarDays className="w-5 h-5 text-indigo-600" />} bg="bg-indigo-50" label="Today's Arrivals" value={data.operational.todaysArrivals} />
                <MetricCard icon={<Activity className="w-5 h-5 text-amber-600" />} bg="bg-amber-50" label="Unsettled Accounts" value={data.operational.unsettledGuests} />
              </>
          )}
          {user?.activeModules?.includes('RESTAURANT') && (
              <MetricCard icon={<UtensilsCrossed className="w-5 h-5 text-rose-600" />} bg="bg-rose-50" label="Pending Orders" value={data.operational.pendingOrders} />
          )}
        </div>
      </section>

      {/* Sales Analytics */}
      <section>
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Sales & Revenue Analytics</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={<IndianRupee className="w-5 h-5 text-emerald-600" />} bg="bg-emerald-50" label="Total Revenue" value={`₹${data.revenue.total.toLocaleString()}`} />
          {user?.activeModules?.includes('HOTEL') && (
            <>
              <MetricCard icon={<TrendingUp className="w-5 h-5 text-blue-600" />} bg="bg-blue-50" label="RevPAR" value={`₹${data.metrics.revPar.toLocaleString()}`} />
              <MetricCard icon={<BarChart3 className="w-5 h-5 text-purple-600" />} bg="bg-purple-50" label="ADR" value={`₹${data.metrics.adr.toLocaleString()}`} />
              <MetricCard icon={<Users className="w-5 h-5 text-teal-600" />} bg="bg-teal-50" label="Occupancy Rate" value={`${data.metrics.occupancyRate}%`} />
            </>
          )}
        </div>
      </section>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
          <h4 className="font-semibold text-slate-800 mb-6">Revenue Trends</h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.trends} margin={{ top: 10, right: 10, left: 25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} formatter={(value) => `₹${Number(value).toLocaleString()}`} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                {user?.activeModules?.includes('HOTEL') && <Bar dataKey="roomRevenue" name="Room Revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />}
                {user?.activeModules?.includes('RESTAURANT') && <Bar dataKey="restaurantRevenue" name="Restaurant Revenue" fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {user?.activeModules?.includes('HOTEL') && (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200">
          <h4 className="font-semibold text-slate-800 mb-6">7-Day Occupancy Forecast</h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.forecast} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dx={-10} />
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Line type="monotone" dataKey="occupied" name="Occupied Rooms" stroke="#6366f1" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="checkIns" name="Check-ins" stroke="#10b981" strokeWidth={2} dot={{r: 3}} />
                <Line type="monotone" dataKey="checkOuts" name="Check-outs" stroke="#f43f5e" strokeWidth={2} dot={{r: 3}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        )}
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {user?.activeModules?.includes('HOTEL') && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h4 className="font-semibold text-slate-800 mb-4">Top Booked Room Types</h4>
          <div className="space-y-4">
            {data.topRoomTypes.length > 0 ? data.topRoomTypes.map((rt: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">{rt.name}</span>
                <span className="text-sm font-bold text-slate-900 bg-white px-2 py-1 rounded shadow-sm border border-slate-200">{rt.count} bookings</span>
              </div>
            )) : <p className="text-sm text-slate-500">No data available for this period.</p>}
          </div>
        </div>
        )}

        {user?.activeModules?.includes('RESTAURANT') && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold text-slate-800">Top Selling Menu Items</h4>
            {user?.activeModules?.includes('HOTEL') && (
               <div className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                 {data.metrics.foodAttachmentRate}% of guests ordered food
               </div>
            )}
          </div>
          <div className="space-y-4">
            {data.topMenuItems.length > 0 ? data.topMenuItems.map((mi: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium text-slate-700">{mi.name}</span>
                <span className="text-sm font-bold text-slate-900 bg-white px-2 py-1 rounded shadow-sm border border-slate-200">{mi.count} ordered</span>
              </div>
            )) : <p className="text-sm text-slate-500">No data available for this period.</p>}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon, bg, label, value }: { icon: React.ReactNode, bg: string, label: string, value: string | number }) {
  return (
    <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm border border-slate-200 flex items-center">
      <div className={`p-3 rounded-full ${bg} mr-4 shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">{label}</p>
        <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-0.5 truncate">{value}</p>
      </div>
    </div>
  );
}
