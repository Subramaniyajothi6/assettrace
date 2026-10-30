# AssetTrace — work log

Running log of what was done, decided and left open, so a new session on either machine knows where things stand.
Newest entry first. `HANDOFF.md` has the original setup and phase decisions; this file covers everything after.

## How we work (two machines)

The project is worked on from two machines, with GitHub (`Subramaniyajothi6/assettrace`, branch `main`) in between:
- **Home PC**: main machine.
- **Laptop**: used when outside. It has about 3.8 GB of RAM, so the dev server sometimes gets killed for low memory.

Every session, on either machine:
1. **Start:** `git pull`, then read this file (at least the top entry and "Open items"). If `package.json` changed, run `npm install`.
2. **Work:** commit when something works. Commit messages describe the change only: no Co-Authored-By and no AI/tool attribution (see `CLAUDE.md`).
3. **End:** add an entry to this file, then `git add -A`, `git commit`, `git push`.

Never edit on both machines without pushing and pulling in between.

### Secrets (not in git)
- `assettrace/.env` holds the DB URLs and password, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET` and `CRON_SECRET`. It's gitignored, so each machine keeps its own copy. Copy it by hand (USB or typing), never through git, email or chat.
- `LOCAL_SECRETS.md` (one folder above the repo) has the same values plus notes. It's outside the repo.
- Day-to-day coding never touches these. They're needed only to set up a machine, to deploy (Vercel env vars), or to rotate a leaked key.
- Both machines use the **same Supabase database**, so data changes show up on both.
- Keep `connection_limit=5` in `DATABASE_URL` on both machines. The Supabase session pooler allows 15 clients in total, shared by every running server, script and Prisma Studio.
- `npx prisma db seed` **wipes every table** and reloads demo data, for both machines.

### Running locally
`npm install` → `npm run dev` → http://localhost:3000.
Demo logins: `admin@assettrace.dev` / `Admin@123`, `manager@assettrace.dev` / `Manager@123`, `employee@assettrace.dev` / `Employee@123`.
If port 3000 is busy, an old dev server is still running. Stop that node process; don't run two servers at once.

## Open items

- [ ] **Run e2e after the 31 Oct motion changes** (StatusBadge became a client component, ActionForm/SubmitButton changed, toast texts changed). Needs more free memory than this PC had.
- [ ] **Responsive audit unfinished.** Run the audit script (see the 30 Oct entry) on the PC; the laptop only managed 3 pages before running out of memory.

- [ ] **Vercel: set `NEXT_PUBLIC_APP_URL`** to `https://assettrace-six.vercel.app` (Settings → Environment Variables), then Redeploy. Only a fallback; QR codes already use the request host.
- [ ] **README:** add the live URL and screenshots.
- [x] ~~**Deploy to Vercel.**~~ Done 29 Oct: https://assettrace-six.vercel.app (env var notes in the 29 Oct entry).

- [ ] **Navigation vs the assignment brief (decision pending, ask the user).** The brief's "Main Application Navigation" table lists:
  - **Admin:** Dashboard, Assets, Employees, **Departments, Locations, Categories**, Users, Reports, Settings. The app has instead Dashboard, Assets, Employees, **Requests, Activity**, Reports, Users, **Master data** (tabs Departments/Locations/Categories/Vendors), Settings.
  - **Manager:** matches, plus an extra Requests item.
  - **Employee:** Dashboard, My Assets, Report Issue, Requests, Asset History, Notifications, Profile. The app has Home, My assets, Report issue, My requests, History. Notifications is reached through the bell, Profile through the avatar.
  - Every page already exists (`/admin/departments|locations|categories|vendors` are separate URLs). Only the nav in `src/components/shell/nav.ts` differs, because Phase 0 followed the prototype.
  - Choices put to the user:
    1. Admin nav exactly as the brief, with Requests/Activity reachable from the Dashboard (recommended).
    2. Brief + Requests.
    3. Brief + Requests + Activity.
  - Also: rename the employee items to the brief's names and add Notifications/Profile?
  - If Master data is split, keep Vendors as a tab on those pages and update `SECTION_ALIASES`.

