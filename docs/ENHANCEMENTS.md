# AssetTrace — Enhancements backlog (Phase 13+)

Ideas collected on 25 Oct 2026 by comparing AssetTrace with Snipe-IT, Lansweeper and InvGate.
**Do these only after the assignment requirements (PLAN.md Phases 0–12) are finished.**
Same rules apply as every phase: services + permissions + history, free tiers only, tests, one commit per item group.

## Where we already stand

On par with or ahead of those tools for the core lifecycle: asset register with categories, QR labels and
scanning, assign/return (check-out/check-in), signed handover with dispute, transfers with approval, issues,
maintenance, mandatory return inspection, retirement, full history timeline, department-scoped managers,
notifications and dashboards.

## Phase 13 — recommended first (best value for the effort)

| # | Feature | Seen in | What it is | Effort | Notes |
|---|---|---|---|---|---|
| 1 | **Bulk import (CSV / Excel)** | Snipe-IT | Upload a sheet of assets (and employees); preview, validate every row, show row errors, then create in one transaction. Downloadable template. | Medium | papaparse + xlsx are already installed. Reuse `assetCreateSchema`; serial duplicates reported per row. Writes REGISTERED history per asset. |
| 2 | **Physical audit / stock check** | Snipe-IT "Audit" | Start an audit for a location → scan QR codes to mark assets verified → report of verified / not found / found in the wrong location. Each asset shows last audited date and next audit due. | Medium | New `Audit` + `AuditItem` models, `Asset.lastAuditedAt`, history event `AUDITED`. Uses the existing scanner. Setting: audit interval (months). |
| 3 | **Depreciation and current value** | Snipe-IT "Current Value" | Straight-line depreciation from purchase cost over a useful life per category (e.g. laptop 36 months). Current value on the asset page; book value vs purchase value on the dashboard and in reports. | Small | Add `AssetCategory.usefulLifeMonths` (+ optional salvage %). Computed, not stored. |
| 4 | **Bulk actions on the asset list** | Snipe-IT | Row checkboxes → print QR labels together (A4 sheet), export selected, change location in bulk. | Medium | Bulk label sheet is the most valuable part. Bulk location change goes through the asset service (history per asset). |
| 5 | **Before → after in history** | InvGate timeline | "Location: Chennai HQ → Coimbatore" instead of "Updated location". | Small | `updateAsset` already computes changed fields; store `{ field, from, to }` in `AssetHistory.metadata` and render it in `<Timeline>`. |

## Later (nice to have)

| # | Feature | Seen in | What it is | Effort |
|---|---|---|---|---|
| 6 | Specs per asset (RAM, CPU, storage, MAC/IMEI, OS) | Snipe-IT custom fields | A small spec template per category, filterable ("laptops with 8 GB RAM"). | Medium |
| 7 | Attachments (invoice, warranty card PDF) | Snipe-IT "Files" | Files tab on the asset; private bucket, PDF allowed, signed URLs like photos. | Small |
| 8 | Clone asset | Snipe-IT | "Register a copy" pre-fills the form; only the serial changes. | Small |
| 9 | Find by asset tag in the top bar | Snipe-IT | Type `AST-LAP-0004` on any page and jump to it. | Small |
| 10 | More dashboard tiles | Lansweeper, Snipe-IT | New in last 7 days, out of warranty, recent activity table. | Small |
| 11 | Overdue return reminders | Common | Daily job notifies employee and manager when the expected return date has passed. | Small |
| 12 | Asset models and manufacturers | Snipe-IT, InvGate | Model as its own record (manufacturer, model no., default specs, image) shared by many assets. | Medium |
| 13 | Column chooser and rows per page on lists | Snipe-IT | Show/hide columns, 15/50/100 rows. | Small |

## Bigger ideas (future / presentation talking points)

- **Software licenses, accessories and consumables** as separate modules (seats, expiry, stock levels).
- **SLA and due dates on requests**: response/resolve timers, overdue highlighting (service-desk style).
- **Self-service catalogue**: employees browse requestable items and request one.
- **Email notifications** in addition to in-app (needs a free-tier email provider).
- **"In transit" / sub-status** for assets moving between locations (needs a state machine change).

## Out of scope

Lansweeper-style network discovery, software inventory, OS end-of-life and vulnerability scanning: these need
agents or scanners on every device, which isn't realistic for this project.
