'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface ColumnWidth {
  [key: string]: number
}

interface ResizableTableContextValue {
  columnWidths: ColumnWidth
  setColumnWidth: (columnId: string, width: number) => void
  isResizing: boolean
  setIsResizing: (resizing: boolean) => void
}

const ResizableTableContext = React.createContext<ResizableTableContextValue | null>(null)

function useResizableTable() {
  const context = React.useContext(ResizableTableContext)
  if (!context) {
    throw new Error('useResizableTable must be used within a ResizableTableProvider')
  }
  return context
}

interface ResizableTableProviderProps {
  children: React.ReactNode
  defaultWidths?: ColumnWidth
  storageKey?: string
}

export function ResizableTableProvider({
  children,
  defaultWidths = {},
  storageKey,
}: ResizableTableProviderProps) {
  const [columnWidths, setColumnWidths] = React.useState<ColumnWidth>(() => {
    if (storageKey && typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        try {
          return JSON.parse(stored)
        } catch {
          return defaultWidths
        }
      }
    }
    return defaultWidths
  })
  const [isResizing, setIsResizing] = React.useState(false)

  const setColumnWidth = React.useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => {
      const next = { ...prev, [columnId]: Math.max(50, width) }
      if (storageKey && typeof window !== 'undefined') {
        localStorage.setItem(storageKey, JSON.stringify(next))
      }
      return next
    })
  }, [storageKey])

  return (
    <ResizableTableContext.Provider value={{ columnWidths, setColumnWidth, isResizing, setIsResizing }}>
      {children}
    </ResizableTableContext.Provider>
  )
}

interface ResizableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  columnId: string
  minWidth?: number
  defaultWidth?: number
}

export function ResizableTableHead({
  columnId,
  minWidth = 50,
  defaultWidth = 120,
  className,
  children,
  ...props
}: ResizableTableHeadProps) {
  const { columnWidths, setColumnWidth, setIsResizing } = useResizableTable()
  const headerRef = React.useRef<HTMLTableCellElement>(null)
  const startXRef = React.useRef<number>(0)
  const startWidthRef = React.useRef<number>(0)

  const width = columnWidths[columnId] || defaultWidth

  const handleMouseDown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    startXRef.current = e.clientX
    startWidthRef.current = headerRef.current?.offsetWidth || width
    setIsResizing(true)

    const handleMouseMove = (e: MouseEvent) => {
      const diff = e.clientX - startXRef.current
      const newWidth = Math.max(minWidth, startWidthRef.current + diff)
      setColumnWidth(columnId, newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }, [columnId, minWidth, setColumnWidth, setIsResizing, width])

  return (
    <th
      ref={headerRef}
      className={cn(
        'h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] relative group',
        className
      )}
      style={{ width: `${width}px`, minWidth: `${minWidth}px` }}
      {...props}
    >
      <div className="flex items-center justify-between pr-2">
        {children}
      </div>
      {/* Resize handle */}
      <div
        className="absolute top-0 right-0 h-full w-1 cursor-col-resize hover:bg-primary/50 active:bg-primary opacity-0 group-hover:opacity-100 transition-opacity"
        onMouseDown={handleMouseDown}
        onClick={(e) => e.stopPropagation()}
      />
    </th>
  )
}

interface ResizableTableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  columnId: string
  defaultWidth?: number
}

export function ResizableTableCell({
  columnId,
  defaultWidth = 120,
  className,
  children,
  ...props
}: ResizableTableCellProps) {
  const { columnWidths } = useResizableTable()
  const width = columnWidths[columnId] || defaultWidth

  return (
    <td
      className={cn(
        'p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]',
        className
      )}
      style={{ width: `${width}px`, maxWidth: `${width}px` }}
      {...props}
    >
      <div className="truncate">
        {children}
      </div>
    </td>
  )
}

export { useResizableTable }
