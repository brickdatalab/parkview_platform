'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import type { TableState, ColumnFilter, ColumnId, GroupByOption } from '@/types/table'

// Valid column IDs for sorting
const VALID_COLUMN_IDS: ColumnId[] = [
  'deal_name', 'rep', 'lender', 'funded_date', 'funded_amount',
  'factor_rate', 'term', 'commission', 'psf', 'total_rev',
  'rep_commission', 'deal_type', 'lead_source', 'sdeal_id'
]

// Valid group by options
const VALID_GROUP_BY: GroupByOption[] = [
  'none', 'funded_date_day', 'funded_date_month', 'funded_date_year',
  'deal_name', 'lender', 'rep', 'funded_amount_range', 'term'
]

function isValidColumnId(value: string): value is ColumnId {
  return VALID_COLUMN_IDS.includes(value as ColumnId)
}

function isValidGroupBy(value: string): value is GroupByOption {
  return VALID_GROUP_BY.includes(value as GroupByOption)
}

/**
 * Serialize table state to URL search params
 */
export function serializeFiltersToUrl(state: TableState): URLSearchParams {
  const params = new URLSearchParams()

  // Serialize column filters
  if (state.filters.length > 0) {
    state.filters.forEach(filter => {
      params.set(`filter_${filter.columnId}`, filter.selectedValues.join(','))
    })
  }

  // Serialize date range
  if (state.dateRange.startDate) {
    params.set('startDate', state.dateRange.startDate)
  }
  if (state.dateRange.endDate) {
    params.set('endDate', state.dateRange.endDate)
  }

  // Serialize sort (only first sort for simplicity)
  if (state.sortConfigs.length > 0) {
    const sort = state.sortConfigs[0]
    if (sort.direction) {
      params.set('sortBy', sort.columnId)
      params.set('sortDir', sort.direction)
    }
  }

  // Serialize grouping
  if (state.groupBy !== 'none') {
    params.set('groupBy', state.groupBy)
  }

  return params
}

/**
 * Parse URL search params to partial table state
 */
export function parseFiltersFromUrl(searchParams: URLSearchParams): Partial<TableState> {
  const state: Partial<TableState> = {}
  const filters: ColumnFilter[] = []

  // Parse column filters
  searchParams.forEach((value, key) => {
    if (key.startsWith('filter_')) {
      const columnId = key.replace('filter_', '')
      filters.push({
        columnId: columnId as ColumnFilter['columnId'],
        selectedValues: value.split(',').filter(Boolean),
      })
    }
  })

  if (filters.length > 0) {
    state.filters = filters
  }

  // Parse date range
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  if (startDate || endDate) {
    state.dateRange = {
      startDate: startDate || null,
      endDate: endDate || null,
    }
  }

  // Parse sort (with type validation)
  const sortBy = searchParams.get('sortBy')
  const sortDir = searchParams.get('sortDir')
  if (sortBy && sortDir && isValidColumnId(sortBy) && (sortDir === 'asc' || sortDir === 'desc')) {
    state.sortConfigs = [{
      columnId: sortBy,
      direction: sortDir,
      priority: 1,
    }]
  }

  // Parse grouping (with type validation)
  const groupBy = searchParams.get('groupBy')
  if (groupBy && isValidGroupBy(groupBy)) {
    state.groupBy = groupBy
  }

  return state
}

/**
 * Hook to sync table state with URL
 */
export function useUrlFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateUrl = useCallback((state: TableState) => {
    const params = serializeFiltersToUrl(state)
    const queryString = params.toString()
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname
    router.replace(newUrl, { scroll: false })
  }, [router, pathname])

  const initialState = parseFiltersFromUrl(searchParams)

  return { initialState, updateUrl }
}
