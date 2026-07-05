# HotelOps Phase 1–2 Product Context and Governing Requirements

## PRODUCT OBJECTIVE

HotelOps is an India-first, multi-tenant Hotel Management SaaS platform.

The current implementation is a Phase 1–2 vertical slice.

The objective of the current stabilization effort is NOT to build a complete enterprise Property Management System.

The objective is to make all CURRENTLY IMPLEMENTED Phase 1–2 modules secure, operationally correct, properly integrated, financially consistent, and usable end-to-end by a real small hotel.

Do not expand scope into Phase 3 or future modules unless functionality is strictly required to make an already implemented Phase 1–2 workflow correct.

## CURRENTLY IMPLEMENTED SCOPE

### Infrastructure and Data Layer

* Serverless PostgreSQL using Neon.
* Prisma ORM.
* PostgreSQL Row-Level Security.
* Tenant isolation.
* Custom tenant-aware Prisma access mechanism.

### Backend

NestJS API.

Implemented backend areas:

* JWT authentication.

* Role-Based Access Control.

* Roles:

  * OWNER
  * MANAGER
  * FRONT_DESK
  * RESTAURANT

* Rooms management.

* Booking management.

* Booking lifecycle:
  RESERVED → CHECKED_IN → CHECKED_OUT

* Guest compliance records associated with bookings.

* Billing and folio generation.

* Indian GST calculation for room tariffs.

* Restaurant POS.

* Menu management.

* Restaurant order/KOT creation.

* Cash settlement.

* Posting restaurant charges to checked-in guests/rooms.

### Frontend

Next.js 14.

Implemented frontend areas:

* Authentication context.
* Central API fetch wrapper.
* Authenticated application layout.
* Dashboard/navigation.
* Rooms management.
* Bookings management.
* Guest compliance capture.
* Check-in.
* Checkout.
* Billing/invoice interface.
* Restaurant POS interface.
* Menu selection.
* KOT cart.
* Cash settlement.
* Posting restaurant charges to checked-in rooms.

## CURRENT PHASE PRIMARY WORKFLOW

The system must reliably support:

Login
→ Room Management
→ Reservation Creation
→ Guest Compliance Data
→ Check-In
→ Active In-House Stay
→ Room Charges
→ Restaurant Order
→ KOT
→ Restaurant Bill Finalization
→ Cash Settlement OR Post to Room
→ Folio
→ GST Calculation
→ Invoice
→ Checkout

The current phase is not complete until this workflow operates correctly end-to-end.

## KNOWN DEFECT

A restaurant KOT/order was created for an in-house guest with a checked-in booking.

The restaurant order could not be found correctly in billing.

During settlement, only room charges were visible.

The restaurant order/charge was not correctly visible as part of the guest's folio and final settlement.

Investigate the actual code and database behavior.

Do not trust previous implementation summaries.

Determine the root cause from code and runtime behavior.

## IMPORTANT RESTAURANT BUSINESS RULE

KOT and financial charge posting are separate concepts.

A KOT represents kitchen production instructions.

Creating a KOT must not automatically create a finalized guest folio charge unless the current product explicitly implements and documents that behavior.

The intended lifecycle for the current product should be evaluated as:

Restaurant Order
→ KOT Created
→ Order Finalized
→ Settlement Method Selected

If CASH:

Restaurant Bill
→ Cash Settlement
→ Restaurant Transaction Recorded
→ Receipt/financial record available

If POST TO ROOM:

Restaurant Bill
→ Validate Active Checked-In Booking
→ Identify Correct Booking/Stay/Room
→ Post F&B Charge Exactly Once
→ Preserve Restaurant Order/Bill Source Reference
→ Apply Correct GST Treatment
→ Folio Updated
→ Charge Visible in Billing
→ Charge Included in Final Settlement
→ Invoice Generated
→ Checkout Allowed Only According to Current Settlement Rules

The implementation must prevent duplicate room posting.

## CURRENT-PHASE AUDIT REQUIREMENTS

Audit all implemented Phase 1–2 modules.

Inspect:

