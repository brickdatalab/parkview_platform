import { createClient } from '@/lib/supabase/client'
import type { FundedDeal, RepSummary } from '@/types/database'

export interface DashboardFilters {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'all'
  rep: string | null
  lender: string | null
  year?: number
}

export interface FundedDealsFilters {
  month: number | null  // 1-12, null = all months
  year: number
  rep: string | null
  lender: string | null
  dealType: string | null
  search: string
  sortBy: SortField
  sortDirection: 'asc' | 'desc'
}

export type SortField =
  | 'funded_date'
  | 'funded_amount'
  | 'rep'
  | 'lender'
  | 'commission'
  | 'deal_name'
  | 'factor_rate'
  | 'term'
  | 'psf'
  | 'total_rev'
  | 'rep_commission'

export interface DashboardSummary {
  totalFunded: number
  totalCommission: number
  dealCount: number
  avgFactorRate: number
}

/**
 * Get quarter date range based on quarter selection and year
 */
function getQuarterDateRange(quarter: string, year: number = new Date().getFullYear()): { start: string; end: string } | null {
  if (quarter === 'all') return null

  const quarters: Record<string, { start: string; end: string }> = {
    Q1: { start: `${year}-01-01`, end: `${year}-03-31` },
    Q2: { start: `${year}-04-01`, end: `${year}-06-30` },
    Q3: { start: `${year}-07-01`, end: `${year}-09-30` },
    Q4: { start: `${year}-10-01`, end: `${year}-12-31` }
  }

  return quarters[quarter] || null
}

/**
 * Parse MM/DD/YYYY date format to YYYY-MM-DD for comparison
 */
function parseDate(dateStr: string | null): Date | null {
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
 * Check if a date falls within a quarter
 */
function isInQuarter(dateStr: string | null, quarter: string, year: number): boolean {
  if (quarter === 'all') return true
  if (!dateStr) return false

  const date = parseDate(dateStr)
  if (!date) return false

  const range = getQuarterDateRange(quarter, year)
  if (!range) return true

  const startDate = new Date(range.start)
  const endDate = new Date(range.end)
  endDate.setHours(23, 59, 59, 999)

  return date >= startDate && date <= endDate
}

/**
 * Fetch all funded deals from Supabase
 * Uses pagination to bypass Supabase's default 1000 row limit
 */
export async function fetchFundedDeals(): Promise<FundedDeal[]> {
  const allDeals: FundedDeal[] = []
  const pageSize = 1000
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await createClient()
      .from('funded_deals')
      .select('*')
      .order('funded_date', { ascending: false })
      .range(offset, offset + pageSize - 1)

    if (error) {
      console.error('Error fetching funded deals:', error)
      throw error
    }

    if (data && data.length > 0) {
      allDeals.push(...data)
      offset += pageSize
      hasMore = data.length === pageSize
    } else {
      hasMore = false
    }
  }

  return allDeals
}

/**
 * Fetch unique reps from funded deals
 */
export async function fetchUniqueReps(): Promise<string[]> {
  const { data, error } = await createClient()
    .from('funded_deals')
    .select('rep')
    .not('rep', 'is', null)

  if (error) {
    console.error('Error fetching reps:', error)
    throw error
  }

  const uniqueReps = [...new Set((data as { rep: string | null }[] | null)?.map(d => d.rep).filter(Boolean) as string[])]
  return uniqueReps.sort()
}

/**
 * Fetch unique lenders from funded deals
 */
export async function fetchUniqueLenders(): Promise<string[]> {
  const { data, error } = await createClient()
    .from('funded_deals')
    .select('lender')
    .not('lender', 'is', null)

  if (error) {
    console.error('Error fetching lenders:', error)
    throw error
  }

  const uniqueLenders = [...new Set((data as { lender: string | null }[] | null)?.map(d => d.lender).filter(Boolean) as string[])]
  return uniqueLenders.sort()
}

/**
 * Calculate dashboard summary metrics
 */
