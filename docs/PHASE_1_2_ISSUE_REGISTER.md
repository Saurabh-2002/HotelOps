# Phase 1-2 Issue Register

## ISSUE-01: Incorrect Room GST Slab Calculation
- **Priority**: P0
- **Status**: OPEN
- **Description**: GST slab (12% vs 18%) is incorrectly calculated using the total stay amount instead of the daily room rate.
- **Code Evidence**: 'billing.service.ts' -> 'calculateGst()' is passed 'totalRoomCharge' (Nights × Rate).
- **Root Cause**: Developer conflated total invoice line item amount with daily tariff boundary.
- **Operational Impact**: Invoices display incorrect tax amounts.
- **Financial Impact**: Overcharging or undercharging GST; severe compliance violation.
- **Security/Data-Integrity Impact**: Corrupts financial records.
- **Proposed Solution**: Modify 'calculateGst()' to accept 'dailyRate' for slab evaluation and apply the resulting percentage to the total amount.
- **Dependencies**: None.
- **Files/Modules**: 'billing.service.ts'
- **Required Tests**: 
  - Daily tariff < 7,500
  - Daily tariff exactly 7,500
  - Daily tariff > 7,500
  - Multi-night stay with total > 7,500 but daily tariff < 7,500
  - One-night stay
  - Rounding behavior
- **Explicit Acceptance Criteria**: The 18% slab is strictly applied only when the single-night room tariff exceeds 7,500.

## ISSUE-02: POS Orders Lack Explicit Financial Lifecycle
- **Priority**: P1
- **Status**: OPEN
- **Description**: Restaurant orders posted to rooms are trapped in 'KOT_PRINTED', bypassing billing.
- **Code Evidence**: 'pos.service.ts' defaults to 'KOT_PRINTED'. 'BillingService' looks for 'BILLED'.
- **Root Cause**: Conflation of kitchen workflow (KOT_PRINTED, SERVED) with financial finalization (CASH vs ROOM_POST) within a single 'status' enum.
- **Operational Impact**: Staff cannot bill restaurant charges to guest rooms.
- **Financial Impact**: Severe revenue loss; unbilled F&B charges.
- **Security/Data-Integrity Impact**: Silent failure of financial tracking.
- **Proposed Solution**: Introduce 'paymentStatus' (UNPAID, PAID_CASH, POSTED_TO_ROOM). Add a '/api/pos/orders/:id/settle' endpoint to transition from UNPAID to a final financial state. Only 'POSTED_TO_ROOM' orders are eligible for Folio inclusion.
- **Dependencies**: None.
- **Files/Modules**: 'schema.prisma', 'pos.controller.ts', 'pos.service.ts', 'billing.service.ts'
- **Required Tests**: Cash settlement, Room post settlement, duplicate room-post rejection, missing booking rejection.
- **Explicit Acceptance Criteria**: POS order requires an explicit financial settlement action. Once settled as 'POSTED_TO_ROOM', it is immutably eligible for folio inclusion exactly once.

## ISSUE-03: Folio Aggregates Are Stale and Non-Deterministic
- **Priority**: P1
- **Status**: OPEN
- **Description**: Folios act as poorly-cached aggregates. 'generateInvoiceForBooking' calculates totals dynamically, but if an 'OPEN' folio exists, it returns the stale database row instead of updating it.
- **Code Evidence**: 'billing.service.ts' returns 'existingFolio' without recalculating or updating totals.
- **Root Cause**: Invoice generation acts as a one-time snapshot rather than a dynamic view of source-of-truth records.
- **Operational Impact**: Invoices do not reflect current consumption.
- **Financial Impact**: Revenue loss from omitted charges.
- **Security/Data-Integrity Impact**: Financial records do not match constituent line items.
- **Proposed Solution**: Adopt Option A (Dynamic calculation until settlement). Invoice generation always dynamically calculates totals from source records (Booking + Room-Posted POS Orders). The Folio record is only persisted/frozen when explicitly transitioned to 'SETTLED'.
- **Dependencies**: ISSUE-02
- **Files/Modules**: 'billing.service.ts'
- **Required Tests**: Folio dynamic calculation with new POS charges, freeze on settlement.
- **Explicit Acceptance Criteria**: Viewing an invoice dynamically aggregates all eligible charges. Settling the folio freezes these totals immutably.

## ISSUE-04: Checkout Allows Unpaid Folios
- **Priority**: P1
- **Status**: OPEN
- **Description**: Guests can check out while their folio remains 'OPEN' (unpaid).
- **Code Evidence**: 'bookings.service.ts' -> 'checkOut()' lacks folio validation.
- **Root Cause**: Settlement workflow is not integrated with the checkout lifecycle.
- **Operational Impact**: Front desk can bypass payment collection.
- **Financial Impact**: Revenue loss due to unpaid checkouts.
- **Security/Data-Integrity Impact**: Allows terminal workflow completion with hanging financial liabilities.
- **Proposed Solution**: Inside 'checkOut()', query the booking's folios. If a folio is missing or 'OPEN', reject checkout with a 409 Conflict.
- **Dependencies**: ISSUE-03
- **Files/Modules**: 'bookings.service.ts'
- **Required Tests**: Checkout with OPEN folio (blocked), Checkout with SETTLED folio (allowed).
- **Explicit Acceptance Criteria**: Checkout strictly requires a 'SETTLED' folio.

## ISSUE-05: Frontend Hides POS Charges
- **Priority**: P2
- **Status**: OPEN
- **Description**: The invoice modal hardcodes only Room Charges, ignoring POS data.
- **Code Evidence**: 'BillingPage' in 'web/src/app/dashboard/billing/page.tsx'.
- **Root Cause**: Incomplete UI implementation.
- **Operational Impact**: Staff cannot review POS charges during settlement.
- **Financial Impact**: None directly, but causes guest disputes due to opaque billing.
- **Security/Data-Integrity Impact**: None.
- **Proposed Solution**: Update the invoice table to iterate and display 'posOrders' alongside Room Charges.
- **Dependencies**: ISSUE-02, ISSUE-03
- **Files/Modules**: 'billing/page.tsx'
- **Required Tests**: Visual verification of POS lines and total matches.
- **Explicit Acceptance Criteria**: Frontend accurately reflects the backend 'breakdown' including F&B items.