* Authentication.
* JWT lifecycle.
* Authorization.
* RBAC enforcement.
* Tenant isolation.
* RLS.
* Tenant-aware Prisma access.
* Rooms CRUD.
* Room ownership by tenant.
* Booking creation.
* Booking state transitions.
* Booking-room relationships.
* Guest compliance records.
* Compliance data access control.
* Check-in.
* Checkout.
* Room-charge calculation.
* Number-of-night calculation.
* Room tariff source.
* GST slab selection.
* GST calculations.
* Rounding.
* Folio generation.
* Folio persistence versus dynamic calculation.
* Restaurant menu management.
* Restaurant order creation.
* KOT creation.
* Restaurant order lifecycle.
* Cash settlement.
* Room posting.
* Restaurant charge persistence.
* Restaurant charge-to-booking relationship.
* Restaurant charge-to-folio relationship.
* Duplicate posting prevention.
* Billing UI.
* Invoice UI.
* POS UI.
* Error handling.
* Loading states.
* Empty states.
* User feedback.
* Existing tests.

## CROSS-MODULE INTEGRATION REQUIREMENTS

Trace actual data flow across:

Authentication → Tenant Context

Tenant → Rooms

Rooms → Bookings

Bookings → Compliance Records

Bookings → Check-In

Checked-In Booking → Restaurant POS Room Selection

Restaurant Order → KOT

Restaurant Order → Settlement

Post to Room → F&B Charge Persistence

F&B Charge → Booking/Folio

Booking + Room Charges + F&B Charges → Folio

Folio → GST/Tax Totals

Folio → Billing UI

Folio → Invoice

Folio Settlement → Checkout

Verify actual code, API calls, database records, and frontend behavior.

## FINANCIAL CORRECTNESS

Within current scope:

* Every room charge must belong to the correct tenant and booking.
* Every F&B room-posting charge must belong to the correct tenant and checked-in booking.
* Cash-settled restaurant orders must not also appear as unpaid room charges.
* A restaurant order must not be posted to a room twice.
* Folio totals must be deterministic.
* GST must be calculated consistently.
* Rounding must be consistent.
* Checkout must not silently omit valid charges.
* Failed financial operations must not leave partial inconsistent data.
* Financial source references must be preserved where required for traceability.

Do not introduce enterprise accounting systems beyond current scope.

## SECURITY REQUIREMENTS

Verify:

* Tenant isolation at API level.
* Tenant isolation at ORM level.
* Tenant isolation at database/RLS level.
* No cross-tenant reads.
* No cross-tenant writes.
* Authorization enforced server-side.
* FRONT_DESK cannot perform RESTAURANT-only actions unless explicitly allowed.
* RESTAURANT cannot access unauthorized hotel-management functionality.
* OWNER and MANAGER permissions behave according to existing intended rules.
* Client-supplied tenant identifiers cannot bypass tenant isolation.
* Booking IDs, Room IDs, Order IDs, Menu Item IDs, and Charge IDs cannot be used for cross-tenant access.

## OUT OF SCOPE

Do not implement these merely because they are missing:

* Android application.
* Offline-first mobile architecture.
* WorkManager synchronization.
* Firebase App Distribution.
* Super-admin console.
* Tenant onboarding UI.
* Subscription billing.
* Feature flags.
* Housekeeping module.
* Maintenance module.
* Night audit.
* Cashier shift management.
* Advanced accounting.
* City ledger.
* Accounts receivable.
* Multiple folios.
* Routing instructions.
* Group bookings.
* Channel manager.
* OTA integrations.
* Inventory distribution.
* Revenue management.
* RevPAR analytics.
* ADR analytics.
* Advanced reporting.
* Loyalty/CRM.
* Guest mobile application.

If an out-of-scope capability is required to fix an existing current-phase workflow, document the reason before implementing it.

## DEFINITION OF CURRENT-PHASE COMPLETE

Phase 1–2 stabilization is complete only when:

1. All implemented modules have been inspected.

2. The primary workflow operates end-to-end.

3. Tenant isolation has been tested.

4. Authorization has been tested.

5. Booking state transitions are valid.

6. Restaurant cash settlement works.

7. Restaurant room posting works.

8. Duplicate restaurant charge posting is prevented.

9. F&B charges appear on the correct guest folio.

10. F&B charges appear in final settlement.

11. Room and F&B GST calculations are correct according to the current product requirements.

12. Invoice totals reconcile with source charges.

13. Checkout behavior correctly handles outstanding charges according to current business rules.

14. API errors are surfaced clearly to users.

15. No current-phase workflow requires manual database modification.

16. Relevant automated tests exist and pass.

17. The production build passes.

18. No P0 or P1 current-phase issues remain unresolved.

Do not move to Phase 3 until these requirements are satisfied.
