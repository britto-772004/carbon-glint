# Carbon Glint: Product Requirements Document

|              |                                                                                              |
| ------------ | -------------------------------------------------------------------------------------------- |
| **Product**  | Carbon Glint, an ESG audit platform                                                          |
| **v1 scope** | Measure carbon emissions (Scopes 1–3) across industries; export country-specific ESG reports |
| **Later**    | Abatement: reduction targets, initiatives, scenario modelling                                |
| **Status**   | Draft v0.1, 2026-11-20                                                                       |
| **Delivery** | Phased (§12). One phase at a time, each shippable and tested                                 |

---

## 1. Problem and goals

Companies across many industries must measure and disclose greenhouse-gas (GHG) emissions under
country-specific regimes. Their activity data (fuel bills, electricity, travel, purchases) sits in
spreadsheets across branches, and turning it into an auditable CO₂e inventory takes manual factor
look-ups and is hard to trace.

**Goals (v1)**

1. A company can sign up with a work email, onboard, and model its organisation (business units).
2. It can upload activity data (CSV/XLSX) as **Activity Definitions**, map columns manually or with AI, and
   classify each one by GHG Protocol scope and category.
3. The platform matches each activity to an emission factor from **public EF databases** held locally,
   calculates CO₂e deterministically, and shows a **traceability tree** for every number.
4. Users can override factors per activity with a reason, and keep a full audit trail.
5. Users can explore emissions by scope, category, Activity Definition and business unit with
   **drill-down (lasagne) views** and a **BU tree**.
6. Users can export a polished **PDF ESG report** for a business unit in a country format (US, Middle East,
   Australia, Singapore, India, and Indian colleges / NIRF).

**Non-goals (v1)**: abatement planning, supplier portals, SSO/SAML, a billing system, a mobile app,
a self-serve password reset flow (see §5.4), market-based Scope 2 (location-based only in v1).

## 2. Glossary

| Term                         | Meaning                                                                                                                           |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Tenant**                   | One customer company. All data is isolated per tenant.                                                                            |
| **Org Unit / BU**            | A branch, plant, office, campus, etc. Units form a parent/child tree.                                                             |
| **Activity Definition (AD)** | A named, classified emission source (e.g. "Diesel for generators"). It has a scope, a GHG category, and one or more data sources. |
| **Data Source**              | An uploaded CSV/XLSX sheet feeding an AD. Each row becomes an **Activity**.                                                       |
| **Activity**                 | One row of activity data: description, location, **measure** (quantity), unit, org unit, period.                                  |
| **Emission Factor (EF)**     | kg CO₂e (or per-gas values) per unit of activity, from a published database.                                                      |
| **Measure**                  | The quantity column (called "volume" in early notes).                                                                             |
| **Lasagne chart**            | A layered drill-down chart (§9.3).                                                                                                |
| **Traceability tree**        | Every input, conversion, factor and override behind an activity's CO₂e.                                                           |

## 3. Users and roles

| Role            | Who                                                                             | Can                                                                                                          |
| --------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Super Admin** | The person who signs the company up (tenant owner). Several per tenant allowed. | Everything, plus user management (invite, disable, change roles) and company settings.                       |
| **Admin**       | Invited colleagues.                                                             | Org units, Activity Definitions, EF overrides, dashboards, reports. Cannot manage users or company settings. |

> **Assumption, to confirm:** both roles are _per tenant_. There is no platform-operator console in v1.

## 4. Platform and architecture changes

The user wants **all services on a single VM for now**. This replaces the current Cloud Run + Neon +
Firebase Hosting setup.

```
               ┌──────────────────────── single VM (docker compose) ────────────────────────┐
 browser ──TLS──▶ Caddy ─┬─ /        → web (static React build)                             │
               │         └─ /api/**  → api  (Express, OpenAPI-driven)                       │
               │                        │        ▲                                          │
               │                        ▼        │ jobs                                     │
               │   postgres 17 (+pg_trgm, FTS)   redis 7 ◀── worker (BullMQ: imports,       │
               │   uploads/ + reports/ volume          sessions, EF matching, PDF, email)   │
               └────────────────────────────────────────────────────────────────────────────┘
                     SMTP relay (587)  ·  Gemini API  ·  nightly pg_dump → Cloud Storage
```

