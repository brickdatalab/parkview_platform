# Parkview Dashboard

Internal dashboard for Parkview Advance MCA/business loan brokerage. Tracks funded deals, commission calculations, and payment status.

**Live Production:** https://dopemasterfunded-production.up.railway.app

---

## Quick Start

```bash
# Clone and install
git clone <repo-url>
cd parkview-dashboard
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with Supabase credentials (see Environment Variables below)

# Run development server
PORT=3456 npm run dev
```

Dashboard available at: http://localhost:3456

**Login:** Mock auth - use `lloyd@christmas.com` with any password.

---

## Environment Variables

Create `.env.local` with these required variables:

| Variable | Description | Source |
|----------|-------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key | Supabase Dashboard → Settings → API |

**Supabase Project Details:**
- Project ID: `irssizfmrqeqcxwdvkhx`
- Region: `us-east-1`
- Project Name: `parkview_core`

To get credentials:
1. Go to https://supabase.com/dashboard/project/irssizfmrqeqcxwdvkhx/settings/api
2. Copy "Project URL" → `NEXT_PUBLIC_SUPABASE_URL`
3. Copy "anon public" key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.0.7 |
| Runtime | React | 19.2.0 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| UI Components | shadcn/ui (Radix primitives) | Latest |
| Data Tables | TanStack React Table | 8.21.3 |
| Database | Supabase (PostgreSQL) | - |
| Notifications | Sonner | 2.0.7 |
| Icons | Lucide React | 0.555.0 |
| Build Tool | Turbopack | Built-in |

**Key Libraries:**
- `@supabase/supabase-js` - Database client with realtime subscriptions
- `@tanstack/react-table` - Headless table with sorting, filtering, pagination
- `class-variance-authority` + `clsx` + `tailwind-merge` - Conditional styling utilities
- `vaul` - Drawer component primitive

---

## Project Structure

