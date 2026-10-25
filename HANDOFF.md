# AssetTrace — handoff for Claude Code

Read this first. It records what is already done, what was decided, and where to start.

## What this project is
Internship assignment (Adz4needz): **AssetTrace**, a company asset lifecycle management web app.
Track what assets exist, where they are, who holds them, their condition, and their full history:
register → assign (employee signs handover) → transfer → issue → maintenance → return → mandatory inspection → retire.
Three roles: **Admin**, **Asset manager**, **Employee**.

## Done so far (as of 23 Oct 2026)
| Item | Status | Where |
|---|---|---|
| Architecture, roles/permissions, status state machine, workflows | Done | `docs/ARCHITECTURE.md` |
| Database schema (18 models, validated with `prisma validate`) | Done | `prisma/schema.prisma` |
| Phase-by-phase build plan with ready prompts | Done | `docs/PLAN.md` |
| Rules for Claude Code | Done | `CLAUDE.md` |
| Clickable prototype of every page (31 screens, 3 roles, 8 styles) | Done, shared with team | `docs/prototype/` · live: https://subramaniyajothi6.github.io/assettrace-design/ |
| Real app code (Next.js) | Phases 0–12 done; Phase 13 ideas in docs/ENHANCEMENTS.md | `src/` |
| GitHub repo for the real app (`assettrace`) | Not created yet | — |
| Supabase project + private `asset-files` bucket | Not created yet | — |
| Vercel account | Not set up yet | — |

## Decisions already made
- **Stack:** Next.js 15 App Router + TypeScript, Prisma + PostgreSQL (Supabase), Auth.js v5 Credentials, Zod, Tailwind + shadcn/ui, TanStack Table, Recharts, qrcode / html5-qrcode, Supabase Storage (private), papaparse + xlsx. Free tiers only.
- **Visual design:** the prototype in `docs/prototype/` is the source of truth for layout, copy and flows.
  Default style is **"Warm pill"** (Urbanist font, off-white background, black + pale-blue hero cards, pill nav with count badges, floating black quick-action bar on the left, light/dark).
  The team is choosing between 8 styles; all of them are CSS-variable skins in `docs/prototype/assets/app.css`
  (`[data-skin="warm|corporate|ledger|midnight|bento|swiss|brutal|nordic"]`). Port these as Tailwind/CSS
  variables with a `data-skin` attribute on `<html>` so the final style is a one-line switch.
- **Extras beyond the brief (keep them):** digital signature on handover, disputed handover, overdue-return list, asset audit trail on every action, QR scan with access rules, CSV + Excel export.
- **Never hard-delete** assets, employees or history; deactivate instead. Retired assets are read-only.

## How to use the prototype as reference
- Open `docs/prototype/index.html` through a static server (`npx serve docs/prototype`) or use the live link.
- Prototype routes → real Next.js routes:
  `#/dashboard`→`/dashboard` · `#/assets`→`/assets` · `#/assets/:id`→`/assets/[id]` · `#/assets/new`→`/assets/new` · `#/assets/:id/edit`→`/assets/[id]/edit` ·
  `#/assign`→`/assignments/new` · `#/assignments` · `#/transfers` · `#/requests` · `#/issues` · `#/maintenance` · `#/returns` ·
  `#/returns/:id/receive`→`/returns/[id]/receive` · `#/inspect/:id`→`/returns/[id]/inspect` · `#/retire/:id`→`/assets/[id]/retire` ·
  `#/employees` · `#/reports` · `#/notifications` · `#/profile` · `#/scan` and `#/scan/:qr`→`/scan/[qrToken]` ·
  `#/admin/users|master|settings`→`/admin/users|/admin/(departments|locations|categories|vendors)|/admin/settings` ·
  employee: `#/home`→`/home` · `#/my-assets` · `#/handover/:id`→`/my-assets/handover/[assignmentId]` · `#/report-issue` · `#/my-requests` · `#/my-history`.
- Business logic in the prototype (`docs/prototype/assets/pages-*.js`, functions under `AT.forms` / `AT.acts`) shows the
  expected behaviour of every action (status changes, history entries, notifications). Re-implement it server-side
  in `src/server/services/*` with Prisma transactions. Don't copy the prototype's localStorage approach.
- Seed data in `docs/prototype/assets/data.js` (Indian names, 34 assets across all statuses) is a good model for `prisma/seed.ts`.

## Start here (first message to paste into Claude Code)
> Read HANDOFF.md, CLAUDE.md, docs/ARCHITECTURE.md and docs/PLAN.md. The UI must match the prototype in docs/prototype
> (open index.html to see it). Then do **Phase 0** from docs/PLAN.md. Before writing code, list anything in the docs that
> conflicts with the prototype and tell me how you'll resolve it. Stop after Phase 0 and wait for me.

Then continue phase by phase. After each phase: `npm run build`, click-test as all three demo users, commit.

## Before Phase 0 (needs the owner, not Claude)
1. Create GitHub repo `assettrace` (public, empty).
2. Create Supabase project (region Mumbai), copy both DB connection strings + project URL + service_role key, create **private** bucket `asset-files`.
3. Fill `.env` from `.env.example`. Never commit `.env`.

## Phase 0 decisions (24 Oct 2026)
Where the docs and the prototype disagreed, the prototype wins on UI:
- **Navigation**: top pill nav with the prototype's per-role items (Manager includes Requests; Admin = Dashboard, Assets, Employees, Requests, Reports, Users, Master data, Settings; Employee = Home, My assets, Report issue, My requests, History). Collapses into a Sheet below `lg`. No sidebar.
- **Quick-action rail**: prototype items (Manager/Admin: Search, Register, Scan QR, Issues; Employee: Scan QR, Report issue, New request, Notifications) + theme toggle + sign out.
- **Routes**: the HANDOFF route map above, not the folder tree in ARCHITECTURE §2.
- **Schema additions**: `Assignment.handoverSignaturePath` (signed PNG in the private bucket), `NotificationType.HANDOVER_DISPUTED`.
- **Skins**: all 8 ported as CSS variables behind `data-skin` on `<html>` (default `warm`); dark mode only for warm/corporate/nordic, as in the prototype.
- **Versions pinned**: Next 15, Prisma 6 (Prisma 7 drops `url`/`directUrl` in the schema), `@hookform/resolvers@5`, TanStack Table 8, Zod 4, xlsx from the official SheetJS CDN build (npm `xlsx` has unfixed advisories). shadcn's `form` is replaced by `field` in the current registry.
- **Supabase**: project is in Tokyo (`ap-northeast-1`). RLS is enabled on every public table with no policies (migration `enable_rls`), so the anon REST API can't read anything; Prisma connects as the owner and is unaffected. DB URLs use `connect_timeout=30`.

## Phase 1 notes (24 Oct 2026)
- Demo logins: admin@assettrace.dev / Admin@123 · manager@assettrace.dev / Manager@123 · employee@assettrace.dev / Employee@123. Other seeded users: Password@123.
- `npx prisma db seed` **wipes every table** and reloads the prototype's demo data (dates relative to today).
- Skin CSS (`src/app/skins.css`) is generated from the prototype; tokens are prefixed `--at-*`, and the prototype classes `.dark`/`.blue`/`.grow` are renamed `.hero-dark`/`.hero-blue`/`.main-col`. The active skin is the `uiSkin` Setting row.
- Role guards live in route-group layouts: `(staff)`, `(staff)/admin`, `(employee)`. Pages not built yet render `<ComingSoon phase={n}>`.
- `EmployeeRequest.title` added (the prototype shows a title on every request).
