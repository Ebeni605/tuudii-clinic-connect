# Roadmap

## Phase 3 — OPD (done)
## Phase 4 — Laboratory (done)

## Phase 5 — Integration, reports, billing, security, go-live prep
- [x] A. Integration: duplicate lab-order guard (same test still open on the visit), row lock against concurrent orders
- [x] B. Admin management dashboard (live database counts)
- [x] B. Reports (7) with date filters, CSV export, print/PDF, pagination, no names in aggregates
- [x] C. Optional billing (off until admin enables): charges, invoices, items, payments, receipts, adjustments, outstanding, daily report
- [x] D. Security: revoke anonymous function access, attribute staff/permission changes in audit, server input validation, password reset, idle sign-out, audit page filters
- [x] E/G. Backup & recovery + deployment/rollback/admin setup guide (document only what is verified)
- [x] F. QA: full journey + role tests in database, browser walkthrough, mobile layout, printing
- [x] Final implementation report
- [ ] Not verified: backup restore in a separate environment, real concurrent-order test, billing browser flow with billing switched on, email reset delivery to a real inbox

## Staff registration & approval (done)
- [ ] Needs a real inbox: register → confirm email → admin approves → log in

## Pre-deployment requirements (done)
- [x] 1. Lab test definitions: units/ranges/method/analyzer/critical limits, age/sex/pregnancy ranges, approval workflow, B/F + BF locked until confirmed
- [x] 2. Price list: per-charge approval, effective/expiry dates, price history, price-list confirmation gate before billing can run
- [x] 3. Backup/restore record, synthetic-data cleanup tool (admin-approved), 10-gate deployment readiness checklist
- [x] Tests + typecheck + final report

## Later / needs the clinic
- Perform a real backup restore and fill in the record in docs/GO_LIVE.md
- Clinic to enter validated units/reference intervals; confirm meaning of B/F and BF
- Clinic to approve prices + payment workflow before billing is switched on
- Remove test accounts and fictional records before real use
