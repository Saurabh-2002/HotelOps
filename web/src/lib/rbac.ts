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
  if (!role) return false;
  const normalizedRole = role.toUpperCase();
  const allowed = ROLE_ACCESS[normalizedRole as keyof typeof ROLE_ACCESS];
  if (!allowed) return false;
  if (allowed.includes('*')) return true;

  // Exact match
  if (allowed.includes(pathname)) return true;

  // Prefix match (only for routes that have subroutes, but we want to prevent '/dashboard' from allowing '/dashboard/settings')
  return allowed.some((route) => {
    if (route === '/dashboard') return false; // Already handled by exact match above
    return pathname.startsWith(`${route}/`);
  });
};

export const getDefaultRoute = (role: string): string => {
  if (!role) return '/dashboard';
  const normalizedRole = role.toUpperCase();
  switch (normalizedRole) {
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
