# CLAUDE.md

This file provides guidance to Claude Code when working with the Parkview Dashboard codebase.

## Project Overview

**Parkview Dashboard** is an internal business intelligence platform for Parkview Advance, an MCA (Merchant Cash Advance) and business loan brokerage. The dashboard tracks funded deals, calculates commissions, and monitors payment status for both in-house sales reps and ISO (Independent Sales Organization) partners.

**Live URL:** https://dopemasterfunded-production.up.railway.app
**Supabase Project:** `irssizfmrqeqcxwdvkhx` (us-east-1)
**n8n Instance:** flow.clearscrub.io

## Quick Start

```bash
# Development (port 3456 to avoid conflicts)
PORT=3456 npm run dev

# Build & production
npm run build
npm start

# Lint
npm run lint
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16 (App Router) with React 19 |
| Styling | Tailwind CSS 4 + shadcn/ui (new-york style) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth via @supabase/ssr (cookie-based sessions) |
| Data Tables | TanStack React Table v8 |
| Data Fetching | SWR for client-side caching |
| Icons | Lucide React |
| Notifications | Sonner (toast) |
| Build | Turbopack |

## Architecture

### Path Aliases
```typescript
import { cn } from "@/lib/utils"           // ./src/lib/utils
import { Button } from "@/components/ui/button"  // ./src/components/ui/button
```

### Directory Structure
```
src/
├── app/                          # Next.js App Router pages
│   ├── login/page.tsx            # Auth login page
│   ├── funding-form/page.tsx     # Embedded funded deal form
│   └── dashboard/                # Protected dashboard routes
│       ├── page.tsx              # Funded deals table
│       ├── submit/page.tsx       # Submit new deal (iframe embed)
│       ├── chat/page.tsx         # AI chat (placeholder)
│       └── commissions/
│           ├── page.tsx          # Redirects to /reps
│           ├── reps/page.tsx     # Rep commission tracking
│           └── iso/page.tsx      # ISO commission tracking
├── components/
│   ├── ui/                       # shadcn/ui primitives (21 components)
│   ├── layout/                   # AppSidebar, SiteHeader
│   ├── dashboard/                # FundedDealsTable, SummaryCards, filters
│   └── commissions/              # Commission tables and components
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client (Client Components)
│   │   ├── server.ts             # Server client (Server Components)
│   │   └── middleware.ts         # Auth middleware helper
│   ├── queries.ts                # All Supabase data fetching functions
│   ├── table-utils.ts            # Sorting, filtering, grouping logic
│   └── utils.ts                  # cn() helper, formatters
├── types/
│   └── database.ts               # TypeScript types for Supabase schema
└── hooks/
    └── use-mobile.ts             # Responsive breakpoint hook
```

### Layout Hierarchy
```
RootLayout
└── DashboardLayout
    └── SidebarProvider (cookie-persisted state)
        ├── AppSidebar (navigation, user info, logout)
        └── SidebarInset
            └── Page content
