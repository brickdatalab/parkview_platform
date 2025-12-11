# Commission Payment Tracking Implementation Plan

**Date:** 2025-12-11
**Status:** Ready for execution

## Overview

Add multi-select payment tracking to all commission tabs (Reps, ISO, Brokered) with batch actions, editable dates, and clawback tracking.

## Requirements Summary

| Feature | Implementation |
|---------|---------------|
| Multi-select rows | Checkbox column + select all |
| Mark as Paid | Batch update `paid=true`, `paid_date=today` |
| Mark as Clawback | Insert into `clawbacks` table |
| Toggle paid status | Click badge to flip |
| Edit date | Double-click cell |
| Context menu | Right-click for actions |
| Brokered tab | New page filtering non-inhouse lenders |

## Phase 1: Database Migrations

### Task 1.1: Add funder_paid_date column
```sql
ALTER TABLE funded_deals
ADD COLUMN funder_paid_date DATE;
```

### Task 1.2: Create clawbacks table
```sql
CREATE TABLE clawbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  funded_deal_id UUID NOT NULL REFERENCES funded_deals(id) ON DELETE CASCADE,
  clawback_type VARCHAR(20) NOT NULL CHECK (clawback_type IN ('rep', 'iso', 'brokered')),
  clawback_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(funded_deal_id, clawback_type)
);

CREATE INDEX idx_clawbacks_funded_deal ON clawbacks(funded_deal_id);
CREATE INDEX idx_clawbacks_type ON clawbacks(clawback_type);
```

### Task 1.3: Update TypeScript types
Add types to `src/types/database.ts`:
```typescript
export interface Clawback {
  id: string
  funded_deal_id: string
  clawback_type: 'rep' | 'iso' | 'brokered'
  clawback_date: string
  notes: string | null
  created_at: string
  updated_at: string
}
```

---

## Phase 2: Shared Components

### Task 2.1: useSelectionState hook
**File:** `src/hooks/use-selection-state.ts`

```typescript
interface UseSelectionStateReturn {
  selectedIds: Set<string>
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  selectAll: (ids: string[]) => void
  clearSelection: () => void
  selectedCount: number
  isAllSelected: (ids: string[]) => boolean
  isIndeterminate: (ids: string[]) => boolean
}
```

### Task 2.2: BulkActionBar component
**File:** `src/components/commissions/BulkActionBar.tsx`

- Fixed position at bottom of screen when items selected
- Shows: "{count} selected | Mark as Paid | Mark as Clawback | Clear"
- Slide-up animation on appear
- Uses shadcn Button components

### Task 2.3: EditableDateCell component
**File:** `src/components/commissions/EditableDateCell.tsx`

- Display mode: formatted date (MMM DD, YYYY)
- Double-click enters edit mode
- Edit mode: date input
- Blur or Enter saves
- Escape cancels
- Calls onSave callback with new date

### Task 2.4: PaymentStatusBadge component
**File:** `src/components/commissions/PaymentStatusBadge.tsx`

- Displays "Paid" (green) or "Pending" (gray) badge
- Clickable - calls onToggle callback
- Hover state shows it's clickable
- Optional loading state during update

### Task 2.5: RowContextMenu component
**File:** `src/components/commissions/RowContextMenu.tsx`

- Uses Radix UI ContextMenu (via shadcn)
- Menu items:
  - Mark as Paid (if currently unpaid)
  - Mark as Unpaid (if currently paid)
  - Mark as Clawback
- Wraps table row

### Task 2.6: Commission mutation functions
**File:** `src/lib/commission-mutations.ts`

```typescript
// Batch update paid status for rep commissions
export async function updateRepCommissionsPaid(
  ids: string[],
  paid: boolean,
  paidDate: string | null
): Promise<void>

// Batch update paid status for ISO commissions
export async function updateISOCommissionsPaid(
  ids: string[],
  paid: boolean,
  paidDate: string | null
): Promise<void>

// Batch update funder paid status for brokered deals
export async function updateBrokeredPaid(
  ids: string[],
  paid: boolean,
  paidDate: string | null
): Promise<void>

// Create clawback record
export async function createClawback(
  fundedDealId: string,
  clawbackType: 'rep' | 'iso' | 'brokered',
  notes?: string
): Promise<void>

// Remove clawback record
export async function removeClawback(
  fundedDealId: string,
  clawbackType: 'rep' | 'iso' | 'brokered'
): Promise<void>

// Update single date
export async function updatePaidDate(
  table: 'commission_payout_reps' | 'commission_payout_iso' | 'funded_deals',
  id: string,
  date: string
): Promise<void>
```

---

## Phase 3: Update Reps Commission Page

