import { DollarSign, TrendingUp, FileText, Percent } from "lucide-react"
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { DashboardSummary } from "@/lib/queries"
import { formatLargeNumber, formatCurrency, formatNumber, formatFactorRate } from "@/lib/queries"

interface SummaryCardsProps {
  summary: DashboardSummary
  isLoading?: boolean
}

function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-32" />
      </CardHeader>
      <CardFooter>
        <Skeleton className="h-4 w-20" />
      </CardFooter>
    </Card>
  )
}

export function SummaryCards({ summary, isLoading }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription>Total Funded</CardDescription>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardTitle className="px-6 text-2xl font-bold">
          {formatLargeNumber(summary.totalFunded)}
        </CardTitle>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            {formatCurrency(summary.totalFunded)}
          </p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription>Total Commission</CardDescription>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardTitle className="px-6 text-2xl font-bold">
          {formatLargeNumber(summary.totalCommission)}
        </CardTitle>
        <CardFooter>
          <p className="text-xs text-muted-foreground">Commission + PSF</p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription>Deal Count</CardDescription>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardTitle className="px-6 text-2xl font-bold">
          {formatNumber(summary.dealCount)}
        </CardTitle>
        <CardFooter>
          <p className="text-xs text-muted-foreground">Funded deals</p>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardDescription>Avg Factor Rate</CardDescription>
          <Percent className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardTitle className="px-6 text-2xl font-bold">
          {formatFactorRate(summary.avgFactorRate)}
        </CardTitle>
        <CardFooter>
          <p className="text-xs text-muted-foreground">Across all deals</p>
        </CardFooter>
      </Card>
    </div>
  )
}