```
parkview-dashboard/
├── src/
│   ├── app/                          # Next.js App Router pages
│   │   ├── layout.tsx                # Root layout with Toaster
│   │   ├── page.tsx                  # Landing redirect
│   │   ├── login/page.tsx            # Mock authentication
│   │   ├── funding-form/page.tsx     # External form embed
│   │   └── dashboard/
│   │       ├── layout.tsx            # Dashboard layout with SidebarProvider
│   │       ├── page.tsx              # Funded Deals table (main view)
│   │       ├── commissions/page.tsx  # Commission tracking & payments
│   │       ├── submit/page.tsx       # New deal submission (placeholder)
│   │       └── chat/page.tsx         # AI chat (placeholder)
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives (21 components)
│   │   │   ├── sidebar.tsx           # Collapsible sidebar system
│   │   │   ├── table.tsx             # Base table components
│   │   │   ├── button.tsx, card.tsx, badge.tsx, etc.
│   │   │   └── sonner.tsx            # Toast notifications
│   │   │
│   │   ├── layout/
│   │   │   ├── app-sidebar.tsx       # Main navigation sidebar
│   │   │   └── site-header.tsx       # Page header with breadcrumbs
│   │   │
│   │   ├── dashboard/
│   │   │   ├── funded-deals-table.tsx # Main data table with all features
│   │   │   ├── summary-cards.tsx      # KPI cards (funded, commission, etc.)
│   │   │   ├── filters.tsx            # Filter controls
│   │   │   ├── saved-views.tsx        # Saved filter configurations
│   │   │   └── column-visibility.tsx  # Column toggle controls
│   │   │
│   │   └── commissions/
│   │       ├── commissions-table.tsx  # Payment tracking table
│   │       ├── action-bar.tsx         # Bulk actions (Mark Paid/Clawback)
│   │       ├── rep-pivot-table.tsx    # Rep-level aggregations
│   │       └── status-badge.tsx       # Payment status indicators
│   │
│   ├── lib/
│   │   ├── supabase.ts               # Supabase client singleton
│   │   ├── queries.ts                # Data fetching & calculations
│   │   ├── utils.ts                  # cn() utility for classnames
│   │   └── table-utils.ts            # Table sorting utilities
│   │
│   ├── types/
│   │   ├── database.ts               # Supabase schema types
│   │   └── table.ts                  # Table configuration types
│   │
│   └── hooks/
│       └── use-mobile.ts             # Responsive breakpoint hook
│
├── .env.local                        # Environment variables (not committed)
├── .env.example                      # Environment template
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## Database Schema (Supabase)

The dashboard connects to Supabase project `irssizfmrqeqcxwdvkhx`. Primary table:

### `funded_deals` (~3,760 rows)

Main table for all funded deals. This is the **source of truth**.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `internal_form_id` | uuid | FK to `internal_funded_form` |
| `rep_id` | uuid | FK to `reps` table |
| `lender_id` | uuid | FK to `lenders` table |
| `sdeal_id` | text | External deal ID (8000001+ for brokered) |
| `deal_name` | text | Business/merchant name |
| `rep` | text | Rep name (denormalized) |
| `lender` | text | Lender name (denormalized) |
| `funded_date` | text | Format: MM/DD/YYYY |
| `funded_amount` | numeric | Funded amount in USD |
| `factor_rate` | numeric | Factor rate (e.g., 1.35) |
| `term` | text | Term length |
| `commission` | numeric | Base commission USD |
| `psf` | numeric | PSF (Points/Fees) USD |
| `total_rev` | numeric | commission + psf |
| `commission_pct` | numeric | Rep commission percentage (0.25-0.50) |
| `rep_commission` | numeric | Calculated: total_rev × commission_pct |
| `deal_type` | text | New/Renewal |
| `parkview_rep_paid` | boolean | Payment status flag |
| `iso_paid` | boolean | ISO payment status |
| `funder_paid_parkview` | boolean | Funder payment received |

### Related Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `reps` | 134 | Sales reps & ISO partners |
| `lenders` | 112 | Funding sources |
| `commission_payout_reps` | 2,681 | Payment tracking per rep per deal |
| `internal_funded_form` | 3,153 | Raw Gravity Form submissions |

### Key Relationships

```
funded_deals.rep_id → reps.id
funded_deals.lender_id → lenders.id
funded_deals.internal_form_id → internal_funded_form.id
commission_payout_reps.funded_deal_id → funded_deals.id
```

---

## Pages & Features

### `/dashboard` - Funded Deals

Main data table displaying all funded deals from Supabase.

**Features:**
- **Summary Cards:** Total Funded, Total Commission, Deal Count, Avg Factor Rate
- **Data Table:** Sortable columns, pagination, row selection
- **Filtering:** By rep, lender, year, month, deal type, search
- **Column Visibility:** Toggle columns on/off
- **Saved Views:** Save/load filter configurations

**Data Flow:**
1. Page loads → `fetchFundedDeals()` queries Supabase with pagination
2. Returns all ~3,760 deals (bypasses 1000 row default limit)
3. Client-side filtering/sorting via TanStack Table
4. Summary metrics recalculated on filter changes

### `/dashboard/commissions` - Commission Tracking

Payment status management for rep commissions.

**Features:**
- **Status Badges:** Pending (amber), Paid (green), Clawback (red)
- **Bulk Actions:** Select multiple deals → Mark Paid / Mark Clawback
- **Summary Footer:** Total deals, pending count, paid count, commission totals
- **Rep Pivot Table:** Aggregated view by rep

**Current Limitation:** Mark Paid/Clawback updates UI state only, not Supabase. Database persistence not yet implemented.

### `/dashboard/submit` - New Deal Submission

Placeholder page for submitting new funded deals. Not yet implemented.

### `/dashboard/chat` - AI Chat

Placeholder page for AI-powered chat interface. Shows "at the bar" message.

---

## Component Architecture

### Layout System

```
RootLayout (src/app/layout.tsx)
└── Toaster (sonner notifications)
    └── DashboardLayout (src/app/dashboard/layout.tsx)
        └── SidebarProvider (cookie-persisted state)
            ├── AppSidebar (collapsible navigation)
            └── SidebarInset (main content area)
                └── Page Content