| Concern         | Decision                                                                                                                                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosting         | One GCE VM (e.g. `e2-standard-4`, 100 GB SSD) running `docker compose`: `caddy`, `api`, `worker`, `postgres`, `redis`.                                                                                                                                                                                              |
| Web             | Built static files served by Caddy (Firebase Hosting no longer needed).                                                                                                                                                                                                                                             |
| Database        | Postgres 17 in a container on the VM, with a persistent volume, `pg_trgm` and `unaccent`. **Nightly `pg_dump` to Cloud Storage is mandatory.**                                                                                                                                                                      |
| Redis           | Sessions, rate limiting, BullMQ job queues, and the AI response cache.                                                                                                                                                                                                                                              |
| Background work | A new `apps/worker` (same codebase, same layers) for file imports, EF matching and calculation, PDF rendering and email.                                                                                                                                                                                            |
| Email           | `nodemailer` over SMTP. **Port 25 outbound is blocked on GCP, and mail sent straight from a VM lands in spam.** Use an SMTP relay on 587 (Brevo / SendGrid / Amazon SES / Google Workspace relay). The app only needs `SMTP_HOST/PORT/USER/PASS`, so the provider can be swapped. Dev uses a **Mailpit** container. |
| Files           | Uploads and generated PDFs stored on a VM volume under `/data`, behind a `FileStorage` interface so Cloud Storage can be swapped in later.                                                                                                                                                                          |
| CI/CD           | GitHub Actions: CI (unchanged) → build `api`/`worker`/`web` images → push to Artifact Registry → SSH to the VM → `docker compose pull && up -d` → run migrations → smoke test `/api/health`.                                                                                                                        |
| Charts          | Apache ECharts (drill-down, stacked bars, treemap, sunburst) inside MUI components.                                                                                                                                                                                                                                 |
| Org chart       | React Flow (`@xyflow/react`) with automatic tree layout (`dagre`/`elkjs`).                                                                                                                                                                                                                                          |
| PDF             | HTML/React templates rendered by headless Chromium (Playwright) in the worker. Charts as SVG.                                                                                                                                                                                                                       |
| Spreadsheets    | `exceljs` (XLSX read/write, sample template) and `papaparse` (CSV).                                                                                                                                                                                                                                                 |

Architecture rules are unchanged: OpenAPI-first, the generated SDK is the only frontend client,
container/component split with MUI, and controller → service → repository → model on the backend
(see `.claude/skills/`).

## 5. Module 1: Authentication, tenancy and onboarding

### 5.1 Sign-up (landing page)

- A public **landing page** (product pitch, "Get started", "Sign in").
- Sign-up form: full name, **work email**, password (minimum 10 characters, at least one letter and one number).
- **Work emails only.** Reject free and disposable providers (gmail, yahoo, outlook/hotmail/live, icloud,
  proton, zoho-free, yandex, mail.ru, gmx, aol, plus a disposable-domain list). The check runs on the server and
  is mirrored in the UI.
- **One tenant per email domain.** The first verified user from `acme.com` creates the tenant and becomes Super Admin.
  Later sign-ups from `acme.com` see: "Your company is already on Carbon Glint. Ask your admin for an invite."
- **Email verification (recommended):** a verification link is emailed (expires in 24 h) and the account is active
  once verified. Without this, anyone could claim a company's domain.

### 5.2 Onboarding (first sign-in only)

A multi-step wizard that blocks the app until it is finished:

