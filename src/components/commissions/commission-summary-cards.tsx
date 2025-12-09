import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/queries'
import { DollarSign, FileText, Clock, CheckCircle } from 'lucide-react'

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
  const cards = [
    {
      title: 'Total Deals',
      value: summary.totalDeals.toString(),
      icon: FileText,
      description: `${variant === 'rep' ? 'Rep' : 'ISO'} commission records`,
    },
    {
      title: 'Total Commission',
      value: formatCurrency(summary.totalCommission),
      icon: DollarSign,
      description: 'Combined commission value',
    },
    {
      title: 'Pending',
      value: formatCurrency(summary.pendingAmount),
      icon: Clock,
      description: `${summary.pendingCount} deals awaiting payment`,
      className: 'text-amber-600',
    },
    {
      title: 'Paid',
      value: formatCurrency(summary.paidAmount),
      icon: CheckCircle,
      description: `${summary.paidCount} deals completed`,
      className: 'text-green-600',
    },
  ]

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {cards.map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-1" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className={`text-sm font-medium ${card.className || 'text-muted-foreground'}`}>
              {card.title}
            </CardTitle>
            <card.icon className={`h-4 w-4 ${card.className || 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${card.className || ''}`}>
              {card.value}
            </div>
            <p className="text-xs text-muted-foreground">{card.description}</p>
          </CardContent>
        </Card>
      ))}
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
