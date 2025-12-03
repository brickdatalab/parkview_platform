import { getSupabase } from './supabase'
import type { FundedDeal, RepSummary } from '@/types/database'

export interface DashboardFilters {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'all'
  rep: string | null
  lender: string | null
  year?: number
}

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
 */
export async function fetchFundedDeals(): Promise<FundedDeal[]> {
  const { data, error } = await getSupabase()
    .from('funded_deals')
    .select('*')
    .order('funded_date', { ascending: false })

  if (error) {
    console.error('Error fetching funded deals:', error)
    throw error
  }

  return data || []
}

/**
 * Fetch unique reps from funded deals
 */
export async function fetchUniqueReps(): Promise<string[]> {
  const { data, error } = await getSupabase()
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
  const { data, error } = await getSupabase()
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