1. **Nature of industry.** Pick from the seeded industry list (§7.2). This drives the default GHG categories.
2. **Number of employees.** Bands: 1–50, 51–250, 251–1,000, 1,001–5,000, 5,000+.
3. **Number of branches / business units** (integer ≥ 1).
4. **Company website** (URL).
5. **LinkedIn company page** (must be a `linkedin.com/company/...` URL).

On finish: save to the tenant, create a root org unit named after the company (HQ), set
`onboarded_at`, and redirect to the **Dashboard** (empty state with "Add business units" and "Create Activity Definition").

### 5.3 Sign-in, sessions, multi-tenant shell

- Sign in with email and password. Sessions are stored in Redis behind an httpOnly, Secure, SameSite=Lax cookie. Idle timeout 8 h, absolute 7 d.
- Brute-force protection: 5 failed attempts per email+IP in 15 min triggers a 15-minute lock (Redis).
- The app shell shows the **tenant name and logo placeholder**, the user menu, and tabs:
  **Dashboard · Org Units · Activity Definitions · Emission Factors · Reports · Settings**.
- **Tenant isolation:** every tenant-owned table has `tenant_id`. Repositories always filter by the session's
  tenant, and Postgres Row-Level Security is enabled as a second layer of protection. Cross-tenant access returns 404.

### 5.4 Forgot password (as specified: email a new password)

- A "Forgot password" form takes an email address. The response is **always the same**, so it can't be used to check which accounts exist.
- If the account exists, generate a 16-character random password, store only its **argon2id hash**,
  **revoke all existing sessions**, and email the new password.
- Rate limit: 3 requests per email per hour.
- _Recommended:_ a "change your password" banner after signing in with an emailed password. A
  "Change password" option in the user menu is included, but there is no reset-link flow in v1.

> ⚠️ Emailed passwords are weaker than reset links, because the password sits in the user's inbox. This is
> acceptable for v1 with the mitigations above. We'll revisit before enterprise customers.

### 5.5 User management (Super Admin)

- Invite a user by email with a role, sent by SMTP. The invite link expires in 7 days and the invitee must use the tenant's domain.
- The invitee opens the link, sets their name and password, and lands on the dashboard (no onboarding).
- List users, resend or revoke invites, change role, disable or enable a user. The last Super Admin can't be removed.

### 5.6 Acceptance criteria

- A gmail address can't sign up. An `@acme.com` address can, and creates the "Acme" tenant.
- A second `@acme.com` sign-up is redirected to "ask for invite".
- First sign-in runs onboarding exactly once. Afterwards it lands on the dashboard.
- Forgot password emails a working new password, the old one stops working, and other sessions are logged out.
- A user of tenant A can never read or change tenant B's data (tested at the HTTP and SQL levels).
- All emails render correctly in Mailpit locally.

## 6. Module 2: Org Units (business units)

- **Org Units tab:** an interactive **React Flow** tree. Nodes are units and edges are parent → child.
  - Create a unit (as a child of the selected node or as a root), edit it, delete it (blocked if it has children or activities, unless they are re-parented), and **drag to re-parent** (with cycle prevention).
  - Fields: name, code (unique per tenant), type (HQ, Branch, Plant, Office, Warehouse, Campus, Store, Other),
    country (ISO-3166), city, optional address, active flag.
  - Toggle between a graph view and a table view. Search, plus auto-layout and fit-to-view.
- The root HQ is created during onboarding.
- Org units are referenced by activities (§7.4), dashboards (§10) and reports (§11). Totals **roll up** from children to parents.

**Acceptance:** CRUD works in both views. Re-parenting a node into its own subtree is rejected with a 422. The tree
persists node positions. A tenant with 500 units renders smoothly.

## 7. Module 3: GHG taxonomy and Activity Definitions

### 7.1 GHG taxonomy (seeded, extensible)

Based on the GHG Protocol Corporate Standard and its Scope 3 Standard.

