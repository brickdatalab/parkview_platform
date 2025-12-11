# Changelog

All notable changes to the Parkview Dashboard project will be documented in this file.

## [1.0.0] - 2025-12-11

### Added

#### AI Chat Feature
- New AI-powered chat interface at `/dashboard/chat`
- Integration with Grok AI (xAI) for natural language database queries
- SQL validation and execution against Supabase
- Conversation persistence with multiple chat sessions
- System prompt with full database schema awareness
- Chat UI with message history, timestamps, and loading states

#### Quick Filters
- 6 toggle-style quick filters on Funded Deals table:
  - ISO Only - Filter to ISO reps
  - In-House Only - Filter to in-house funded lenders
  - New Business - Filter by deal_type = 'New Business'
  - Pending Payment - Filter where funder hasn't paid Parkview
  - This Month - Filter to current month's deals
  - LOC Only - Filter to line of credit deals
- Sleek pill-shaped button design with icons
- Filters work alongside existing column filters

#### Dynamic Summary Cards
- Summary cards now update when table filters are applied
- Works on all three pages: Funded Deals, Rep Commissions, ISO Commissions
- Cards show totals for filtered data, not all data

#### MetricCard Component
- Standardized reusable metric card component
- Consistent styling across dashboard summary sections
- Supports loading states and value formatting

#### Database Optimizations
- Added 4 new indexes to `funded_deals` table:
  - `idx_funded_deals_deal_type` - Optimizes New Business filter
  - `idx_funded_deals_date_rep` - Composite for dashboard sorting
  - `idx_funded_deals_funder_paid` - Optimizes Pending Payment filter
  - `idx_funded_deals_is_loc` - Optimizes LOC Only filter

#### Testing Infrastructure
- Playwright configuration for E2E testing
- Test directory structure setup

### Changed
- Updated `fetchFundedDeals()` to JOIN reps and lenders tables for quick filter data
- Extended `FundedDeal` type with `rep_is_iso` and `lender_inhouse_funded` fields
- Moved summary calculation in commission pages to use filtered data
- Improved table toolbar layout with centered quick filters

### Fixed
- Fixed infinite render loop caused by `onFilteredDataChange` callback
- Fixed New Business filter checking wrong field (was `business_main_id`, now `deal_type`)
- Summary cards now properly reflect filtered data instead of always showing totals

### Technical Details
- **Framework**: Next.js 16 with React 19
- **Database**: Supabase (PostgreSQL)
- **AI Provider**: xAI (Grok)
- **Styling**: Tailwind CSS 4 + shadcn/ui

## [0.9.0] - 2025-12-08

### Added
- Commission split into separate Rep and ISO pages
- SWR caching for data fetching
- Sidebar prefetch on hover
- URL persistence for table filters
- Empty state components
- Skeleton loading states

### Changed
- Reorganized commission tracking by entity type
- Improved data fetching with pagination (1000 row limit handling)

## [0.8.0] - 2025-12-05

### Added
- Comprehensive project documentation
- Business main table for normalized business names
- Supabase authentication with middleware protection

## [0.7.0] - 2025-12-04

### Added
- Full shadcn/ui component library (21 components)
- Column visibility controls
- Saved views functionality

## [0.6.0] - 2025-12-03

### Added
- Initial dashboard with funded deals table
- Multi-column filtering and sorting
- Summary KPI cards
- Collapsible sidebar navigation
