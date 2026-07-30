'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DirectoryTab } from './components/DirectoryTab';
import { AttendanceTab } from './components/AttendanceTab';
import { LeaveTab } from './components/LeaveTab';
import { AttendanceAnalyticsTab } from './components/AttendanceAnalyticsTab';
import { Users, ClipboardCheck, CalendarOff, BarChart3 } from 'lucide-react';

export default function StaffHubPage() {
  const { user } = useAuth();
  
  // OWNER and MANAGER get Directory as default, others get Attendance
  const isManagement = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'ATTENDANCE' | 'LEAVE' | 'ANALYTICS'>(
    isManagement ? 'DIRECTORY' : 'ATTENDANCE'
  );

  const tabs = [
    ...(isManagement ? [{ key: 'DIRECTORY' as const, label: 'Staff Directory', icon: Users }] : []),
    { key: 'ATTENDANCE' as const, label: 'Daily Attendance', icon: ClipboardCheck },
    { key: 'LEAVE' as const, label: 'Leave Requests', icon: CalendarOff },
    { key: 'ANALYTICS' as const, label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'DIRECTORY' && isManagement && <DirectoryTab />}
        {activeTab === 'ATTENDANCE' && <AttendanceTab />}
        {activeTab === 'LEAVE' && <LeaveTab />}
        {activeTab === 'ANALYTICS' && <AttendanceAnalyticsTab />}
      </div>
    </div>
  );
}
