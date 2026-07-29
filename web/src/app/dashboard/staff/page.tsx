'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DirectoryTab } from './components/DirectoryTab';
import { AttendanceTab } from './components/AttendanceTab';
import { LeaveTab } from './components/LeaveTab';
import { Users, ClipboardCheck, CalendarOff } from 'lucide-react';

export default function StaffHubPage() {
  const { user } = useAuth();
  
  // OWNER and MANAGER get Directory as default, others get Attendance
  const isManagement = user?.role === 'OWNER' || user?.role === 'MANAGER';
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'ATTENDANCE' | 'LEAVE'>(
    isManagement ? 'DIRECTORY' : 'ATTENDANCE'
  );

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6">
          {isManagement && (
            <button
              onClick={() => setActiveTab('DIRECTORY')}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
                activeTab === 'DIRECTORY'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Staff Directory
            </button>
          )}

          <button
            onClick={() => setActiveTab('ATTENDANCE')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
              activeTab === 'ATTENDANCE'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 mr-2" />
            Daily Attendance
          </button>

          <button
            onClick={() => setActiveTab('LEAVE')}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors ${
              activeTab === 'LEAVE'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <CalendarOff className="w-4 h-4 mr-2" />
            Leave Requests
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'DIRECTORY' && isManagement && <DirectoryTab />}
        {activeTab === 'ATTENDANCE' && <AttendanceTab />}
        {activeTab === 'LEAVE' && <LeaveTab />}
      </div>
    </div>
  );
}