- [ ] **Finish Step 12 of the walkthrough** (final checks): Reports + one Excel export, Arun's notifications / My assets / History, admin Dashboard counts and Activity. Steps 1–11 are done (AST-LAP-0017 registered → … → retired on 28 Oct).
- [ ] **Run only one dev server at a time.** On 27 Oct the PC hit `EMAXCONNSESSION`. When the laptop checked, it had no server or node process running, yet all 15 slots were held (idle Supavisor clients). So they came from the PC side or processes that never closed. If it happens: `Get-Process node | Stop-Process -Force` on the machine that ran the server. A permanent fix would be the transaction pooler (port 6543 + `pgbouncer=true`) for `DATABASE_URL`.
- [ ] **KPI tiles on other pages:** the Assets page and the Dashboard location rows now share one `StatusKey` colour key. Dashboard KPIs, Assignments, Maintenance, Users and employee Home still use the old `KpiCard`.
- [ ] **Form dropdowns** (Register asset, Assign, etc.) are still native `<select>` and can open upwards in short windows. The toolbar filters are already fixed. Switch the forms to `FilterSelect`-style dropdowns?
- [ ] **Locations / Categories:** rename the "Name" field and column to "Location name" / "Category name", to match "Department name" and "Vendor name"?
- [ ] **Unused visual skins:** the other 7 skins are still in `src/lib/skins.ts` and `src/app/skins.css`, but there's no picker any more. Remove them to shrink the CSS?
- [ ] **`.claude/` folder** in the repo is untracked but not ignored. Add it to `.gitignore`?
- [ ] **npm audit** reports 5 vulnerabilities (4 high). Not looked into yet. `npm audit fix --force` would cause breaking upgrades.
- [ ] **From HANDOFF/LOCAL_SECRETS:** Vercel deployment, README screenshots, Phase 13 enhancements (`docs/ENHANCEMENTS.md`).

## Log

### 31 Oct 2026 — PC: dark mode, motion
Pulled the laptop's admin dashboard work (`c53d7ce`…`5ecb7d4`). This PC has only 3.7 GB RAM (about 0.5 GB free); the dev server was once stopped by Claude Code for low memory, and the user declined headless-browser test scripts for the same reason.

**Admin dashboard:** removed the greeting card buttons (Add user, Master data, Reports, All activity); the pages stay in the nav/rail.

**Dark mode (every page):** the skin's cards (#181818) were almost the page colour (#0E0E0E), so card text looked like it floated. Overrides in `globals.css` (after `[data-mode="dark"]`): page #101011, cards #1D1D20 with a 1px #2D2D31 border (`--at-bw/--at-bc`) and a soft shadow, chips/lines/outlines one step lighter, rail #2A2A2F with its own border and deeper shadow. All text tokens checked ≥ 5.7:1 on the new card and chip colours.

**Motion.** The user picked from two demo pages (artifacts "AssetTrace Motion Options" 1–8 and "…II" A–O). Applied: theme switch (1), sliding tabs (4), list refresh (6), count-up (7), and A–I, K, N. Not applied: 2, 3, 5, 8 (first page) and J signature stamp, L QR scan, M quick peek, O field focus. New `src/components/motion/`:
- `switchTheme.ts` (1): View Transition circle from the moon/sun button. The skin fades body/button colours (`transition: background-color .5s`), which made the "new" snapshot mid-fade and hid the circle, so `.theme-switching` turns transitions off during the switch. Fallback for other browsers: `.theme-fade` colour fade.
- `TabIndicator.tsx` (4): first child of every `.tabs`/`.seg` bar; one highlight slides to the item with `aria-current="page"`/`aria-selected` (MutationObserver + ResizeObserver). The breakdown card content cross-fades (`.swap-in`).
- List refresh (6): `.tbl tbody tr` rows fade up with a 30 ms stagger; `ListToolbar` sets `data-list-pending` on <html> while a search/filter loads (table dims); `.skel` shimmers.
- `CountUp.tsx` (7): wraps the existing `useCountUp`, formats int / ₹ / ₹ short; used in StatTile, dashboard small tiles, Assignments and Maintenance KPIs.
- `MorphLink.tsx` (A): Assets rows glide into the asset page title (`PageHeader morph` → `data-vt="record-title"`). Waits at most 2.5 s for the new page (Chrome aborts at ~4 s and dev compiles are slow) and swallows the transition's rejections; the first version raised "Transition was aborted because of timeout".
- B: `ActionForm` keeps a `flash` (ok/err) in context; `SubmitButton` shows a spinner while pending, a drawn tick + green "Saved" for 1.4 s, and shakes on error. `ConfirmButton` shows a spinner.
- C: `StatusBadge` is now a client component; when its status changes in place it pops, and its row glows (cards get a ring).
- D: `details::details-content` animates open/close (`interpolate-size`, Chromium).
- E: `WhenVisible.tsx` mounts Recharts charts only when they scroll into view, so they grow when seen.
- F: the bell swings and its dot pops when the unread count goes up; drop-down items slide in.
- G: `FlipTbody.tsx` (in `TableCard`) animates rows to their new place when a sort reorders them.
- H: `CondenseOnScroll.tsx` sets `data-condensed` past 60 px (back under 10 px); `.ph` is sticky and shrinks to a slim bar.
- I: `undoToast.ts`: success toast with Undo and a timer line for Mark all as read (new service `markNotificationsUnread` + `markUnreadAction`, owner-scoped, Zod-checked) and the Active switches (Undo flips back).
- K: issue `.pipe` steps fill left to right via `::after` (`data-on`, `--c`).
- N: `RollingCount.tsx` rolls nav badge numbers when they change.
- Everything is off with prefers-reduced-motion (skins.css rule + explicit checks in JS).

