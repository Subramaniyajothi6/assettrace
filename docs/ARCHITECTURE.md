# AssetTrace — Architecture & Design

## 1. Stack (all free tier)

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) + TypeScript | One codebase for UI + API, deploys free on Vercel |
| DB | PostgreSQL on Supabase (free) | Real relational DB, transactions |
| ORM | Prisma | Typed queries, migrations, `$transaction` |
| Auth | Auth.js v5 (Credentials) + bcryptjs | Free, full control of roles, easy demo logins for evaluators |
| Validation | Zod (shared client + server) + react-hook-form | Same rules both sides |
| UI | Tailwind + shadcn/ui + lucide-react | Clean corporate look fast |
| Tables | TanStack Table | Sort/filter/paginate |
| Charts | Recharts | Free |
| QR | `qrcode` (generate), `html5-qrcode` (scan in browser) | Free |
| Files | Supabase Storage, **private** bucket, signed URLs (5 min) | "Uploaded files should be protected" |
| Export | `papaparse` (CSV) + `xlsx` (SheetJS, .xlsx) | Excel-compatible |
| Dates | date-fns | |
| Deploy | Vercel (app) + Supabase (DB/storage) | Free |

## 2. Folder structure

```
src/
  app/
    (auth)/login/page.tsx
    (app)/layout.tsx                 # sidebar by role, topbar, notification bell
    (app)/dashboard/page.tsx         # renders role-specific dashboard
    (app)/my-assets/...              # EMPLOYEE
    (app)/report-issue/page.tsx      # EMPLOYEE
    (app)/requests/...               # EMPLOYEE (own) / MANAGER (handle)
    (app)/history/page.tsx           # EMPLOYEE: history of own assets
    (app)/assets/...                 # list, new, [id], [id]/edit
    (app)/employees/...
    (app)/assignments/...
    (app)/transfers/...
    (app)/maintenance/...
    (app)/returns/...
    (app)/inspections/...
    (app)/reports/page.tsx
    (app)/admin/{departments,locations,categories,users,vendors,settings}/...
    (app)/notifications/page.tsx
    (app)/profile/page.tsx
    scan/[qrToken]/page.tsx          # requires login, then redirects by permission
    api/export/[report]/route.ts     # CSV/XLSX download
    api/files/[...path]/route.ts     # returns signed URL after permission check
  server/
    auth.ts                          # Auth.js config
    db.ts                            # Prisma client singleton
    permissions.ts                   # can(user, action, resource) + scope filters
    lifecycle.ts                     # status state machine (single source of truth)
    history.ts                       # recordHistory(tx, ...)
    notify.ts                        # createNotification(tx, ...)
    sequence.ts                      # nextNumber(tx, "AST-LAP") -> AST-LAP-0001
    storage.ts                       # Supabase upload + signed URL
    services/                        # ALL business logic lives here
      assets.ts assignments.ts transfers.ts issues.ts requests.ts
      maintenance.ts returns.ts inspections.ts retirement.ts
      masterdata.ts users.ts dashboard.ts reports.ts
  actions/                           # thin server actions -> call services
  lib/validation/                    # zod schemas
  components/
    ui/ (shadcn)  status-badge.tsx  data-table.tsx  timeline.tsx
    empty-state.tsx  confirm-dialog.tsx  page-header.tsx  stat-card.tsx
prisma/
  schema.prisma
  seed.ts
middleware.ts                        # redirect unauthenticated users to /login
```

**Golden rule:** pages and server actions never call Prisma for writes directly.
Every mutation = `service(fn)` → checks permission → validates with Zod →
checks lifecycle transition → `prisma.$transaction` that writes the record +
`AssetHistory` + `Notification`. This is what makes the system "traceable" and
"no silent data loss".

## 3. Roles & permission matrix