```

### Sidebar (`src/components/layout/app-sidebar.tsx`)

Collapsible sidebar using shadcn/ui sidebar primitive.

**Sections:**
- **Header:** Parkview logo/branding
- **Actions:** Submit New Funded, Chat
- **Knowledge:** Funded Deals, Commissions
- **Footer:** User avatar (Alex Figueroa), logout dropdown

**State:** Collapse state persisted via `sidebar_state` cookie.

### Data Table (`src/components/dashboard/funded-deals-table.tsx`)

TanStack React Table implementation with:
- Column definitions with sorting
- Client-side filtering
- Pagination controls
- Row selection
- Column visibility toggles
- Saved view management

### Summary Cards (`src/components/dashboard/summary-cards.tsx`)

Four KPI cards displaying:
1. Total Funded (USD)
2. Total Commission (USD)
3. Deal Count
4. Average Factor Rate

Includes skeleton loading states.

---

## Data Fetching

### Supabase Client (`src/lib/supabase.ts`)

Singleton pattern with lazy initialization:

```typescript
export function getSupabase(): SupabaseClient<Database> {
  if (!supabase && supabaseUrl && supabaseAnonKey) {
    supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)
  }
  return supabase
}
```

### Query Functions (`src/lib/queries.ts`)

**`fetchFundedDeals()`** - Paginated fetch bypassing 1000 row limit:
```typescript
// Fetches in 1000-row chunks until exhausted
while (hasMore) {
  const { data } = await getSupabase()
    .from('funded_deals')
    .select('*')
    .order('funded_date', { ascending: false })
    .range(offset, offset + pageSize - 1)
  // ...
}
```

**Filter/Sort Functions:**
- `filterAndSortDeals()` - Client-side filtering
- `calculateSummary()` - Aggregate metrics
- `calculateRepSummaries()` - Per-rep aggregations

**Utility Functions:**
- `formatCurrency()` - USD formatting
- `formatLargeNumber()` - Abbreviated amounts ($1.2M)
- `formatFactorRate()` - 3 decimal places
- `formatDate()` - MM/DD/YYYY to readable

---

## Deployment

### Production (Railway)

Dashboard deployed to Railway at: https://dopemasterfunded-production.up.railway.app

**Railway Project ID:** `d3cab47c-ba58-4fd5-a161-f25d1fe3ebd0`

**Deploy command:**
```bash
railway up
```

**CRITICAL:** `NEXT_PUBLIC_*` environment variables must be set BEFORE build (they're baked at compile time). After adding/changing env vars in Railway:
1. Set variable at SERVICE level (not project level)
2. Trigger a new BUILD (not just redeploy)

### Local Development

```bash
PORT=3456 npm run dev
```

Uses Turbopack for fast refresh (~300-500ms startup).

### Build

```bash
npm run build
npm start
```

---

## Known Issues & Limitations

1. **Commission persistence:** Mark Paid/Clawback only updates UI state, not Supabase database

2. **Authentication:** Mock login only - no real auth implemented

3. **Date format:** Database stores dates as MM/DD/YYYY strings (not proper timestamps)

4. **Lockfile warning:** Next.js shows warning about multiple lockfiles - can be ignored

5. **Submit page:** Not implemented - placeholder only

6. **Chat page:** Not implemented - shows placeholder message

---

## Related Systems

| System | Purpose | Connection |
|--------|---------|------------|
| Gravity Form 37 | Funded deal intake | Webhook → n8n → Supabase |
| n8n Workflow | Data pipeline | `funded-form-internal` at flow.clearscrub.io |
| Google Sheets | Legacy tracking | Being deprecated, Supabase is source of truth |

---

## Contact

- **Technical:** Vincent (Vitolo)
- **Operations:** Alex Figueroa
- **Owner:** Matt Walsh