**Checked:** `tsc` and `eslint` clean; the user tried the transitions in the browser. e2e not run (memory); `phase9` updated for the new "N notifications marked as read" + Undo toast.

### 30 Oct 2026 — laptop (admin dashboard; merged into `main` and deployed the same day, branch deleted)
**Admin dashboard (layout B, picked from mock-ups).** Admins get their own Dashboard (`dashboard/AdminDashboard.tsx`, data from `getAdminOverview` in `src/server/queries/admin.ts`); the manager dashboard is unchanged.
- Main column: admin greeting (departments without a manager, employees without a login, open work), cards (Departments, Assets, Without a manager in red, Can sign in), Departments table (managers or a "No manager" badge, status bar, assets, % in use, value), status breakdown card, four admin charts.
- Side panel (sticky, stacks below 1100px): Needs an admin, Open work across departments, Users (by role, latest sign-ins, stale after 3 days in red).
- Admin charts (picked from a mock-up): **Spend per month** (purchases vs repairs, new `SpendChart`), **Value going out of warranty** (₹ per month for the next 6 months plus the 4 biggest assets), **Asset age by department** (under 1 / 1–2 / 2–3 / 3+ years), **In use per month** (`TrendChart percent`). The manager keeps the old four charts.
- `StatTile` has `tone="bad"`; `lastMonths`/`monthKey` are exported from `dashboard.ts`.
- e2e `phase10-dashboards.spec.ts`: admin sees the new sections and charts and not "Needs your action"; manager doesn't see "Needs an admin". Not run.

**Header and nav**
- Rail pages (Employees/Inspections/Reports, Activity/Settings) also render in the top nav as `.nav-rail`, shown only ≤1100px where the rail is hidden. Before this they had no link at 768–1100px.
- Above 1100px the header stays one row (logo · nav · bell/profile): the skin's 1300px wrap is undone, the brand never shrinks or hides, the nav shrinks and scrolls sideways if needed. ≤1100px the nav takes its own row with items spread across it. Phones: one row (☰ · logo + name with ellipsis · bell · profile). All rules are unlayered at the end of `globals.css` (skins.css is unlayered).

**Responsive audit (unfinished).** A Playwright script (kept in the scratchpad, not the repo) opens every page as manager/admin/employee at 360/768/1024/1280px and lists elements that stick out past the viewport outside a scroll container. Measured so far: manager Dashboard, Assets, asset record: all OK. The laptop kept running out of memory; rerun on the PC.

**README** (`3da4ebb`): "Live demo" section at the top (URL, GitHub, the 3 demo logins, two-window tour tip); dashboards, issues table, maintenance edits and layout described; deploy section says every push to `main` redeploys. Submission is due 30 Oct.

**Local dev note.** Chrome on this laptop has a leftover service worker from another project on `localhost:3000` ("AI Interview Arena" offline page); use `127.0.0.1:3000` or unregister it at `chrome://serviceworker-internals`.

### 29 Oct 2026 — PC (after midnight): deployed + live check
**Deployed to Vercel**: **https://assettrace-six.vercel.app** (`assettrace.vercel.app` belongs to someone else). Project `assettrace`, Hobby plan, from `main`: **every push to `main` redeploys production**. Env vars were pasted from `.env`, with `DATABASE_URL` switched to the transaction pooler (6543, `pgbouncer=true&connection_limit=1`) and `NEXT_PUBLIC_DEMO_MODE` removed. The Supabase/Prisma integrations were skipped.
- QR codes use the request host first (`src/server/url.ts`), so they already point at assettrace-six. `NEXT_PUBLIC_APP_URL` is only a fallback; set it to the real URL anyway (open item).
- Claude can't type passwords into the live site (rule: only local or test hosts). The user signs in; Claude drives Chrome afterwards.

