'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, BedDouble, CalendarDays, ReceiptText, LogOut, UtensilsCrossed } from 'lucide-react';
import { LayoutSkeleton } from '@/components/Skeletons';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, isLoading } = useAuth();
  const pathname = usePathname();

  if (isLoading) {
    return <LayoutSkeleton />;
  }

  if (!user) {
    return null; // AuthContext will redirect to login
  }

    const navItems = [
      { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
      ...(user.activeModules?.includes('HOTEL') ? [
        { name: 'Rooms', href: '/dashboard/rooms', icon: BedDouble },
        { name: 'Room Types', href: '/dashboard/room-types', icon: BedDouble },
        { name: 'Bookings', href: '/dashboard/bookings', icon: CalendarDays },
      ] : []),
      ...(user.activeModules?.includes('RESTAURANT') ? [
        { name: 'Restaurant POS', href: '/dashboard/pos', icon: UtensilsCrossed },
      ] : []),
      { name: 'Billing', href: '/dashboard/billing', icon: ReceiptText },
      { name: 'Settings', href: '/dashboard/settings', icon: LayoutDashboard },
    ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden print:block print:h-auto print:overflow-visible">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col transition-all print:hidden">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
          <h1 className="text-xl font-bold text-white tracking-tight">HotelOps</h1>
        </div>
        
        <div className="p-4 border-b border-slate-800">
          <div className="text-sm font-medium text-white truncate">{user.tenantName}</div>
          <div className="text-xs text-slate-400 mt-1 truncate">{user.name} ({user.role})</div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className={`mr-3 flex-shrink-0 h-5 w-5 ${isActive ? 'text-blue-200' : 'text-slate-400'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={logout}
            className="flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <LogOut className="mr-3 h-5 w-5 text-slate-400" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden print:block print:overflow-visible">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8 shrink-0 shadow-sm z-10 print:hidden">
          <h2 className="text-lg font-semibold text-slate-800 capitalize">
            {pathname.split('/').pop() || 'Dashboard'}
          </h2>
        </header>
        <div className="flex-1 overflow-auto p-8 bg-slate-50/50 print:block print:overflow-visible print:p-0 print:bg-white">
          {children}
        </div>
      </main>
    </div>
  );
}
