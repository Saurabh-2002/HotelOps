const ROLE_ACCESS = {
  OWNER: ['*'],
  MANAGER: ['*'],
  FRONT_DESK: [
    '/dashboard',
    '/dashboard/bookings',
    '/dashboard/pos',
    '/dashboard/billing',
    '/dashboard/staff',
  ],
  HOUSEKEEPING: [
    '/dashboard/rooms',
    '/dashboard/staff',
  ],
  RESTAURANT: [
    '/dashboard/pos',
    '/dashboard/staff',
  ],
  ACCOUNTANT: [
    '/dashboard',
    '/dashboard/billing',
    '/dashboard/staff',
    '/dashboard/settings',
  ],
};

const hasAccess = (role, pathname) => {
  if (!role) return false;
  const normalizedRole = role.toUpperCase();
  const allowed = ROLE_ACCESS[normalizedRole];
  if (!allowed) return false;
  if (allowed.includes('*')) return true;

  // Exact match
  if (allowed.includes(pathname)) return true;

  // Prefix match
  return allowed.some((route) => {
    if (route === '/dashboard') return false; 
    return pathname.startsWith(`${route}/`);
  });
};

const getDefaultRoute = (role) => {
  if (!role) return '/dashboard';
  const normalized = role.toUpperCase();
  switch (normalized) {
    case 'OWNER':
    case 'MANAGER':
      return '/dashboard';
    case 'FRONT_DESK':
      return '/dashboard/bookings';
    case 'HOUSEKEEPING':
      return '/dashboard/rooms';
    case 'RESTAURANT':
      return '/dashboard/pos';
    case 'ACCOUNTANT':
      return '/dashboard/billing';
    default:
      return '/dashboard';
  }
};

const roles = ['OWNER', 'MANAGER', 'FRONT_DESK', 'HOUSEKEEPING', 'RESTAURANT', 'ACCOUNTANT'];
for (const role of roles) {
  const def = getDefaultRoute(role);
  const acc = hasAccess(role, def);
  if (!acc) {
    console.log(`ERROR: ${role} cannot access its default route ${def}`);
  }
}

const testPaths = ['/dashboard', '/dashboard/staff', '/dashboard/bookings', '/dashboard/rooms', '/dashboard/pos', '/dashboard/billing', '/dashboard/settings'];
for (const role of roles) {
  for (const p of testPaths) {
    if (!hasAccess(role, p)) {
      const def = getDefaultRoute(role);
      // If we redirect to def, can they access def?
      if (!hasAccess(role, def)) {
         console.log(`INFINITE LOOP for ${role} on ${p}`);
      }
    }
  }
}
console.log("Done checking.");
