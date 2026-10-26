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

- [ ] **Run only one dev server at a time.** On 27 Oct the PC hit `EMAXCONNSESSION` while something else (probably the laptop's server) still held pool slots. Stop the server on one machine before starting it on the other. A permanent fix would be the transaction pooler (port 6543 + `pgbouncer=true`) for `DATABASE_URL`.
- [ ] **Dashboard e2e not run** after the 27 Oct breakdown card change. `e2e/phase10-dashboards.spec.ts` was updated but not executed: the e2e suite reseeds the shared database.
- [ ] **KPI cards (new StatTile style):** only the Assets page uses them so far. Dashboard, Assignments, Maintenance, Users and employee Home still have the old cards, and each needs its own choice of what the bar shows.
- [ ] **Form dropdowns** (Register asset, Assign, etc.) are still native `<select>` and can open upwards in short windows. The toolbar filters are already fixed. Switch the forms to `FilterSelect`-style dropdowns?
- [ ] **Locations / Categories:** rename the "Name" field and column to "Location name" / "Category name", to match "Department name" and "Vendor name"?
- [ ] **Unused visual skins:** the other 7 skins are still in `src/lib/skins.ts` and `src/app/skins.css`, but there's no picker any more. Remove them to shrink the CSS?
- [ ] **`.claude/` folder** in the repo is untracked but not ignored. Add it to `.gitignore`?
- [ ] **npm audit** reports 5 vulnerabilities (4 high). Not looked into yet. `npm audit fix --force` would cause breaking upgrades.
- [ ] **Not yet verified:** full `npm run build` and the Playwright e2e suite after the 26 Oct changes. Only `tsc` and `eslint` were run.
- [ ] **From HANDOFF/LOCAL_SECRETS:** Vercel deployment, README screenshots, Phase 13 enhancements (`docs/ENHANCEMENTS.md`).

## Log

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
