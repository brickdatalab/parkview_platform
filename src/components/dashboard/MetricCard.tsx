import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

/**
 * Format a metric value based on magnitude and currency flag
 *
 * Currency formatting:
 * - Under $10K: Show full number with commas ($9,500)
 * - $10K - $999K: Show with K ($125.50K) - always 2 decimal places
 * - $1M+: Show with M ($26.93M) - always 2 decimal places
 *
 * Count formatting (non-currency):
 * - Full integers with commas (3,760)
 */
export function formatMetricValue(value: number, isCurrency: boolean = true): string {
  if (!isCurrency) {
    return new Intl.NumberFormat('en-US').format(Math.round(value))
  }

  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (absValue >= 1_000_000) {
    return `${sign}$${(absValue / 1_000_000).toFixed(2)}M`
  }

  if (absValue >= 10_000) {
    return `${sign}$${(absValue / 1_000).toFixed(2)}K`
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

const variantStyles = {
  default: 'text-foreground',
  warning: 'text-orange-600',
  success: 'text-green-600',
  danger: 'text-red-600',
} as const

export type MetricCardVariant = keyof typeof variantStyles

export interface MetricCardProps {
  /** Card title (e.g., "Total Funded") */
  title: string
  /** Numeric value to display */
  value: number
  /** Optional pre-formatted value string (bypasses formatMetricValue) */
  formattedValue?: string
  /** Optional subtitle text (e.g., "Across all deals") */
  subtitle?: string
  /** Optional Lucide icon component */
  icon?: LucideIcon
  /** Whether the value represents currency (default: true) */
  isCurrency?: boolean
  /** Color variant for the value text */
  variant?: MetricCardVariant
  /** Show loading skeleton */
  isLoading?: boolean
  /** Additional CSS classes for the card */
  className?: string
}

/**
 * Skeleton placeholder for loading state
 */
function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-5 w-5" />
      </div>
      <Skeleton className="mt-2 h-7 w-24" />
      <Skeleton className="mt-1 h-3 w-16" />
    </Card>
  )
}

/**
 * Reusable metric card component for displaying KPIs
 *
 * @example
 * ```tsx
 * <MetricCard
 *   title="Total Funded"
 *   value={26930000}
 *   subtitle="Across all deals"
 *   icon={DollarSign}
 *   variant="default"
 * />
 *
 * <MetricCard
 *   title="Deal Count"
 *   value={3760}
 *   subtitle="Funded deals"
 *   icon={FileText}
 *   isCurrency={false}
 * />
 * ```
 */
export function MetricCard({
  title,
  value,
  formattedValue: formattedValueProp,
  subtitle,
  icon: Icon,
  isCurrency = true,
  variant = 'default',
  isLoading,
  className,
}: MetricCardProps) {
  if (isLoading) {
    return <MetricCardSkeleton className={className} />
  }

  const formattedValue = formattedValueProp ?? formatMetricValue(value, isCurrency)

  return (
    <Card className={cn("p-4", className)}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-muted-foreground">
            {title}
          </span>
          {Icon && (
            <Icon className="h-5 w-5 text-muted-foreground opacity-50" />
          )}
        </div>
        <div className={cn("mt-1 text-2xl font-bold", variantStyles[variant])}>
          {formattedValue}
        </div>
        {subtitle && (
          <div className="text-xs text-muted-foreground">
            {subtitle}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export { MetricCardSkeleton }
