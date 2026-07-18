import React from 'react';

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden animate-pulse">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {[1, 2, 3, 4, 5].map((i) => (
                <th key={i} className="px-6 py-4">
                  <div className="h-3 bg-slate-200 rounded w-20"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-4">
                  <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-slate-100 rounded w-24"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 bg-slate-200 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-slate-100 rounded w-16"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-4 bg-slate-200 rounded w-28 mb-2"></div>
                </td>
                <td className="px-6 py-4">
                  <div className="h-6 bg-slate-200 rounded-full w-20"></div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end space-x-2">
                    <div className="h-8 w-8 bg-slate-200 rounded-md"></div>
                    <div className="h-8 w-8 bg-slate-200 rounded-md"></div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-pulse">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-slate-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-slate-100 rounded w-1/3"></div>
            </div>
          </div>
          <div className="space-y-3 mt-6">
            <div className="flex justify-between">
              <div className="h-3 bg-slate-100 rounded w-20"></div>
              <div className="h-3 bg-slate-200 rounded w-16"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-3 bg-slate-100 rounded w-24"></div>
              <div className="h-3 bg-slate-200 rounded w-12"></div>
            </div>
            <div className="flex justify-between">
              <div className="h-3 bg-slate-100 rounded w-16"></div>
              <div className="h-3 bg-slate-200 rounded w-20"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center animate-pulse">
          <div className="w-12 h-12 rounded-full bg-slate-200 mr-4"></div>
          <div className="flex-1">
            <div className="h-3 bg-slate-200 rounded w-24 mb-3"></div>
            <div className="h-6 bg-slate-300 rounded w-12"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function LayoutSkeleton() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden animate-pulse">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="h-16 border-b border-slate-800 bg-slate-950 flex items-center px-6">
          <div className="w-32 h-6 bg-slate-800 rounded"></div>
        </div>
        <div className="p-4 border-b border-slate-800">
          <div className="w-24 h-4 bg-slate-800 rounded mb-2"></div>
          <div className="w-32 h-3 bg-slate-800/50 rounded"></div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="w-full h-10 bg-slate-800 rounded-lg"></div>
          ))}
        </div>
      </aside>
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-8">
          <div className="w-48 h-6 bg-slate-200 rounded"></div>
        </header>
        <div className="flex-1 p-8 bg-slate-50/50 space-y-8">
          <DashboardStatsSkeleton />
          <CardGridSkeleton count={3} />
        </div>
      </main>
    </div>
  );
}