Scope rule for MANAGER: a manager sees/acts on assets whose `departmentId` is
in the departments they manage (`Department.managers`). Admin sees everything.
Employee sees only assets where `currentHolderId = their employee id` (plus
history of assets they previously held, limited to their own entries).

| Action | Employee | Manager | Admin |
|---|---|---|---|
| View own assets / confirm handover | ✅ | ✅ (own) | ✅ (own) |
| Report issue / create request | ✅ own assets | ✅ | ✅ |
| Register / edit asset | ❌ | ✅ in scope | ✅ |
| Assign / transfer / receive return / inspect | ❌ | ✅ in scope | ✅ |
| Maintenance records | ❌ | ✅ in scope | ✅ |
| Retire asset | ❌ | ✅ in scope | ✅ |
| Handle employee requests | ❌ | ✅ in scope | ✅ |
| Manage employees | ❌ | ✅ (create/edit, no role change) | ✅ |
| Manage locations | ❌ | ✅ | ✅ |
| Departments, categories, vendors, users, roles, settings | ❌ | ❌ | ✅ |
| Reports & export | ❌ | ✅ scoped | ✅ all |
| All transactions / analytics | ❌ | scoped | ✅ |

Enforce in 3 layers: `middleware.ts` (logged in), route/page guard
(`requireRole`), and **service layer** (`can()` + scoped `where`). The service
layer is the one that actually matters.

## 4. Asset status state machine

```
              ┌──────────── RESERVED ─────────┐
              ▼                               │
REGISTERED → AVAILABLE ──assign──► ASSIGNED ──transfer──► ASSIGNED (new holder)
              ▲   │                   │  │
              │   │                   │  └─return request─► (still ASSIGNED until received)
              │   │                   │                           │ receive
              │   │                   ▼                           ▼
              │   └──► UNDER_MAINTENANCE ◄───────────────────  RETURNED
              │              │                                    │ inspection (mandatory)
              └──────────────┘                                    ▼
                                                    GOOD → AVAILABLE
                                                    MINOR/MAJOR_REPAIR → UNDER_MAINTENANCE
                                                    DAMAGED → DAMAGED
                                                    RETIRE → RETIRED
```

Allowed transitions (`src/server/lifecycle.ts`):

```ts
export const TRANSITIONS: Record<AssetStatus, AssetStatus[]> = {
  AVAILABLE:         ["ASSIGNED", "RESERVED", "UNDER_MAINTENANCE", "LOST", "DAMAGED", "RETIRED"],
  RESERVED:          ["ASSIGNED", "AVAILABLE"],
  ASSIGNED:          ["ASSIGNED", "UNDER_MAINTENANCE", "RETURNED", "LOST", "DAMAGED"],
  UNDER_MAINTENANCE: ["AVAILABLE", "ASSIGNED", "DAMAGED", "RETIRED"],
  RETURNED:          ["AVAILABLE", "UNDER_MAINTENANCE", "DAMAGED", "RETIRED"], // only via inspection
  DAMAGED:           ["UNDER_MAINTENANCE", "RETIRED"],
  LOST:              ["AVAILABLE", "RETIRED"],
  RETIRED:           [],
};
```

Hard business rules:
1. Assign only if status is AVAILABLE or RESERVED and no active assignment exists.
2. One active assignment per asset (service check + partial unique index, see §6).
3. RETURNED → anything requires an `AssetInspection` linked to that return.
4. Retire only if not ASSIGNED (return it first). Retired = read-only forever, still visible in history/reports.
5. Maintenance start on an ASSIGNED asset keeps the assignment; on completion the asset goes back to ASSIGNED (if holder) or AVAILABLE.
6. Transfer creates a **new** Assignment (old one `isActive=false, endReason=TRANSFERRED`) with handover PENDING for the new holder.
7. Duplicate `assetTag` / `serialNumber` → friendly field error, not a 500 (catch Prisma `P2002`).
8. Dates: warrantyEnd ≥ warrantyStart, purchaseDate ≤ today, expectedReturnDate ≥ assignment date.

