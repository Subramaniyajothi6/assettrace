# AssetTrace — Build Plan

Realistic pace with Claude Code: **5–7 focused days** (≈2 phases/day).
Rule: finish a phase, run its checks, commit, then start the next. Don't skip ahead.

---

## Part A — Do NOW on your phone (no laptop needed)

1. **GitHub**: create empty repo `assettrace` (public, no README).
2. **Supabase** (supabase.com, free): New project → region *Mumbai (ap-south-1)* → save the DB password.
   - Project Settings → Database → copy both connection strings (pooled 6543 + direct 5432).
   - Project Settings → API → copy Project URL and `service_role` key.
   - Storage → New bucket `asset-files` → **Private**.
   - Put all values in a private note (fill `.env.example` keys). Never share them.
3. **Vercel** (vercel.com): sign up with GitHub. Nothing to deploy yet.
4. Re-read `docs/ARCHITECTURE.md` §4–5 (state machine + workflows) until you can explain them —
   that's what interviewers/reviewers will ask about.
5. Optional head start: if you can use Claude Code from the web/mobile app with your GitHub repo,
   you can run Phase 0–1 prompts there before the laptop returns.

---

## Part B — Laptop day: setup (30 min)

```bash
npx create-next-app@latest assettrace --ts --tailwind --eslint --app --src-dir --import-alias "@/*"
cd assettrace
# copy CLAUDE.md, docs/, prisma/schema.prisma, .env.example from this pack into the project
cp .env.example .env   # fill in real values
git init && git add . && git commit -m "chore: scaffold + design docs"
git remote add origin https://github.com/Subramaniyajothi6/assettrace.git && git push -u origin main
claude
```

Paste each prompt below into Claude Code, in order. After each: `npm run build`, click-test, commit.

---

## Phase 0 — Foundations
> Read CLAUDE.md and docs/ARCHITECTURE.md. Install and configure: prisma + @prisma/client, next-auth@beta, bcryptjs, zod, react-hook-form, @hookform/resolvers, shadcn/ui (button, input, label, form, select, textarea, dialog, alert-dialog, sheet, dropdown-menu, table, badge, card, tabs, skeleton, sonner, popover, calendar, checkbox, avatar, separator, scroll-area, tooltip), @tanstack/react-table, recharts, date-fns, qrcode, html5-qrcode, papaparse, xlsx, @supabase/supabase-js, lucide-react. Create src/server/db.ts, lifecycle.ts (TRANSITIONS + assertTransition), sequence.ts (nextNumber), history.ts, notify.ts, permissions.ts (can, requireUser, requireRole, assetScope), src/lib/labels.ts, StatusBadge. Run the first migration, then add a second migration with the partial unique index for one active assignment per asset. Don't build pages yet.

✅ Check: `npx prisma migrate dev` ran, tables visible in Supabase.

## Phase 1 — Auth, layout, seed
> Implement Auth.js v5 Credentials login (email + password, bcrypt), session includes id, role, employeeId. middleware.ts protects everything except /login. Build the app shell: role-based sidebar exactly matching the navigation in docs/ARCHITECTURE.md (Employee/Manager/Admin lists), topbar with notification bell placeholder and user menu (profile, logout), responsive Sheet on mobile. Write prisma/seed.ts with the demo data in ARCHITECTURE.md §7 (realistic Indian names, all statuses represented, warranties expiring within 30 days). Login page shows demo credentials when NEXT_PUBLIC_DEMO_MODE=true. Implement the full visual system from ARCHITECTURE.md §8 now (tokens in globals.css, Urbanist + JetBrains Mono via next/font, next-themes light/dark, top pill nav with count badges, floating quick-action rail, StatusPill, KpiCard with sparkline, Card, PageHeader) so every later phase reuses it.

✅ Check: log in as all 3 users; each sees a different sidebar; employee can't open /admin/* (redirect/403).

## Phase 2 — Master data (Admin + Manager)
> Build CRUD pages for Departments (with manager assignment), Locations, Asset Categories (name + code), Vendors, Employees (manager/admin), and Users (admin only: create user, set role, activate/deactivate, link to employee, reset password). Use a reusable DataTable with search, filters, pagination, empty/loading/error states. Deactivate instead of delete. All writes through services with Zod and permission checks.

✅ Check: manager can't see Users/Departments/Categories pages; duplicate names show field errors.

## Phase 3 — Assets core
> Build Assets: list with search + filters from the spec (asset tag, serial, category, brand, employee, department, location, status, condition, warranty status: active/expiring in 30 days/expired, purchase year), register form (all fields in the spec, photo upload to private Supabase bucket, asset tag auto-generated AST-<CATEGORYCODE>-0001), edit form, and asset detail page with tabs: Overview, History timeline, Assignments, Maintenance, Issues, Returns/Inspections, QR. Duplicate tag/serial → friendly field errors. Registration writes REGISTERED history. Manager scope applies. QR tab: generate QR for `${APP_URL}/scan/${qrToken}`, downloadable PNG and a printable label. Build /scan/[qrToken] with the access rules in ARCHITECTURE.md (no private data for unauthorized users) plus an in-app "Scan QR" button using html5-qrcode.

✅ Check: register laptop with an existing serial → error. Scan QR on phone while logged in as employee who doesn't hold it → access denied.

