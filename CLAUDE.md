# AssetTrace — instructions for Claude Code

Company asset lifecycle management MVP (internship assignment for Adz4needz).
Goal: know what asset exists, where it is, who holds it, its condition, and its full history.

**Every session:** `git pull` first, then read `docs/WORKLOG.md` (latest entry + open items) — the project is worked on
from two machines synced through GitHub. Before finishing, add an entry to `docs/WORKLOG.md`, commit and push.

Start with `HANDOFF.md` (status, decisions, first steps). The clickable prototype in `docs/prototype/`
is the visual and behavioural reference for every page — match its layout, copy and flows.
Read `docs/ARCHITECTURE.md` before any feature work. It is the source of truth for
stack, folder structure, permissions, the status state machine and workflows.
`prisma/schema.prisma` is already designed and validated — extend it, don't redesign it.
Work through `docs/PLAN.md` one phase at a time.

## Stack
Next.js 15 App Router + TypeScript (strict) · Prisma + PostgreSQL (Supabase) ·
Auth.js v5 Credentials + bcryptjs · Zod + react-hook-form · Tailwind + shadcn/ui ·
TanStack Table · Recharts · qrcode / html5-qrcode · Supabase Storage (private bucket) ·
papaparse + xlsx · date-fns · sonner (toasts). Free tiers only. No paid APIs, no AI features.

## Non-negotiable rules
1. All writes go through `src/server/services/*`. Pages/actions never write with Prisma directly.
2. Every service mutation: `requireUser()` → `can()` permission + manager scope → Zod parse →
   lifecycle check (`assertTransition` in `src/server/lifecycle.ts`) → `prisma.$transaction`
   that writes the record + `AssetHistory` row + `Notification` rows.
3. Never hard-delete assets, employees, history. Use `isActive=false`. Retired assets stay visible.
4. Return Result objects from server actions: `{ ok: true, data } | { ok: false, error, fieldErrors? }`.
   Map Prisma `P2002` to a field error ("Serial number already exists").
5. Every read query for MANAGER is filtered by managed departments; EMPLOYEE by own employee id.
   Use helpers `assetScope(user)` etc. from `src/server/permissions.ts`.
6. Files: upload to private Supabase bucket, store the key, serve via signed URL after a permission check.
   Max 1 MB per photo (`src/lib/photos.ts`, checked in the browser and on the server — Vercel rejects
   requests over 4.5 MB before our validation runs), images only (jpeg/png/webp).
7. Every list page has loading skeleton, empty state, error state, search, filters, pagination.
   Every lifecycle action uses a confirm dialog and a toast.
8. Mobile-first responsive (sidebar becomes a Sheet below `md`, tables scroll horizontally or become cards).
9. Never commit `.env`. Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client.

## Visual style
Follow ARCHITECTURE.md §8 exactly ("v2" style: Urbanist font, warm off-white bg, 28px cards,
pill nav with count badges, floating black quick-action rail, black + pale-blue hero KPI cards,
light/dark theme via next-themes). Never fall back to default shadcn slate look.

## Conventions
- Running numbers via `nextNumber(tx, key)` in `src/server/sequence.ts` (AST-LAP-0001, REQ-0001...).
- Dates stored UTC, displayed `dd MMM yyyy` / `dd MMM yyyy, hh:mm a` in Asia/Kolkata. Currency ₹.
- Enum labels via one map in `src/lib/labels.ts`; status colours via `<StatusBadge>`.
- Components: PascalCase files in `src/components`; server code in `src/server`.

## Commands
- `npm run dev` · `npm run build` · `npm run lint`
- `npx prisma migrate dev` · `npx prisma db seed` · `npx prisma studio`

## Commits
One commit per PLAN.md phase. Messages describe the change only: no Co-Authored-By lines, no tool or AI attribution.

## Definition of done for every phase
`npm run build` passes with zero type errors, `npm run lint` clean, feature manually
checked as all three demo users, and a git commit with a clear message.
