import type { DealWithPayment, PaymentStatus, CommissionPayoutRep, CommissionPayoutISO } from '@/types/database'
import type {
  CommissionColumnId,
  CommissionSortConfig,
  CommissionColumnFilter,
  DateRangeFilter,
  CommissionGroupByOption,
  CommissionGroupedData,
  CommissionGroupTotals,
  CommissionTableState,
  CommissionSavedView,
  SortDirection,
  RepCommissionColumnId,
  RepCommissionSortConfig,
  RepCommissionFilter,
  RepCommissionTableState,
  RepCommissionSavedView,
  RepCommissionGroupByOption,
  ISOCommissionColumnId,
  ISOCommissionSortConfig,
  ISOCommissionFilter,
  ISOCommissionTableState,
  ISOCommissionSavedView,
  ISOCommissionGroupByOption,
} from '@/types/table'
import {
  COMMISSION_COLUMNS,
  DEFAULT_COMMISSION_TABLE_STATE,
  REP_COMMISSION_COLUMNS,
  DEFAULT_REP_COMMISSION_TABLE_STATE,
  ISO_COMMISSION_COLUMNS,
  DEFAULT_ISO_COMMISSION_TABLE_STATE,
} from '@/types/table'

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

// ============ FILTERING ============

/**
 * Apply search filter to deals
 */
