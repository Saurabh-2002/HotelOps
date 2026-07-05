# Phase 1-2 Implementation Plan

## TASK-01: Fix GST Slab Calculation
- **Related Issue IDs**: ISSUE-01
- **Priority**: P0 | **Status**: IMPLEMENTED / PENDING MERGE VERIFICATION
- **Objective**: Ensure GST slab is evaluated strictly against the daily room rate.
- **Business Reason**: Legal financial compliance.
- **Root Cause Addressed**: Developer passed total invoice amount to slab calculator.
- **Implementation Scope**: Modify 'calculateGst(totalAmount, dailyRate)' in 'billing.service.ts' to use 'dailyRate' for the 12%/18% threshold.
- **Explicit Non-Goals**: Do not build a generic tax engine. Do not modify POS GST (which is correctly 5%).
- **Schema/API/Frontend Impact**: None.
- **Financial Impact**: Prevents overcharging GST on long stays.
- **Tenant-Isolation/Auth Impact**: None.
- **Transaction Boundaries**: N/A (pure calculation).
- **Idempotency Requirements**: N/A.
- **Required Tests**: Boundary cases for ₹7,500 daily limit on multi-night stays.
- **Acceptance Criteria**: 18% GST is only applied if 'dailyRate > 7500'.
- **Dependencies**: None.
- **Recommended Branch Name**: 'fix/gst-calculation'
- **Verification Result**: 
  - Actual root cause: 'totalRoomCharge' was used as the slab basis instead of 'roomRate'.
  - Implementation summary: Added optional 'dailyRate' parameter to 'calculateGst()'. Used it as basis if provided. Updated 'generateInvoiceForBooking' to pass 'roomRate'.
  - Files changed: 'backend/src/billing/billing.service.ts', 'backend/src/billing/billing.service.spec.ts'
  - Tests added: 9 jest test cases covering boundary conditions, multi-night stays, and fallback behavior.
  - Tests executed/results: 9 tests passed. Complete backend test suite passed.
  - Acceptance-criteria result: PASSED.
  - Newly discovered issues: None.
  - Remaining risks: None.

## TASK-02: Implement POS Financial Settlement Lifecycle
- **Related Issue IDs**: ISSUE-02
- **Priority**: P1 | **Status**: PENDING
- **Objective**: Decouple POS kitchen fulfillment from financial settlement.
- **Business Reason**: Prevent F&B revenue loss and duplicate charging.
- **Root Cause Addressed**: Overloaded 'status' enum.
- **Implementation Scope**: Add 'paymentStatus' (UNPAID, PAID_CASH, POSTED_TO_ROOM) to Prisma 'PosOrder'. Create 'POST /api/pos/orders/:id/settle' endpoint requiring method CASH or ROOM_POST.
- **Explicit Non-Goals**: Do not handle partial payments, refunds, or inventory deductions.
- **Schema Impact**: Add 'paymentStatus' String/Enum to 'PosOrder' (default 'UNPAID'). Migration required.
- **API Impact**: New settlement endpoint.
- **Frontend Impact**: Minimal (update 'pos.service.ts' call).
- **Financial Impact**: Secures F&B revenue.
- **Tenant-Isolation/Auth Impact**: Endpoint must verify tenant ownership.
- **Transaction Boundaries**: Settlement is an atomic update.
- **Idempotency Requirements**: Reject settlement if 'paymentStatus' is not UNPAID.
- **Required Tests**: Cash settlement, room-post settlement, duplicate settlement rejection.
- **Acceptance Criteria**: Orders can be explicitly settled exactly once.
- **Dependencies**: None.
- **Recommended Branch Name**: 'feature/pos-financial-lifecycle'

