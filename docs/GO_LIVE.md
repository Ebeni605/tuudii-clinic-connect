# Two D Medium Clinic — Go-live, backup and recovery guide

This system has been built and tested with **fictional data only**. It is **not** certified as
healthcare-compliant and must not receive real patient information until every item in
section 7 has been completed and signed off by the clinic.

---

## 1. Environment and secrets

| Item | Where it lives | Notes |
|---|---|---|
| Database, sign-in, server functions | Lovable Cloud (one backend serves preview and the published app) | No separate "test" database exists today. See section 7, item 2. |
| Public browser keys (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) | `.env` (generated) | Safe to ship to browsers; all data is protected by row-level security. |
| Service-role key | Server-side only, read inside server functions in `src/lib/admin.functions.ts` | Never in browser code, never in chat, not visible to the clinic. |
| Other secrets | Lovable Cloud secrets | None are required today. |

No file storage is used; there are no storage buckets and no download links to protect.
Lab reports, receipts and invoices are generated in the browser and printed / saved as PDF.

## 2. Publishing, domain and HTTPS

1. Remove test data first (section 6).
2. Publish from the editor (**Publish**). The app is served over HTTPS automatically.
3. Optional custom domain: Project settings → Domains → connect the clinic's domain and add the
   DNS records shown. HTTPS certificates are issued automatically once DNS is verified.
4. After connecting a domain, sign in once on the new address and run the smoke test (section 5).

## 3. Error monitoring

- Server and database errors: Lovable Cloud → logs (ask the developer to review weekly).
- Every change to clinical, lab, staff and billing records is in **Administration → Audit log**
  (filter by date, staff member and area; export CSV).
- No third-party error-tracking service is connected. Add one only after a privacy review,
  and configure it so no patient names, phone numbers or results are sent.

## 4. Backup and recovery

What Lovable Cloud provides (from the platform documentation — **not yet verified for this project**):

- One automatic database backup per day, kept for about 14 days.
- Restore is **to a daily snapshot only** (no point-in-time recovery). Data entered after the
  snapshot is lost, and the database structure reverts with it.
- Backups cover the database only. This app stores no files, so nothing else needs backing up.
- Where to look: **More → Database → Manage → Backups** (each row shows the snapshot time in UTC).
- Full export: **More → Database → Manage → Settings → Export project data** (once per 24 h,
  includes staff accounts and password hashes — keep the file encrypted and offline).

Recommended procedure for the clinic:

1. **Daily:** confirm in the Backups page that a backup from the last 24 h exists (record date/initials in a logbook).
2. **Weekly:** take a full export and store it encrypted on an offline drive kept in a locked place.
3. **Paper fallback:** keep printed blank registration, OPD and lab request forms for outages.
4. **Restore test before go-live (required, not yet done):** restore an export into a separate,
   clinic-owned test project, sign in, and check that patients, visits, lab results and the audit
   log match. Record the date, who did it and the result. Do not restore over the live database for a test.

Status: **backups and restoration have not been verified.** Do not claim the system is backed up
until steps 1 and 4 have been done and recorded.

### Backup/restore verification record (fill in — NOT yet verified)

| Date | Backup source | Restored to (separate environment) | Checks performed (patient count, lab results, audit log) | Result | Performed by |
|------|---------------|-----------------------------------|----------------------------------------------------------|--------|--------------|
| — | — | — | — | Not performed | — |

Only tick the "Backup restored and checked" gate on the admin Go-live checklist after a row above is completed with evidence.

## 5. Deployment and rollback

Before every publish:
1. Automated checks pass (`bunx vitest run`).
2. Database changes are only added through new migration files in `drizzle/migrations/` (never edited after they are applied).
3. Smoke test on the preview with fictional accounts: sign in for each role → register → check in →
   OPD consult → lab order → specimen → result → verify → OPD review → complete → print lab report.

Rollback:
- **App screens:** restore the previous version from the editor's version history and publish again.
  Database changes are not undone by this.
- **Database:** prefer a new corrective migration. Restoring a daily backup is the last resort
  because everything entered since that backup is lost (record those visits on paper and re-enter).
- After any rollback, repeat the smoke test.

## 6. Administrator setup for real use

1. Delete or disable every fictional `qa.*@example.test` account (Staff & roles → disable;
   permanent removal is done through the backend user list).
2. Remove fictional patients and visits: ask the developer to clear them **before** real data is
   entered (patient records cannot be deleted from the app by design).
3. Sign in as the real administrator, change the password, and create one account per staff
   member (never shared accounts). Give lab verifier permission only to qualified staff.
4. Enter validated lab units and reference intervals (Test catalogue) and confirm B/F and BF.
5. Billing stays **off** until prices are approved: Billing setup → enter price list → record who
   approved it → switch on.
6. Shared computers sign out automatically after 30 minutes without activity; staff should still sign out when leaving.

## 7. Open items needing external review before real patient data

1. Legal/privacy review under Ethiopian health-data rules (consent, retention, who may see records).
2. A separate test environment so testing never touches live records.
3. Backup restore test (section 4) and a written downtime procedure.
4. Independent security review / penetration test.
5. Clinical sign-off of templates, diagnosis list, lab catalogue units and reference intervals.
6. Staff training, account policy, and password reset process (email reset needs real staff email
   addresses; otherwise the administrator resets passwords).
7. Approval of billing prices and payment workflow, if billing will be used.
