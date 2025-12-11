import { createClient } from '@/lib/supabase/client'
import type { ClawbackType } from '@/types/database'

const supabase = createClient()

// Batch update paid status for rep commissions
export async function updateRepCommissionsPaid(
  ids: string[],
  paid: boolean,
  paidDate: string | null
): Promise<void> {
  const { error } = await supabase
    .from('commission_payout_reps')
    .update({
      paid,
      paid_date: paidDate,
      payment_status: paid ? 'Paid' : 'Pending',
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)

  if (error) throw error
}

// Batch update paid status for ISO commissions
export async function updateISOCommissionsPaid(
  ids: string[],
  paid: boolean,
  paidDate: string | null
): Promise<void> {
  const { error } = await supabase
    .from('commission_payout_iso')
    .update({
      paid,
      paid_date: paidDate,
      payment_status: paid ? 'Paid' : 'Pending',
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)

  if (error) throw error
}

// Batch update funder paid status for brokered deals
export async function updateBrokeredPaid(
  ids: string[],
  paid: boolean,
  paidDate: string | null
): Promise<void> {
  const { error } = await supabase
    .from('funded_deals')
    .update({
      funder_paid_parkview: paid,
      funder_paid_date: paidDate,
      updated_at: new Date().toISOString(),
    })
    .in('id', ids)

  if (error) throw error
}

// Create clawback record
export async function createClawback(
  fundedDealId: string,
  clawbackType: ClawbackType,
  notes?: string
): Promise<void> {
  const { error } = await supabase.from('clawbacks').insert({
    funded_deal_id: fundedDealId,
    clawback_type: clawbackType,
    clawback_date: new Date().toISOString().split('T')[0],
    notes: notes || null,
  })

  if (error) throw error
}

// Create multiple clawback records
export async function createClawbacks(
  fundedDealIds: string[],
  clawbackType: ClawbackType,
  notes?: string
): Promise<void> {
  const records = fundedDealIds.map((fundedDealId) => ({
    funded_deal_id: fundedDealId,
    clawback_type: clawbackType,
    clawback_date: new Date().toISOString().split('T')[0],
    notes: notes || null,
  }))

  const { error } = await supabase.from('clawbacks').upsert(records, {
    onConflict: 'funded_deal_id,clawback_type',
  })

  if (error) throw error
}

// Remove clawback record
export async function removeClawback(
  fundedDealId: string,
  clawbackType: ClawbackType
): Promise<void> {
  const { error } = await supabase
    .from('clawbacks')
    .delete()
    .eq('funded_deal_id', fundedDealId)
    .eq('clawback_type', clawbackType)

  if (error) throw error
}

// Update single paid date for rep commissions
export async function updateRepPaidDate(
  id: string,
  date: string
): Promise<void> {
  const { error } = await supabase
    .from('commission_payout_reps')
    .update({
      paid_date: date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}

// Update single paid date for ISO commissions
export async function updateISOPaidDate(
  id: string,
  date: string
): Promise<void> {
  const { error } = await supabase
    .from('commission_payout_iso')
    .update({
      paid_date: date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}

// Update single paid date for brokered deals
export async function updateBrokeredPaidDate(
  id: string,
  date: string
): Promise<void> {
  const { error } = await supabase
    .from('funded_deals')
    .update({
      funder_paid_date: date,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (error) throw error
}

// Get today's date in YYYY-MM-DD format
export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}
