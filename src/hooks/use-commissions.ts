'use client'

import useSWR, { preload } from 'swr'
import { fetchRepCommissions, fetchISOCommissions } from '@/lib/queries'
import type { CommissionPayoutRep, CommissionPayoutISO } from '@/types/database'

// Cache keys
export const COMMISSION_KEYS = {
  rep: 'commissions-rep',
  iso: 'commissions-iso',
} as const

// SWR configuration for optimal performance
const swrConfig = {
  revalidateOnFocus: false,      // Don't refetch when window regains focus
  revalidateOnReconnect: false,  // Don't refetch on reconnect
  dedupingInterval: 60000,       // Dedupe requests within 1 minute
  keepPreviousData: true,        // Show stale data while revalidating
}

/**
 * Hook for fetching Rep Commissions with client-side caching
 * - First load: fetches from Supabase
 * - Subsequent loads: instant from cache, background refresh
 */
export function useRepCommissions() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<CommissionPayoutRep[]>(
    COMMISSION_KEYS.rep,
    fetchRepCommissions,
    swrConfig
  )

  return {
    data: data ?? [],
    error,
    isLoading,
    isValidating, // true when background refresh is happening
    mutate,       // Manual refresh trigger
  }
}

/**
 * Hook for fetching ISO Commissions with client-side caching
 */
export function useISOCommissions() {
  const { data, error, isLoading, isValidating, mutate } = useSWR<CommissionPayoutISO[]>(
    COMMISSION_KEYS.iso,
    fetchISOCommissions,
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
 * Prefetch commission data - call on sidebar hover
 * Data will be ready in cache before user clicks
 */
export function prefetchRepCommissions() {
  preload(COMMISSION_KEYS.rep, fetchRepCommissions)
}

export function prefetchISOCommissions() {
  preload(COMMISSION_KEYS.iso, fetchISOCommissions)
}

/**
 * Prefetch both commission datasets
 */
export function prefetchAllCommissions() {
  prefetchRepCommissions()
  prefetchISOCommissions()
}