## TASK-03: Fix Folio Source of Truth & Dynamic Calculation
- **Related Issue IDs**: ISSUE-03
- **Priority**: P1 | **Status**: PENDING
- **Objective**: Ensure invoice totals perfectly reflect source records and do not go stale.
- **Business Reason**: Prevent guest under-billing and invoice discrepancies.
- **Root Cause Addressed**: Caching dynamic totals in an OPEN folio record.
- **Implementation Scope**: 'generateInvoiceForBooking' dynamically calculates totals from Booking + 'POSTED_TO_ROOM' POS orders. The 'Folio' DB record is only persisted/frozen when 'POST /api/billing/folio/:id/settle' is called.
- **Explicit Non-Goals**: Do not build a ledger accounting system.
- **Schema Impact**: None required (can use existing Folio model for frozen records).
- **API Impact**: 'generateInvoiceForBooking' response format remains identical, but backend calculation changes.
- **Frontend Impact**: None.
- **Financial Impact**: Ensures 100% capture of room-posted charges.
- **Tenant-Isolation/Auth Impact**: None.
- **Transaction Boundaries**: Settle endpoint must atomically transition Folio to 'SETTLED' and persist final calculated totals.
- **Idempotency Requirements**: 'generateInvoiceForBooking' is purely read-only (idempotent). Settlement is idempotent.
- **Required Tests**: Add POS order to OPEN folio -> verify invoice updates. Settle folio -> verify totals frozen.
- **Acceptance Criteria**: Invoices accurately aggregate all eligible charges dynamically until settlement.
- **Dependencies**: TASK-02.
- **Recommended Branch Name**: 'fix/folio-dynamic-calculation'

## TASK-04: Enforce Settlement at Checkout
- **Related Issue IDs**: ISSUE-04
- **Priority**: P1 | **Status**: PENDING
- **Objective**: Block guests from checking out with unpaid bills.
- **Business Reason**: Revenue protection.
- **Root Cause Addressed**: Missing validation in 'checkOut()' flow.
- **Implementation Scope**: 'bookings.service.ts' queries folios. If no 'SETTLED' folio exists (or if an 'OPEN' one exists depending on TASK-03 design), throw 409 Conflict.
- **Explicit Non-Goals**: Do not automatically settle folios on checkout.
- **Schema/API/Frontend Impact**: API returns 409, frontend displays error.
- **Financial Impact**: Prevents revenue leakage.
- **Tenant-Isolation/Auth Impact**: None.
- **Transaction Boundaries**: Atomic checkout update.
- **Idempotency Requirements**: N/A.
- **Required Tests**: Block checkout on unpaid booking. Allow on paid booking.
- **Acceptance Criteria**: Impossible to check out without financial settlement.
- **Dependencies**: TASK-03.
- **Recommended Branch Name**: 'fix/checkout-settlement-block'

## TASK-05: Update Frontend Invoice UI & Settlement Flow
- **Related Issue IDs**: ISSUE-05
- **Priority**: P2 | **Status**: PENDING
- **Objective**: Display complete itemized charges to staff and guests.
- **Business Reason**: Transparency and reduction of billing disputes.
- **Root Cause Addressed**: Hardcoded frontend rendering.
- **Implementation Scope**: Map over 'breakdown.posOrders' in 'BillingPage' and render line items.
- **Explicit Non-Goals**: Do not build PDF generation.
- **Schema/API Impact**: None.
- **Frontend Impact**: Modifies 'billing/page.tsx'.
- **Financial Impact**: None.
- **Tenant-Isolation/Auth Impact**: None.
- **Transaction Boundaries**: N/A.
- **Idempotency Requirements**: N/A.
- **Required Tests**: Visual verification.
- **Acceptance Criteria**: Invoice modal displays room charges, F&B charges, and matched grand total.
- **Dependencies**: TASK-03.
- **Recommended Branch Name**: 'feat/frontend-invoice-ui'

## TASK-06: Cross-Module Regression Test Suite
- **Related Issue IDs**: ALL
- **Priority**: P1 | **Status**: PENDING
- **Objective**: Guarantee stability of Phase 1-2 core workflows.
- **Business Reason**: Prevent future regressions.
- **Implementation Scope**: Write automated test cases for Auth/RBAC, GST, POS lifecycle, Folio generation, Checkout blocking.
- **Dependencies**: TASK-01 through TASK-05.
- **Recommended Branch Name**: 'test/phase-1-2-regression'
