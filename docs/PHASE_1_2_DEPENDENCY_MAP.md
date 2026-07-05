# Phase 1-2 Dependency Map

## Implementation Task Sequence
1. **TASK-01 (P0)**: Fix GST Slab Calculation (Dependency: None)
2. **TASK-02 (P1)**: Fix Folio Stale Aggregates (Dependency: None)
3. **TASK-03 (P1)**: Finalize POS Order Status Lifecycle (Dependency: None)
4. **TASK-04 (P1)**: Update Frontend Invoice UI for POS Charges (Dependency: TASK-02, TASK-03)
5. **TASK-05 (P2)**: Enforce Settlement at Checkout (Dependency: TASK-02, TASK-03)

## Minimum Critical Automated Test Suite
- **Auth & Tenants**: Test JWT rejection, RLS boundary enforcement.
- **Billing**: Test GST calculation with daily tariff < 7500 but total > 7500. Test folio dynamic updates.
- **POS**: Test room-posting lifecycle and visibility in billing.
- **Checkout**: Test checkout rejection with open folio.
