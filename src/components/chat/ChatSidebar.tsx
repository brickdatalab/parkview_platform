'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { PlusCircle, MessageSquare, Trash2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Conversation } from '@/types/chat'

interface ChatSidebarProps {
  conversations: Conversation[]
  activeId: string | null
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
  isLoading?: boolean
}

export function ChatSidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  isLoading
}: ChatSidebarProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    setDeletingId(id)
    await onDelete(id)
    setDeletingId(null)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' })
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="flex flex-col h-full border-r bg-white overflow-hidden">
      <div className="p-3 border-b">
        <Button
          onClick={onNew}
          className="w-full gap-2 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <PlusCircle className="h-4 w-4" />
          )}
          New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-2 space-y-1 w-full">
          {!Array.isArray(conversations) || conversations.length === 0 ? (
            <p className="text-sm text-[#6e6e73] text-center py-8">
              No conversations yet
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  'group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-150 w-full',
                  activeId === conv.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-[#f5f5f7]'
                )}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate block">{conv.title}</p>
                  <p className={cn(
                    'text-xs',
                    activeId === conv.id ? 'text-primary-foreground/70' : 'text-[#6e6e73]'
                  )}>
                    {formatDate(conv.updated_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
                    activeId === conv.id
                      ? 'hover:bg-primary-foreground/10 text-primary-foreground'
                      : 'hover:bg-red-100 hover:text-red-600'
                  )}
                  onClick={(e) => handleDelete(e, conv.id)}
                  disabled={deletingId === conv.id}
                >
                  {deletingId === conv.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
