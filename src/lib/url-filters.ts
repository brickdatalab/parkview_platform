'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import type { TableState, ColumnFilter } from '@/types/table'

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

  // Parse sort
  const sortBy = searchParams.get('sortBy')
  const sortDir = searchParams.get('sortDir')
  if (sortBy && sortDir) {
    state.sortConfigs = [{
      columnId: sortBy as any,
      direction: sortDir as 'asc' | 'desc',
      priority: 1,
    }]
  }

  // Parse grouping
  const groupBy = searchParams.get('groupBy')
  if (groupBy) {
    state.groupBy = groupBy as any
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