- **Scope 1** (direct): Stationary combustion · Mobile combustion · Process emissions · Fugitive emissions (refrigerants, SF₆).
- **Scope 2** (purchased energy): Purchased electricity · Purchased heat/steam · Purchased cooling.
- **Scope 3** (value chain), 15 categories: 1 Purchased goods and services · 2 Capital goods · 3 Fuel- and energy-related
  activities · 4 Upstream transportation and distribution · 5 Waste generated in operations · 6 Business travel ·
  7 Employee commuting · 8 Upstream leased assets · 9 Downstream transportation · 10 Processing of sold products ·
  11 Use of sold products · 12 End-of-life treatment of sold products · 13 Downstream leased assets · 14 Franchises · 15 Investments.
- Tenants can **add custom categories** under any scope (name and description). Custom categories are visible only to that tenant.

### 7.2 Industries → recommended categories

Seeded industries, each with a recommended and ordered category set (all categories remain selectable):

Manufacturing · Oil and gas · Power and utilities · Mining and metals · Chemicals · Construction and real estate ·
Transportation and logistics · Retail and e-commerce · Food and agriculture · Hospitality and tourism ·
Healthcare and pharma · IT and software services · Financial services · Telecommunications ·
**Higher education (colleges and universities)** · Government and public sector · Textiles and apparel · Automotive.

_Example (IT services):_ Purchased electricity, Business travel, Employee commuting, Purchased goods and services, Capital goods,
Fuel- and energy-related activities, Waste, Stationary combustion (DG sets), Fugitive (HVAC refrigerants).

### 7.3 Activity Definitions tab

- List ADs with filters (scope, category, status, org unit) and status chips: **Draft → Published → Archived**.
- Create an AD: **name, description, scope, GHG category** (filtered by scope, with industry-recommended ones first,
  plus "+ Add custom category"), reporting period (start and end), and optionally a default org unit.
- An AD has **one or more data sources** and therefore one or more activities.

### 7.4 Data source upload and column mapping

1. **Upload** a CSV or XLSX file (≤ 20 MB, ≤ 100k rows). For XLSX, choose the sheet and the header row (auto-detected).
2. **Preview** the first 50 rows.
3. **Choose the mapping mode** (the user is asked every time):
   - **Auto (AI):** Gemini receives the headers and ~20 sample rows and returns a mapping with a confidence
     score and reasoning for each target field. The user reviews and confirms; low-confidence fields are highlighted.
   - **Manual:** a dropdown per target field, populated with the sheet's columns.
4. **Target fields**, the GHG activity characteristics:

   | Field                | Required | Notes                                                                                                                                         |
   | -------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
   | Activity description | ✅       | e.g. "Diesel – DG set", "Flight BLR→DXB"                                                                                                      |
   | Measure              | ✅       | numeric quantity (formerly "volume")                                                                                                          |
   | Unit                 | ✅       | normalised against the unit catalogue (kWh, MWh, L, kg, t, km, passenger-km, tonne-km, m³, GJ, therm, USD…). Unknown units are flagged.       |
   | Location             | —        | free text or country/city; used to pick regional factors                                                                                      |
   | Org unit             | —        | matched to org units by code or name (exact, then fuzzy). The AD default is used when blank. Unmatched values are listed for the user to fix. |
   | Period start / end   | —        | defaults to the AD reporting period                                                                                                           |
   | Spend + currency     | —        | for spend-based Scope 3                                                                                                                       |

   Users can also store **extra columns** as metadata.

5. **Validate and import** (as a background job): per-row errors (non-numeric measure, unknown unit,
   unmatched org unit) appear in a downloadable error report. The import is all-or-nothing, or "import valid rows", at the user's choice.
6. The raw file and the confirmed mapping are stored. The mapping can be **saved as a reusable template** for the next upload.

### 7.5 Sample Excel and visual template

- **Download sample:** `Carbon-Glint-Activity-Template.xlsx` with:
  - an _Instructions_ sheet (what each column means, accepted units, examples per scope),
  - an _Activities_ sheet with headers and ~10 realistic sample rows (grid electricity, diesel DG set, petrol fleet,
    R-410A refill, flights, hotel nights, employee commute, purchased paper, waste to landfill), unit dropdowns, and
    number formatting,
  - a CSV variant.
