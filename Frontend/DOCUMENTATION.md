# ShareTrade P2P — Project Documentation

## What Is ShareTrade P2P?

A **private share trading platform** for Cameroon — a peer-to-peer marketplace where investors buy and sell shares in private companies, with escrow-protected transactions, company-verified transfers, KYC identity verification, and automated share certificates.

---

## Technology Stack

### Languages Used

| Layer | Language / Technology | Purpose |
|---|---|---|
| Structure | **HTML5** | Every page is a `.html` file — layout, content, semantic structure |
| Styling | **CSS3** (custom, via `shared.css`) | All visual design — colours, layout, animations, dark/light mode |
| Logic | **Vanilla JavaScript** | Theme toggle, tab switching, form validation, slideshow, particle canvas |
| Graphics | **SVG (inline)** | Charts — area graphs, bar charts, candlestick patterns, donut charts |
| Fonts | **Google Fonts** (CDN) | Syne (headings) + DM Sans (body text) |
| Icons | **Font Awesome 6** (CDN) | All icons — navigation, badges, buttons, status indicators |

> **No frameworks.** No React, Vue, Angular or jQuery. No backend. No database.  
> This is a **pure front-end prototype** — all data is hardcoded HTML.

---

## File Structure

```
outputs/
│
├── index.html              ← Landing page
├── login.html              ← Authentication page
├── register.html           ← Registration (Investor + Company flows)
│
├── investor/               ← Investor dashboard & pages
│   ├── shared.css          ← Master stylesheet (722 lines, used by all)
│   ├── dashboard.html
│   ├── portfolio.html
│   ├── trades.html
│   ├── marketplace.html
│   ├── wallet.html
│   ├── history.html
│   ├── certificates.html
│   ├── kyc.html
│   ├── notifications.html
│   └── settings.html
│
├── company/                ← Company dashboard & pages
│   ├── shared.css
│   ├── dashboard.html
│   ├── analytics.html
│   ├── approvals.html
│   ├── captable.html
│   ├── listings.html
│   ├── buybacks.html
│   ├── transactions.html
│   ├── documents.html
│   ├── certificates.html
│   ├── profile.html
│   └── settings.html
│
└── admin/                  ← Admin dashboard & pages
    ├── shared.css
    ├── dashboard.html
    ├── analytics.html
    ├── alerts.html
    ├── kyc.html
    ├── investors.html
    ├── companies.html
    ├── suspended.html
    ├── trades.html
    ├── escrow.html
    ├── disputes.html
    ├── settings.html
    ├── auditlogs.html
    └── maintenance.html
```

**Total: 37 HTML pages + 3 copies of shared.css**

---

## Architecture: How Pages Are Built

### 1. Master Stylesheet (`shared.css`)

One 722-line CSS file shared by all 34 inner pages via:
```html
<link rel="stylesheet" href="../shared.css">
```

It contains:
- **CSS Variables** for the entire colour system — both dark and light themes
- **Layout** — sidebar, topbar, main content area
- **Components** — cards, tables, badges, buttons, forms, tabs, modals
- **Utility classes** — flex helpers, typography, spacing, animations
- **Responsive breakpoints** — 1300px, 900px, 768px, 480px

### 2. Dark / Light Theme System

Implemented entirely in CSS using `[data-theme]` attribute on `<html>`:

```css
[data-theme="dark"]  { --bg:#070d07; --text:#f0faf0; --card:#0f1a0f; ... }
[data-theme="light"] { --bg:#f0faf0; --text:#0a1a0a; --card:#ffffff; ... }
```

Every colour in the UI uses a CSS variable (`var(--green)`, `var(--text2)`, etc.).  
The toggle button runs this JavaScript on every page:

```javascript
const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
html.setAttribute('data-theme', next);
localStorage.setItem('st-theme', next);   // persists across page loads
```

### 3. Page Template

Every inner page follows this skeleton:

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <!-- Google Fonts: Syne + DM Sans -->
  <!-- Font Awesome 6 icons -->
  <!-- shared.css -->
