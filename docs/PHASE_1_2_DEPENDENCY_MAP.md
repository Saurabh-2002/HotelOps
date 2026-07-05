# Phase 1-2 Dependency Map

## Implementation Task Sequence
1. **TASK-01 (P0)**: Fix GST Slab Calculation (Independent)
2. **TASK-02 (P1)**: Implement POS Financial Settlement Lifecycle (Independent)
3. **TASK-03 (P1)**: Fix Folio Source of Truth & Dynamic Calculation (Depends on: TASK-02)
4. **TASK-04 (P1)**: Enforce Settlement at Checkout (Depends on: TASK-03)
5. **TASK-05 (P2)**: Update Frontend Invoice UI & Settlement Flow (Depends on: TASK-03)
6. **TASK-06 (P1)**: Cross-Module Regression Test Suite (Depends on: All tasks)

## Dependency Justification
- GST correctness (TASK-01) is standalone math and can be fixed immediately.
- POS financial lifecycle (TASK-02) must be defined (CASH vs ROOM_POST) before the Folio (TASK-03) can accurately filter eligible charges.
- Folio calculation and settlement freeze (TASK-03) must be rock-solid before Checkout (TASK-04) depends on its status.
- Frontend UI (TASK-05) requires the finalized backend contracts.
- Regression testing (TASK-06) validates the entire integrated workflow.