- **Visual template:** an in-app illustrated guide on the upload step showing a spreadsheet mock with arrows
  from each column to its GHG field, plus "what good data looks like".

### 7.6 Publish

Publishing an AD locks its mapping and triggers **EF matching and calculation** (§8) for all its activities.
Re-publishing after new uploads recalculates only new or changed activities.

**Acceptance (Module 3):** the sample file imports with zero errors using either Auto or Manual mapping. A messy real-world
file (different headers, extra columns, merged title rows) maps correctly with Auto at ≥ 80% field accuracy on our
fixture set. Errors are reported per row. Custom categories work and stay tenant-scoped.

## 8. Module 4: Emission factor library and calculation engine

### 8.1 Local EF library ("clone" of public databases)

Datasets are imported by versioned ETL scripts into `emission_factor_sources` and `emission_factors`.
Each factor keeps: source, dataset version and year, external ID, name (EN, plus the original language), category
path, region, unit (denominator), CO₂e per unit and per-gas values (CO₂, CH₄, N₂O), GWP basis (AR5/AR6), and a
citation URL.

| Source                                                            | Coverage                                                   | Licence / status                                                                                        |
| ----------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| **UK DESNZ/DEFRA GHG Conversion Factors** (annual)                | fuels, electricity (UK), travel, freight, waste, materials | Open Government Licence ✅                                                                              |
| **ADEME Base Carbone / Base Empreinte**                           | very broad, FR/EU                                          | Open licence (Etalab) ✅. Uses the English names where present                                          |
| **US EPA GHG Emission Factors Hub**                               | US fuels, eGRID electricity, transport, waste              | Public domain ✅                                                                                        |
| **IPCC 2006 Guidelines + 2019 Refinement default factors (EFDB)** | global defaults for fuels, processes                       | Free with citation. **Bulk-use terms to verify**                                                        |
| **India CEA CO₂ Baseline Database**                               | Indian grid electricity                                    | Public ✅. Needed for India reports                                                                     |
| **Australia NGA Factors (DCCEEW)**                                | Australian fuels and state grids                           | Public ✅. Needed for Australia reports                                                                 |
| **Singapore EMA grid emission factor**                            | Singapore electricity                                      | Public ✅                                                                                               |
| **ecoinvent**                                                     | LCA, very broad                                            | ❌ **Commercial licence. It can't be cloned.** Planned as an optional connector if a licence is bought. |

The importer is idempotent and versioned: a new DEFRA year adds a new version, and old calculations keep pointing at
the exact factor version they used.

### 8.2 Search and matching

1. **Full-text plus fuzzy search:** a Postgres `tsvector` (English, `unaccent`), `pg_trgm` similarity, and filters
   (scope/category hints, unit compatibility, region, year). This is exposed as a search API and UI for manual picks.
2. **AI-assisted match:** for each _distinct_ (description, unit, location, category), retrieve the top ~20 candidates,
   then **Gemini selects the best candidate ID**, returning a confidence score (0–1) and a short rationale. Results are cached in Redis and Postgres by input hash.
3. **Gemini never produces numbers.** It only chooses among real factor IDs. The arithmetic is deterministic code.
4. Confidence below 0.6, no unit-compatible candidate, or no candidate at all marks the activity as **Needs review**.

### 8.3 Calculation

```
normalised_qty = measure × unit_conversion(activity.unit → factor.unit)      (dimension check: energy, mass, distance…)
co2e_kg        = normalised_qty × factor.co2e_per_unit
                 or Σ_gas normalised_qty × factor.gas_per_unit × GWP[gas, basis]   (when only per-gas values exist)
```

- The GWP basis is a tenant setting (default AR6). Scope 2 is location-based in v1.
- Every calculation is stored with a **trace** (§9.4) and is reproducible: factor version, conversion factors, GWP table and timestamp.
- Totals per AD = Σ of its activities. Org unit totals roll up the tree.

