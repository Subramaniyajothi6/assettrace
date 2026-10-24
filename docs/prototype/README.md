# AssetTrace — clickable UI prototype

Interactive prototype of **AssetTrace**, a company asset lifecycle management system: register, assign, transfer, repair, return, inspect and retire company equipment, with a full history of who did what and when.

**Live demo:** https://subramaniyajothi6.github.io/assettrace-design/

## How to review it

1. Open the link and pick a demo account on the sign-in page (Admin, Asset manager or Employee). Any password works.
2. Use the **Style** button (bottom right) to switch the whole app between 8 design directions:
   Warm pill · Corporate · Ledger · Midnight ops · Bento · Swiss · Neo-brutal · Nordic calm.
   Warm pill, Corporate and Nordic also have a dark mode.
3. The same panel lets you **view as** another role, and **reset demo data**.

Everything you click works and is saved in your browser, so you can follow an asset through its whole life:

> Register asset → Assign → Employee signs handover → Report issue → Maintenance → Return → Inspection → Retire

## Pages (31 screens)

| Area | Pages |
|---|---|
| Shared | Sign in · Scan QR (with access rules) · Notifications · Profile |
| Asset manager | Dashboard · Assets · Asset detail & history · Register / edit asset · Assign asset · Assignments · Transfers · Requests · Issue board · Maintenance · Returns · Receive return · Inspection · Retire · Employees · Reports & export |
| Employee | Home · My assets · Confirm handover (with signature) · Report issue · My requests · My asset history |
| Admin | Dashboard · Users & roles · Master data (departments, locations, categories, vendors) · Settings |

## Business rules shown in the prototype

- Only Available or Reserved assets can be assigned; one active assignment per asset.
- Returned assets must be inspected before they can be assigned again.
- Assigned assets can't be retired; retired assets are read-only but stay in history and reports.
- Duplicate serial numbers are rejected; warranty end must be after warranty start.
- Managers only see their departments' assets; employees only see their own.
- Every action is written to the asset's history timeline and notifies the right people.

## Run locally

No build step. Serve the folder with any static server:

```bash
npx serve .
# or
python3 -m http.server 8000
```

then open http://localhost:8000.

## Tech

Plain HTML, CSS and JavaScript (no framework), Google Fonts, and [qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator) (MIT) for QR labels.
