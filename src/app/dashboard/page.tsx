'use client'

import { useMemo } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { FundedDealsTable } from '@/components/dashboard/funded-deals-table'
import { useFundedDeals } from '@/hooks/use-funded-deals'
import type { DashboardSummary } from '@/lib/queries'

export default function DashboardPage() {
  const { data: allDeals, error: fetchError, isLoading } = useFundedDeals()

  // Convert error object to string for display
  const error = fetchError ? 'Failed to load dashboard data. Please try again.' : null

  // Compute summary from all deals (summary cards show totals, not filtered)
  const summary = useMemo<DashboardSummary>(() => {
    if (allDeals.length === 0) {
      return { totalFunded: 0, totalCommission: 0, dealCount: 0, avgFactorRate: 0 }
    }
    const totalFunded = allDeals.reduce((sum, deal) => sum + (deal.funded_amount ?? 0), 0)
    const totalCommission = allDeals.reduce((sum, deal) => sum + (deal.commission ?? 0) + (deal.psf ?? 0), 0)
    const dealCount = allDeals.length
    const factorRates = allDeals.map(deal => deal.factor_rate).filter((rate): rate is number => rate !== null && rate > 0)
    const avgFactorRate = factorRates.length > 0 ? factorRates.reduce((sum, rate) => sum + rate, 0) / factorRates.length : 0
    return { totalFunded, totalCommission, dealCount, avgFactorRate }
  }, [allDeals])

  if (error) {
    return (
      <>
        <SiteHeader title="Funded Deals" />
        <div className="flex flex-1 items-center justify-center p-8">
          <div className="text-center">
            <p className="text-lg font-medium text-destructive">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <SiteHeader title="Funded Deals" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <SummaryCards summary={summary} isLoading={isLoading} />
        <FundedDealsTable
          data={allDeals}
          totalCount={allDeals.length}
          isLoading={isLoading}
        />
      </div>
    </>
  )
}
