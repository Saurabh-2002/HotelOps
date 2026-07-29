export const ROLE_ACCESS = {
  OWNER: ['*'],
  MANAGER: ['*'],
  FRONT_DESK: [
    '/dashboard', // Need exact match or startWith handling in guard
    '/dashboard/rooms',
    '/dashboard/bookings',
    '/dashboard/pos',
    '/dashboard/billing',
    '/dashboard/staff/leave',
  ],
  HOUSEKEEPING: [
    '/dashboard/rooms',
    '/dashboard/staff/leave',
  ],
  RESTAURANT: [
    '/dashboard/pos',
    '/dashboard/staff/leave',
  ],
  ACCOUNTANT: [
    '/dashboard',
    '/dashboard/billing',
    '/dashboard/staff', // Can view staff list and details for payroll
    '/dashboard/staff/attendance',
    '/dashboard/staff/leave',
    '/dashboard/settings',
  ],
};

export const hasAccess = (role: string, pathname: string): boolean => {
  const allowed = ROLE_ACCESS[role as keyof typeof ROLE_ACCESS];
  if (!allowed) return false;
  if (allowed.includes('*')) return true;

  // We check if the pathname exactly matches or is a child of the allowed route
  // e.g. /dashboard/rooms/123 is allowed if /dashboard/rooms is in the list
  // However, /dashboard should not allow /dashboard/settings if not explicitly listed.
  
  return allowed.some((route) => {
    if (pathname === route) return true;
    if (pathname.startsWith(`${route}/`)) return true;
    return false;
  });
};

export const getDefaultRoute = (role: string): string => {
  switch (role) {
    case 'OWNER':
    case 'MANAGER':
    case 'FRONT_DESK':
    case 'ACCOUNTANT':
      return '/dashboard'; // Analytics / Overview
    case 'HOUSEKEEPING':
      return '/dashboard/rooms';
    case 'RESTAURANT':
      return '/dashboard/pos';
    default:
      return '/dashboard';
  }
};