## 5. Workflows (who does what)

**Assignment + handover** — Manager assigns (asset, employee, location, expected return, condition, accessories, remarks) → asset ASSIGNED, history ASSIGNED, notification to employee → Employee opens My Assets → "Confirm receipt" (or "Report problem" = DISPUTED with note) → history HANDOVER_CONFIRMED, notification to manager.

**Transfer** — Employee or Manager raises transfer request (to employee/department/location + reason) → TRANSFER_REQUESTED → Manager approves/rejects with remarks → on approve: close old assignment, create new assignment, status stays ASSIGNED, holder/department/location updated, transfer COMPLETED after new holder confirms handover. Notify both employees.

**Issue** — Employee reports (asset, category, title, description, severity, photo) → creates AssetIssue (REPORTED) + EmployeeRequest(type ISSUE) → Manager moves to UNDER_REVIEW → optionally "Send to maintenance" (creates MaintenanceRecord, issue = MAINTENANCE, asset = UNDER_MAINTENANCE) → completion → issue RESOLVED → CLOSED. Notify employee on each status change.

**Return** — Employee requests return (or manager initiates) → AssetReturn REQUESTED → Manager "Receive" (date, condition, missing accessories, damage, photos) → asset RETURNED, assignment closed → Inspection form (mandatory) → result sets next status (see §4).

**Retirement** — From asset page (not assigned) → form (date, reason, final condition, disposal method, remarks) → confirm dialog → RETIRED.

**QR** — QR encodes `${APP_URL}/scan/${qrToken}` (random token, not the asset tag). Scan page: not logged in → login → back. Logged in → if allowed to view, redirect to `/assets/[id]` (manager/admin) or `/my-assets/[id]` (holder); else "You don't have access to this asset". Never show holder name to unauthorized users.

**Notifications** — Rows in `Notification`, bell with unread count in topbar (poll every 30–60s or refresh on navigation). Warranty expiry: a "Check warranties" job — run on dashboard load for managers (idempotent: skip if a WARRANTY_EXPIRING notification exists for that asset in last 30 days) — no paid cron needed. Optionally a Vercel cron (free, daily) hitting `/api/cron/warranty`.

## 6. DB notes
- Partial unique index (add in a migration via raw SQL):
  `CREATE UNIQUE INDEX one_active_assignment ON "Assignment"("assetId") WHERE "isActive" = true;`
- Human-readable numbers via `Sequence` table inside the same transaction: `AST-LAP-0001`, `REQ-0001`, `TRF-0001`, `ISS-0001`, `MNT-0001`, `RET-0001`.
- Money: `Decimal(12,2)`, display in ₹.
- Never hard-delete assets/employees; use `isActive=false`.

## 7. Seed / demo data (important for evaluation)
- admin@assettrace.dev / Admin@123 (ADMIN)
- manager@assettrace.dev / Manager@123 (MANAGER, manages IT + Engineering)
- employee@assettrace.dev / Employee@123 (EMPLOYEE)
- 4 departments, 3 locations, all 12 categories, 3 vendors, ~12 employees, ~40 assets across all statuses, with assignments, 2 transfers, issues, maintenance, returns+inspections, 2 retired, several warranties expiring in < 30 days → dashboards look alive on first login.
- Show demo credentials on the login page (only when `NEXT_PUBLIC_DEMO_MODE=true`).

## 8. UI system ("v2" style — see the v2 artboards on the design canvas)

Look: warm off-white canvas, big soft white cards, pill shapes everywhere, one black
and one pale-blue "hero" KPI card per row, small sparklines, light + dark theme.

