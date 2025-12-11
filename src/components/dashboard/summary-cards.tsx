import { DollarSign, TrendingUp, FileText, Percent } from "lucide-react"
import { MetricCard, formatMetricValue } from "@/components/dashboard/MetricCard"
import type { DashboardSummary } from "@/lib/queries"
import { formatCurrency, formatFactorRate } from "@/lib/queries"

interface SummaryCardsProps {
  summary: DashboardSummary
  isLoading?: boolean
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Total Funded"
        value={summary.totalFunded}
        subtitle={formatCurrency(summary.totalFunded)}
        icon={DollarSign}
        isCurrency={true}
        isLoading={isLoading}
      />

      <MetricCard
        title="Total Commission"
        value={summary.totalCommission}
        subtitle="Commission + PSF"
        icon={TrendingUp}
        isCurrency={true}
        isLoading={isLoading}
      />

      <MetricCard
        title="Deal Count"
        value={summary.dealCount}
        subtitle="Funded deals"
        icon={FileText}
        isCurrency={false}
        isLoading={isLoading}
      />

      <MetricCard
        title="Avg Factor Rate"
        value={summary.avgFactorRate}
        formattedValue={formatFactorRate(summary.avgFactorRate)}
        subtitle="Across all deals"
        icon={Percent}
        isCurrency={false}
        isLoading={isLoading}
      />
    </div>
  )
}

// Re-export for backward compatibility if needed elsewhere
export { formatMetricValue }
