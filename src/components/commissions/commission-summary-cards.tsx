import { DollarSign, FileText, Clock, CheckCircle } from 'lucide-react'
import { MetricCard } from '@/components/dashboard/MetricCard'

interface CommissionSummary {
  totalDeals: number
  totalCommission: number
  pendingAmount: number
  paidAmount: number
  pendingCount: number
  paidCount: number
}

interface CommissionSummaryCardsProps {
  summary: CommissionSummary
  isLoading?: boolean
  variant?: 'rep' | 'iso'
}

export function CommissionSummaryCards({
  summary,
  isLoading,
  variant = 'rep',
}: CommissionSummaryCardsProps) {
  const entityLabel = variant === 'rep' ? 'Rep' : 'ISO'

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Deals"
        value={summary.totalDeals}
        subtitle={`${entityLabel} commission records`}
        icon={FileText}
        isCurrency={false}
        isLoading={isLoading}
      />

      <MetricCard
        title="Total Commission"
        value={summary.totalCommission}
        subtitle="Combined commission value"
        icon={DollarSign}
        isCurrency={true}
        isLoading={isLoading}
      />

      <MetricCard
        title="Pending"
        value={summary.pendingAmount}
        subtitle={`${summary.pendingCount} deals awaiting payment`}
        icon={Clock}
        isCurrency={true}
        variant="warning"
        isLoading={isLoading}
      />

      <MetricCard
        title="Paid"
        value={summary.paidAmount}
        subtitle={`${summary.paidCount} deals completed`}
        icon={CheckCircle}
        isCurrency={true}
        variant="success"
        isLoading={isLoading}
      />
    </div>
  )
}

/**
 * Calculate summary from commission data
 */
export function calculateCommissionSummary<T extends { commission_amount: number | null; paid: boolean | null }>(
  data: T[]
): CommissionSummary {
  const totalDeals = data.length
  const totalCommission = data.reduce((sum, d) => sum + (d.commission_amount || 0), 0)

  const paidDeals = data.filter(d => d.paid === true)
  const pendingDeals = data.filter(d => d.paid !== true)

  const paidAmount = paidDeals.reduce((sum, d) => sum + (d.commission_amount || 0), 0)
  const pendingAmount = pendingDeals.reduce((sum, d) => sum + (d.commission_amount || 0), 0)

  return {
    totalDeals,
    totalCommission,
    pendingAmount,
    paidAmount,
    pendingCount: pendingDeals.length,
    paidCount: paidDeals.length,
  }
}