```

## Key Patterns

### Supabase Client Selection

**Client Components (browser):**
```typescript
import { createClient } from "@/lib/supabase/client"
const supabase = createClient()
```

**Server Components/Route Handlers:**
```typescript
import { createClient } from "@/lib/supabase/server"
const supabase = await createClient()
```

### Data Fetching with Pagination

Supabase has a 1000-row default limit. All fetch functions paginate:

```typescript
export async function fetchFundedDeals(): Promise<FundedDeal[]> {
  const pageSize = 1000
  let allData: FundedDeal[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const { data } = await supabase
      .from('funded_deals')
      .select('*')
      .range(page * pageSize, (page + 1) * pageSize - 1)

    if (data) allData = [...allData, ...data]
    hasMore = data?.length === pageSize
    page++
  }
  return allData
}
```

### SWR Caching (Commission Pages)

```typescript
const { data, isLoading } = useSWR('rep-commissions', fetchRepCommissions, {
  dedupingInterval: 60000,  // 1 minute deduplication
  keepPreviousData: true,
  revalidateOnFocus: false,
})
```

### Authentication Flow

1. Middleware (`middleware.ts`) intercepts `/dashboard/*` routes
2. Checks for valid Supabase session via cookies
3. Unauthenticated → redirect to `/login`
4. Authenticated → proceed with user context
5. User metadata (first_name, last_name) from `raw_user_meta_data`

## Database Schema

See `SUPABASE_SCHEMA.md` for complete schema documentation. Key tables:

| Table | Rows | Purpose |
|-------|------|---------|
| `funded_deals` | ~3,760 | Master funded deal records |
| `commission_payout_reps` | ~2,681 | Rep commission tracking |
| `commission_payout_iso` | ~1,077 | ISO commission tracking |
| `reps` | ~134 | Sales rep/ISO master data |
| `lenders` | ~112 | Lender lookup |
| `business_main` | ~1,879 | Normalized business names |
| `internal_funded_form` | ~3,153 | Raw form submission archive |
| `schlomo_parkview_deals` | ~1,517 | Schlomo system deal data |

### Key Relationships
```
business_main (1) ←── (N) funded_deals
                 ←── (N) commission_payout_reps
                 ←── (N) commission_payout_iso

funded_deals (1) ←── (N) commission_payout_reps
             (1) ←── (N) commission_payout_iso

reps (1) ←── (N) funded_deals (via rep_id)
     (1) ←── (N) commission_payout_reps
     (1) ←── (N) commission_payout_iso

lenders (1) ←── (N) funded_deals (via lender_id)
```

## Data Pipeline

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Notion Form    │────▶│    n8n          │────▶│   Supabase      │
│  Magic (Lovable)│     │  (flow.         │     │                 │
│                 │     │  clearscrub.io) │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
┌─────────────────┐                                      │
│  Schlomo System │──────────────────────────────────────┤
│  (via Zapier)   │                                      │
└─────────────────┘                                      │
                                                         ▼
                                               ┌─────────────────┐
                                               │    Dashboard    │
                                               │    (Next.js)    │
                                               └─────────────────┘
```

### n8n Workflows

See `docs/n8n-workflows.md` for complete workflow documentation.

| Workflow | Trigger | Tables Written |
|----------|---------|----------------|
| `create_business_main` | Webhook (form) | `business_main` |
| `funded-form-internal` | Webhook (form) | `internal_funded_form`, `funded_deals`, `commission_payout_*` |
| `new-schlomo-id-to-supa` | Webhook (Zapier) | `schlomo_parkview_deals` |

## Current Features

### Working
- Funded Deals table with multi-column filtering, sorting, column visibility
- Summary KPI cards (Total Funded, Commission, Deal Count, Avg Factor Rate)
- Supabase authentication with middleware route protection
- Rep Commission tracking page with SWR caching
- ISO Commission tracking page (separate from Reps)
- Collapsible sidebar with Commissions submenu
- Commission grouping by Rep/ISO, Lender, Month, Year
- Column width resizing (persisted to localStorage)
- Sidebar collapse state (persisted to cookie)
- Mobile responsive design

### Placeholder/Incomplete
- **Commission persistence** - Mark Paid/Clawback updates UI only, not database
- **Submit page** - Embeds external Notion form via iframe
- **Chat page** - Displays "AI Assistant at the bar" placeholder

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://irssizfmrqeqcxwdvkhx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Adding shadcn/ui Components

```bash
npx shadcn@latest add <component-name>
```

Components are installed to `src/components/ui/`. Do not modify these files directly.

## Deployment

- **Platform:** Railway
- **Build:** `npm run build` (uses Turbopack)
- **Environment:** Variables set in Railway dashboard

## Development Notes

1. **Port 3456** - Use to avoid conflicts with other local services
2. **Turbopack** - Fast refresh, ~300-500ms startup
3. **Cookie auth** - Session tokens in cookies for SSR compatibility
4. **Pagination** - Always paginate Supabase queries (1000 row limit)
5. **SWR prefetch** - Commission pages prefetch on sidebar hover

## Project History

| Date | Milestone |
|------|-----------|
| Dec 3, 2025 | Project created, initial dashboard with basic table |
| Dec 4, 2025 | Full shadcn/ui conversion (21 components) |
| Dec 5, 2025 | Comprehensive documentation, business_main table |
| Dec 8, 2025 | Supabase auth, Parkview logo, commission split (Reps/ISO) |
| Dec 9, 2025 | n8n workflow docs, schema update, final sprint prep |

## File Reference

- `SUPABASE_SCHEMA.md` - Complete database schema documentation
- `docs/n8n-workflows.md` - n8n workflow logic and data flow
- `docs/plans/` - Implementation plans for major features
- `README.md` - User-facing documentation
