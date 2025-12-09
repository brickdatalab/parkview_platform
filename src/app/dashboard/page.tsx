'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { SiteHeader } from '@/components/layout/site-header'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { FundedDealsTable } from '@/components/dashboard/funded-deals-table'
import { useFundedDeals } from '@/hooks/use-funded-deals'
import type { FundedDeal } from '@/types/database'
import type { DashboardSummary } from '@/lib/queries'

export default function DashboardPage() {
  const { data: allDeals, error: fetchError, isLoading } = useFundedDeals()
  const [filteredDeals, setFilteredDeals] = useState<FundedDeal[]>([])

  // Update filtered deals when allDeals changes
  useEffect(() => {
    setFilteredDeals(allDeals)
  }, [allDeals])

  // Convert error object to string for display
  const error = fetchError ? 'Failed to load dashboard data. Please try again.' : null

  const handleFilteredDataChange = useCallback((data: FundedDeal[]) => {
    setFilteredDeals(data)
  }, [])

  const summary = useMemo<DashboardSummary>(() => {
    if (filteredDeals.length === 0) {
      return { totalFunded: 0, totalCommission: 0, dealCount: 0, avgFactorRate: 0 }
    }
    const totalFunded = filteredDeals.reduce((sum, deal) => sum + (deal.funded_amount ?? 0), 0)
    const totalCommission = filteredDeals.reduce((sum, deal) => sum + (deal.commission ?? 0) + (deal.psf ?? 0), 0)
    const dealCount = filteredDeals.length
    const factorRates = filteredDeals.map(deal => deal.factor_rate).filter((rate): rate is number => rate !== null && rate > 0)
    const avgFactorRate = factorRates.length > 0 ? factorRates.reduce((sum, rate) => sum + rate, 0) / factorRates.length : 0
    return { totalFunded, totalCommission, dealCount, avgFactorRate }
  }, [filteredDeals])

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
          onFilteredDataChange={handleFilteredDataChange}
        />
      </div>
    </>
  )
}
