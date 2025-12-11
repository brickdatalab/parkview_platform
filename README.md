# Parkview Dashboard

Internal business intelligence platform for Parkview Advance MCA/business loan brokerage. Tracks funded deals, calculates commissions, and manages payment status for sales reps and ISO partners.

**Live Production:** https://dopemasterfunded-production.up.railway.app
**Planned Domain:** https://platform.parkview.com

---

## Quick Start

```bash
# Clone and install
git clone https://github.com/brickdatalab/parkview_platform.git
cd parkview-dashboard
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with Supabase credentials

# Run development server
PORT=3456 npm run dev
```

Dashboard available at: http://localhost:3456

**Authentication:** Real Supabase Auth - users must have accounts in Supabase to log in.

---

## Environment Variables

Create `.env.local` with these required variables:

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key |

**Supabase Project:** `irssizfmrqeqcxwdvkhx` (us-east-1)

---

## Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.0.7 |
| Runtime | React | 19 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| UI Components | shadcn/ui (Radix primitives) | Latest |
| Data Tables | TanStack React Table | 8.x |
| Data Fetching | SWR | Latest |
| Database | Supabase (PostgreSQL) | - |
| Auth | Supabase Auth (@supabase/ssr) | Latest |
| Date Handling | date-fns | Latest |
| Notifications | Sonner | 2.x |
| Icons | Lucide React | Latest |
| Build Tool | Turbopack | Built-in |

---

## Features

### Funded Deals Dashboard (`/dashboard`)
- **Summary Cards** - Total Funded, Total Commission, Deal Count, Avg Factor Rate
- **Data Table** - Sortable columns, pagination, row selection
- **Filtering** - By rep, lender, year, month, deal type, search
- **Quick Filters** - One-click filters for common views
- **Column Visibility** - Toggle columns on/off
- **Saved Views** - Save/load filter configurations
- **Resizable Columns** - Drag to resize, persisted to localStorage

### Commission Tracking (`/dashboard/commissions/*`)

Three separate commission pages for different commission types:

#### Reps (`/dashboard/commissions/reps`)
Track and manage rep commission payments.

#### ISO (`/dashboard/commissions/iso`)
Track and manage ISO partner commission payments.

#### Brokered (`/dashboard/commissions/brokered`)
Track payments for non-inhouse funded deals (where lender.inhouse_funded = false).

**Shared Features (all commission pages):**
- **Multi-Select Checkboxes** - Select multiple rows for bulk operations
- **Bulk Action Bar** - Mark Paid / Mark Unpaid for selected rows
- **Right-Click Context Menu** - Mark Paid, Mark Unpaid, Mark as Clawback
- **Editable Paid Date** - Double-click to edit date inline
- **PaymentStatusBadge** - Click to toggle paid/pending status
- **SWR Caching** - 60-second deduplication, keeps previous data while loading
- **Real Database Persistence** - All changes saved to Supabase

### AI Chat (`/dashboard/chat`)
AI-powered chat interface for querying deal data (placeholder UI implemented).

### Authentication
- Supabase Auth with cookie-based sessions
- Middleware protects all `/dashboard/*` routes
- Automatic redirect to `/login` for unauthenticated users

---

## Project Structure

```
src/
├── app/                              # Next.js App Router
│   ├── login/page.tsx                # Auth login page
│   ├── dashboard/
│   │   ├── page.tsx                  # Funded deals table
│   │   ├── layout.tsx                # Dashboard layout with sidebar
│   │   ├── chat/page.tsx             # AI chat interface
│   │   ├── submit/page.tsx           # New deal submission
│   │   └── commissions/
│   │       ├── page.tsx              # Redirects to /reps
│   │       ├── reps/page.tsx         # Rep commission tracking
│   │       ├── iso/page.tsx          # ISO commission tracking
│   │       └── brokered/page.tsx     # Brokered deal tracking
│   └── api/chat/                     # Chat API routes
│
├── components/
│   ├── ui/                           # shadcn/ui primitives
│   ├── layout/
│   │   ├── app-sidebar.tsx           # Navigation sidebar
│   │   └── site-header.tsx           # Page header
│   ├── dashboard/
│   │   ├── funded-deals-table.tsx    # Main data table
│   │   ├── summary-cards.tsx         # KPI cards
│   │   ├── quick-filters.tsx         # One-click filters
│   │   └── ...
│   ├── commissions/
│   │   ├── BulkActionBar.tsx         # Floating bulk action bar
│   │   ├── EditableDateCell.tsx      # Double-click date editing
│   │   ├── PaymentStatusBadge.tsx    # Clickable status badge
│   │   ├── RowContextMenu.tsx        # Right-click menu
│   │   └── ...
│   └── chat/                         # Chat UI components
│
├── hooks/
│   ├── use-selection-state.ts        # Checkbox selection management
│   ├── use-brokered-commissions.ts   # SWR hook for brokered data
│   ├── use-commissions.ts            # SWR hook for rep/ISO data
│   └── use-funded-deals.ts           # SWR hook for deals
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser client
│   │   ├── server.ts                 # Server client
│   │   └── middleware.ts             # Auth middleware helper
│   ├── commission-mutations.ts       # Supabase update functions
│   ├── queries.ts                    # Data fetching functions
│   ├── table-utils.ts                # Sorting, filtering logic
│   └── utils.ts                      # cn() helper, formatters
│
└── types/
    ├── database.ts                   # Supabase schema types
    └── table.ts                      # Table configuration types
```

---

## Database Schema

### Key Tables

| Table | Rows | Purpose |
|-------|------|---------|
| `funded_deals` | ~3,760 | Master funded deal records |
| `commission_payout_reps` | ~2,681 | Rep commission tracking |
| `commission_payout_iso` | ~1,077 | ISO commission tracking |
| `clawbacks` | - | Clawback records |
| `reps` | ~134 | Sales rep/ISO master data |
| `lenders` | ~112 | Lender lookup |

### Recent Schema Changes

**`funded_deals` table:**
- Added `funder_paid_date` (timestamp) - Date funder paid Parkview

**`clawbacks` table (new):**
| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `funded_deal_id` | uuid | FK to funded_deals |
| `clawback_type` | text | 'rep', 'iso', or 'brokered' |
| `clawback_date` | timestamp | When clawback occurred |
| `notes` | text | Optional notes |

---

## Deployment

### Railway (Current Production)
```bash
# Railway CLI deployment
railway up
```

URL: https://dopemasterfunded-production.up.railway.app

### Vercel (In Progress)
```bash
npx vercel deploy --prod
```

**Note:** `NEXT_PUBLIC_*` variables must be set BEFORE build (baked at compile time).

### Local Development
```bash
PORT=3456 npm run dev    # Development with Turbopack
npm run build            # Production build
npm start                # Start production server
npm run lint             # Run ESLint
```

---

## Data Pipeline

```
Notion Form ─────► n8n (flow.clearscrub.io) ─────► Supabase
                                                      │
Schlomo System ──► Zapier ───────────────────────────┘
                                                      │
                                                      ▼
                                               Parkview Dashboard
```

---

## Related Systems

| System | Purpose |
|--------|---------|
| n8n (flow.clearscrub.io) | Data pipeline automation |
| Supabase | Database, Auth, API |
| Railway | Production hosting |
| Vercel | Deployment (in progress) |

---

## Contact

- **Technical:** Vincent (Vitolo)
- **Operations:** Alex Figueroa
- **Owner:** Matt Walsh
