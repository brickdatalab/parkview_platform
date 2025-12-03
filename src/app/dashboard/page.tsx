'use client'

import { useState, useEffect, useCallback } from 'react'
import { SummaryCards } from '@/components/dashboard/summary-cards'
import { Filters } from '@/components/dashboard/filters'
import { RepTable } from '@/components/dashboard/rep-table'
import {
  fetchFundedDeals,
  fetchUniqueReps,
  fetchUniqueLenders,
  calculateSummary,
  calculateRepSummaries,
  type DashboardFilters,
  type DashboardSummary
} from '@/lib/queries'
import type { FundedDeal, RepSummary } from '@/types/database'

export default function DashboardPage() {
  const [deals, setDeals] = useState<FundedDeal[]>([])
  const [reps, setReps] = useState<string[]>([])
  const [lenders, setLenders] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState<DashboardFilters>({
    quarter: 'all',
    rep: null,
    lender: null,
    year: new Date().getFullYear()
  })

  const [summary, setSummary] = useState<DashboardSummary>({
    totalFunded: 0,
    totalCommission: 0,
    dealCount: 0,
    avgFactorRate: 0
  })

  const [repSummaries, setRepSummaries] = useState<RepSummary[]>([])

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch all data in parallel
        const [dealsData, repsData, lendersData] = await Promise.all([
          fetchFundedDeals(),
          fetchUniqueReps(),
          fetchUniqueLenders()
        ])

        setDeals(dealsData)
        setReps(repsData)
        setLenders(lendersData)
      } catch (err) {
        console.error('Error loading dashboard data:', err)
        setError('Failed to load dashboard data. Please try again.')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  // Recalculate metrics when filters or data change
  useEffect(() => {
    if (deals.length > 0) {
      const newSummary = calculateSummary(deals, filters)
      const newRepSummaries = calculateRepSummaries(deals, filters)
      setSummary(newSummary)
      setRepSummaries(newRepSummaries)
    }
  }, [deals, filters])

  const handleFiltersChange = useCallback((newFilters: DashboardFilters) => {
    setFilters(newFilters)
  }, [])

  if (error) {
    return (
      <div className="flex h-full items-center justify-center p-8">
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
    )
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Reports Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Commission tracking and performance metrics for Parkview Advance
        </p>
      </div>

      {/* Filters */}
      <Filters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        reps={reps}
        lenders={lenders}
        isLoading={isLoading}
      />

      {/* Summary Cards */}
      <SummaryCards summary={summary} isLoading={isLoading} />

      {/* Rep Performance Table */}
      <RepTable data={repSummaries} isLoading={isLoading} />
    </div>
  )
}