export function calculateSummary(deals: FundedDeal[], filters: DashboardFilters): DashboardSummary {
  const year = filters.year || new Date().getFullYear()

  const filteredDeals = deals.filter(deal => {
    // Quarter filter
    if (!isInQuarter(deal.funded_date, filters.quarter, year)) return false

    // Rep filter
    if (filters.rep && deal.rep !== filters.rep) return false

    // Lender filter
    if (filters.lender && deal.lender !== filters.lender) return false

    return true
  })

  const totalFunded = filteredDeals.reduce((sum, deal) => sum + (deal.funded_amount || 0), 0)
  const totalCommission = filteredDeals.reduce((sum, deal) => sum + (deal.commission || 0) + (deal.psf || 0), 0)
  const dealCount = filteredDeals.length

  const factorRates = filteredDeals
    .map(deal => deal.factor_rate)
    .filter((rate): rate is number => rate !== null && rate > 0)

  const avgFactorRate = factorRates.length > 0
    ? factorRates.reduce((sum, rate) => sum + rate, 0) / factorRates.length
    : 0

  return {
    totalFunded,
    totalCommission,
    dealCount,
    avgFactorRate
  }
}

/**
 * Calculate rep-level summary data
 */
export function calculateRepSummaries(deals: FundedDeal[], filters: DashboardFilters): RepSummary[] {
  const year = filters.year || new Date().getFullYear()

  const filteredDeals = deals.filter(deal => {
    // Quarter filter
    if (!isInQuarter(deal.funded_date, filters.quarter, year)) return false

    // Lender filter (don't filter by rep here - we're grouping by rep)
    if (filters.lender && deal.lender !== filters.lender) return false

    // If specific rep is selected, filter to that rep
    if (filters.rep && deal.rep !== filters.rep) return false

    return true
  })

  // Group by rep
  const repMap = new Map<string, RepSummary>()

  filteredDeals.forEach(deal => {
    const repName = deal.rep || 'Unknown'

    if (!repMap.has(repName)) {
      repMap.set(repName, {
        rep: repName,
        rep_id: deal.rep_id,
        total_funded: 0,
        total_commission: 0,
        deal_count: 0,
        avg_factor: 0,
        total_psf: 0,
        psf_count: 0,
        total_rev: 0
      })
    }

    const summary = repMap.get(repName)!
    summary.total_funded += deal.funded_amount || 0
    summary.total_commission += deal.commission || 0
    summary.deal_count += 1
    summary.total_psf += deal.psf || 0
    if (deal.psf && deal.psf > 0) summary.psf_count += 1
    summary.total_rev += deal.total_rev || 0

    // Accumulate factor rate for averaging
    if (deal.factor_rate && deal.factor_rate > 0) {
      summary.avg_factor += deal.factor_rate
    }
  })

  // Calculate averages
  const summaries = Array.from(repMap.values()).map(summary => ({
    ...summary,
    avg_factor: summary.deal_count > 0 ? summary.avg_factor / summary.deal_count : 0
  }))

  // Sort by total funded descending
  return summaries.sort((a, b) => b.total_funded - a.total_funded)
}

/**
 * Format currency values
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * Format large numbers with abbreviations
 */
