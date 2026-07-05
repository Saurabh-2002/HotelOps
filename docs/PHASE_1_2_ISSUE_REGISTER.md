# Phase 1-2 Issue Register

## ISSUE-01: Incorrect Room GST Slab Calculation
- **Priority**: P0 (Financial Compliance Violation)
- **Status**: OPEN
- **Description**: GST slab (12% vs 18%) is calculated using the total stay amount instead of the daily room rate.
- **Code Evidence**: `billing.service.ts` -> `calculateGst()` receives `totalRoomCharge`.
- **Root Cause**: Developer assumed slab was based on total invoice value rather than daily tariff.
- **Financial Impact**: Guests are overcharged GST; severe legal non-compliance.
- **Proposed Solution**: Pass `dailyRate` to `calculateGst` and determine the slab based on the daily rate.

## ISSUE-02: POS Orders Hidden from Room Folio
- **Priority**: P1 (Financial Data Loss)
- **Status**: OPEN
- **Description**: Restaurant orders posted to rooms are not billed.
- **Code Evidence**: `pos.service.ts` defaults to `KOT_PRINTED`. `billing.service.ts` expects `BILLED`. `BillingPage` frontend table ignores POS charges.
- **Root Cause**: Conflation of KOT status with financial status; frontend UI hardcoded.
- **Financial Impact**: Hotel loses revenue for all restaurant orders.
- **Proposed Solution**: Transition room-posted orders to `BILLED` when finalized. Update `BillingPage` UI to map and render `posOrders`.

## ISSUE-03: Folio Aggregates Become Stale
- **Priority**: P1 (Financial Inconsistency)
- **Status**: OPEN
- **Description**: If a folio is opened, subsequent POS orders are not added to the folio totals.
- **Code Evidence**: `billing.service.ts` -> `generateInvoiceForBooking` returns existing `OPEN` folio without updating DB.
- **Root Cause**: Missing `tx.folio.update` step.
- **Financial Impact**: Invoices do not reflect actual consumption.
- **Proposed Solution**: Recalculate and update the folio in the database before returning.

## ISSUE-04: Unpaid Checkout Allowed
- **Priority**: P2 (Workflow bypass)
- **Status**: OPEN
- **Description**: Guests can check out with OPEN folios.
- **Code Evidence**: `bookings.service.ts` -> `checkOut()` lacks folio validation.
- **Root Cause**: Missing business logic validation.
- **Proposed Solution**: Block `checkOut` if any associated folio is `OPEN`.