## Phase 4 — Assignment + handover + My Assets
> Implement assignment per ARCHITECTURE.md §5: manager assigns AVAILABLE/RESERVED asset (employee, location, expected return, condition, accessories as tag input, remarks). Asset → ASSIGNED, holder/department/location updated, history + notification. Assignments list page. Employee: My Assets (cards on mobile) with asset detail, assigned accessories, and Confirm Receipt / Report Problem (DISPUTED) for pending handovers; manager gets notified. Employee Asset History page shows timeline only for assets they hold/held, only their own periods.

✅ Check: can't assign an already-assigned asset (try twice quickly too).

## Phase 5 — Transfers
> Implement transfer workflow: request (from asset page or by employee for own asset) to another employee/department/location with reason → manager review approve/reject with remarks → approval closes old assignment (endReason TRANSFERRED), creates new assignment with PENDING handover, updates asset, transfer COMPLETED when new holder confirms. Transfers list with status filter and full transfer history on the asset page. Notifications to old holder, new holder, manager.

## Phase 6 — Issues + Employee Requests
> Employee Report Issue page (asset from own assets, category, title, description, severity, photo) creates AssetIssue + linked EmployeeRequest(type ISSUE). Employee Requests page: create REPLACEMENT, RETURN (creates AssetReturn REQUESTED), NEW_ASSET requests with priority; view status and manager remarks; cancel while pending. Manager Requests inbox with filters, detail drawer, status updates + remarks; issue status flow REPORTED → UNDER_REVIEW → MAINTENANCE → RESOLVED → CLOSED with "Send to maintenance" action. Notify employee on every status change.

## Phase 7 — Maintenance
> Maintenance records: create (asset, linked issue optional, problem, type, provider, service date, cost ₹, parts replaced, technician notes, warranty covered, expected completion), update status, complete (actual completion date). Starting sets asset UNDER_MAINTENANCE and stores statusBefore; completing restores to ASSIGNED (if active assignment) or AVAILABLE, resolves the linked issue, notifies holder. Maintenance list + per-asset maintenance history with total cost.

## Phase 8 — Returns, inspection, retirement, lost
> Returns page: pending return requests + manager-initiated return. Receive form (return date, received by = me, condition, missing accessories checklist from assignment accessories, damage, remarks, up to 3 photos) → asset RETURNED, assignment closed. Inspection form (all fields in spec) is mandatory before the asset can leave RETURNED; result maps to next status per ARCHITECTURE.md §4. Inspections list page. Retire action (blocked if ASSIGNED) with date, reason, final condition, disposal method, authorized by, remarks → RETIRED, read-only afterwards. Mark Lost / Found actions.

✅ Check: try to assign a RETURNED-but-not-inspected asset → blocked with clear message.

## Phase 9 — Notifications
> Notification bell with unread count, dropdown of latest 10, Notifications page with mark read/mark all read, links to the related record. Warranty check: on manager/admin dashboard load, create WARRANTY_EXPIRING notifications for assets expiring within Setting warrantyAlertDays (default 30), idempotent (one per asset per 30 days). Optional Vercel cron route /api/cron/warranty protected by CRON_SECRET.

## Phase 10 — Dashboards & analytics
> Role dashboards. Manager/Admin cards: Total, Available, Assigned, Under Maintenance, Damaged, Lost, Retired, Warranty Expiring Soon, Pending Requests, Open Issues (each card links to a filtered list). Charts (Recharts): assets by category, by department, by location, status distribution (donut), maintenance cost by month, warranty expiry next 6 months, monthly asset transactions (from AssetHistory). Employee dashboard: my assets count, pending handovers, open issues/requests, recent notifications. Use aggregate queries (groupBy), not loading all rows.

## Phase 11 — Reports & export
> Reports page with these reports, each with filters + preview table + Export CSV and Export Excel: asset inventory, employee asset list, maintenance records, transfer records, return records, retired assets, warranty-expiring assets, issue records. Export via /api/export/[report] route with permission + scope checks. Admin: export everything; manager: scoped.

## Phase 12 — Admin settings, polish, security, deploy
> Admin Settings page (org name, warranty alert days, asset tag prefix). Profile page (view info, change password). Audit the whole app against docs/ARCHITECTURE.md and the 20-item final requirement list: every action permission-checked server-side, every status change in history, consistent loading/empty/error states, confirm dialogs, mobile layout at 375px, no console errors, no secrets on the client. Write README.md (features, stack, architecture diagram, ER summary, setup steps, demo logins, screenshots placeholders). Then prepare for Vercel deploy (prisma generate in build script).

Deploy: Vercel → Import repo → add env vars → deploy → run `npx prisma migrate deploy` and seed against production DB → test all 3 logins on your phone.

## Phase 13 — Enhancements (after Phases 0–12 are complete)
> See docs/ENHANCEMENTS.md. Recommended first: bulk CSV/Excel import, physical audit by QR scan, depreciation and current value, bulk QR label printing and other bulk actions, before → after values in the history timeline. Only start once the assignment requirements are finished.

---

## Submission checklist
- [ ] Live URL + GitHub repo link + demo credentials for 3 roles
- [ ] README with setup, architecture, schema, workflows, screenshots
- [x] ~~3–5 min screen recording: register → assign → confirm → issue → maintenance → return → inspect → retire → history timeline → dashboard → export~~ Not needed (user, 29 Oct).
- [ ] Walk through all 20 items of the "Final Requirement" list once, live