**Live check, every page as all three roles** (Claude in Chrome): manager 19 pages, admin 11, employee 8 + 2 denied. No console errors, access rules hold, warranty alerts are generated on the live site. A freeze on Settings was a browser dialog, not the app.

**Fixes from the live check** (`tsc`/`eslint` clean; e2e phase2, 4, 7, 9 and 10 pass; checked on localhost in Chrome):
- **Dates:** newer ICU writes "Sept". `threeLetterMonth()` in `src/lib/format.ts` turns it into "Sep" in `formatDate`/`formatDateTime`, the dashboard month labels and the notification dates.
- **Profile:** the email breaks only after the @ (`<wbr>`), not inside a word.
- **Employees:** "Add employee" is now a header button + dialog (`FormDialog`), and the table has the full width. The e2e test opens the dialog.
- **Maintenance:** Problem/Provider get a min width, the record cell doesn't wrap, and the row actions may wrap to two lines (min 190px).
- **Password fields** use a system font (Urbanist draws • tiny); pushed earlier as `63f9a10`.
- **Seed: no future-dated rows.** `d()` now squeezes any time later than the moment of seeding into the hour before it (in order), so "today 10:45" seeded at 00:30 isn't in the future. Intentionally future dates use the new `ahead()` (warranty end, expected return, expected completion). "Registered" is also capped before the first assignment. Checked after reseeding: 0 future history/notifications/assignments, and still 6 warranties within 30 days.
- **Shell gotcha:** a `node -e` edit turned `` into literal backspace characters in a regex (it silently never matched). Use the editor or a heredoc'd script for code edits. The repo was scanned: no control characters left.

**Database:** reseeded to clean demo data at the end.

### 28 Oct 2026 — PC (evening): pre-deploy checks
Pulled `e9a8bb6` and `ea7eb9b`, then ran `npx prisma generate` (the migration was already applied). Getting ready to deploy to Vercel; the user answered one question at a time.

**Decisions**
- **Photos: max 1 MB each** (was 5 MB). Vercel rejects requests over 4.5 MB before the app runs, and a return can carry 3 photos. New `src/lib/photos.ts` (`MAX_PHOTO_BYTES`, `PHOTO_HINT`, `photoError`) is used by `storage.ts` and by the three photo inputs (asset form, report issue, receive return). Those inputs now reject a too-big file in the browser with a toast. `CLAUDE.md` rule 6 was updated.
- **Demo accounts removed from the login page** (not just hidden). `DEMO_ACCOUNTS`, the tap-to-fill buttons, the pre-filled manager login, "Sign in as …", `NEXT_PUBLIC_DEMO_MODE` (code, `.env.example`, README, ARCHITECTURE) and the `.demo` CSS are gone. **The README "Demo accounts" table is kept**, so evaluators find the logins there.
- **Database reset to clean demo data** after the tests (`npx prisma db seed`: 34 assets, 14 employees, 7 users). The walkthrough asset AST-LAP-0017 is gone.

**Full e2e run** (production build, `npm start`, all 11 spec files): first run 45 passed, 6 failed. All fixed, and **all 51 now pass**.
- **Real bug: the notification bell blocked navigation.** `NotificationBell` polled with a server action (`bellDataAction`) on every page change. Next.js runs server actions one at a time on the router queue, so search URL updates, links and post-action refreshes waited behind it and timed out when the database was slow. It now uses `GET /api/notifications/bell` (`src/app/api/notifications/bell/route.ts`, 401 when signed out, `no-store`); `bellDataAction` was removed.
  - **Rule: never read data with a server action from polling or effects.** Use a GET route.
- The assign toast test expected the old text (now "Assigned to Arun Kumar" + "AST-LAP-0004 · …").
- Race test ("two managers assign at once") used `isVisible({ timeout })`, which checks once. It now uses `waitFor`. The app was right: only one assignment was created.
- The retire test allows 60 s for the redirect. From this PC the asset page takes about 7 s (about a dozen queries to the Tokyo database with 5 connections). It should be fast on Vercel in `hnd1`.
- **List search:** the × clear button was inside the `<label>`, so the field's accessible name became "… Clear search". `.search` is now a `div` with a separate `<label htmlFor>`.

