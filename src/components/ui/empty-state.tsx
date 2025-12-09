import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { SearchX, FileX, FilterX, Inbox } from 'lucide-react'

type EmptyStateVariant = 'no-results' | 'no-data' | 'filtered' | 'default'

interface EmptyStateProps {
  variant?: EmptyStateVariant
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

const variantConfig: Record<EmptyStateVariant, {
  icon: typeof SearchX
  defaultTitle: string
  defaultDescription: string
}> = {
  'no-results': {
    icon: SearchX,
    defaultTitle: 'No results found',
    defaultDescription: 'Try adjusting your search or filters',
  },
  'no-data': {
    icon: FileX,
    defaultTitle: 'No data yet',
    defaultDescription: 'Data will appear here once available',
  },
  'filtered': {
    icon: FilterX,
    defaultTitle: 'No matches',
    defaultDescription: 'No items match the current filters',
  },
  'default': {
    icon: Inbox,
    defaultTitle: 'Nothing here',
    defaultDescription: 'There are no items to display',
  },
}

export function EmptyState({
  variant = 'default',
  title,
  description,
  actionLabel,
  onAction,
  className,
}: EmptyStateProps) {
  const config = variantConfig[variant]
  const Icon = config.icon

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-12 px-4 text-center',
        className
      )}
    >
      <div className="rounded-full bg-muted p-4 mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">
        {title || config.defaultTitle}
      </h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        {description || config.defaultDescription}
      </p>
      {actionLabel && onAction && (
        <Button variant="outline" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
