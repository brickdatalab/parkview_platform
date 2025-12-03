'use client'

import { Card, CardContent } from '@/components/ui/card'
import { DollarSign, TrendingUp, FileText, Percent } from 'lucide-react'
import type { DashboardSummary } from '@/lib/queries'
import { formatLargeNumber, formatCurrency, formatNumber, formatFactorRate } from '@/lib/queries'

interface SummaryCardsProps {
  summary: DashboardSummary
  isLoading?: boolean
}

interface StatCardProps {
  title: string
  value: string
  subtitle?: string
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  iconBg: string
}

function StatCard({ title, value, subtitle, icon: Icon, iconColor, iconBg }: StatCardProps) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SkeletonCard() {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-8 w-32 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
        </div>
      </CardContent>
    </Card>
  )
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Funded"
        value={formatLargeNumber(summary.totalFunded)}
        subtitle={formatCurrency(summary.totalFunded)}
        icon={DollarSign}
        iconColor="text-emerald-600"
        iconBg="bg-emerald-50"
      />
      <StatCard
        title="Total Commission"
        value={formatLargeNumber(summary.totalCommission)}
        subtitle="Commission + PSF"
        icon={TrendingUp}
        iconColor="text-blue-600"
        iconBg="bg-blue-50"
      />
      <StatCard
        title="Deal Count"
        value={formatNumber(summary.dealCount)}
        subtitle="Funded deals"
        icon={FileText}
        iconColor="text-purple-600"
        iconBg="bg-purple-50"
      />
      <StatCard
        title="Avg Factor Rate"
        value={formatFactorRate(summary.avgFactorRate)}
        subtitle="Across all deals"
        icon={Percent}
        iconColor="text-amber-600"
        iconBg="bg-amber-50"
      />
    </div>
  )
}