## 9. Module 5: Emission Factors tab (results, overrides, traceability)

### 9.1 Views

- **Table view:** one row per activity, showing AD, org unit, description, measure and unit, matched factor (source, name, region,
  year), CO₂e, confidence, status (Auto / Needs review / Overridden).
- **Grouped view:** by AD, with expandable activities and the total per AD.
- **Lasagne drill-down chart** (§9.3).

### 9.2 Filters

Scope · GHG category · Activity Definition · business unit (including children) · period · EF source · status
(needs review, overridden) · confidence range. Filters are reflected in the URL so views can be shared.

### 9.3 Lasagne drill-down chart

> **Interpretation, to confirm:** a layered horizontal stacked bar. Each layer is one level of the hierarchy and
> each segment is a share of CO₂e. Clicking a segment drills down to the next layer, with a breadcrumb to go back up:
> **Total → Scope → GHG category → Activity Definition → Activity** (or, with "Group by BU" switched on, **BU → child BU → …**).
> Tooltips show the absolute tCO₂e and the % of the parent.

### 9.4 GHG traceability tree (per activity)

A side panel with a collapsible tree:

```
Activity row #42  (data source "Q1-fuel.xlsx", sheet "Diesel", row 42)
├─ Input: 1,200 L diesel · Bengaluru Plant · Jan–Mar 2026
├─ Unit conversion: L → L (×1)
├─ Factor: DEFRA 2025 › Fuels › Diesel (average biofuel blend) · 2.51 kg CO₂e/L  [link]
│   ├─ Matched by: AI (confidence 0.92) · rationale "…"
│   └─ Alternatives considered: ADEME #…, EPA #…
├─ GWP basis: AR6
├─ Result: 3,012 kg CO₂e
└─ Overrides: none   ·   Calculated 2026-11-20 by system
```

### 9.5 Emission factor override (per activity)

- Override types: **pick a different library factor** (with search), **custom factor** (value, unit, citation),
  or **custom result** (kg CO₂e entered directly).
- A **reason is mandatory**. Overrides are versioned. Each records the user and timestamp, can be reverted, and appears in the traceability tree.
- Bulk override: apply one factor to all selected activities.
- Overridden values are never replaced by re-matching.

**Acceptance:** each activity has a trace that adds up to its CO₂e. Overriding updates totals everywhere within 2 s and
leaves an audit record. Filters and drill-down agree with the table totals.

## 10. Module 6: Dashboard

- **KPI cards:** total tCO₂e, Scope 1 / 2 / 3 split, % change compared with the previous period (when available), number of activities
  needing review, data coverage (BUs with data out of the total).
- **Lasagne drill-down** (same component as §9.3) with filters for BU, scope, category, AD and period.
- **BU tree view:** a React Flow tree of org units. Each node shows its total and a Scope 1/2/3 mini-bar, with rolled-up
  totals. Clicking a node filters the whole dashboard to that subtree.
- Trend over the reporting period (monthly stacked by scope) and the top 10 emitting activities.

## 11. Module 7: Reports (country-format ESG exports)

Select **business unit (including children)**, **reporting period**, and **format**, then **Generate PDF** (a background job). The PDF appears in the
report history (download, regenerate).