</head>
<body>                         ← display:flex

  <aside class="sidebar">      ← fixed, 240px wide
    <!-- logo, user info, nav links -->
  </aside>

  <div class="main">           ← margin-left:240px, flex:1
    <header class="topbar">    ← sticky top, blurred backdrop
      <!-- page title, theme toggle, notification bell -->
    </header>

    <main class="content">     ← padding:1.75rem 2rem
      <!-- page-specific content -->
    </main>
  </div>

  <script><!-- theme + tab logic --></script>
</body>
</html>
```

### 4. SVG Charts

All charts are hand-coded SVG — no chart library needed:

**Area chart** (portfolio performance, share price history):
```svg
<path d="M0,100 C60,93 ... L520,8 L520,120 L0,120Z" fill="url(#gradient)"/>
<path d="M0,100 C60,93 ... L520,8" stroke="#22c55e" stroke-width="2.5"/>
```

**Bar chart** (monthly volume):
```svg
<rect x="4" y="30" width="36" height="70" rx="3" fill="var(--green)"/>
```

**Donut chart** (allocation):
```svg
<circle r="46" stroke="#22c55e" stroke-width="18"
  stroke-dasharray="173 289" stroke-dashoffset="-72"/>
```

### 5. Animated Canvas Background (Login & Register)

Uses the browser's `<canvas>` API + `requestAnimationFrame`:
- Generates floating particles that bounce off edges
- Draws connecting lines between particles within 160px
- Radial gradient "glow blobs" for atmospheric depth
- Redraws on every animation frame (~60fps)
- Colour adapts to dark/light theme

---

## Colour Palette

| Name | Dark Mode | Light Mode | Usage |
|---|---|---|---|
| `--green` | `#22c55e` | `#22c55e` | Primary accent, buttons, icons |
| `--green-dark` | `#16a34a` | `#16a34a` | Button gradients, active states |
| `--green-light` | `#4ade80` | `#4ade80` | Positive P&L, up indicators |
| `--bg` | `#070d07` | `#f0faf0` | Page background |
| `--card` | `#0f1a0f` | `#ffffff` | Card/panel background |
| `--text` | `#f0faf0` | `#0a1a0a` | Primary text |
| `--text2` | `#7a9e7a` | `#3a6a3a` | Secondary text, labels |
| `--text3` | `#4a6a4a` | `#7aaa7a` | Muted text, timestamps |
| `--border` | `rgba(255,255,255,.07)` | `rgba(0,0,0,.07)` | Card borders |
| `--red` | `#ef4444` | `#ef4444` | Danger, rejected, SELL |
| `--amber` | `#f59e0b` | `#f59e0b` | Warnings, pending |
| `--blue` | `#3b82f6` | `#3b82f6` | Info, deposits |

---

## Typography

| Font | Weight | Used For |
|---|---|---|
| **Syne** | 400, 600, 700, 800 | All headings, stat values, card titles, nav logo |
| **DM Sans** | 300, 400, 500, 600 | All body text, labels, table content, buttons |

Both loaded from Google Fonts CDN in every page `<head>`.

---

## CSS Class System (key classes)

### Layout
```
.sidebar          Fixed left panel (240px)
.main             Content area (margin-left: 240px)
.topbar           Sticky header with backdrop blur
.content          Main content padding
```

### Grid System
```
.stats-grid       4-column responsive stat cards
.grid-2           2-column equal grid
.grid-3           3-column equal grid
.grid-3-2         3fr + 2fr split
.grid-2-1         2fr + 1fr split
.form-row-2       2-column form row
.form-row-3       3-column form row
```

### Components
```
.card             White/dark card panel with border
.card-header      Card title row
.card-body        Card content padding
.stat-card        Metric card with icon, label, value, change
.badge            Inline status pill (badge-green/amber/red/blue)
.btn              Base button
.btn-primary      Green gradient button
.btn-outline      Ghost border button
.btn-danger       Red danger button
.data-table       Striped hover table
.tab-bar          Horizontal tab navigation
.tab              Individual tab (active state on click)
.search-bar       Search input with magnifier icon
.banner           Full-width alert banner (warning/error/success)
.nav-item         Sidebar navigation link
.nav-badge        Red/amber/green count pill on nav items
```

### Animation
```
.fade-in          0.5s ease fadeInUp (no delay)
.fade-in-2        0.5s ease fadeInUp (0.1s delay)
.fade-in-3        0.5s ease fadeInUp (0.2s delay)
.live-dot         Pulsing green dot (for live indicators)
```