function applySearchFilter(deals: DealWithPayment[], searchQuery: string): DealWithPayment[] {
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
function applyColumnFilters(deals: DealWithPayment[], filters: CommissionColumnFilter[]): DealWithPayment[] {
  if (filters.length === 0) return deals

  return deals.filter(deal => {
    return filters.every(filter => {
      if (filter.selectedValues.length === 0) return true

      const column = COMMISSION_COLUMNS.find(c => c.id === filter.columnId)
      if (!column) return true

      const rawValue = deal[column.accessor]
      const value = rawValue != null ? String(rawValue) : ''

      return filter.selectedValues.includes(value)
    })
  })
}

/**
 * Apply date range filter
 */
function applyDateRangeFilter(deals: DealWithPayment[], dateRange: DateRangeFilter): DealWithPayment[] {
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
 * Apply rep filter
 */
function applyRepFilter(deals: DealWithPayment[], selectedRep: string | null): DealWithPayment[] {
  if (!selectedRep) return deals
  return deals.filter(deal => deal.rep === selectedRep)
}

/**
 * Apply month filter
 */
function applyMonthFilter(deals: DealWithPayment[], selectedMonth: number | null): DealWithPayment[] {
  if (selectedMonth === null) return deals
  return deals.filter(deal => {
    const date = parseDate(deal.funded_date)
    if (!date) return false
    return date.getMonth() + 1 === selectedMonth
  })
}

/**
 * Apply year filter
 */
function applyYearFilter(deals: DealWithPayment[], selectedYear: number | null): DealWithPayment[] {
  if (selectedYear === null) return deals
  return deals.filter(deal => {
    const date = parseDate(deal.funded_date)
    if (!date) return false
    return date.getFullYear() === selectedYear
  })
}

/**
 * Apply all filters to deals
 */
export function filterCommissionDeals(deals: DealWithPayment[], state: CommissionTableState): DealWithPayment[] {
  let filtered = deals

  // Apply search
  filtered = applySearchFilter(filtered, state.searchQuery)

  // Apply column filters
  filtered = applyColumnFilters(filtered, state.filters)

  // Apply date range
  filtered = applyDateRangeFilter(filtered, state.dateRange)

  // Apply rep filter
  filtered = applyRepFilter(filtered, state.selectedRep)

  // Apply month filter
  filtered = applyMonthFilter(filtered, state.selectedMonth)

  // Apply year filter
  filtered = applyYearFilter(filtered, state.selectedYear)

  return filtered
}

// ============ SORTING ============

/**
 * Sort deals by multiple columns
 */
export function sortCommissionDeals(deals: DealWithPayment[], sortConfigs: CommissionSortConfig[]): DealWithPayment[] {
  if (sortConfigs.length === 0) return deals

  // Sort by priority (1 first, 2 second, etc.)
  const sortedConfigs = [...sortConfigs]
    .filter(c => c.direction !== null)
    .sort((a, b) => a.priority - b.priority)

  if (sortedConfigs.length === 0) return deals

  return [...deals].sort((a, b) => {
    for (const config of sortedConfigs) {
      const column = COMMISSION_COLUMNS.find(c => c.id === config.columnId)
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
        comparison = aValue.localeCompare(bValue)
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
function calculateCommissionGroupTotals(deals: DealWithPayment[]): CommissionGroupTotals {
  const count = deals.length
  const totalFunded = deals.reduce((sum, d) => sum + (d.funded_amount ?? 0), 0)
  const totalRepCommission = deals.reduce((sum, d) => sum + (d.rep_commission ?? 0), 0)
  const pendingCount = deals.filter(d => d.payment_status === 'Pending').length
  const paidCount = deals.filter(d => d.payment_status === 'Paid').length
  const clawbackCount = deals.filter(d => d.payment_status === 'Clawback').length

  return {
    count,
    totalFunded,
    totalRepCommission,
    pendingCount,
    paidCount,
    clawbackCount,
  }
}

/**
 * Get group key for a deal based on grouping option
 */
function getCommissionGroupKey(deal: DealWithPayment, groupBy: CommissionGroupByOption): string {
  switch (groupBy) {
    case 'funded_date_day':
      return getDayKey(deal.funded_date)
    case 'funded_date_month':
      return getMonthYearKey(deal.funded_date)
    case 'funded_date_year':
      return getYearKey(deal.funded_date)
    case 'lender':
      return deal.lender || 'Unknown'
    case 'rep':
      return deal.rep || 'Unknown'
    case 'payment_status':
      return deal.payment_status || 'Unknown'
    default:
      return 'all'
  }
}

/**
 * Get display label for a group key
 */
function getCommissionGroupLabel(key: string, groupBy: CommissionGroupByOption): string {
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
export function groupCommissionDeals(
  deals: DealWithPayment[],
  groupBy: CommissionGroupByOption,
  expandedGroups: Set<string> = new Set()
): CommissionGroupedData[] {
  if (groupBy === 'none') {
    return [{
      groupKey: 'all',
      groupLabel: 'All Deals',
      deals,
      totals: calculateCommissionGroupTotals(deals),
      isExpanded: true,
    }]
  }

  // Group deals
  const groups = new Map<string, DealWithPayment[]>()

  for (const deal of deals) {
    const key = getCommissionGroupKey(deal, groupBy)
    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(deal)
  }

  // Convert to array and sort
  const result: CommissionGroupedData[] = Array.from(groups.entries()).map(([key, groupDeals]) => ({
    groupKey: key,
    groupLabel: getCommissionGroupLabel(key, groupBy),
    deals: groupDeals,
    totals: calculateCommissionGroupTotals(groupDeals),
    isExpanded: expandedGroups.has(key),
  }))

  // Sort groups
  result.sort((a, b) => {
    // For date-based grouping, sort by date descending
    if (groupBy.startsWith('funded_date')) {
      return b.groupKey.localeCompare(a.groupKey)
    }
    // For payment status, order: Pending, Paid, Clawback
    if (groupBy === 'payment_status') {
      const order = ['Pending', 'Paid', 'Clawback', 'Unknown']
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
export function getUniqueCommissionColumnValues(deals: DealWithPayment[], columnId: CommissionColumnId): string[] {
  const column = COMMISSION_COLUMNS.find(c => c.id === columnId)
  if (!column) return []

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
 * Format cell value based on column format
 */
export function formatCommissionCellValue(value: unknown, format?: string): string {
  if (value == null) return '-'

  switch (format) {
    case 'currency':
      return formatCurrency(value as number)
    case 'date':
      return formatDateDisplay(value as string)
    case 'status':
      return String(value) || '-'
    default:
      return String(value) || '-'
  }
}

// ============ LOCAL STORAGE ============

const COMMISSION_SAVED_VIEWS_KEY = 'parkview_commission_saved_views'

/**
 * Load saved views from localStorage
 */
export function loadCommissionSavedViews(): CommissionSavedView[] {
  if (typeof window === 'undefined') return []

  try {
    const data = localStorage.getItem(COMMISSION_SAVED_VIEWS_KEY)
    if (!data) return []
    return JSON.parse(data)
  } catch {
    return []
  }
}

/**
 * Save views to localStorage
 */
export function saveCommissionSavedViews(views: CommissionSavedView[]): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(COMMISSION_SAVED_VIEWS_KEY, JSON.stringify(views))
  } catch (error) {
    console.error('Failed to save commission views:', error)
  }
}

/**
 * Create a new saved view
 */
export function createCommissionSavedView(name: string, state: CommissionTableState): CommissionSavedView {
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
export function deleteCommissionSavedView(views: CommissionSavedView[], viewId: string): CommissionSavedView[] {
  return views.filter(v => v.id !== viewId)
}

// ============ PAGINATION ============

/**
 * Paginate data
 */
export function paginateCommissionData<T>(data: T[], pageSize: number, currentPage: number): T[] {
  if (pageSize === -1) return data // -1 means "All"

  const start = (currentPage - 1) * pageSize
  return data.slice(start, start + pageSize)
}

/**
 * Calculate total pages
 */
export function getCommissionTotalPages(totalItems: number, pageSize: number): number {
  if (pageSize === -1) return 1
  return Math.ceil(totalItems / pageSize)
}

// ============ STATE HELPERS ============

/**
 * Check if any filters are active
 */
export function hasActiveCommissionFilters(state: CommissionTableState): boolean {
  return (
    state.filters.length > 0 ||
    state.dateRange.startDate !== null ||
    state.dateRange.endDate !== null ||
    state.searchQuery.trim() !== '' ||
    state.selectedRep !== null ||
    state.selectedMonth !== null ||
    state.selectedYear !== null
  )
}

/**
 * Get active filter count
 */
export function getActiveCommissionFilterCount(state: CommissionTableState): number {
  let count = 0
  count += state.filters.filter(f => f.selectedValues.length > 0).length
  if (state.dateRange.startDate || state.dateRange.endDate) count++
  if (state.searchQuery.trim()) count++
  if (state.selectedRep) count++
  if (state.selectedMonth) count++
  if (state.selectedYear) count++
  return count
}

/**
 * Reset state to defaults
 */
export function resetToCommissionDefault(): CommissionTableState {
  return { ...DEFAULT_COMMISSION_TABLE_STATE }
}

/**
 * Toggle sort on a column (cycles: none -> desc -> asc -> none)
 */
export function toggleCommissionColumnSort(sortConfigs: CommissionSortConfig[], columnId: CommissionColumnId): CommissionSortConfig[] {
  const existingIndex = sortConfigs.findIndex(c => c.columnId === columnId)

  if (existingIndex === -1) {
    // Add new sort (desc first)
    const maxPriority = Math.max(0, ...sortConfigs.map(c => c.priority))
    return [...sortConfigs, { columnId, direction: 'desc', priority: maxPriority + 1 }]
  }

  const existing = sortConfigs[existingIndex]

  if (existing.direction === 'desc') {
    // Switch to asc
    const updated = [...sortConfigs]
    updated[existingIndex] = { ...existing, direction: 'asc' }
    return updated
  }

  if (existing.direction === 'asc') {
    // Remove sort
    const updated = sortConfigs.filter((_, i) => i !== existingIndex)
    // Re-assign priorities
    return updated.map((c, i) => ({ ...c, priority: i + 1 }))
  }

  return sortConfigs
}

/**
 * Get sort indicator for a column
 */
export function getCommissionSortIndicator(sortConfigs: CommissionSortConfig[], columnId: CommissionColumnId): { priority: number | null; direction: 'asc' | 'desc' | null } {
  const config = sortConfigs.find(c => c.columnId === columnId)
  if (!config || config.direction === null) {
    return { priority: null, direction: null }
  }
  return { priority: config.priority, direction: config.direction }
}

// ============ REP COMMISSION UTILITIES ============

export function filterRepCommissions(
  data: CommissionPayoutRep[],
  state: RepCommissionTableState
): CommissionPayoutRep[] {
  let filtered = data

  // Apply search
  if (state.searchQuery.trim()) {
    const query = state.searchQuery.toLowerCase().trim()
    filtered = filtered.filter(row => {
      const dealName = (row.deal_name || '').toLowerCase()
      const repName = (row.rep_name || '').toLowerCase()
      const lender = (row.lender || '').toLowerCase()
      return dealName.includes(query) || repName.includes(query) || lender.includes(query)
    })
  }

  // Apply column filters
  for (const filter of state.filters) {
    if (filter.selectedValues.length === 0) continue

    filtered = filtered.filter(row => {
      let value: string
      switch (filter.columnId) {
        case 'deal_name':
          value = row.deal_name || ''
          break
        case 'rep_name':
          value = row.rep_name || ''
          break
        case 'lender':
          value = row.lender || ''
          break
        case 'paid_to_rep':
          value = row.paid ? 'Paid' : 'Pending'
          break
        case 'funder_paid':
          if (row.lender_inhouse) {
            value = 'In-House'
          } else {
            value = row.funder_paid_parkview ? 'Received' : 'Pending'
          }
          break
        default:
          value = ''
      }
      return filter.selectedValues.includes(value)
    })
  }

  // Apply date range
  if (state.dateRange.startDate || state.dateRange.endDate) {
    filtered = filtered.filter(row => {
      const rowDate = parseDate(row.funded_date ?? null)
      if (!rowDate) return false

      if (state.dateRange.startDate) {
        const start = new Date(state.dateRange.startDate)
        start.setHours(0, 0, 0, 0)
        if (rowDate < start) return false
      }

      if (state.dateRange.endDate) {
        const end = new Date(state.dateRange.endDate)
        end.setHours(23, 59, 59, 999)
        if (rowDate > end) return false
      }

      return true
    })
  }

  return filtered
}

export function sortRepCommissions(
  data: CommissionPayoutRep[],
  sortConfigs: RepCommissionSortConfig[]
): CommissionPayoutRep[] {
  if (sortConfigs.length === 0) return data

  const sortedConfigs = [...sortConfigs]
    .filter(c => c.direction !== null)
    .sort((a, b) => a.priority - b.priority)

  if (sortedConfigs.length === 0) return data

  return [...data].sort((a, b) => {
    for (const config of sortedConfigs) {
      let aValue: string | number | boolean | null
      let bValue: string | number | boolean | null

      switch (config.columnId) {
        case 'deal_name':
          aValue = a.deal_name ?? null
          bValue = b.deal_name ?? null
          break
        case 'rep_name':
          aValue = a.rep_name ?? null
          bValue = b.rep_name ?? null
          break
        case 'lender':
          aValue = a.lender ?? null
          bValue = b.lender ?? null
          break
        case 'funded_date':
          aValue = parseDate(a.funded_date ?? null)?.getTime() ?? 0
          bValue = parseDate(b.funded_date ?? null)?.getTime() ?? 0
          break
        case 'funded_amount':
          aValue = a.funded_amount ?? 0
          bValue = b.funded_amount ?? 0
          break
        case 'commission':
          aValue = a.commission_amount ?? 0
          bValue = b.commission_amount ?? 0
          break
        case 'paid_to_rep':
          aValue = a.paid ? 1 : 0
          bValue = b.paid ? 1 : 0
          break
        case 'funder_paid':
          aValue = a.funder_paid_parkview ? 1 : 0
          bValue = b.funder_paid_parkview ? 1 : 0
          break
        default:
          continue
      }

      if (aValue == null && bValue == null) continue
      if (aValue == null) return config.direction === 'asc' ? 1 : -1
      if (bValue == null) return config.direction === 'asc' ? -1 : 1

      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, undefined, { sensitivity: 'base' })
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

export interface RepCommissionGroupedData {
  groupKey: string
  groupLabel: string
  rows: CommissionPayoutRep[]
  totals: {
    count: number
    totalFunded: number
    totalCommission: number
    paidCount: number
    pendingCount: number
  }
  isExpanded: boolean
}

export function groupRepCommissions(
  data: CommissionPayoutRep[],
  groupBy: RepCommissionGroupByOption,
  expandedGroups: Set<string> = new Set()
): RepCommissionGroupedData[] {
  if (groupBy === 'none') {
    const totals = {
      count: data.length,
      totalFunded: data.reduce((sum, r) => sum + (r.funded_amount ?? 0), 0),
      totalCommission: data.reduce((sum, r) => sum + (r.commission_amount ?? 0), 0),
      paidCount: data.filter(r => r.paid).length,
      pendingCount: data.filter(r => !r.paid).length,
    }
    return [{
      groupKey: 'all',
      groupLabel: 'All Commissions',
      rows: data,
      totals,
      isExpanded: true,
    }]
  }

  const groups = new Map<string, CommissionPayoutRep[]>()

  for (const row of data) {
    let key: string
    switch (groupBy) {
      case 'rep_name':
        key = row.rep_name || 'Unknown'
        break
      case 'lender':
        key = row.lender || 'Unknown'
        break
      case 'paid_to_rep':
        key = row.paid ? 'Paid' : 'Pending'
        break
      case 'funder_paid':
        if (row.lender_inhouse) {
          key = 'In-House'
        } else {
          key = row.funder_paid_parkview ? 'Received' : 'Pending'
        }
        break
      case 'funded_date_month':
        key = getMonthYearKey(row.funded_date ?? null)
        break
      case 'funded_date_year':
        key = getYearKey(row.funded_date ?? null)
        break
      default:
        key = 'all'
    }

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(row)
  }

  const result: RepCommissionGroupedData[] = Array.from(groups.entries()).map(([key, rows]) => {
    const totals = {
      count: rows.length,
      totalFunded: rows.reduce((sum, r) => sum + (r.funded_amount ?? 0), 0),
      totalCommission: rows.reduce((sum, r) => sum + (r.commission_amount ?? 0), 0),
      paidCount: rows.filter(r => r.paid).length,
      pendingCount: rows.filter(r => !r.paid).length,
    }

    let label = key
    if (groupBy === 'funded_date_month') {
      label = formatMonthYearLabel(key)
    }

    return {
      groupKey: key,
      groupLabel: label,
      rows,
      totals,
      isExpanded: expandedGroups.has(key),
    }
  })

  // Sort groups
  result.sort((a, b) => {
    if (groupBy.startsWith('funded_date')) {
      return b.groupKey.localeCompare(a.groupKey)
    }
    return a.groupLabel.localeCompare(b.groupLabel)
  })

  return result
}

export function getRepCommissionUniqueValues(
  data: CommissionPayoutRep[],
  columnId: RepCommissionColumnId
): string[] {
  const values = new Set<string>()

  for (const row of data) {
    let value: string
    switch (columnId) {
      case 'deal_name':
        value = row.deal_name || ''
        break
      case 'rep_name':
        value = row.rep_name || ''
        break
      case 'lender':
        value = row.lender || ''
        break
      case 'paid_to_rep':
        value = row.paid ? 'Paid' : 'Pending'
        break
      case 'funder_paid':
        if (row.lender_inhouse) {
          value = 'In-House'
        } else {
          value = row.funder_paid_parkview ? 'Received' : 'Pending'
        }
        break
      default:
        continue
    }
    if (value.trim()) {
      values.add(value)
    }
  }

  return Array.from(values).sort()
}

export function toggleRepCommissionSort(
  sortConfigs: RepCommissionSortConfig[],
  columnId: RepCommissionColumnId
): RepCommissionSortConfig[] {
  const existing = sortConfigs.find(c => c.columnId === columnId)

  if (!existing) {
    return [{ columnId, direction: 'asc', priority: 1 }]
  }

  if (existing.direction === 'asc') {
    return [{ columnId, direction: 'desc', priority: 1 }]
  }

  return []
}

export function getRepCommissionSortIndicator(
  sortConfigs: RepCommissionSortConfig[],
  columnId: RepCommissionColumnId
): { priority: number | null; direction: SortDirection } {
  const config = sortConfigs.find(c => c.columnId === columnId)
  if (!config || config.direction === null) {
    return { priority: null, direction: null }
  }
  return { priority: config.priority, direction: config.direction }
}

// Rep Commission localStorage helpers
const REP_COMMISSION_SAVED_VIEWS_KEY = 'parkview_rep_commission_saved_views'

export function loadRepCommissionSavedViews(): RepCommissionSavedView[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(REP_COMMISSION_SAVED_VIEWS_KEY)
    if (!data) return []
    return JSON.parse(data)
  } catch {
    return []
  }
}

export function saveRepCommissionSavedViews(views: RepCommissionSavedView[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(REP_COMMISSION_SAVED_VIEWS_KEY, JSON.stringify(views))
  } catch (error) {
    console.error('Failed to save views:', error)
  }
}

export function createRepCommissionSavedView(
  name: string,
  state: RepCommissionTableState
): RepCommissionSavedView {
  return {
    id: crypto.randomUUID(),
    name,
    state: { ...state },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function resetRepCommissionToDefault(): RepCommissionTableState {
  return { ...DEFAULT_REP_COMMISSION_TABLE_STATE }
}

export function hasRepCommissionActiveFilters(state: RepCommissionTableState): boolean {
  return (
    state.filters.length > 0 ||
    state.dateRange.startDate !== null ||
    state.dateRange.endDate !== null ||
    state.searchQuery.trim() !== ''
  )
}

export function getRepCommissionActiveFilterCount(state: RepCommissionTableState): number {
  let count = 0
  count += state.filters.filter(f => f.selectedValues.length > 0).length
  if (state.dateRange.startDate || state.dateRange.endDate) count++
  if (state.searchQuery.trim()) count++
  return count
}

// ============ ISO COMMISSION UTILITIES ============

export function filterISOCommissions(
  data: CommissionPayoutISO[],
  state: ISOCommissionTableState
): CommissionPayoutISO[] {
  let filtered = data

  // Apply search
  if (state.searchQuery.trim()) {
    const query = state.searchQuery.toLowerCase().trim()
    filtered = filtered.filter(row => {
      const dealName = (row.deal_name || '').toLowerCase()
      const isoName = (row.iso_name || '').toLowerCase()
      const lender = (row.lender || '').toLowerCase()
      return dealName.includes(query) || isoName.includes(query) || lender.includes(query)
    })
  }

  // Apply column filters
  for (const filter of state.filters) {
    if (filter.selectedValues.length === 0) continue

    filtered = filtered.filter(row => {
      let value: string
      switch (filter.columnId) {
        case 'deal_name':
          value = row.deal_name || ''
          break
        case 'iso_name':
          value = row.iso_name || ''
          break
        case 'lender':
          value = row.lender || ''
          break
        case 'paid_to_iso':
          value = row.paid ? 'Paid' : 'Pending'
          break
        default:
          value = ''
      }
      return filter.selectedValues.includes(value)
    })
  }

  // Apply date range
  if (state.dateRange.startDate || state.dateRange.endDate) {
    filtered = filtered.filter(row => {
      const rowDate = parseDate(row.funded_date ?? null)
      if (!rowDate) return false

      if (state.dateRange.startDate) {
        const start = new Date(state.dateRange.startDate)
        start.setHours(0, 0, 0, 0)
        if (rowDate < start) return false
      }

      if (state.dateRange.endDate) {
        const end = new Date(state.dateRange.endDate)
        end.setHours(23, 59, 59, 999)
        if (rowDate > end) return false
      }

      return true
    })
  }

  return filtered
}

export function sortISOCommissions(
  data: CommissionPayoutISO[],
  sortConfigs: ISOCommissionSortConfig[]
): CommissionPayoutISO[] {
  if (sortConfigs.length === 0) return data

  const sortedConfigs = [...sortConfigs]
    .filter(c => c.direction !== null)
    .sort((a, b) => a.priority - b.priority)

  if (sortedConfigs.length === 0) return data

  return [...data].sort((a, b) => {
    for (const config of sortedConfigs) {
      let aValue: string | number | boolean | null
      let bValue: string | number | boolean | null

      switch (config.columnId) {
        case 'deal_name':
          aValue = a.deal_name ?? null
          bValue = b.deal_name ?? null
          break
        case 'iso_name':
          aValue = a.iso_name ?? null
          bValue = b.iso_name ?? null
          break
        case 'lender':
          aValue = a.lender ?? null
          bValue = b.lender ?? null
          break
        case 'funded_date':
          aValue = parseDate(a.funded_date ?? null)?.getTime() ?? 0
          bValue = parseDate(b.funded_date ?? null)?.getTime() ?? 0
          break
        case 'funded_amount':
          aValue = a.funded_amount ?? 0
          bValue = b.funded_amount ?? 0
          break
        case 'commission':
          aValue = a.commission_amount ?? 0
          bValue = b.commission_amount ?? 0
          break
        case 'paid_to_iso':
          aValue = a.paid ? 1 : 0
          bValue = b.paid ? 1 : 0
          break
        default:
          continue
      }

      if (aValue == null && bValue == null) continue
      if (aValue == null) return config.direction === 'asc' ? 1 : -1
      if (bValue == null) return config.direction === 'asc' ? -1 : 1

      let comparison = 0
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue, undefined, { sensitivity: 'base' })
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

export interface ISOCommissionGroupedData {
  groupKey: string
  groupLabel: string
  rows: CommissionPayoutISO[]
  totals: {
    count: number
    totalFunded: number
    totalCommission: number
    paidCount: number
    pendingCount: number
  }
  isExpanded: boolean
}

export function groupISOCommissions(
  data: CommissionPayoutISO[],
  groupBy: ISOCommissionGroupByOption,
  expandedGroups: Set<string> = new Set()
): ISOCommissionGroupedData[] {
  if (groupBy === 'none') {
    const totals = {
      count: data.length,
      totalFunded: data.reduce((sum, r) => sum + (r.funded_amount ?? 0), 0),
      totalCommission: data.reduce((sum, r) => sum + (r.commission_amount ?? 0), 0),
      paidCount: data.filter(r => r.paid).length,
      pendingCount: data.filter(r => !r.paid).length,
    }
    return [{
      groupKey: 'all',
      groupLabel: 'All Commissions',
      rows: data,
      totals,
      isExpanded: true,
    }]
  }

  const groups = new Map<string, CommissionPayoutISO[]>()

  for (const row of data) {
    let key: string
    switch (groupBy) {
      case 'iso_name':
        key = row.iso_name || 'Unknown'
        break
      case 'lender':
        key = row.lender || 'Unknown'
        break
      case 'paid_to_iso':
        key = row.paid ? 'Paid' : 'Pending'
        break
      case 'funded_date_month':
        key = getMonthYearKey(row.funded_date ?? null)
        break
      case 'funded_date_year':
        key = getYearKey(row.funded_date ?? null)
        break
      default:
        key = 'all'
    }

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(row)
  }

  const result: ISOCommissionGroupedData[] = Array.from(groups.entries()).map(([key, rows]) => {
    const totals = {
      count: rows.length,
      totalFunded: rows.reduce((sum, r) => sum + (r.funded_amount ?? 0), 0),
      totalCommission: rows.reduce((sum, r) => sum + (r.commission_amount ?? 0), 0),
      paidCount: rows.filter(r => r.paid).length,
      pendingCount: rows.filter(r => !r.paid).length,
    }

    let label = key
    if (groupBy === 'funded_date_month') {
      label = formatMonthYearLabel(key)
    }

    return {
      groupKey: key,
      groupLabel: label,
      rows,
      totals,
      isExpanded: expandedGroups.has(key),
    }
  })

  // Sort groups
  result.sort((a, b) => {
    if (groupBy.startsWith('funded_date')) {
      return b.groupKey.localeCompare(a.groupKey)
    }
    return a.groupLabel.localeCompare(b.groupLabel)
  })

  return result
}

export function getISOCommissionUniqueValues(
  data: CommissionPayoutISO[],
  columnId: ISOCommissionColumnId
): string[] {
  const values = new Set<string>()

  for (const row of data) {
    let value: string
    switch (columnId) {
      case 'deal_name':
        value = row.deal_name || ''
        break
      case 'iso_name':
        value = row.iso_name || ''
        break
      case 'lender':
        value = row.lender || ''
        break
      case 'paid_to_iso':
        value = row.paid ? 'Paid' : 'Pending'
        break
      default:
        continue
    }
    if (value.trim()) {
      values.add(value)
    }
  }

  return Array.from(values).sort()
}

export function toggleISOCommissionSort(
  sortConfigs: ISOCommissionSortConfig[],
  columnId: ISOCommissionColumnId
): ISOCommissionSortConfig[] {
  const existing = sortConfigs.find(c => c.columnId === columnId)

  if (!existing) {
    return [{ columnId, direction: 'asc', priority: 1 }]
  }

  if (existing.direction === 'asc') {
    return [{ columnId, direction: 'desc', priority: 1 }]
  }

  return []
}

export function getISOCommissionSortIndicator(
  sortConfigs: ISOCommissionSortConfig[],
  columnId: ISOCommissionColumnId
): { priority: number | null; direction: SortDirection } {
  const config = sortConfigs.find(c => c.columnId === columnId)
  if (!config || config.direction === null) {
    return { priority: null, direction: null }
  }
  return { priority: config.priority, direction: config.direction }
}

// ISO Commission localStorage helpers
const ISO_COMMISSION_SAVED_VIEWS_KEY = 'parkview_iso_commission_saved_views'

export function loadISOCommissionSavedViews(): ISOCommissionSavedView[] {
  if (typeof window === 'undefined') return []
  try {
    const data = localStorage.getItem(ISO_COMMISSION_SAVED_VIEWS_KEY)
    if (!data) return []
    return JSON.parse(data)
  } catch {
    return []
  }
}

export function saveISOCommissionSavedViews(views: ISOCommissionSavedView[]): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(ISO_COMMISSION_SAVED_VIEWS_KEY, JSON.stringify(views))
  } catch (error) {
    console.error('Failed to save views:', error)
  }
}

export function createISOCommissionSavedView(
  name: string,
  state: ISOCommissionTableState
): ISOCommissionSavedView {
  return {
    id: crypto.randomUUID(),
    name,
    state: { ...state },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function resetISOCommissionToDefault(): ISOCommissionTableState {
  return { ...DEFAULT_ISO_COMMISSION_TABLE_STATE }
}

export function hasISOCommissionActiveFilters(state: ISOCommissionTableState): boolean {
  return (
    state.filters.length > 0 ||
    state.dateRange.startDate !== null ||
    state.dateRange.endDate !== null ||
    state.searchQuery.trim() !== ''
  )
}

export function getISOCommissionActiveFilterCount(state: ISOCommissionTableState): number {
  let count = 0
  count += state.filters.filter(f => f.selectedValues.length > 0).length
  if (state.dateRange.startDate || state.dateRange.endDate) count++
  if (state.searchQuery.trim()) count++
  return count
}