**Checked**
- `npm run build` passes, `tsc` and `eslint` are clean, and all 51 e2e tests pass. The database ends on clean seed data.

**Next:** deploy on Vercel (the user imports the repo and adds the env vars; see the first open item), then check the live site as all three users.

### 28 Oct 2026 — laptop (afternoon)
Walkthrough Steps 7–11 done with AST-LAP-0017 (MNT-0017 completed ₹3,500 · RET-0015 received, charger missing · inspected Good · retired, recycled). Commit `e9a8bb6`.

**Bugs fixed from the walkthrough**
- Dates: new `isoDayIST()` in `src/lib/format.ts`. All form defaults/`max` use it, and `endOfToday()` (validation) is now the end of the IST day, so a UTC server no longer rejects "today" before 05:30 IST.
- Issues: "Fix: Fixed: Battery" → "Fix: Battery" (display strips the stored "Fixed:" prefix).
- History: new enum value `MAINTENANCE_IN_PROGRESS` (migration `20261028100000_maintenance_in_progress`, applied). "Start" logs "Maintenance in progress"; `MAINTENANCE_STARTED` is now labelled "Sent for maintenance". Old rows keep "Details updated" (history is append-only).
- Assignments: the tab "Pending handover" is renamed "Not signed" (it counts pending + disputed).
- Maintenance: "Record maintenance" is a header button + dialog (`RecordMaintenance.tsx`; opens itself for `?asset=`), so the table has the full width. New **Edit** action on open jobs (`updateMaintenance` service + `updateMaintenanceSchema`): cost, expected date, provider, parts, notes, warranty; history lists the changes. Complete pre-fills from it.