export function formatLargeNumber(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(1)}K`
  }
  return formatCurrency(value)
}

/**
 * Format factor rate as decimal
 */
export function formatFactorRate(value: number): string {
  if (value === 0) return '-'
  return value.toFixed(3)
}

/**
 * Format number with commas
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(value)
}

/**
 * Fetch unique deal types from funded deals
 */
export async function fetchUniqueDealTypes(): Promise<string[]> {
  const { data, error } = await createClient()
    .from('funded_deals')
    .select('deal_type')
    .not('deal_type', 'is', null)

  if (error) {
    console.error('Error fetching deal types:', error)
    throw error
  }

  const uniqueTypes = [...new Set((data as { deal_type: string | null }[] | null)?.map(d => d.deal_type).filter(Boolean) as string[])]
  return uniqueTypes.sort()
}

/**
 * Fetch unique years from funded deals
 */
export async function fetchUniqueYears(): Promise<number[]> {
  const { data, error } = await createClient()
    .from('funded_deals')
    .select('funded_date')
    .not('funded_date', 'is', null)

  if (error) {
    console.error('Error fetching years:', error)
    throw error
  }

  const years = new Set<number>()
  ;(data as { funded_date: string | null }[] | null)?.forEach(d => {
    const date = parseDate(d.funded_date)
    if (date) {
      years.add(date.getFullYear())
    }
  })

  return Array.from(years).sort((a, b) => b - a) // Most recent first
}

/**
 * Check if a date falls within a specific month and year
 */
function isInMonth(dateStr: string | null, month: number | null, year: number): boolean {
  if (!dateStr) return false

  const date = parseDate(dateStr)
  if (!date) return false

  const dateYear = date.getFullYear()
  const dateMonth = date.getMonth() + 1 // 1-indexed

  // Year must always match
  if (dateYear !== year) return false

  // If month is null, include all months of the year
  if (month === null) return true

  return dateMonth === month
}

/**
 * Filter and sort funded deals based on comprehensive filters
 */
export function filterAndSortDeals(deals: FundedDeal[], filters: FundedDealsFilters): FundedDeal[] {
  // First filter
  let filtered = deals.filter(deal => {
    // Month/Year filter
    if (!isInMonth(deal.funded_date, filters.month, filters.year)) return false

    // Rep filter
    if (filters.rep && deal.rep !== filters.rep) return false

    // Lender filter
    if (filters.lender && deal.lender !== filters.lender) return false

    // Deal type filter
    if (filters.dealType && deal.deal_type !== filters.dealType) return false

    // Search filter (case-insensitive match on deal_name)
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      const dealNameMatch = deal.deal_name?.toLowerCase().includes(searchLower) ?? false
      const merchantMatch = deal.merchant_name?.toLowerCase().includes(searchLower) ?? false
      if (!dealNameMatch && !merchantMatch) return false
    }

    return true
  })

  // Then sort
  filtered.sort((a, b) => {
    const field = filters.sortBy
    let aValue: string | number | null = null
    let bValue: string | number | null = null

    switch (field) {
      case 'funded_date':
        const aDate = parseDate(a.funded_date)
        const bDate = parseDate(b.funded_date)
        aValue = aDate?.getTime() ?? 0
        bValue = bDate?.getTime() ?? 0
        break
      case 'funded_amount':
        aValue = a.funded_amount ?? 0
        bValue = b.funded_amount ?? 0
        break
      case 'rep':
        aValue = a.rep ?? ''
        bValue = b.rep ?? ''
        break
      case 'lender':
        aValue = a.lender ?? ''
        bValue = b.lender ?? ''
        break
      case 'commission':
        aValue = a.commission ?? 0
        bValue = b.commission ?? 0
        break
      case 'deal_name':
        aValue = a.deal_name ?? ''
        bValue = b.deal_name ?? ''
        break
      case 'factor_rate':
        aValue = a.factor_rate ?? 0
        bValue = b.factor_rate ?? 0
        break
      case 'term':
        aValue = a.term ?? ''
        bValue = b.term ?? ''
        break
      case 'psf':
        aValue = a.psf ?? 0
        bValue = b.psf ?? 0
        break
      case 'total_rev':
        aValue = a.total_rev ?? 0
        bValue = b.total_rev ?? 0
        break
      case 'rep_commission':
        aValue = a.rep_commission ?? 0
        bValue = b.rep_commission ?? 0
        break
    }

    // Handle string comparison
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return filters.sortDirection === 'asc'
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }

    // Handle numeric comparison
    return filters.sortDirection === 'asc'
      ? (aValue as number) - (bValue as number)
      : (bValue as number) - (aValue as number)
  })

  return filtered
}

/**
 * Calculate summary metrics for filtered deals
 */
export function calculateFilteredSummary(deals: FundedDeal[]): DashboardSummary {
  const totalFunded = deals.reduce((sum, deal) => sum + (deal.funded_amount ?? 0), 0)
  const totalCommission = deals.reduce((sum, deal) => sum + (deal.commission ?? 0) + (deal.psf ?? 0), 0)
  const dealCount = deals.length

  const factorRates = deals
    .map(deal => deal.factor_rate)
    .filter((rate): rate is number => rate !== null && rate > 0)

  const avgFactorRate = factorRates.length > 0
    ? factorRates.reduce((sum, rate) => sum + rate, 0) / factorRates.length
    : 0

  return {
    totalFunded,
    totalCommission,
    dealCount,
    avgFactorRate
  }
}

/**
 * Format date from MM/DD/YYYY to readable format
 */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-'
  const date = parseDate(dateStr)
  if (!date) return dateStr
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

/**
 * Get month name from month number (1-12)
 */
export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]
  return months[month - 1] || ''
}

/**
 * Get all months for dropdown
 */
export function getAllMonths(): { value: number; label: string }[] {
  return [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' },
  ]
}
