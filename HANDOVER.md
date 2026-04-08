# EIGHTY PLUS SKU Manager — Handover Document

> **Version:** 2.0 (Price Intelligence)
> **Date:** 2026-04-07
> **Production URL:** https://eightyplus-sku-manager.netlify.app
> **Repository:** https://github.com/nanaseco-sudo/eightyplus-sku

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [File Inventory](#3-file-inventory)
4. [Environment & Credentials](#4-environment--credentials)
5. [Data Model](#5-data-model)
6. [Feature Details](#6-feature-details)
7. [Development History & Decisions](#7-development-history--decisions)
8. [Deployment Guide](#8-deployment-guide)
9. [New Environment Setup](#9-new-environment-setup)
10. [Known Issues & Limitations](#10-known-issues--limitations)
11. [Phase 2-3 Roadmap](#11-phase-2-3-roadmap)
12. [QA Checklist](#12-qa-checklist)
13. [Appendix: Full Conversation Log](#13-appendix-full-conversation-log)

---

## 1. Project Overview

### What is it?

A single-page web application for managing **green coffee SKU codes** at EIGHTY PLUS (Thailand-based specialty coffee importer operating in TH/MY/ID/PH markets). The app generates standardized 8-character SKU codes, tracks pricing across 4 markets, and now includes a **Price Intelligence** module for competitive price comparison.

### Who uses it?

- **Operations team** — Register and manage SKUs for green coffee products
- **Sales team** — Look up SKU codes, prices, and export data
- **Management** — Price Intelligence for competitive analysis across 4 ASEAN markets

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Single HTML file (vanilla JS, CSS, no framework) |
| Backend | Netlify Functions (serverless Node.js) |
| Database | Notion API (cloud) + localStorage (client cache) |
| Hosting | Netlify (auto-deploys from CLI) |
| External libs | SheetJS (xlsx.full.min.js) for Excel import/export |
| Fonts | Google Fonts: Montserrat, JetBrains Mono, Noto Sans KR |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────┐
│                   Browser                        │
│  ┌─────────────────────────────────────────────┐│
│  │  index.html (single file)                   ││
│  │  ├─ CSS (~300 lines)                        ││
│  │  ├─ HTML structure (~40 lines)              ││
│  │  └─ JavaScript (~2250 lines)                ││
│  │     ├─ Data Layer (DB, KEYS, defaults)      ││
│  │     ├─ Notion Sync Layer (SYNC object)      ││
│  │     ├─ State Management                     ││
│  │     ├─ Tab Rendering (6 tabs)               ││
│  │     ├─ SKU Generator Logic                  ││
│  │     ├─ Registry (table, filters, export)    ││
│  │     ├─ Settings (master data CRUD)          ││
│  │     ├─ Admin (advanced CRUD, backup)        ││
│  │     ├─ Price Intelligence (NEW)             ││
│  │     └─ Utilities (toast, modal, etc.)       ││
│  └─────────────────────────────────────────────┘│
│           │                    ▲                  │
│  localStorage              SheetJS               │
│  (primary store)           (Excel parse/write)   │
└───────────┼──────────────────────────────────────┘
            │ fetch()
┌───────────▼──────────────────────────────────────┐
│        Netlify Functions                          │
│  ┌───────────────────┐                            │
│  │ skus.js           │  GET / POST / DELETE       │
│  │ (@notionhq/client)│                            │
│  └─────────┬─────────┘                            │
└────────────┼─────────────────────────────────────┘
             │ Notion API
┌────────────▼─────────────────────────────────────┐
│           Notion Database                         │
│  DB: e959b50638c54fb09ab7c6f7faf30378             │
│  Collection: ba343836-e017-4f84-bc51-632aeb62a0ca│
│  22 SKUs, 20+ properties                          │
└──────────────────────────────────────────────────┘
```

### Data Flow

1. **App loads** → `initData()` seeds localStorage with defaults if empty
2. **Notion sync** → `SYNC.init()` fetches all SKUs from Notion, overwrites localStorage
3. **User actions** → Create/delete SKUs updates both localStorage AND Notion
4. **Price Intel** → Competitor data stored only in localStorage (Phase 1)
5. **Offline mode** → If Notion unreachable, app works with localStorage only

---

## 3. File Inventory

```
D:/claude/sku-generator/
├── index.html                          # THE APP (2591 lines, single file)
├── netlify.toml                        # Netlify build config
├── package.json                        # Dependencies (@notionhq/client)
├── package-lock.json                   # Lock file
├── .gitignore                          # node_modules/, .netlify/, .env
├── seed.js                             # One-time script: pushed initial 21 SKUs to Notion
├── migrate.js                          # One-time script: split Region/Process fields (v2.0)
└── netlify/
    └── functions/
        └── skus.js                     # Serverless function: Notion API proxy
```

### File Details

#### `index.html` (2591 lines)

The entire application in one file. Sections:

| Line Range | Section |
|------------|---------|
| 1-8 | Head, meta, external scripts |
| 9-297 | CSS (all styles including Price Intel) |
| 298-309 | HTML body structure (header, tabs, content divs) |
| 310-320 | Data Layer (STORAGE_PREFIX, KEYS, DB object) |
| 321-480 | Notion Sync Layer (SYNC object with init/create/delete/buildPayload) |
| 481-573 | Default Data (countries, grades, pack sizes, suppliers, regions, brands, processes, grading specs, markets) |
| 574-600 | initData(), state object |
| 601-650 | Helpers & Tab Switching |
| 651-730 | Dashboard rendering |
| 731-960 | Generator (form, SKU preview, register logic) |
| 961-1230 | Registry (table, filters, sort, pagination) |
| 1231-1370 | CSV/Excel Export |
| 1371-1550 | CSV Bulk Import |
| 1551-1650 | Excel Export (3-sheet workbook) |
| 1651-1800 | Settings (8 master data sections) |
| 1801-1900 | Admin (full CRUD, backup/restore) |
| 1901-2500 | **Price Intelligence** (market switcher, comparison, competitor CRUD, upload, mapping) |
| 2501-2591 | Modal, Toast, Manual Sync, Seed, Init |

#### `netlify/functions/skus.js` (153 lines)

Serverless Notion proxy. Methods:
- **GET** — Query all SKUs from Notion DB, paginated (100/page)
- **POST** — Create one or bulk SKUs (with 350ms rate limit between items)
- **DELETE** — Archive a SKU by notionId

Environment variables used:
- `NOTION_TOKEN` — Notion integration token
- `NOTION_DB_ID` — Notion database ID

#### `seed.js` (54 lines)

One-time script to push initial 21 SKUs to Notion via HTTPS POST to the Netlify function. **Already executed, do not run again.**

#### `migrate.js` (120 lines)

One-time migration script that updated existing 22 SKUs in Notion:
- Split Region field → Region + Brand/Farm (moved culturing/competition names to Brand Farm)
- Split Process field → Process + Grading Spec (e.g., "Natural G1" → Process: "Natural", Grading Spec: "G1")
- Renamed "Infusion" → "Infused" in Process fields

**Already executed on 2026-04-07. Do not run again.**

---

## 4. Environment & Credentials

### Netlify

| Item | Value |
|------|-------|
| Site name | eightyplus-sku-manager |
| Production URL | https://eightyplus-sku-manager.netlify.app |
| Account | Connected via Netlify CLI |

### Netlify Environment Variables

Set these in Netlify Dashboard → Site → Environment Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `NOTION_TOKEN` | `ntn_****` (see Netlify env vars) | Notion integration token — DO NOT commit |
| `NOTION_DB_ID` | (see Netlify env vars) | Notion database ID — DO NOT commit |

> **Phase 2 will add:** `ANTHROPIC_API_KEY` for AI-powered price list parsing

### Notion

| Item | Value |
|------|-------|
| Database ID | `e959b50638c54fb09ab7c6f7faf30378` |
| Collection ID | `ba343836-e017-4f84-bc51-632aeb62a0ca` |
| Integration | Internal integration with read/write access to the SKU database |

### GitHub

| Item | Value |
|------|-------|
| Repository | https://github.com/nanaseco-sudo/eightyplus-sku |
| Branch | main |

---

## 5. Data Model

### 5.1 SKU Code Structure

```
E T C A 6 5 0 1
│ │ │ │ │ │ │ │
│ │ │ │ └─┴─┴─┘ Running number (01-99, per supplier)
│ │ │ │
│ │ │ └── Supplier code (2 chars, 01-76)
│ │ │
│ │ └── Pack size code (A-O)
│ │
│ └── Grade code (C/R/X/Y/Z/M/D)
│
└── Country code (2 chars, ISO-based)
```

LOT Number format: `80-XXXX` (auto-incrementing)

### 5.2 localStorage Keys

All prefixed with `changco_sku_`:

| Key | Type | Description |
|-----|------|-------------|
| `countries` | Array | Origin countries with `{id, name, code, active, sortOrder}` |
| `grades` | Array | Quality grades: COMMERCIAL(C), SPECIALTY(R), EXOTIC(X), GEISHA(Y), COMPETITION(Z), Merchandise(M), DISCOVERY(D) |
| `packSizes` | Array | Pack types: Bag 30-70, Box 20-30, Pack 1-10, ITEM/PCS |
| `suppliers` | Array | 76 suppliers with 2-char codes |
| `regions` | Array | 37 origin regions (Guji, Yirgacheffe, Sidama, etc.) |
| `brandFarms` | Array | 17 brands/farms (Niu Culturing, Finca Deborah, etc.) |
| `processes` | Array | 20 processing methods (Washed, Natural, Anaerobic, etc.) |
| `gradingSpecs` | Array | 32 grading standards (G1-G5, SHB, AA, AB, etc.) |
| `skus` | Array | All SKU records |
| `settings` | Object | `{nextLotNumber, adminPassword}` |
| `markets` | Array | 4 markets: TH, MY, ID, PH |
| `competitors` | Array | Competitor profiles per market |
| `competitorPrices` | Array | Extracted competitor price records |
| `priceIntelSettings` | Object | Exchange rates, market strategies |

### 5.3 SKU Record Schema

```javascript
{
  id: "uuid",
  notionId: "notion-page-id",        // null if local-only
  skuCode: "ETCA6501",               // 8-char generated code
  lotNumber: "80-0013",              // auto-increment
  countryId: "uuid",                 // FK → countries
  gradeId: "uuid",                   // FK → grades
  packSizeId: "uuid",               // FK → packSizes
  supplierId: "uuid",               // FK → suppliers
  regionId: "uuid",                 // FK → regions (optional)
  brandFarmId: "uuid",              // FK → brandFarms (optional)
  processId: "uuid",                // FK → processes (optional)
  process2Id: "uuid",               // FK → processes, secondary (optional)
  gradingSpecId: "uuid",            // FK → gradingSpecs (optional)
  description: "auto-generated",     // from linked entities
  saleName: "custom marketing name", // optional
  notes: "",                         // optional
  costPrice: 450,                    // number or null (THB, HQ cost)
  sellingPrice: 520,                 // number or null (TH market, backward compat)
  currency: "THB",                   // default currency
  marketPrices: {                    // NEW in v2.0
    TH: { sellingPrice: 520, currency: "THB" },
    MY: { sellingPrice: 68, currency: "MYR" },
    ID: { sellingPrice: 115000, currency: "IDR" },
    PH: { sellingPrice: 780, currency: "PHP" }
  },
  createdAt: "ISO date"
}
```

### 5.4 Notion Database Properties

| Property | Type | Notes |
|----------|------|-------|
| SKU Code | Title | Primary key, 8-char |
| LOT Number | Rich Text | 80-XXXX |
| Country | Select | 43 options |
| Country Code | Rich Text | 2-char ISO |
| Grade | Select | 7 options |
| Grade Code | Rich Text | 1 char |
| Pack Size | Select | 15 options |
| Pack Code | Rich Text | 1 char |
| Supplier | Rich Text | Name |
| Supplier Code | Rich Text | 2 chars |
| Region | Rich Text | |
| Brand Farm | Rich Text | Added in v2.0 migration |
| Process | Rich Text | |
| Process 2 | Rich Text | Added in v2.0 migration |
| Grading Spec | Select | 32 options, added in v2.0 migration |
| Description | Rich Text | Auto-generated |
| Sale Name | Rich Text | Marketing name |
| Notes | Rich Text | |
| Cost Price | Number | THB |
| Selling Price | Number | THB |
| Currency | Select | THB/USD/EUR/etc. |
| Registered | Date | Created timestamp |

### 5.5 Competitor Price Record Schema

```javascript
{
  id: "uuid",
  competitorId: "uuid",              // FK → competitors
  uploadBatchId: "uuid",             // groups records from same upload
  uploadDate: "ISO date",
  rawProductName: "Ethiopia Yirgacheffe Natural G1",
  rawPrice: 450,
  rawCurrency: "THB",
  rawUnit: "kg",
  country: "Ethiopia",               // normalized
  region: "Yirgacheffe",
  process: "Natural",
  gradingSpec: "G1",
  category: "COMMERCIAL",            // mapped to 80+ grade
  pricePerKg: 450,                   // normalized
  currency: "THB"
}
```

### 5.6 Market Strategy Schema

```javascript
{
  exchangeRates: {
    baseCurrency: "USD",
    rates: { THB: 34.5, MYR: 4.45, IDR: 15800, PHP: 56.2 },
    updatedAt: "ISO date"
  },
  marketStrategies: {
    TH: { strategy: "premium", multiplier: 1.15 },
    MY: { strategy: "competitive", multiplier: 0.95 },
    ID: { strategy: "penetration", multiplier: 0.85 },
    PH: { strategy: "parity", multiplier: 1.00 }
  }
}
```

---

## 6. Feature Details

### 6.1 Dashboard

- 4 stat cards: Total SKUs, Active Suppliers, This Month count, Latest SKU code
- Top Countries bar chart (CSS-based, no external lib)
- Grade distribution breakdown
- Recent registrations list (latest 8)

### 6.2 Generator

- **Required fields:** Country, Grade, Pack Size, Supplier
- **Optional fields:** Region, Brand/Farm, Process 1 (Primary), Process 2 (Secondary), Grading Spec, Sale Name, Notes
- **Price fields:** Cost Price, Selling Price (TH), Market Prices (MY/ID/PH collapsible section)
- **Auto-generation:** SKU code built from field codes, LOT auto-incremented
- **Real-time preview:** SKU code segments highlighted in branded card
- **On register:** Saves to localStorage + async Notion sync

### 6.3 Registry

- Full table with 14+ columns (SKU, LOT, Country, Grade, Pack, Supplier, Region, Brand/Farm, Process, Grading, Sale Name, Cost, Sell, Date)
- Filters: search text, country dropdown, grade dropdown, supplier dropdown
- Sorting: clickable headers with asc/desc toggle
- Pagination: 20/50/100/All per page
- CSV export, CSV bulk import (with template), Excel export (3-sheet workbook)
- Admin mode adds Delete button per row

### 6.4 Settings

8 collapsible master data sections:
1. Countries (43 items, with ISO codes)
2. Grades/Categories (7 items, with letter codes)
3. Pack Sizes (15 items, with letter codes)
4. Suppliers (76 items, with 2-char codes)
5. Regions (37 items)
6. Brands/Farms (17 items)
7. Processes (20 items)
8. Grading Specs (32 items)

Each section supports: Add new, Edit inline, Toggle active, Delete (with SKU reference check).

### 6.5 Admin

- Password-protected (default: `changco2026`)
- Full CRUD on all entity types
- Data backup (JSON download) and restore (JSON upload)
- Reset to Defaults button
- Seed to Notion function (one-time)

### 6.6 Price Intelligence (NEW — Phase 1)

**Market Switcher:** 5 pill buttons — 🇹🇭 TH | 🇲🇾 MY | 🇮🇩 ID | 🇵🇭 PH | 🌐 Cross-Market

**Stats Dashboard:** Categories Tracked, Competitors count, Price Points, Last Updated

**Actions:**
- **📤 Upload Price List** — 3-step modal:
  1. Select competitor + drag/drop Excel/CSV file
  2. Column mapping with auto-guess (product name, country, region, process, grade, price, currency, unit)
  3. Preview extracted records → Confirm to save
- **🏢 Manage Competitors** — Per-market CRUD. Fields: name, type (Roaster/Importer/Trader)
- **💱 Exchange Rates** — USD base rate for all 4 currencies (manual update)

**Comparison Table:** Grouped by Country + Category, showing:
- Eightyplus average selling price for selected market
- Each competitor's average price
- Market average
- Gap % (green = cheaper, red = more expensive)
- Visual bar chart per row

**Filters:** Country, Category, Competitor dropdowns

**Cross-Market view:** Placeholder directing users to upload data per individual market first.

---

## 7. Development History & Decisions

### 7.1 Timeline

| Date | Milestone |
|------|-----------|
| 2026-03-15 | v1.0 — Initial SKU Manager with Generator, Registry, Settings |
| 2026-03-20 | Notion backend integration via Netlify Functions |
| 2026-03-26 | seed.js — Pushed 21 initial SKUs to Notion |
| 2026-04-07 | v2.0 — Field separation (Region/Brand Farm, Process/Grading Spec) |
| 2026-04-07 | v2.0 — Notion DB schema update (3 new properties) |
| 2026-04-07 | v2.0 — Migration of 22 existing SKUs (14 updated) |
| 2026-04-07 | v2.1 — Price Intelligence Phase 1 (multi-market, competitors, upload) |

### 7.2 Key Design Decisions

#### Decision 1: Single HTML file architecture

**Why:** Rapid prototyping, zero build tooling, easy deployment. The team can edit one file and push. At ~2600 lines it's still manageable. Consider splitting if it exceeds 4000 lines.

#### Decision 2: localStorage as primary store

**Why:** Instant load, offline capability, no server dependency for master data. Notion is the cloud persistence layer synced on app load. If Notion is down, app still works.

#### Decision 3: Region / Brand Farm separation

**Team feedback:** "Brand 와 Region 을 나누어 달라는 말 같아" — Combined Region field had mixed values (actual regions like "Guji" alongside brand names like "Niu Culturing"). Separated into distinct fields for cleaner data.

**Migration impact:** 6 SKUs had brand/farm names moved from Region to new Brand Farm field.

#### Decision 4: Process 1 + Process 2 dual dropdown (not free text)

**Options considered:**
- A) Two dropdown fields (Primary + Secondary) ← **Selected**
- B) Multi-tag free-form

**Why A:** Standardized data for reliable comparison and filtering. Secondary process is optional (most coffees have only one process).

#### Decision 5: "Infusion" renamed to "Infused"

**User directive:** "Process에서 Infusion 은 Infused 로 바꾸자" — Changed to past tense for consistency with other process names (Washed, not Washing).

#### Decision 6: Grading Spec as separate field

**Reference:** Team researched global coffee grading systems (커피 등급 및 프로세싱 분류 기준 조사.docx). Grading specs are country-specific (Ethiopia: G1-G5, Guatemala: SHB/HB, Kenya: AA/AB/PB, etc.) and don't belong mixed with process names.

**Migration impact:** 4 SKUs had "Natural G1" split to Process: "Natural" + Grading Spec: "G1". 1 SKU had "SHB" moved to Grading Spec.

#### Decision 7: Multi-market design (4 markets)

**Business context:** Eightyplus sells the same green coffee to roasters in Thailand (HQ), Malaysia, Indonesia, and Philippines. Each market has different competitors, different currencies, and different pricing strategies.

**Implementation:** Market switcher in Price Intel, per-market competitor management, per-market strategy configuration, cross-market comparison view (USD-normalized).

#### Decision 8: Manual exchange rates (not auto-fetch)

**Why:** Avoids external API dependency, keeps the app simple. The team manually updates rates when needed. Specialty coffee pricing doesn't change moment-to-moment.

---

## 8. Deployment Guide

### Prerequisites

- Node.js 18+ installed
- Netlify CLI installed (`npm i -g netlify-cli`)
- Authenticated with Netlify (`netlify login`)
- Linked to site (`netlify link`)

### Deploy to production

```bash
cd D:/claude/sku-generator
npx netlify deploy --prod --dir=. --message="description of changes"
```

This deploys:
- `index.html` and static files → Netlify CDN
- `netlify/functions/skus.js` → Netlify Functions (bundled by esbuild)

### Verify deployment

1. Visit https://eightyplus-sku-manager.netlify.app
2. Check sync indicator (top-right): should show green dot "Cloud (N SKUs)"
3. Navigate through all tabs
4. Test Price Intel tab loads without errors

---

## 9. New Environment Setup

### Step 1: Clone the repository

```bash
git clone https://github.com/nanaseco-sudo/eightyplus-sku.git
cd eightyplus-sku
npm install
```

### Step 2: Create Notion integration

1. Go to https://www.notion.so/my-integrations
2. Create new integration: "EIGHTY PLUS SKU Manager"
3. Copy the Internal Integration Token
4. Share the target Notion database with this integration

### Step 3: Create Notion database

Create a new database with these properties (or duplicate the existing one):

| Property | Type |
|----------|------|
| SKU Code | Title |
| LOT Number | Rich Text |
| Country | Select |
| Country Code | Rich Text |
| Grade | Select |
| Grade Code | Rich Text |
| Pack Size | Select |
| Pack Code | Rich Text |
| Supplier | Rich Text |
| Supplier Code | Rich Text |
| Region | Rich Text |
| Brand Farm | Rich Text |
| Process | Rich Text |
| Process 2 | Rich Text |
| Grading Spec | Select (add all 32 options) |
| Description | Rich Text |
| Sale Name | Rich Text |
| Notes | Rich Text |
| Cost Price | Number |
| Selling Price | Number |
| Currency | Select (THB, USD, EUR, MYR, IDR, PHP, SGD, JPY, KRW, CNY, GBP) |
| Registered | Date |

### Step 4: Create Netlify site

```bash
netlify init
# Choose: Create & configure a new site
# Set build command: (leave empty)
# Set deploy directory: .
```

### Step 5: Set environment variables

```bash
netlify env:set NOTION_TOKEN "your-notion-token"
netlify env:set NOTION_DB_ID "your-database-id"
```

### Step 6: Update code references

In `index.html`, no hardcoded credentials exist — all Notion access goes through the Netlify Function which reads env vars.

In `seed.js` and `migrate.js`, credentials are hardcoded for one-time use. Update these if you need to run them:

```javascript
// seed.js — update hostname if using different Netlify site
hostname: 'your-site-name.netlify.app'

// migrate.js — update token and DB ID
const notion = new Client({ auth: 'your-notion-token' });
const DB_ID = 'your-database-id';
```

### Step 7: Deploy

```bash
npx netlify deploy --prod --dir=.
```

### Step 8: Initial data load

On first visit:
1. The app auto-initializes localStorage with default master data
2. Notion sync runs automatically
3. If migrating from another instance, export SKUs as CSV from old instance → import in new

### Step 9: Clear localStorage note

When deploying to a new environment where users had a previous version cached:
- Users should go to **Settings → Reset to Defaults** (or clear browser localStorage)
- This loads the new default master data (regions, brands, processes, grading specs, markets, etc.)

---

## 10. Known Issues & Limitations

| Issue | Severity | Workaround |
|-------|----------|------------|
| localStorage 5-10MB limit | Low | Competitor data could grow; monitor with dev tools |
| No authentication system | Medium | Admin password is stored in localStorage (change via Settings) |
| Notion sync is one-directional on load | Low | Manual Sync button available; changes made in Notion UI need manual sync |
| No conflict resolution | Medium | Last write wins; two users editing simultaneously may overwrite |
| Market prices not synced to Notion yet | Medium | `marketPrices` is localStorage only; Notion has single sellingPrice |
| Cross-Market view is placeholder | Low | Planned for Phase 2 |
| No PDF upload support | Low | Phase 2 will add Claude API integration |
| Competitor data is browser-local | Medium | Phase 3 will add Notion DB for competitor prices |

---

## 11. Phase 2-3 Roadmap

### Phase 2: AI-Assisted Parsing

| Task | Description |
|------|-------------|
| Create `netlify/functions/ai-parse.js` | New Netlify Function calling Claude API |
| Add `@anthropic-ai/sdk` to package.json | Anthropic SDK dependency |
| Set `ANTHROPIC_API_KEY` env var | In Netlify dashboard |
| PDF upload support | Send base64 to Claude API for native document understanding |
| AI column mapping | Auto-detect columns without manual mapping |
| Smart product matching | Fuzzy match competitor items to 80+ SKUs (4-level matching) |
| Match confirmation UI | Green/Yellow/Red confidence rows, user confirms |

### Phase 3: Historical Trends & Recommendations

| Task | Description |
|------|-------------|
| Add Chart.js CDN | `https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js` |
| Historical snapshots | Store price snapshots by date, market, category |
| Create Notion "Price Intelligence" DB | Persistent storage for historical data |
| Create `netlify/functions/price-intel.js` | CRUD for price intelligence Notion DB |
| Trend line charts | Price over time per country+category |
| Price position scatter plot | Where 80+ sits vs market |
| Gap analysis bar chart | % difference from market average by category |
| Recommended pricing engine | Strategy-based (Premium/Parity/Competitive/Penetration) |
| AI-enhanced recommendations | Claude API qualitative analysis |
| Cross-Market analysis view | Same product priced across TH/MY/ID/PH (USD normalized) |
| Market prices sync to Notion | Add Price TH/MY/ID/PH number fields to Notion DB |

---

## 12. QA Checklist

### Functional Tests

#### Dashboard
- [ ] Stats display correctly (total SKUs, suppliers, this month, latest)
- [ ] Country bar chart renders
- [ ] Grade distribution shows correct counts
- [ ] "View All SKUs" button navigates to Registry

#### Generator
- [ ] All required fields marked with *
- [ ] Country searchable select works
- [ ] Supplier searchable select works
- [ ] SKU code preview updates in real time
- [ ] LOT number auto-increments
- [ ] Description auto-generates from all fields
- [ ] Market prices section expands/collapses
- [ ] TH price syncs between main field and market prices
- [ ] Register button disabled until all required fields filled
- [ ] Successful registration shows toast + resets form
- [ ] New SKU appears in Registry

#### Registry
- [ ] Table renders all columns
- [ ] Process shows "Primary / Secondary" format
- [ ] Filters work: search, country, grade, supplier
- [ ] Sorting works on: SKU Code, LOT, Date
- [ ] Pagination works: 20, 50, 100, All
- [ ] CSV export downloads correct file
- [ ] CSV import: template download works
- [ ] CSV import: file upload + validation + preview + execute
- [ ] Excel export creates 3-sheet workbook
- [ ] Admin mode shows delete button

#### Settings
- [ ] All 8 sections expand/collapse
- [ ] Add new item works for each section
- [ ] Edit inline works
- [ ] Toggle active/inactive works
- [ ] Delete shows confirmation + checks SKU references

#### Price Intelligence
- [ ] Tab renders with market switcher
- [ ] Market switcher changes view (TH/MY/ID/PH/Cross-Market)
- [ ] Stats cards show correct numbers
- [ ] "Manage Competitors" opens modal
- [ ] Add competitor saves to correct market
- [ ] Delete competitor removes it
- [ ] "Exchange Rates" modal opens with current rates
- [ ] Save exchange rates updates localStorage
- [ ] "Upload Price List" modal opens
- [ ] File drop zone accepts .xlsx and .csv
- [ ] Column mapping auto-guesses correctly
- [ ] Preview shows extracted records
- [ ] Confirm saves records to localStorage
- [ ] Comparison table groups by country + category
- [ ] Gap % colored correctly (green/red)
- [ ] Bar chart widths proportional to prices
- [ ] Filters (country/category/competitor) work

#### Admin
- [ ] Password prompt on first access
- [ ] Invalid password rejected
- [ ] All entity types visible with full CRUD
- [ ] Backup downloads JSON
- [ ] Restore uploads and replaces data
- [ ] Reset to Defaults confirmation works

#### Sync
- [ ] Sync indicator shows status (green/amber/red/gray)
- [ ] Initial load fetches from Notion
- [ ] Manual sync button works
- [ ] New SKU creates in Notion
- [ ] Delete SKU archives in Notion
- [ ] App works in offline mode (local only)

### Browser Compatibility
- [ ] Chrome (primary)
- [ ] Safari
- [ ] Firefox
- [ ] Mobile responsive (768px, 480px breakpoints)

### Edge Cases
- [ ] Empty state: no SKUs registered
- [ ] Empty state: no competitors added
- [ ] Empty state: no competitor prices uploaded
- [ ] Duplicate SKU code detection
- [ ] Very long supplier names in table
- [ ] Thai language characters render correctly
- [ ] Korean language characters render correctly

---

## 13. Appendix: Full Conversation Log

### Session 1: Field Separation & Migration (2026-04-07)

**Context:** Team feedback on the existing SKU Manager requested separating combined fields.

**User requests (translated from Korean):**
1. "Brand 와 Region 을 나누어 달라는 말 같아" — Separate Brand and Region fields
2. "Process에서 Infusion 은 Infused 로 바꾸자" — Rename Infusion to Infused
3. "Anaerobic Honey, Thermal shock, Koji fermentation 도 필요해" — Add 3 new processes
4. "근데 두세개의 프로세싱이 복합적으로 구현된건 어떻게 하지?" — How to handle compound processing?
5. "A안으로 가자" — Chose Option A: Primary + Secondary dual dropdown
6. "바로 진행해 보자. 마이그레이션 매핑 및 퍼블리싱도 부탁해" — Proceed with implementation + migration + deploy

**Reference document analyzed:** `커피 등급 및 프로세싱 분류 기준 조사.docx` — Survey of global coffee grading systems (Ethiopia G1-G5, Guatemala SHB/HB, Kenya AA/AB, Colombia Supremo/Excelso, Brazil NY Type, etc.)

**Implementation steps:**
1. Designed new data model: 2 fields → 5 fields (Region, Brand/Farm, Process 1, Process 2, Grading Spec)
2. Updated DEFAULT data arrays with new master data
3. Updated Generator form with 5 new fields in 2-column grid layout
4. Updated Registry table columns
5. Updated CSV import/export column mappings
6. Updated Settings sections (4 → 8 sections)
7. Updated Notion DB schema (3 new properties: Brand Farm, Process 2, Grading Spec)
8. Created and ran migration script (22 SKUs, 14 updated)
9. Deployed to Netlify production

**Migration results:**
- 6 SKUs: Region → Brand Farm (Niu/Maypop/April/NG/AGI Culturing, Caturra Nitro, Sakura/April/Maypop Competition)
- 4 SKUs: "Natural G1" → Process: Natural + Grading Spec: G1
- 1 SKU: "SHB" → Grading Spec: SHB
- 3 SKUs: Competition lots → Brand Farm
- 8 SKUs: No changes needed

### Session 2: Price Intelligence Feature (2026-04-07)

**User request:** "가격비교를 할 수 있는 기능을 넣고 싶어. 경쟁사의 가격표(pdf 또는 엑셀파일)를 넣으면 ai로 리스트를 분석 후 현재 Eightyplus에 카테고리별, 상품별로 적용된 가격과 경쟁사의 가격을 비교해 누적된 데이터에 따른 추세 그래프 및 우리가 설정할 추천 가격을 띄워주는 거야"

**Phase planning:**
- Phase 1 (MVP): Excel upload + manual column mapping + comparison table
- Phase 2: AI parsing via Claude API + PDF support + smart matching
- Phase 3: Historical trends + Chart.js + recommended pricing engine

**Multi-market extension request:** "우리가 총 4개의 시장을 봐야 해. 태국(HQ), 말레이시아, 인도네시아, 필리핀까지 봐야 하거든"

**User confirmation:** "지금 sku는 태국시장 기준이야" — Current SKU prices are Thailand market prices.

**Key design decisions documented:**
- Market switcher with 4 country pills + Cross-Market view
- Per-market competitor management
- Per-market pricing strategies (Premium/Parity/Competitive/Penetration)
- Manual exchange rate table (USD base)
- SKU model extended with `marketPrices` object
- Generator form extended with collapsible market price inputs
- Comparison table with Gap% and bar visualization

**Implementation:**
- ~627 lines of new code added (CSS + JS)
- File grew from 1964 → 2591 lines
- All features verified in browser preview (no console errors)
- Deployed to Netlify production

---

## Quick Reference Card

```
Production URL:  https://eightyplus-sku-manager.netlify.app
Admin Password:  (stored in localStorage, change via Settings > Admin)
Notion DB ID:    (see Netlify environment variables)
Notion Token:    (see Netlify environment variables)
GitHub Repo:     https://github.com/nanaseco-sudo/eightyplus-sku
Deploy Command:  npx netlify deploy --prod --dir=.
File to edit:    index.html (single-file app)
Total lines:     ~2591
Markets:         TH (HQ), MY, ID, PH
SKU Format:      CC+G+P+SS+NN (8 chars)
LOT Format:      80-XXXX
```

---

*Document generated: 2026-04-07 | EIGHTY PLUS SKU Manager v2.1*