| Region              | Format (v1 target)                                                                                                               | Notes                                                                                                                                                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 🇮🇳 India            | **SEBI BRSR, Principle 6** (energy, Scope 1/2 intensity, Scope 3 as a leadership indicator) and **BRSR Core**                    | listed companies                                                                                                                                                                                 |
| 🇮🇳 India, colleges  | **NIRF / NAAC sustainability annex**                                                                                             | ⚠️ NIRF's main ranking template has no standard GHG section. We need the exact template or criteria you want (e.g. NAAC Criterion 7.1 green audit, or UI GreenMetric "Energy & Climate Change"). |
| 🇺🇸 United States    | **GHG Protocol corporate inventory**, aligned with **California SB 253** (Scope 1/2, then 3) and EPA GHGRP-style facility tables | the SEC climate rule is not being pursued, so it is excluded                                                                                                                                     |
| 🇦🇪 / 🇸🇦 Middle East | **UAE climate law (Federal Decree-Law 11/2024) GHG report** and **Saudi Tadawul ESG disclosure** metrics                         |                                                                                                                                                                                                  |
| 🇦🇺 Australia        | **AASB S2** climate disclosure (GHG section) and **NGER**-style facility tables                                                  | uses NGA factors                                                                                                                                                                                 |
| 🇸🇬 Singapore        | **SGX climate reporting (ISSB IFRS S2–aligned)**, Scope 1/2 (and 3)                                                              | uses EMA grid factor                                                                                                                                                                             |

**Every PDF** has: a branded cover (tenant name, BU, period, format), contents, executive summary with KPIs and charts,
organisational and operational boundary (BU tree), methodology (GHG Protocol, GWP basis, consolidation approach),
emissions by scope, category and BU (tables and charts), the framework-specific disclosure table, emission factor sources
and citations, data quality (coverage, % estimated, overrides list), and an appendix with the traceability summary.

> ⚠️ Templates follow the published frameworks but **must be reviewed by an ESG / compliance expert** before
> customers file them. The PDF footer will say "Prepared with Carbon Glint; not assured".

**Acceptance:** each format generates a PDF of 10 pages or fewer in under 30 s for 10k activities. Its totals match the dashboard for the same filters.

## 12. Delivery plan (one phase at a time)

| #     | Phase                               | Contents                                                                                                                                                                     | Done when                                                                           |
| ----- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **0** | **VM platform**                     | docker compose (caddy, api, worker, postgres, redis, mailpit for dev), `FileStorage`, SMTP mailer, BullMQ, CI/CD to VM, backups. Retire Cloud Run, Neon and Firebase config. | `docker compose up` runs everything locally. CI deploys to the VM. Health is green. |
| **1** | **Auth, tenancy, onboarding**       | landing, sign-up (work email + verification), sign-in, sessions, onboarding wizard, app shell with tenant, forgot password, invites and user management, RLS                 | §5.6 passes                                                                         |
| **2** | **Org Units**                       | React Flow tree + table, CRUD, re-parent                                                                                                                                     | §6 acceptance                                                                       |
| **3** | **Taxonomy + Activity Definitions** | industries and categories seed, custom categories, AD CRUD, upload, AI and manual mapping, import job, sample XLSX and visual guide                                          | §7 acceptance                                                                       |
| **4** | **EF library + engine**             | ETL for DEFRA, ADEME, EPA, CEA, NGA, EMA (IPCC once terms are checked), search API, Gemini matching, unit catalogue, calculation and trace, publish flow                     | factors searchable; published AD → CO₂e for every activity                          |
| **5** | **Emission Factors tab**            | views, filters, lasagne, traceability panel, overrides                                                                                                                       | §9 acceptance                                                                       |
| **6** | **Dashboard**                       | KPIs, lasagne, BU tree, trends                                                                                                                                               | §10                                                                                 |
| **7** | **Reports**                         | PDF engine and the six formats                                                                                                                                               | §11 acceptance                                                                      |

Each phase starts with the **OpenAPI contract** for its endpoints, follows the backend and frontend skills, and ships with
service, controller, repository (Postgres) and frontend component and container tests, all running in CI.

## 13. Data model (initial sketch)