### Task 3.1: Add checkbox column to table
- Add checkbox as first column
- Header has select-all checkbox
- Each row has individual checkbox
- Checkbox state from useSelectionState hook

### Task 3.2: Integrate BulkActionBar
- Render BulkActionBar when selectedCount > 0
- Wire up Mark as Paid → updateRepCommissionsPaid
- Wire up Mark as Clawback → createClawback with type 'rep'
- Invalidate SWR cache after mutations
- Show toast notifications

### Task 3.3: Replace paid badge with PaymentStatusBadge
- Make it clickable to toggle status
- Optimistic update + API call
- Show loading state during update

### Task 3.4: Add EditableDateCell for paid_date column
- Double-click to edit
- Save calls updatePaidDate
- Optimistic update

### Task 3.5: Wrap rows with RowContextMenu
- Right-click shows context menu
- Actions call appropriate mutation functions

---

## Phase 4: Update ISO Commission Page

### Task 4.1-4.5: Same as Phase 3
Mirror all changes from Reps page:
- Checkbox column
- BulkActionBar integration
- PaymentStatusBadge
- EditableDateCell
- RowContextMenu

Use 'iso' as clawback_type.

---

## Phase 5: Create Brokered Commission Page

### Task 5.1: Create page file
**File:** `src/app/dashboard/commissions/brokered/page.tsx`

### Task 5.2: Create data fetching hook
**File:** `src/hooks/use-brokered-commissions.ts`

Query funded_deals with:
- JOIN lenders to get inhouse_funded
- WHERE lender.inhouse_funded = false
- SELECT: id, deal_name, lender, rep, funded_date, funded_amount, total_rev, funder_paid_parkview, funder_paid_date

### Task 5.3: Build page with all selection features
- Same pattern as Reps/ISO pages
- Checkbox column
- BulkActionBar (Mark as Paid updates funder_paid_parkview)
- PaymentStatusBadge for funder_paid_parkview
- EditableDateCell for funder_paid_date
- RowContextMenu

### Task 5.4: Add to sidebar navigation
Update `src/components/layout/app-sidebar.tsx`:
- Add "Brokered" link under Commissions submenu
- Icon: Building or similar

---

## Phase 6: Testing & Polish

### Task 6.1: Test all workflows
- Multi-select and batch mark as paid
- Toggle individual status via badge click
- Right-click context menu actions
- Double-click date editing
- Clawback creation
- Undo actions

### Task 6.2: Add toast notifications
- "X commissions marked as paid"
- "Clawback recorded"
- Error handling toasts

### Task 6.3: Verify database persistence
- Check Supabase after each action
- Verify SWR cache invalidation
- Test page refresh maintains state

---

## Execution Strategy

### Parallel Execution Groups

**Group A (Database + Types):** Can run first, blocks everything else
- Task 1.1: Add funder_paid_date column
- Task 1.2: Create clawbacks table
- Task 1.3: Update TypeScript types

**Group B (Shared Components):** Can run in parallel after Group A
- Task 2.1: useSelectionState hook
- Task 2.2: BulkActionBar component
- Task 2.3: EditableDateCell component
- Task 2.4: PaymentStatusBadge component
- Task 2.5: RowContextMenu component
- Task 2.6: Commission mutation functions

**Group C (Page Updates):** Can run in parallel after Group B
- Tasks 3.1-3.5: Reps page (one agent)
- Tasks 4.1-4.5: ISO page (one agent)
- Tasks 5.1-5.4: Brokered page (one agent)

**Group D (Final):** Sequential after Group C
- Task 6.1-6.3: Testing and polish

### Agent Allocation

| Agent | Tasks | Dependencies |
|-------|-------|--------------|
| Agent 1 | Database migrations (1.1, 1.2, 1.3) | None |
| Agent 2 | Shared components (2.1-2.6) | Agent 1 complete |
| Agent 3 | Reps page updates (3.1-3.5) | Agent 2 complete |
| Agent 4 | ISO page updates (4.1-4.5) | Agent 2 complete |
| Agent 5 | Brokered page (5.1-5.4) | Agent 2 complete |
| Orchestrator | Testing & verification (6.1-6.3) | Agents 3-5 complete |

**Agents 3, 4, 5 run in parallel** after Agent 2 completes.

---

## Success Criteria

1. [ ] Can multi-select commissions on all three tabs
2. [ ] "Mark as Paid" updates database instantly
3. [ ] "Mark as Clawback" creates clawback record
4. [ ] Click badge toggles paid status
5. [ ] Double-click date opens editor
6. [ ] Right-click shows context menu
7. [ ] Brokered tab shows non-inhouse lender deals
8. [ ] All changes persist after page refresh
9. [ ] Toast notifications confirm actions