Design tokens (put in `globals.css` as CSS variables + Tailwind theme):
| Token | Light | Dark |
|---|---|---|
| `--bg` page | `#F2F1EE` | `#0E0E0E` |
| `--card` | `#FFFFFF` | `#181818` |
| `--ink` text | `#141414` | `#F2F1EE` |
| `--muted` text | `#5F5B55` | `#A39E96` |
| `--line` borders | `#ECE9E4` | `#2A2A2A` |
| `--hero-dark` card | `#141414` | `#F2F1EE` (inverts) |
| `--hero-blue` card | `#C3D5F0` | `#1F3F6E` |
| `--accent` link/active | `#1F4E95` | `#8DB0E6` |
| `--alert` badges | `#C2461E` | `#E2764F` |
| `--success` | `#2E7D4F` | `#5DB583` |

- Font: **Urbanist** (Google Fonts, via `next/font/google`), weights 400/500/600/700;
  **JetBrains Mono** for asset tags and serial numbers.
- Radius: cards `28px` (`rounded-[28px]`), inner tiles `22px`, buttons/inputs/nav `9999px` (pills).
- Shadows: almost none — `0 1px 2px rgba(20,20,20,.04)`. No gradients except the faint greeting card.
- Page title 40px/600, card titles 17px/600, body 15px.

Layout:
- **Top bar**: logo + org name (left), white pill nav with red count badges (centre), bell + avatar (right).
  Manager nav: Dashboard · Assets · Assignments · Transfers · Maintenance · Returns · Reports.
  Admin adds an "Admin" pill (departments, locations, categories, vendors, users, settings).
  Employee nav: Home · My assets · Requests · History.
  Below `lg`: nav collapses into a Sheet behind a menu button.
- **Floating left rail** (black pill, desktop only): Search · Register asset · Scan QR · Theme · Help.
  On mobile these become a bottom tab bar (employee) / FAB for Scan QR.
- Breadcrumb + big page title; right side = live status pill or segmented tabs + primary actions
  (primary = black pill, secondary = white outlined pill).
- Dashboard: greeting card ("Good morning, Karthik. 3 handovers…") with today's activity timeline
  (from AssetHistory), asset value card, 4 KPI cards with sparklines, **"Where your assets are"
  location cards — each asset a small square coloured by status**, "Needs your action" list.
- Status pill colours (bg / text): Available `#DCEFE2/#1F5C3A`, Assigned `#DDE6F4/#1F4E95`,
  Reserved `#EDE7F6/#4C2A85`, Under maintenance `#FBEBD2/#7A4505`, Returned `#ECE9E4/#3B3833`,
  Damaged `#F8DDD2/#8E2A12`, Lost `#F6D9DC/#8E1B26`, Retired `#EEEDEA/#55524C`. Pill has a 7px dot in the text colour.
- Theme toggle with `next-themes` (class strategy), living in the floating rail. Keep contrast ≥ 4.5:1 for text in both themes.
- **Floating rail**: `position: fixed; left: 22px; top: 50%`, black pill, 44px round buttons,
  tooltip to the right on hover; page content gets `padding-left: 112px` on desktop; hidden below 1100px.

Motion (CSS keyframes in `globals.css`, no extra library; respect `prefers-reduced-motion`):
- Page enter: blocks rise 16px + fade + blur(6px→0), 650ms, staggered 60ms per block.
- Rail slides in from the left on load. Live status dot pulses.
- Sparklines draw in (stroke-dashoffset), bar charts grow from the baseline, staggered 45ms.
- Location grid squares pop in one after another (7ms stagger); hover scales a square 1.5×.
- KPI numbers count up from 0 over ~1s (small `useCountUp` hook).
- Cards lift 4px with a soft shadow on hover; table rows slide in and highlight on hover.
- Theme switch animates background and text colour over 500ms.
- Every list: search, filters, pagination, loading skeleton, empty state with CTA, error state.
- Every destructive/lifecycle action: confirm dialog, toast on success, inline field errors.
- Asset detail page tabs: Overview · History (vertical timeline: event, date/time, actor) · Assignments · Maintenance · Issues · Returns/Inspections · QR.
