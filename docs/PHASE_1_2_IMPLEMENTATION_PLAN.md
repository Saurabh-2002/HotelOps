# Phase 1-2 Implementation Plan

## TASK-01: Fix GST Slab Calculation
- **Issue ID**: ISSUE-01
- **Priority**: P0 | **Status**: PENDING
- **Objective**: Ensure GST slab is evaluated against daily room rate.
- **Scope**: Modify `calculateGst` in `billing.service.ts`.

## TASK-02: Fix Folio Stale Aggregates
- **Issue ID**: ISSUE-03
- **Priority**: P1 | **Status**: PENDING
- **Objective**: Dynamically update OPEN folios.
- **Scope**: Add `tx.folio.update` inside `generateInvoiceForBooking` in `billing.service.ts`.

## TASK-03: Finalize POS Order Status Lifecycle
- **Issue ID**: ISSUE-02
- **Priority**: P1 | **Status**: PENDING
- **Objective**: Allow room-posted KOTs to become financially recognized.
- **Scope**: Add logic in `pos.service.ts` to handle 'Finalize' or default room-posted orders to `BILLED`.

## TASK-04: Update Frontend Invoice UI for POS Charges
- **Issue ID**: ISSUE-02
- **Priority**: P1 | **Status**: PENDING
- **Objective**: Render restaurant charges on the invoice.
- **Scope**: Modify `web/src/app/dashboard/billing/page.tsx`.

## TASK-05: Enforce Settlement at Checkout
- **Issue ID**: ISSUE-04
- **Priority**: P2 | **Status**: PENDING
- **Objective**: Block checkout of unpaid stays.
- **Scope**: Modify `checkOut` in `bookings.service.ts`.