### Charts & Specialised
```
.cert-card        Share certificate card (green top border)
.cert-icon        Certificate icon circle
.company-card     Marketplace company card
.escrow-item      Escrow tracker item
.metric-row       Progress bar row
.metric-bar       Grey progress track
.metric-fill      Green filled progress
.notif-row        Notification feed row
.notif-icon       Coloured notification icon circle
.unread-dot       Green unread indicator dot
.upload-zone      File drag-and-drop upload area
.toggle           Toggle switch (checkbox)
```

---

## Pages by Role

### Investor (10 pages)

| Page | Key Features |
|---|---|
| `dashboard.html` | Portfolio value, KYC banner, quick actions, area chart, holdings, recent trades, marketplace preview |
| `portfolio.html` | Full holdings table, performance chart, allocation donut, sector bars |
| `trades.html` | Trade history table, status tabs, escrow tracker, trade summary metrics |
| `marketplace.html` | Company cards grid, filter by sector/city/price, buy shares CTA |
| `wallet.html` | Balance stats, transaction list, deposit form (MTN/Orange/Bank), withdrawal form |
| `history.html` | Full ledger table, date range filter, category tabs, deposit/trade/escrow totals |
| `certificates.html` | Card + table toggle view, downloadable certificate cards, stat summary |
| `kyc.html` | Document checklist, upload CTAs for missing docs, access limit table |
| `notifications.html` | Feed with unread dots, per-notification action links, preference toggles |
| `settings.html` | Profile form, password change, notification toggles, dark mode toggle, danger zone |

### Company (11 pages)

| Page | Key Features |
|---|---|
| `dashboard.html` | Share capital stats, pending approvals queue, share price chart, cap table, recent trades, document compliance |
| `analytics.html` | Share price history, monthly volume bars, investor distribution, top shareholders |
| `approvals.html` | Trade approval cards (Confirm / Reject / Request Info), investor details, escrow status |
| `captable.html` | Full shareholder registry table, ownership breakdown bars, donut chart |
| `listings.html` | Active/past listings table, create-listing form with all fields |
| `buybacks.html` | Program stats, active program progress bars, buyback history table |
| `transactions.html` | Full ledger with type filter, volume breakdown bars, monthly chart |
| `documents.html` | All 9 Cameroon company documents, validity status, renew/upload CTAs |
| `certificates.html` | Certificate cards + table view, issued cert registry |
| `profile.html` | Company info form, address, legal representative, verification status |
| `settings.html` | Password change, approval rules toggles, notification prefs, appearance |

### Admin (13 pages)

| Page | Key Features |
|---|---|
| `dashboard.html` | Platform stats, monthly volume chart, system health, feature flag toggles, KYC queue, live activity feed, disputes |
| `analytics.html` | User growth chart, volume bars, YTD totals, top companies table |
| `alerts.html` | Prioritised alert feed, severity stats, unread dots, colour-coded risk |
| `kyc.html` | KYC review cards with doc checklist chips, Approve/Reject/View/Request Info actions |
| `investors.html` | Investor registry table, KYC/status filter, suspend action |
| `companies.html` | Company registry table, sector filter, review/suspend actions |
| `suspended.html` | Suspension cards with reason, risk level, policy explanation, reinstate/ban actions |
| `trades.html` | Full platform trade ledger, status filter, completion rate stats |
| `escrow.html` | Active escrow holds table, frozen dispute flags, total locked stats |
| `disputes.html` | Dispute cards with evidence, Rule for Investor/Company actions, mediation status |
| `settings.html` | Feature flags, trading limits form, admin password, email/SMTP config |
| `auditlogs.html` | Timestamped audit trail, actor/action/target/IP/result, actor breakdown bars |
| `maintenance.html` | Service status indicators, resource usage meters, maintenance action buttons |

---

## Public Pages (root level)

### `index.html` — Landing Page
- Fixed frosted-glass navbar with dark/light toggle
- Hero section with **4-slide auto-advancing slideshow** (SVG financial graphics on dark green backgrounds, 5s interval, clickable dots)
- Stats bar (500+ companies, 50K+ investors, $100M+ volume, 99.9% uptime)
- Features section (6 cards)
- About Us section (story text + 4 value cards)
- Footer with contact info

