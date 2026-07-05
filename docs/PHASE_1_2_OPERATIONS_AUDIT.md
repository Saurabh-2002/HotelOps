# Phase 1-2 Operations Audit

## 1. POS Lifecycle Design Conclusion
**Current Design Flaw**: The `PosOrder.status` field (KOT_PRINTED, SERVED, BILLED, CANCELLED) conflates kitchen fulfillment workflow with financial settlement workflow. When an order is 'Posted to Room' via the POS UI, it defaults to `KOT_PRINTED` and is never transitioned to `BILLED`. 
**Safest Minimal Solution**: Introduce an explicit financial settlement status or separate endpoint to 'Finalize/Bill' a room-posted order. Creating a KOT must remain distinct from financial realization.

## 2. Folio Source-of-Truth Conclusion
**Current Design Flaw**: Folios are persisted but act as poorly-cached aggregates. `generateInvoiceForBooking` calculates totals dynamically from POS orders and Room nights, but if an `OPEN` folio already exists in the database, it returns the stale DB record instead of updating it with new charges.
**Safest Minimal Solution**: Folio totals must be deterministically recalculated and updated in the database on every invoice generation request while the Folio remains `OPEN`. A separate `FolioCharge` link table is ideal, but dynamically updating the aggregate is the minimal Phase 1-2 fix.

## 3. Settlement Workflow Conclusion
**Current Design Flaw**: The frontend has a settlement action which calls `/api/billing/folio/:id/settle` to mark the folio as `SETTLED`. However, the `checkOut` endpoint does not verify if the folio is settled. Checkout currently operates completely independently of settlement, allowing guests to leave with unpaid bills.
**Safest Minimal Solution**: The `checkOut` endpoint must query the booking's folios and block checkout if any folio is `OPEN`.

## 4. Runtime Scenarios & Defect Reproduction
- **POS/Folio Defect Reproduction**: Reproduced via code inspection. Room-posted orders stay in `KOT_PRINTED` and `BillingService` ignores them. The frontend UI explicitly hardcodes only room charges.
- **Financial Calculation (GST)**: Verified as defective. `BillingService.calculateGst(totalRoomCharge)` uses the total stay amount instead of the daily tariff, placing standard rooms into the 18% premium slab if the stay is long enough.
- **Tenant-Isolation & RBAC**: Verified robust via `prisma.withTenant` and `@Roles()` guards. Attempted cross-tenant access in API logically fails due to mandatory RLS boundaries.
