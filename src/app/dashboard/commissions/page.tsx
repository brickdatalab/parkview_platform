'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DealsTable } from '@/components/commissions/deals-table'
import { ActionBar } from '@/components/commissions/action-bar'
import type { FundedDeal, DealWithPayment, PaymentStatus } from '@/types/database'

export default function CommissionsPage() {
  const [deals, setDeals] = useState<DealWithPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Fetch deals from Supabase
  useEffect(() => {
    async function fetchDeals() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('funded_deals')
          .select('*')
          .order('funded_date', { ascending: false })

        if (error) {
          throw error
        }

        // Transform to DealWithPayment, defaulting to 'Pending' status
        const dealsWithPayment: DealWithPayment[] = (data || []).map((deal: FundedDeal) => ({
          id: deal.id,
          internal_form_id: deal.internal_form_id,
          rep_id: deal.rep_id,
          lender_id: deal.lender_id,
          sdeal_id: deal.sdeal_id,
          deal_name: deal.deal_name,
          rep: deal.rep,
          lender: deal.lender,
          funded_date: deal.funded_date,
          funded_amount: deal.funded_amount,
          factor_rate: deal.factor_rate,
          term: deal.term,
          commission: deal.commission,
          psf: deal.psf,
          total_rev: deal.total_rev,
          commission_pct: deal.commission_pct,
          rep_commission: deal.rep_commission,
          deal_type: deal.deal_type,
          lead_source: deal.lead_source,
          email: deal.email,
          phone: deal.phone,
          merchant_name: deal.merchant_name,
          sub_id: deal.sub_id,
          split_rep: deal.split_rep,
          parkview_rep_paid: deal.parkview_rep_paid,
          iso_paid: deal.iso_paid,
          funder_paid_parkview: deal.funder_paid_parkview,
          created_at: deal.created_at,
          updated_at: deal.updated_at,
          payment_status: (deal.parkview_rep_paid ? 'Paid' : 'Pending') as PaymentStatus,
          paid_date: null,
        }))

        setDeals(dealsWithPayment)
      } catch (err) {
        console.error('Error fetching deals:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch deals')
      } finally {
        setLoading(false)
      }
    }

    fetchDeals()
  }, [])

  // Selection handlers
  const handleSelectId = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === deals.length) {
        return new Set()
      }
      return new Set(deals.map((d) => d.id))
    })
  }, [deals])

  // Bulk action handlers (UI state only)
  const handleMarkPaid = useCallback(() => {
    setDeals((prev) =>
      prev.map((deal) =>
        selectedIds.has(deal.id)
          ? { ...deal, payment_status: 'Paid' as PaymentStatus, paid_date: new Date().toISOString() }
          : deal
      )
    )
    const count = selectedIds.size
    setSelectedIds(new Set())
    setToast({ message: `${count} deal${count > 1 ? 's' : ''} marked as paid`, type: 'success' })
    setTimeout(() => setToast(null), 3000)
  }, [selectedIds])

  const handleMarkClawback = useCallback(() => {
    setDeals((prev) =>
      prev.map((deal) =>
        selectedIds.has(deal.id)
          ? { ...deal, payment_status: 'Clawback' as PaymentStatus }
          : deal
      )
    )
    const count = selectedIds.size
    setSelectedIds(new Set())
    setToast({ message: `${count} deal${count > 1 ? 's' : ''} marked as clawback`, type: 'success' })
    setTimeout(() => setToast(null), 3000)
  }, [selectedIds])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900 dark:border-zinc-600 dark:border-t-zinc-50"></div>
          <span className="text-zinc-600 dark:text-zinc-400">Loading deals...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg bg-red-50 p-4 text-red-800 dark:bg-red-900/20 dark:text-red-200">
          <p className="font-medium">Error loading deals</p>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page Header */}
      <div className="border-b bg-white px-6 py-6 dark:bg-zinc-950">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Commission Tracking
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Track and manage commission payments for funded deals
        </p>
      </div>

      {/* Action Bar */}
      <ActionBar
        selectedCount={selectedIds.size}
        totalCount={deals.length}
        allSelected={selectedIds.size === deals.length && deals.length > 0}
        onSelectAll={handleSelectAll}
        onMarkPaid={handleMarkPaid}
        onMarkClawback={handleMarkClawback}
      />

      {/* Deals Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        <DealsTable
          deals={deals}
          selectedIds={selectedIds}
          onSelectId={handleSelectId}
        />
      </div>

      {/* Summary Footer */}
      <div className="border-t bg-zinc-50 px-6 py-4 dark:bg-zinc-900">
        <div className="flex items-center justify-between text-sm">
          <div className="flex gap-6">
            <span className="text-zinc-500 dark:text-zinc-400">
              Total deals: <span className="font-medium text-zinc-900 dark:text-zinc-50">{deals.length}</span>
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              Pending:{' '}
              <span className="font-medium text-amber-600">
                {deals.filter((d) => d.payment_status === 'Pending').length}
              </span>
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              Paid:{' '}
              <span className="font-medium text-green-600">
                {deals.filter((d) => d.payment_status === 'Paid').length}
              </span>
            </span>
            <span className="text-zinc-500 dark:text-zinc-400">
              Clawback:{' '}
              <span className="font-medium text-red-600">
                {deals.filter((d) => d.payment_status === 'Clawback').length}
              </span>
            </span>
          </div>
          <div className="text-zinc-500 dark:text-zinc-400">
            Total commissions:{' '}
            <span className="font-mono font-medium text-zinc-900 dark:text-zinc-50">
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(
                deals.reduce((sum, d) => sum + (d.rep_commission || 0), 0)
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-red-600 text-white'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}