### `login.html` — Authentication
- Two-panel layout: branding (left) + form (right)
- **Animated particle canvas background** — green dots connected by lines, ambient glow blobs, 60fps
- Single form: email + password (no role selector — credentials determine access)
- Password show/hide toggle
- Theme toggle (top-right corner)
- Demo routing by email prefix (admin@... → admin, company@... → company, else investor)

### `register.html` — Registration
- Same animated canvas background as login
- Role toggle: **Investor** or **Company**
- **Investor flow**: Personal info + KYC document uploads (Passport, CNI front/back, Proof of Address, Selfie with ID)
- **Company flow**: Company info (RCCM, NIU, legal form, capital), address (10 Cameroon regions, major cities), legal representative, **8 required Cameroon company documents** (RCCM cert, Statuts, NIU attestation, Attestation de Localisation, Plan de Localisation, PV d'Assemblée Constitutive, Rep ID, Patente, OHADA deed)
- Drag-and-drop file upload zones with filename confirmation

---

## How Navigation Works

Every page sidebar links to sibling pages using **relative paths**:
```html
<a href="portfolio.html">Portfolio</a>
<a href="../index.html">Home</a>
<a href="../login.html">Sign Out</a>
```

The active page highlights its nav item:
```html
<a class="nav-item active" href="portfolio.html">Portfolio</a>
```

---

## How the Theme Persists

Every page runs this on load:
```javascript
var t = localStorage.getItem('st-theme') || 'dark';
document.documentElement.setAttribute('data-theme', t);
```

And saves on toggle:
```javascript
localStorage.setItem('st-theme', next);
```

`localStorage` is browser storage that survives page navigation and refresh.

---

## Cameroon-Specific Details

The platform is localised for Cameroon:

- **Currency**: XAF (Central African Franc)
- **Phone format**: +237 prefix
- **Cities**: Yaoundé, Douala, Bafoussam, Garoua, Maroua, Bertoua, Ebolowa, Buea, Limbé
- **Regions**: All 10 Cameroon regions (Centre, Littoral, Ouest, Nord, Extrême-Nord, Adamaoua, Est, Sud, South West, North West)
- **Legal forms**: SA, SARL, SAS, SNC, GIE, SE, Établissement (OHADA types)
- **Company documents**: RCCM (Registre du Commerce et du Crédit Mobilier), NIU (DGI), Attestation de Localisation, Plan de Localisation, PV d'Assemblée Constitutive, Patente, Acte OHADA
- **Payment methods**: MTN Mobile Money, Orange Money, Express Union, Afriland First Bank transfer, Western Union
- **Company example**: RC/YAO/2021/B/04512 (real RCCM format)

---

## What Is NOT Yet Built

This is a **front-end prototype only**. To make it a real application, you would need to add:

1. **Backend / API** — A server (Node.js, Django, Laravel, etc.) to handle:
   - User authentication and session management
   - Real data storage (database like PostgreSQL or MongoDB)
   - File uploads for KYC and company documents
   - Escrow logic and payment gateway integration
   - Email/SMS notifications
   - Certificate PDF generation

2. **Real-time features** — WebSocket connections for live notifications and trade status updates

3. **Payment integration** — MTN Mobile Money API, Orange Money API, or a payment gateway like CinetPay (which covers Cameroon)

4. **Security** — HTTPS, CSRF protection, input validation, rate limiting, encryption

5. **Admin authentication** — Currently any URL can be accessed directly; needs real role-based access control

---

## Build Methodology

All inner pages were generated using a **Python code generator** (`generate_pages.py`), which:

1. Defines helper functions (`card()`, `tbl()`, `btn()`, `sc()`, etc.) that produce reusable HTML snippets
2. Defines sidebar builders for each role (investor / company / admin) that automatically mark the active page
3. Defines topbar, page header and content builders
4. Assembles full pages from these building blocks
5. Writes all 31 pages to disk in one run

This approach ensures:
- **Consistency**: every page has identical sidebar, topbar structure and theme system
- **Speed**: all 31 pages generated in under 1 second
- **Maintainability**: change the sidebar once, all pages update

The three dashboards (`dashboard.html` for each role) were written directly with full inline CSS for richer visual complexity, then patched to also reference `shared.css`.
