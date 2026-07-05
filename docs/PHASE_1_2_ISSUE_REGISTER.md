# Phase 1-2 Issue Register

## ISSUE-07: Incomplete POS Settlement Authorization for FRONT_DESK
- **Priority**: P1
- **Status**: COMPLETE
- **Description**: The current endpoint-level `@Roles(...)` authorization applies to the entire `/settle` endpoint. It denies all access to `FRONT_DESK`. However, the product requirement states that `FRONT_DESK` must be allowed to perform `ROOM_POST` settlement (to associate F&B orders with guest folios), while remaining denied from `CASH` settlement (which belongs to Restaurant operations).
- **Code Evidence**: Endpoint relies on NestJS `@Roles` guard which cannot differentiate based on request payload method (CASH vs ROOM_POST).
- **Root Cause**: Coarse-grained endpoint authorization instead of method-aware server-side authorization.
- **Operational Impact**: Front desk staff cannot finalize restaurant orders to guest folios.
- **Financial Impact**: Uncollected F&B revenue if guests check out without front desk being able to post their open restaurant bills.
- **Security/Data-Integrity Impact**: Overly restrictive, causing workflow blocks.
- **Proposed Solution**: Implement a method-aware server-side authorization check within `PosService.settleOrder` (or a custom Guard) to explicitly enforce the matrix.
- **Dependencies**: None.
- **Files/Modules**: `pos.service.ts`, `pos.controller.ts`
- **Required Tests**: Matrix of all roles (OWNER, MANAGER, RESTAURANT, FRONT_DESK) against CASH and ROOM_POST to prove exact allowance/denial.
- **Explicit Acceptance Criteria**: FRONT_DESK CASH returns 403. FRONT_DESK ROOM_POST proceeds. Other roles allowed for both.

## ISSUE-01: Incorrect Room GST Slab Calculation
- **Priority**: P0
- **Status**: COMPLETE
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
- **Verification Result**: 
  - Actual root cause: 'totalRoomCharge' was used as the slab basis instead of 'roomRate'.
  - Implementation summary: Added optional 'dailyRate' parameter to 'calculateGst()'. Used it as basis if provided. Updated 'generateInvoiceForBooking' to pass 'roomRate'.
  - Files changed: 'backend/src/billing/billing.service.ts', 'backend/src/billing/billing.service.spec.ts'
  - Tests added: 9 jest test cases covering boundary conditions, multi-night stays, and fallback behavior.
  - Tests executed/results: 9 tests passed.
  - Acceptance-criteria result: PASSED.
  - Newly discovered issues: None.
  - Remaining risks: None.

## ISSUE-02: POS Orders Lack Explicit Financial Lifecycle
- **Priority**: P1
- **Status**: IMPLEMENTED / PENDING MERGE VERIFICATION
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

## ISSUE-06: POS Settlement Concurrency Vulnerability
- **Priority**: P0
- **Status**: COMPLETE
- **Description**: The POS settlement endpoint (`/api/pos/orders/:id/settle`) is vulnerable to concurrent race conditions. Two simultaneous requests can both observe an `UNPAID` status, pass application validation, and both succeed due to the lack of database row locks or conditional update predicates.
- **Code Evidence**: `pos.service.ts` -> `settleOrder()` reads `paymentStatus` and subsequently calls `tx.posOrder.update({ where: { id } })`.
- **Root Cause**: Non-atomic application-level read-modify-write pattern running under default Postgres Read Committed isolation.
- **Operational Impact**: Staff or API clients firing double-clicks or duplicate requests can overwrite each other (last-writer-wins) or create duplicate financial finalizations.
- **Financial Impact**: F&B revenue could be improperly mapped, or guests could be double-billed (if POS order ID is collected twice in folio logic).
- **Security/Data-Integrity Impact**: Endangers exact-once financial semantics. `POSTED_TO_ROOM` cannot safely be treated as authoritative folio eligibility until corrected.
- **Proposed Solution**: Implement an atomic conditional update predicate (e.g., `where: { id, paymentStatus: 'UNPAID' }`) and verify affected row count, or use explicit row locks (`SELECT FOR UPDATE`).
- **Dependencies**: None.
- **Files/Modules**: `pos.service.ts`
- **Required Tests**:
  - Concurrent CASH vs CASH
  - Concurrent ROOM_POST vs ROOM_POST (same booking)
  - Concurrent ROOM_POST vs ROOM_POST (different bookings)
  - Concurrent CASH vs ROOM_POST
- **Explicit Acceptance Criteria**: Under concurrent load, exactly one settlement request succeeds. Losing requests fail with a clear conflict response. No last-writer-wins behavior. No duplicate financial finalization.

## ISSUE-03: Folio Aggregates Are Stale and Non-Deterministic
- **Priority**: P1
- **Status**: COMPLETE
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
- **Verification Result**: 
  - Implementation summary: Invoice reads for OPEN folios now dynamically calculate the exact breakdown at request time. Settlement creates a permanent immutable database row.
  - Tests added: Full integration test suite in `billing.integration.spec.ts`.
  - Tests executed/results: Passed.
  - Acceptance-criteria result: PASSED.

## ISSUE-09: Incomplete Historical Invoice Snapshot
- **Priority**: P0
- **Status**: COMPLETE
- **Description**: Migrations were applied destroying historical aggregate columns (like roomSubtotal, etc.) causing legacy invoices to lose resolution, but the replacement JSON snapshot approach was not implemented to capture the true immutable state of the Folio.
- **Root Cause**: Premature deletion of historical columns and lack of JSON snapshot persistence upon settlement.
- **Operational Impact**: Cannot reproduce past settled invoices exactly as they appeared.
- **Financial Impact**: Audit failure.
- **Proposed Solution**: Implement `invoiceSnapshot` as JSONB on `Folio`, versioned via `snapshotVersion`.
- **Files/Modules**: `schema.prisma`, `billing.service.ts`, `invoice-snapshot.dto.ts`
- **Verification Result**:
  - Implementation summary: Folio now has `invoiceSnapshot` JSONB. Billing service writes exact view model to this snapshot at settlement. Re-reading a settled folio returns this frozen JSON.
  - Acceptance-criteria result: PASSED.

## ISSUE-10: Duplicate/concurrent settlement returns 201 instead of deterministic 409 Conflict
- **Priority**: P2
- **Status**: COMPLETE
- **Description**: Concurrent requests to settle the same folio could result in multiple successful responses or race conditions.
- **Root Cause**: No row locks on `Booking` and no database-level constraint preventing duplicate `Folio` rows.
- **Proposed Solution**: Add `@@unique([bookingId])` on `Folio`, use Postgres `FOR UPDATE` lock on `Booking` during settlement, and map Prisma P2002 to `409 Conflict`.
- **Files/Modules**: `schema.prisma`, `billing.service.ts`
- **Verification Result**:
  - Implementation summary: Atomic shared locks and database-level constraints now enforce exact-once settlement idempotency.
  - Acceptance-criteria result: PASSED.

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
