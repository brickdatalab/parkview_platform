'use client'

import useSWR, { preload } from 'swr'
import { fetchFundedDeals } from '@/lib/queries'
import type { FundedDeal } from '@/types/database'

// Cache key
export const FUNDED_DEALS_KEY = 'funded-deals'

// SWR configuration matching commission pages
const swrConfig = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 60000, // 1 minute
  keepPreviousData: true,
}

/**
 * Hook for fetching Funded Deals with client-side caching
 * - First load: fetches from Supabase
 * - Subsequent loads: instant from cache, background refresh
 */
export function useFundedDeals() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<FundedDeal[]>(
    FUNDED_DEALS_KEY,
    fetchFundedDeals,
    swrConfig
  )

  return {
    data: data ?? [],
    error,
    isLoading,
    isValidating,
    mutate,
  }
}

/**
 * Prefetch funded deals data - call on sidebar hover
 */
export function prefetchFundedDeals() {
  preload(FUNDED_DEALS_KEY, fetchFundedDeals)
}
