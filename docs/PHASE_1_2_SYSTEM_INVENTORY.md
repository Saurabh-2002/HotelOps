# Phase 1-2 System Inventory

## Modules Inspected
1. **AuthModule**: JWT strategy, Roles guard, Super-admin seeding.
2. **TenantsModule**: CRUD operations, bypass RLS.
3. **RoomsModule**: Tenant-scoped CRUD, capacity constraints.
4. **BookingsModule**: Lifecycle management (Reserved, Checked-In, Checked-Out), guest records.
5. **BillingModule**: Folio generation, GST calculations, settlement.
6. **PosModule**: Menu management, POS order creation, KOT generation.

## APIs Inspected
- `POST /api/auth/login`
- `GET/POST/PATCH /api/tenants`
- `GET/POST/PATCH/DELETE /api/rooms`
- `GET/POST/PATCH /api/bookings`
- `POST /api/bookings/:id/check-in`, `/check-out`, `/cancel`
- `GET /api/billing/booking/:bookingId`
- `POST /api/billing/folio`, `/api/billing/invoice/:bookingId`, `/api/billing/folio/:id/settle`
- `GET/POST /api/pos/menu`
- `GET/POST /api/pos/orders`
- `PATCH /api/pos/orders/:id/status`

## Database Models Inspected
- `Tenant`, `User`, `Room`, `Booking`, `GuestRecord`, `Folio`, `MenuItem`, `PosOrder`, `PosOrderItem`
