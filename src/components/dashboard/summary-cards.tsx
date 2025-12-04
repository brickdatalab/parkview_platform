import { DollarSign, TrendingUp, FileText, Percent } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardSummary } from "@/lib/queries"
import { formatLargeNumber, formatCurrency, formatNumber, formatFactorRate } from "@/lib/queries"

interface SummaryCardsProps {
  summary: DashboardSummary
  isLoading?: boolean
}

function CardSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-4 w-4" />
      </div>
      <Skeleton className="mt-2 h-7 w-24" />
      <Skeleton className="mt-1 h-3 w-16" />
    </Card>
  )
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
      <Card className="p-4">
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Funded</span>
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="mt-1 text-xl font-bold">{formatLargeNumber(summary.totalFunded)}</div>
          <div className="text-[11px] text-muted-foreground">{formatCurrency(summary.totalFunded)}</div>
        </CardContent>
      </Card>

      <Card className="p-4">
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Total Commission</span>
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="mt-1 text-xl font-bold">{formatLargeNumber(summary.totalCommission)}</div>
          <div className="text-[11px] text-muted-foreground">Commission + PSF</div>
        </CardContent>
      </Card>

      <Card className="p-4">
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Deal Count</span>
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="mt-1 text-xl font-bold">{formatNumber(summary.dealCount)}</div>
          <div className="text-[11px] text-muted-foreground">Funded deals</div>
        </CardContent>
      </Card>

      <Card className="p-4">
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Avg Factor Rate</span>
            <Percent className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="mt-1 text-xl font-bold">{formatFactorRate(summary.avgFactorRate)}</div>
          <div className="text-[11px] text-muted-foreground">Across all deals</div>
        </CardContent>
      </Card>
    </div>
  )
}