**UI**
- Contrast audit (WCAG, warm skin, light + dark): all tokens pass. 13 hard-coded colours failed in dark mode (red/brown text, light text on the black hero card, which turns light in dark mode). New theme tokens `--at-t-bad|high|warn|ok` and `--at-hd-ok|warn|bad` in `globals.css`. Issue severity colours use them.
- Nav: `NavItem.rail` moves a page into the left bar. Manager: Employees, Inspections, Reports. Admin: Activity, Settings. The top nav fits on one line with the bell/profile again; the mobile menu lists every page. Rail quick actions: staff Scan QR + Issues; employee Scan QR only (duplicates removed).
- Dashboard: no Scan QR on the greeting card (it's in the rail), the content is spread over the card, the row is stretched, and the Asset value chart uses `ColumnChart height="fill"` + `label` (mini chart, no table) so both cards end level.

**User guide (reference only, not in the repo):** an artifact with screenshots of every page and numbered pointers, captured with a Playwright script from the scratchpad. Only Sign in + Dashboard were captured on the laptop (too little memory); the full capture is better run on the PC.

### 28 Oct 2026 — PC
Pulled the laptop's `e024baa` and `176bda2`. The user is walking through the full asset lifecycle by hand, one step at a time, with a test asset **AST-LAP-0017 "Flow Test Laptop"** (serial `FLOWTEST001`, Engineering, Chennai HQ), assigned to Arun Kumar.
- Done so far: register → assign → employee signed the handover → employee reported **ISS-0037** (High, Battery) → manager reviewed it and sent it to maintenance as **MNT-0017**.
- **Next:** Step 7, complete MNT-0017. Then return request → receive → inspection → retire → check history, notifications, reports and the admin view.

**Fixes found during the walkthrough**
- **Assign form:** the employee search box was 260px tall, because the toolbar `.search` rule (`flex: 1 1 260px`) applied in a column. Fixed with `flex: none` there.
- **Toasts:** restyled app-wide (`src/components/ui/sonner.tsx` + unlayered `.at-toast` rules in `globals.css`). Dark hero card (inverts in dark mode), Urbanist font, round tinted icon per type, bold title + softer description, small close button at the top right. `richColors` was removed from `<Toaster>`.
  - `ActionForm`'s `success` can now return `{ title, description }`. The assign form uses it: "Assigned to Arun Kumar" / "AST-LAP-0017 · waiting for their signature on the handover".
- **Issues page:** the 5-column kanban was replaced by a **table with progress** (option H, picked from mock-ups A–H).
  - Tabs: **Open** (Reported, Under review, Maintenance), Resolved, Closed, All, each with a count.
  - Sortable Severity / Reported (newest or oldest) / Status, plus pagination.
  - A 5-step progress bar (`.pipe`) under each status. A "Fix:" line shows the resolution.
  - The maintenance button reads "Complete MNT-00xx".
  - New `ISSUE_STATUS_ORDER` and `ISSUE_STATUS_COLORS` in `labels.ts`.
  - The kanban CSS in `skins.css` is now unused (the file was left as generated). The page title is "Issues", and the Requests page link was renamed to match.
  - `e2e/phase6-issues-requests.spec.ts` now targets table rows and switches to the Resolved tab before closing (not run).
- **List toolbar search (all list pages):** white pill with a border (it had blended into the page background), max 460px wide, and a focus ring. The browser's blue × is hidden, and the app's own round × clears the search.
- **Vendor dropdown "empty":** not a bug. The first option is "—" (optional field), and the 5 vendors are below it.
- **CSS note:** `skins.css` is imported unlayered, so overrides of its rules must also be unlayered. Rules inside `@layer components` lose to it.

**Checked**
- `tsc` and `eslint` are clean. The user checked the assign form, the toasts and the Issues table in the browser. Not run: `npm run build`, e2e.

### 27 Oct 2026 — laptop (evening)
- **Assets list:** the "With" column is now "Assigned to" (also on the QR scan result page).
- **Dashboard greeting card:** removed the 9am–6pm "today" timeline, since the time already shows in the header pill. The `today` query in `getStaffDashboard` and its helpers (`hx`, `EV_COLOR`, `hourFmt`) were removed too. The `.timeline` CSS in `skins.css` is now unused (generated from the prototype, left as is).
- Compared the nav with the brief (see Open items). Nothing changed yet.
- `tsc` and `eslint` are clean. Not checked in a browser by Claude.

### 27 Oct 2026 — laptop (afternoon)
Pulled the PC's `dd85718` (breakdown card). The user picked each change below from a mock-up shown as an artifact.

**Dashboard chart tables** (option C)
- "Show as table" under each chart (Maintenance cost, Warranty expiry, Monthly transactions, Purchases) lists only months with a value, labelled with the year ("May 2026"), then a bold Total row and a note such as "10 months with no cost not shown".
- `Point.full` carries the month+year label (`monthYearLabel` in `src/server/queries/dashboard.ts`). `ColumnChart` takes `zeroText` and `unit` (warranty counts read "6 assets").

**Dashboard "Where your assets are" / "Needs your action"** (option C)
- Locations are rows instead of cards: code badge (location colour on its edge), name and address, status bar, then Assets / In use / Value columns under a small header. The rows share the card's height equally (`.loc-rows`, `.loc-row`). On phones each row wraps to name + numbers, with the bar below.
- The per-row status legend was replaced by one shared key under the rows. Segment counts show on hover.
- "Needs your action" takes the locations card's height and scrolls inside it (`.act-scroll` with `contain: size`, min 240px). `ACTIONS_SHOWN` and "Show N more" were removed.

**Assets page KPI tiles**
- The per-tile legends were removed. One `StatusKey` line under the tiles ("In this view: Available 9 · Assigned 17 …") explains the black card's status bar.
- The three single-share tiles use the tile's ink colour plus a caption "9 of 34 in scope". Before, the amber warranty bar could be mistaken for "Under maintenance".
- New `StatusKey` export in `src/components/StatTile.tsx`, also used on the Dashboard. `STATUS_ORDER` moved to `src/lib/labels.ts` (shared by the client charts and server pages).

**Checked**
- `tsc` and `eslint` are clean, and the pages compiled and loaded in the dev server. Not run: `npm run build`, e2e. Not checked visually by Claude.
- The laptop dev server keeps getting killed for low memory, and `tsc` once ran out of memory. Heavier work is better done on the PC.

### 27 Oct 2026 — PC
Pulled the laptop's 26 Oct work (`7326304`, `797b14a`, `59cedc4`) and ran `npm install` (adds `exceljs`).

**Database connection**
- The dashboard failed with `EMAXCONNSESSION` (all 15 session-pooler slots held). Only one dev server was running on the PC, so the other slots were held elsewhere, probably by the laptop.
- Changed the PC `.env` to `connection_limit=5` (both machines now match) and restarted the dev server.

**Dashboard layout (uneven cards)**
- The user picked a layout from a mock-up of options A–D plus compact status variants S1–S4. They chose **S3**: status as the first tab of one breakdown card.
- New `BreakdownCard` in `src/components/charts/Charts.tsx` replaces the status donut and the three "Assets by category/department/location" bar lists:
  - It's full width, with tabs **Status / Category / Department / Location**. The heading follows the tab ("All assets by status", "Active assets by department", …).
  - Each row is a bar split by status (`.loc-bar` style, `STATUS_COLORS`), with a legend on the split tabs. Names and segments link to `/assets?category|department|location=…&status=…`.
  - More than 8 rows fold into "Other (n)" (not linked). The panel has a fixed minimum height so switching tabs doesn't move the page.
  - Arrow keys switch tabs.
  - `StatusDonut` and `BarList` were removed (no other users).
- `getStaffDashboard` now returns `breakdown.{status,category,department,location}` (`BreakdownGroup[]`). Category and department are grouped by `[id, status]`, and location reuses the existing per-location status query (the separate `byLocation` query was dropped).
- Charts below the card use the new `.dash-charts` grid: two equal columns (one below 900px), and Monthly transactions stays full width.
- **Top row:** "Where your assets are" and "Needs your action" stretch to the same height, and the location cards fill it. The action list shows 5 items plus "Show N more" (a `<details>`, because there is no page listing all action items).
- `e2e/phase10-dashboards.spec.ts` was updated for the new headings and tabs.

**Checked**
- `tsc` and `eslint` are clean. Not yet checked: `npm run build`, the e2e suite, and a visual check of the dashboard by Claude (the Chrome extension wasn't connected). Check the dashboard as admin and manager on the next session.

### 26 Oct 2026 — laptop
Project copied from the PC to the laptop (`D:\Adz4\AssetTrace-full-transfer\AssetTrace\assettrace`). Ran `npm install` and the dev server.

Commits pushed: `7326304`, `797b14a`.

**Settings page**
- Removed the "Look & feel" style picker. The app keeps the saved skin (warm). `uiSkin` was removed from the settings form and service; the root layout still reads the setting.
- Time zone and Currency are shown as fixed read-only fields ("Fixed: all dates are shown in IST" / "…in ₹"), not disabled dropdowns.

**Master data**
- Departments: "Name" is now "Department name" (form label and table column). Managers are still picked from users with the Manager role, not typed in.

**Reports and export**
- Excel export rebuilt with **ExcelJS** (`src/server/exports/xlsx.ts`), because free SheetJS can't write styles. The file has:
  - a title block (organisation, report, record count, generated by/at, applied filters)
  - a black frozen header row with autofilter, and zebra rows
  - status/condition/severity cells coloured like the app badges
  - IST dates, ₹ formats, a totals row for money columns, and a landscape print setup
- CSV export is unchanged. `xlsx` (SheetJS) stays installed for the e2e test that reads the file back.
- New column kind `long` in `src/server/queries/reports.ts` for free text (Reason, Remarks, Problem, Resolution, Damage, Title, Accessories). It wraps in a 280px-min column, and other cells stay on one line. In Excel, it wraps and the row grows.
- ID columns renamed: Return ID, Transfer ID, Record ID, Issue ID, Linked issue ID.

**Tables and lists**
- Table headings are now 15px, bold and in ink colour, the same size as the body (`.tbl th` in `skins.css`). Asset tags (`.tag`) never wrap.
- Toolbar filters: new `src/components/list/FilterSelect.tsx` (Base UI Select) replaces the native `<select>`. It always opens below and scrolls, and its width fits the selected text.

**KPI cards**
- New `src/components/StatTile.tsx`: icon and label on the left, large number on the right, and a coloured share bar with a legend (status colours from `STATUS_COLORS`).
  - Used on the Assets page: status split of the current view, plus Available / Warranty ending / Returned against scope.
  - The user picked this from a mock-up of options A–F (B icon + D bar + F number on the right).
- `listAssets` KPIs now come from two `groupBy(status)` queries instead of three counts.

**Database connection**
- Hit `EMAXCONNSESSION` ("max clients reached in session mode, pool_size: 15") after several dev-server restarts left two servers running. Lowered `connection_limit` to 5 in the laptop `.env` and updated the `.env.example` comment.

**Checked**
- No secrets in git history (service-role key, DB password and AUTH_SECRET searched across all commits).
- The only sensitive file changed on the laptop is `.env` (the connection limit).
