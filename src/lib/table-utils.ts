import type { FundedDeal } from '@/types/database'
import type {
  ColumnId,
  SortConfig,
  ColumnFilter,
  DateRangeFilter,
  GroupByOption,
  GroupedData,
  GroupTotals,
  TableState,
  SavedView,
  AmountRange,
  AMOUNT_RANGES,
} from '@/types/table'
import { ALL_COLUMNS, DEFAULT_TABLE_STATE } from '@/types/table'

const AMOUNT_RANGES_DATA: { label: AmountRange; min: number; max: number }[] = [
  { label: '$0-50K', min: 0, max: 50000 },
  { label: '$50K-100K', min: 50000, max: 100000 },
  { label: '$100K-250K', min: 100000, max: 250000 },
  { label: '$250K+', min: 250000, max: Infinity },
]

// ============ DATE PARSING ============

/**
 * Parse date string (MM/DD/YYYY or ISO) to Date object
 */
export function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null

  // Handle MM/DD/YYYY format
  const parts = dateStr.split('/')
  if (parts.length === 3) {
    const [month, day, year] = parts
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }

  // Handle ISO format
  return new Date(dateStr)
}

/**
 * Format date for display
 */
export function formatDateDisplay(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = parseDate(dateStr)
  if (!date || isNaN(date.getTime())) return dateStr
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Get month-year key from date (e.g., "2024-01")
 */
function getMonthYearKey(dateStr: string | null): string {
  const date = parseDate(dateStr)
  if (!date) return 'Unknown'
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * Get year key from date
 */
function getYearKey(dateStr: string | null): string {
  const date = parseDate(dateStr)
  if (!date) return 'Unknown'
  return String(date.getFullYear())
}

/**
 * Get day key from date (e.g., "2024-01-15")
 */
function getDayKey(dateStr: string | null): string {
  const date = parseDate(dateStr)
  if (!date) return 'Unknown'
  return date.toISOString().split('T')[0]
}

/**
 * Format month-year key for display (e.g., "January 2024")
 */
function formatMonthYearLabel(key: string): string {
  if (key === 'Unknown') return key
  const [year, month] = key.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

/**
 * Format day key for display (e.g., "Jan 15, 2024")
 */
function formatDayLabel(key: string): string {
  if (key === 'Unknown') return key
  const date = new Date(key)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ============ AMOUNT RANGE ============

/**
 * Get amount range for a value
 */
function getAmountRange(amount: number | null): AmountRange {
  if (!amount) return '$0-50K'
  for (const range of AMOUNT_RANGES_DATA) {
    if (amount >= range.min && amount < range.max) {
      return range.label
    }
  }
  return '$250K+'
}

// ============ FILTERING ============

/**
 * Apply search filter to deals
 */
function applySearchFilter(deals: FundedDeal[], searchQuery: string): FundedDeal[] {
  if (!searchQuery.trim()) return deals

  const query = searchQuery.toLowerCase().trim()
  return deals.filter(deal => {
    const dealName = (deal.deal_name || '').toLowerCase()
    const merchantName = (deal.merchant_name || '').toLowerCase()
    const rep = (deal.rep || '').toLowerCase()
    const lender = (deal.lender || '').toLowerCase()
    const sdealId = (deal.sdeal_id || '').toLowerCase()

    return dealName.includes(query) ||
           merchantName.includes(query) ||
           rep.includes(query) ||
           lender.includes(query) ||
           sdealId.includes(query)
  })
}

/**
 * Apply column filters to deals
 */
function applyColumnFilters(deals: FundedDeal[], filters: ColumnFilter[]): FundedDeal[] {
  if (filters.length === 0) return deals

  return deals.filter(deal => {
    return filters.every(filter => {
      if (filter.selectedValues.length === 0) return true

      const column = ALL_COLUMNS.find(c => c.id === filter.columnId)
      if (!column) return true

      let value: string

      // Special handling for funded_amount ranges
      if (filter.columnId === 'funded_amount') {
        value = getAmountRange(deal.funded_amount)
      } else {
        const rawValue = deal[column.accessor]
        value = rawValue != null ? String(rawValue) : ''
      }

      return filter.selectedValues.includes(value)
    })
  })
}

/**
 * Apply date range filter
 */
function applyDateRangeFilter(deals: FundedDeal[], dateRange: DateRangeFilter): FundedDeal[] {
  if (!dateRange.startDate && !dateRange.endDate) return deals

  return deals.filter(deal => {
    const dealDate = parseDate(deal.funded_date)
    if (!dealDate) return false

    if (dateRange.startDate) {
      const start = new Date(dateRange.startDate)
      start.setHours(0, 0, 0, 0)
      if (dealDate < start) return false
    }

    if (dateRange.endDate) {
      const end = new Date(dateRange.endDate)
      end.setHours(23, 59, 59, 999)
      if (dealDate > end) return false
    }

    return true
  })
}

/**
 * Apply all filters to deals
 */
/**
 * Apply quick filters
 */
function applyQuickFilters(deals: FundedDeal[], quickFilters: TableState['quickFilters']): FundedDeal[] {
  let filtered = deals

  // ISO Only - rep is an ISO partner
  if (quickFilters.isoOnly) {
    filtered = filtered.filter(deal => deal.rep_is_iso === true)
  }

  // In-House Only - lender is in-house funded
  if (quickFilters.inhouseOnly) {
    filtered = filtered.filter(deal => deal.lender_inhouse_funded === true)
  }

  // New Business - deal_type is 'New Business'
  if (quickFilters.newBusinessOnly) {
    filtered = filtered.filter(deal => deal.deal_type === 'New Business')
  }

  // Pending Payment - funder hasn't paid Parkview yet
  if (quickFilters.pendingPayment) {
    filtered = filtered.filter(deal => deal.funder_paid_parkview !== true)
  }

  // This Month - funded date is in current month
  if (quickFilters.thisMonth) {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    filtered = filtered.filter(deal => {
      const date = parseDate(deal.funded_date)
      return date && date.getMonth() === currentMonth && date.getFullYear() === currentYear
    })
  }

  // LOC Only - is_loc is true
  if (quickFilters.locOnly) {
    filtered = filtered.filter(deal => deal.is_loc === true)
  }

  return filtered
}

export function filterDeals(deals: FundedDeal[], state: TableState): FundedDeal[] {
  let filtered = deals

  // Apply quick filters first
  if (state.quickFilters) {
    filtered = applyQuickFilters(filtered, state.quickFilters)
  }

  // Apply search
  filtered = applySearchFilter(filtered, state.searchQuery)

  // Apply column filters
  filtered = applyColumnFilters(filtered, state.filters)

  // Apply date range
  filtered = applyDateRangeFilter(filtered, state.dateRange)

  return filtered
}

// ============ SORTING ============

/**
 * Sort deals by multiple columns
 */
export function sortDeals(deals: FundedDeal[], sortConfigs: SortConfig[]): FundedDeal[] {
  if (sortConfigs.length === 0) return deals

  // Sort by priority (1 first, 2 second, etc.)
  const sortedConfigs = [...sortConfigs]
    .filter(c => c.direction !== null)
    .sort((a, b) => a.priority - b.priority)

  if (sortedConfigs.length === 0) return deals

  return [...deals].sort((a, b) => {
    for (const config of sortedConfigs) {
      const column = ALL_COLUMNS.find(c => c.id === config.columnId)
      if (!column) continue

      let aValue: string | number | null = a[column.accessor] as string | number | null
      let bValue: string | number | null = b[column.accessor] as string | number | null

      // Special handling for dates
      if (column.format === 'date') {
        const aDate = parseDate(aValue as string | null)
        const bDate = parseDate(bValue as string | null)
        aValue = aDate?.getTime() ?? 0
        bValue = bDate?.getTime() ?? 0
      }

      // Handle nulls
      if (aValue == null && bValue == null) continue
      if (aValue == null) return config.direction === 'asc' ? 1 : -1
      if (bValue == null) return config.direction === 'asc' ? -1 : 1

      // Compare
      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        // Trim whitespace before comparing to handle dirty data
        comparison = aValue.trim().localeCompare(bValue.trim(), undefined, { sensitivity: 'base' })
      } else {
        comparison = (aValue as number) - (bValue as number)
      }

      if (comparison !== 0) {
        return config.direction === 'asc' ? comparison : -comparison
      }
    }
    return 0
  })
}

// ============ GROUPING ============

/**
 * Calculate group totals
 */
function calculateGroupTotals(deals: FundedDeal[]): GroupTotals {
  const count = deals.length
  const totalFunded = deals.reduce((sum, d) => sum + (d.funded_amount ?? 0), 0)
  const totalCommission = deals.reduce((sum, d) => sum + (d.commission ?? 0), 0)
  const totalPsf = deals.reduce((sum, d) => sum + (d.psf ?? 0), 0)
  const totalRev = deals.reduce((sum, d) => sum + (d.total_rev ?? 0), 0)
  const totalRepCommission = deals.reduce((sum, d) => sum + (d.rep_commission ?? 0), 0)

  const factorRates = deals
    .map(d => d.factor_rate)
    .filter((r): r is number => r != null && r > 0)
  const avgFactorRate = factorRates.length > 0
    ? factorRates.reduce((sum, r) => sum + r, 0) / factorRates.length
    : 0

  return {
    count,
    totalFunded,
    totalCommission,
    totalPsf,
    totalRev,
    totalRepCommission,
    avgFactorRate,
  }
}

/**
 * Get group key for a deal based on grouping option
 */
function getGroupKey(deal: FundedDeal, groupBy: GroupByOption): string {
  switch (groupBy) {
    case 'funded_date_day':
      return getDayKey(deal.funded_date)
    case 'funded_date_month':
      return getMonthYearKey(deal.funded_date)
    case 'funded_date_year':
      return getYearKey(deal.funded_date)
    case 'deal_name':
      return deal.deal_name || 'Unknown'
    case 'lender':
      return deal.lender || 'Unknown'
    case 'rep':
      return deal.rep || 'Unknown'
    case 'funded_amount_range':
      return getAmountRange(deal.funded_amount)
    case 'term':
      return deal.term || 'Unknown'
    default:
      return 'all'
  }
}

/**
 * Get display label for a group key
 */
function getGroupLabel(key: string, groupBy: GroupByOption): string {
  switch (groupBy) {
    case 'funded_date_day':
      return formatDayLabel(key)
    case 'funded_date_month':
      return formatMonthYearLabel(key)
    case 'funded_date_year':
      return key === 'Unknown' ? key : key
    default:
      return key
  }
}

/**
 * Group deals by specified option
 */
export function groupDeals(
  deals: FundedDeal[],
  groupBy: GroupByOption,
  expandedGroups: Set<string> = new Set()
): GroupedData[] {
  if (groupBy === 'none') {
    return [{
      groupKey: 'all',
      groupLabel: 'All Deals',
      deals,
      totals: calculateGroupTotals(deals),
      isExpanded: true,
    }]
  }

  // Group deals
  const groups = new Map<string, FundedDeal[]>()

  for (const deal of deals) {
    const key = getGroupKey(deal, groupBy)
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(deal)
  }

  // Convert to array and sort
  const result: GroupedData[] = Array.from(groups.entries()).map(([key, groupDeals]) => ({
    groupKey: key,
    groupLabel: getGroupLabel(key, groupBy),
    deals: groupDeals,
    totals: calculateGroupTotals(groupDeals),
    isExpanded: expandedGroups.has(key),
  }))

  // Sort groups
  result.sort((a, b) => {
    // For date-based grouping, sort by date descending
    if (groupBy.startsWith('funded_date')) {
      return b.groupKey.localeCompare(a.groupKey)
    }
    // For amount ranges, sort by amount
    if (groupBy === 'funded_amount_range') {
      const order = ['$0-50K', '$50K-100K', '$100K-250K', '$250K+']
      return order.indexOf(a.groupKey) - order.indexOf(b.groupKey)
    }
    // For others, sort alphabetically
    return a.groupLabel.localeCompare(b.groupLabel)
  })

  return result
}

// ============ UNIQUE VALUES ============

/**
 * Get unique values for a column (for filter dropdowns)
 */
export function getUniqueColumnValues(deals: FundedDeal[], columnId: ColumnId): string[] {
  const column = ALL_COLUMNS.find(c => c.id === columnId)
  if (!column) return []

  // Special handling for funded_amount - return ranges
  if (columnId === 'funded_amount') {
    const usedRanges = new Set<string>()
    for (const deal of deals) {
      usedRanges.add(getAmountRange(deal.funded_amount))
    }
    return AMOUNT_RANGES_DATA.map(r => r.label).filter(r => usedRanges.has(r))
  }

  const values = new Set<string>()
  for (const deal of deals) {
    const value = deal[column.accessor]
    if (value != null && String(value).trim() !== '') {
      values.add(String(value))
    }
  }

  return Array.from(values).sort()
}

// ============ FORMATTING ============

/**
 * Format currency value
 */
export function formatCurrency(value: number | null): string {
  if (value == null) return '-'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

/**
 * Format factor rate
 */
export function formatFactorRate(value: number | null): string {
  if (value == null || value === 0) return '-'
  return value.toFixed(3)
}

/**
 * Format cell value based on column format
 */
export function formatCellValue(value: unknown, format?: string): string {
  if (value == null) return '-'

  switch (format) {
    case 'currency':
      return formatCurrency(value as number)
    case 'factor':
      return formatFactorRate(value as number)
    case 'date':
      return formatDateDisplay(value as string)
    default:
      return String(value) || '-'
  }
}

// ============ LOCAL STORAGE ============

const SAVED_VIEWS_KEY = 'parkview_saved_views'

/**
 * Load saved views from localStorage
 */
export function loadSavedViews(): SavedView[] {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(SAVED_VIEWS_KEY)
    if (!data) return []
    return JSON.parse(data)
  } catch {
    return []
  }
}

/**
 * Save views to localStorage
 */
export function saveSavedViews(views: SavedView[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views))
  } catch (error) {
    console.error('Failed to save views:', error)
  }
}

/**
 * Create a new saved view
 */
export function createSavedView(name: string, state: TableState): SavedView {
  return {
    id: crypto.randomUUID(),
    name,
    state: { ...state },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Delete a saved view
 */
export function deleteSavedView(views: SavedView[], viewId: string): SavedView[] {
  return views.filter(v => v.id !== viewId)
}

// ============ PAGINATION ============

/**
 * Paginate data
 */
export function paginateData<T>(data: T[], pageSize: number, currentPage: number): T[] {
  if (pageSize === -1) return data // -1 means "All"

  const start = (currentPage - 1) * pageSize
  return data.slice(start, start + pageSize)
}

/**
 * Calculate total pages
 */
export function getTotalPages(totalItems: number, pageSize: number): number {
  if (pageSize === -1) return 1
  return Math.ceil(totalItems / pageSize)
}

// ============ STATE HELPERS ============

/**
 * Check if any filters are active
 */
export function hasActiveFilters(state: TableState): boolean {
  return (
    state.filters.length > 0 ||
    state.dateRange.startDate !== null ||
    state.dateRange.endDate !== null ||
    state.searchQuery.trim() !== ''
  )
}

/**
 * Get active filter count
 */
export function getActiveFilterCount(state: TableState): number {
  let count = 0
  count += state.filters.filter(f => f.selectedValues.length > 0).length
  if (state.dateRange.startDate || state.dateRange.endDate) count++
  if (state.searchQuery.trim()) count++
  return count
}

/**
 * Reset state to defaults
 */
export function resetToDefault(): TableState {
  return { ...DEFAULT_TABLE_STATE }
}

/**
 * Toggle sort on a column (cycles: none -> asc -> desc -> none)
 * Single column sort only - clicking a new column clears previous sort
 */
export function toggleColumnSort(sortConfigs: SortConfig[], columnId: ColumnId): SortConfig[] {
  const existing = sortConfigs.find(c => c.columnId === columnId)

  if (!existing) {
    // New column clicked - replace any existing sort with this one (asc first)
    return [{ columnId, direction: 'asc', priority: 1 }]
  }

  if (existing.direction === 'asc') {
    // Switch to desc (Z to A)
    return [{ columnId, direction: 'desc', priority: 1 }]
  }

  if (existing.direction === 'desc') {
    // Remove sort entirely
    return []
  }

  return sortConfigs
}

/**
 * Get sort indicator for a column
 */
export function getSortIndicator(sortConfigs: SortConfig[], columnId: ColumnId): { priority: number | null; direction: 'asc' | 'desc' | null } {
  const config = sortConfigs.find(c => c.columnId === columnId)
  if (!config || config.direction === null) {
    return { priority: null, direction: null }
  }
  return { priority: config.priority, direction: config.direction }
}