```
tenants(id, name, email_domain UNIQUE, industry_id, employee_band, bu_count, website, linkedin_url, gwp_basis, onboarded_at)
users(id, tenant_id, email UNIQUE, name, password_hash, role[superadmin|admin], status[pending|active|disabled],
      email_verified_at, password_is_temporary, last_login_at)
invitations(id, tenant_id, email, role, token_hash, invited_by, expires_at, accepted_at, revoked_at)
org_units(id, tenant_id, parent_id→org_units, name, code, type, country, city, address, active, pos_x, pos_y)
industries(id, code, name)                      ghg_categories(id, tenant_id NULL=system, scope, code, name, description)
industry_categories(industry_id, category_id, rank)
activity_definitions(id, tenant_id, name, description, scope, category_id, default_org_unit_id,
                     period_start, period_end, status[draft|published|archived], published_at)
data_sources(id, tenant_id, ad_id, file_key, file_name, file_type, sheet, header_row, mapping JSONB,
             mapping_mode[ai|manual], ai_confidence JSONB, status, row_count, error_count)
mapping_templates(id, tenant_id, name, mapping JSONB)
activities(id, tenant_id, ad_id, data_source_id, row_no, description, location, measure NUMERIC, unit,
           org_unit_id, period_start, period_end, spend, currency, extra JSONB)
units(code, dimension, to_base NUMERIC)        -- unit catalogue + conversions
ef_sources(id, code, name, version, year, licence, url, imported_at)
emission_factors(id, source_id, external_id, name, name_original, category_path, region, year, unit,
                 co2e_per_unit, co2, ch4, n2o, gwp_basis, citation_url, search tsvector)
calculations(id, tenant_id, activity_id, factor_id, method[ai|search|override], confidence, normalised_qty,
             conversion NUMERIC, gwp_basis, co2e_kg NUMERIC, trace JSONB, is_current, calculated_at)
ef_overrides(id, tenant_id, activity_id, type[factor|custom_factor|custom_result], factor_id, value, unit,
             citation, reason, created_by, created_at, reverted_at)
reports(id, tenant_id, org_unit_id, format, period_start, period_end, status, file_key, created_by, created_at)
audit_log(id, tenant_id, actor_id, action, entity, entity_id, before JSONB, after JSONB, at)
```

## 14. Non-functional requirements

- **Security:** argon2id hashes. httpOnly session cookies plus CSRF protection (SameSite and an origin check). Rate limits in Redis.
  Tenant isolation in repositories and through Postgres RLS. Uploaded files are virus-size-limited and never executed. Secrets live only in `.env` on the VM.
- **Auditability:** every calculation is reproducible and every change goes into `audit_log`. EF dataset versions are immutable.
- **Performance:** importing 10k rows takes under 30 s. Dashboards for 100k activities respond in under 1 s (pre-aggregated materialised views if needed).
- **AI cost and safety:** Gemini is only called on distinct inputs, cached, with bounded batches and structured JSON output. If Gemini is down, fall back to the top full-text-search match marked "Needs review".
- **Reliability:** nightly database backups with a restore drill. Jobs retry with backoff. Emails are queued.
- **Accessibility:** MUI defaults, keyboard-navigable flows, and charts with table alternatives.

## 15. Open questions

1. **Roles:** are Super Admin and Admin per tenant (as assumed), or is Super Admin _us_, the platform operator across all tenants?
2. **Deployment:** replace Cloud Run, Neon and Firebase Hosting fully with the single VM (as assumed), or keep any of them?
3. **"Lasagne chart":** is §9.3's layered drill-down bar what you mean, or a heatmap (rows = BUs, columns = months)?
4. **Email verification at sign-up:** OK to require it (recommended)?
5. **SMTP provider** for the relay (Brevo / SendGrid / SES / Google Workspace)?
6. **NIRF:** which exact template or criteria should the college report follow?
7. **Middle East:** UAE and Saudi as listed, or other countries (Qatar, Oman, Bahrain)?
8. **ecoinvent:** do you have, or plan to buy, a licence?

## 16. Later (abatement, v2+)

Reduction targets (SBTi-style), initiatives with costs and expected tCO₂e savings, marginal abatement cost curves,
scenario modelling, supplier engagement, market-based Scope 2 (RECs/PPAs), and assurance workflows.
