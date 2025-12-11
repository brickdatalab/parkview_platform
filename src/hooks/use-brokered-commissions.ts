'use client'

import useSWR from 'swr'
import { createClient } from '@/lib/supabase/client'
import type { BrokeredCommission } from '@/types/database'

const supabase = createClient()

async function fetchBrokeredCommissions(): Promise<BrokeredCommission[]> {
  const pageSize = 1000
  let allData: BrokeredCommission[] = []
  let page = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('funded_deals')
      .select(`
        id,
        deal_name,
        lender,
        lender_id,
        rep,
        funded_date,
        funded_amount,
        total_rev,
        funder_paid_parkview,
        funder_paid_date,
        lenders:lender_id(inhouse_funded)
      `)
      .range(page * pageSize, (page + 1) * pageSize - 1)
      .order('funded_date', { ascending: false })

    if (error) throw error

    // Filter for non-inhouse funded (brokered deals)
    // and transform to flat structure
    const brokeredDeals = (data || [])
      .filter((deal) => {
        const lender = deal.lenders as { inhouse_funded: boolean | null } | null
        return lender?.inhouse_funded === false
      })
      .map((deal) => {
        const lender = deal.lenders as { inhouse_funded: boolean | null } | null
        return {
          id: deal.id,
          deal_name: deal.deal_name,
          lender: deal.lender,
          lender_id: deal.lender_id,
          rep: deal.rep,
          funded_date: deal.funded_date,
          funded_amount: deal.funded_amount,
          total_rev: deal.total_rev,
          funder_paid_parkview: deal.funder_paid_parkview,
          funder_paid_date: deal.funder_paid_date,
          lender_inhouse_funded: lender?.inhouse_funded ?? undefined,
        } as BrokeredCommission
      })

    allData = [...allData, ...brokeredDeals]
    hasMore = (data?.length ?? 0) === pageSize
    page++
  }

  return allData
}

export function useBrokeredCommissions() {
  return useSWR('brokered-commissions', fetchBrokeredCommissions, {
    dedupingInterval: 60000,
    keepPreviousData: true,
    revalidateOnFocus: false,
  })
}
