# Chat Visual Refresh Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the chat UI into a clean, iMessage-style interface with proper date awareness and polished UX.

**Architecture:** Update 4 React components (ChatMessage, ChatSidebar, ChatInterface, page.tsx), update system prompt for date awareness and plain language responses. All styling changes use Tailwind CSS inline.

**Tech Stack:** React 19, Tailwind CSS 4, Next.js 16, shadcn/ui, Lucide icons

---

## Task Overview

| Task | Component | Can Run In Parallel |
|------|-----------|---------------------|
| 1 | ChatMessage.tsx - iMessage bubbles | Yes (with 2, 3) |
| 2 | ChatSidebar.tsx - wider, hover delete, better styling | Yes (with 1, 3) |
| 3 | ChatInterface.tsx - centered empty state, white bg | Yes (with 1, 2) |
| 4 | System prompt - date awareness + plain language | Yes (with 1, 2, 3) |
| 5 | page.tsx - header text color fix | After 1-4 |

---

### Task 1: ChatMessage.tsx - iMessage-Style Bubbles

**Files:**
- Modify: `src/components/chat/ChatMessage.tsx`

**Changes:**
1. Remove avatar icons entirely for cleaner look
2. User messages: Blue bubble (#0b93f6), right-aligned, white text, rounded-2xl
3. Assistant messages: Light gray bubble (#e5e5ea), left-aligned, near-black text (#1c1c1e)
4. Narrower max-width (max-w-[70%]) to bring messages closer together
5. Timestamps in subtle dark gray (#6e6e73)
6. White background everywhere (no bg-muted)

**Complete replacement code:**

```tsx
import { cn } from '@/lib/utils'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex px-4 py-1', isUser ? 'justify-end' : 'justify-start')}>
      <div className={cn('flex flex-col max-w-[70%]', isUser && 'items-end')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed',
            isUser
              ? 'bg-[#0b93f6] text-white'
              : 'bg-[#e5e5ea] text-[#1c1c1e]'
          )}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        {timestamp && (
          <span className="text-[11px] text-[#6e6e73] mt-1 px-1">
            {new Date(timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        )}
      </div>
    </div>
  )
}
```

**Verification:**
- Run dev server, send message
- User bubble should be blue, right-aligned
- Assistant bubble should be light gray, left-aligned
- No avatar icons visible
- Messages narrower than before

---

### Task 2: ChatSidebar.tsx - Wider, Hover Delete, Better Styling

**Files:**
- Modify: `src/components/chat/ChatSidebar.tsx`
- Modify: `src/app/dashboard/chat/page.tsx` (sidebar width)

**Changes:**
1. Increase sidebar width from w-64 (256px) to w-72 (288px) in page.tsx
2. Add tooltip on hover showing full conversation title
3. Delete button always visible on hover (already works, verify)
4. New Chat button: better hover effect with scale transform
5. Conversation titles: truncate with ellipsis, show full on hover
6. Text color: change from text-muted-foreground to text-[#3c3c43] (dark gray, not hard black)
7. Active state: keep primary color but softer

**Complete replacement code for ChatSidebar.tsx:**

```tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
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
    <TooltipProvider>
      <div className="flex flex-col h-full border-r bg-white">
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

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.length === 0 ? (
              <p className="text-sm text-[#6e6e73] text-center py-8">
                No conversations yet
              </p>
            ) : (
              conversations.map((conv) => (
                <Tooltip key={conv.id}>
                  <TooltipTrigger asChild>
                    <div
                      onClick={() => onSelect(conv.id)}
                      className={cn(
                        'group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-all duration-150',
                        activeId === conv.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-[#f5f5f7]'
                      )}
                    >
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conv.title}</p>
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
                          'h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity',
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
                  </TooltipTrigger>
                  <TooltipContent side="right" className="max-w-[300px]">
                    <p>{conv.title}</p>
                  </TooltipContent>
                </Tooltip>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </TooltipProvider>
  )
}
```

**Verification:**
- Hover over conversation: delete button appears with red hover
- Hover over truncated title: tooltip shows full title
- New Chat button has subtle scale on hover
- Text is dark gray, not muted gray

---

### Task 3: ChatInterface.tsx - Centered Empty State, White Background

**Files:**
- Modify: `src/components/chat/ChatInterface.tsx`

**Changes:**
1. White background everywhere
2. Empty state vertically AND horizontally centered
3. Remove text-muted-foreground, use text-[#3c3c43] and text-[#6e6e73]
4. Example prompts: cleaner styling without heavy muted background
5. Typing indicator matches new gray bubble style

**Complete replacement code:**

```tsx
'use client'

import { useRef, useEffect } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { Bot, MessageSquare } from 'lucide-react'
import type { Message } from '@/types/chat'

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
}

export function ChatInterface({ messages, onSendMessage, isLoading }: ChatInterfaceProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const filteredMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant')

  return (
    <div className="flex flex-col h-full bg-white">
      <ScrollArea className="flex-1" ref={scrollRef}>
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#f5f5f7] mb-4">
              <Bot className="h-8 w-8 text-[#3c3c43]" />
            </div>
            <h2 className="text-xl font-semibold text-[#1c1c1e] mb-2">Parkview Assistant</h2>
            <p className="text-[#6e6e73] max-w-md mb-6 text-center">
              Ask me anything about deals, commissions, rep performance, or payment status.
            </p>
            <div className="space-y-2 text-sm">
              <button
                onClick={() => onSendMessage("How many deals did we fund this month?")}
                className="flex items-center gap-2 rounded-xl border border-[#e5e5ea] px-4 py-2.5 hover:bg-[#f5f5f7] transition-colors w-full"
              >
                <MessageSquare className="h-4 w-4 text-[#0b93f6]" />
                <span className="text-[#3c3c43]">"How many deals did we fund this month?"</span>
              </button>
              <button
                onClick={() => onSendMessage("What do we owe Sarah in commissions?")}
                className="flex items-center gap-2 rounded-xl border border-[#e5e5ea] px-4 py-2.5 hover:bg-[#f5f5f7] transition-colors w-full"
              >
                <MessageSquare className="h-4 w-4 text-[#0b93f6]" />
                <span className="text-[#3c3c43]">"What do we owe Sarah in commissions?"</span>
              </button>
              <button
                onClick={() => onSendMessage("Mark the ABC Trucking commission as paid")}
                className="flex items-center gap-2 rounded-xl border border-[#e5e5ea] px-4 py-2.5 hover:bg-[#f5f5f7] transition-colors w-full"
              >
                <MessageSquare className="h-4 w-4 text-[#0b93f6]" />
                <span className="text-[#3c3c43]">"Mark the ABC Trucking commission as paid"</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="py-4">
            {filteredMessages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role as 'user' | 'assistant'}
                content={msg.content}
                timestamp={msg.created_at}
              />
            ))}
            {isLoading && (
              <div className="flex px-4 py-1 justify-start">
                <div className="flex items-center gap-1.5 rounded-2xl bg-[#e5e5ea] px-4 py-3">
                  <span className="w-2 h-2 bg-[#6e6e73] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-[#6e6e73] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-[#6e6e73] rounded-full animate-bounce" />
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <ChatInput onSend={onSendMessage} isLoading={isLoading} />
    </div>
  )
}
```

**Verification:**
- Empty state is centered both vertically and horizontally
- Example prompts are clickable and send the message
- White background everywhere
- Typing indicator is gray bubble matching assistant style

---

### Task 4: System Prompt - Date Awareness + Plain Language

**Files:**
- Modify: `src/lib/system-prompt.ts`

**Changes:**
1. Add current date injection with Eastern timezone
2. Add rule to never expose internal field names (business_main_id, rep_id, etc.)
3. Tell AI to speak in plain business language

**Complete replacement code:**

```typescript
// Get current date in Eastern timezone
function getCurrentDateET(): string {
  const now = new Date()
  const etDate = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
  // Convert MM/DD/YYYY to YYYY-MM-DD
  const [month, day, year] = etDate.split('/')
  return `${year}-${month}-${day}`
}

export const SYSTEM_PROMPT = `You are Parkview Assistant, an internal AI for Parkview Advance LLC. You help team members query deal data, commissions, and business metrics through natural conversation.

## CRITICAL: Current Date
Today's date is ${getCurrentDateET()} (Eastern Time). Use this for all date-relative queries like "today", "this month", "YTD", etc.

## CRITICAL: Plain Language Only
NEVER mention internal database field names in your responses. Instead of saying "business_main_id populated", say "new business" or "linked to a business record". Never say rep_id, lender_id, funded_deal_id, etc. Translate all technical terms to plain business language the team uses.

Bad: "95 deals with business_main_id populated"
Good: "95 new business deals"

Bad: "funder_paid_parkview is true"
Good: "funder has paid us"

## Your Role
- You are the conversational interface to Parkview's database
- All users are internal admins - be direct, use industry terms
- Generate SQL to answer questions, then explain results clearly
- You can READ data (SELECT), UPDATE records (payment status, names), and INSERT new records

## Database Schema

### funded_deals (main deals table - ~3,760 rows)
Primary source of truth for all funded MCA/business loan deals.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| sdeal_id | varchar | Schlomo deal ID |
| deal_name | varchar | Business/deal name |
| rep | varchar | Rep name (denormalized) |
| rep_id | uuid | FK to reps |
| split_rep | varchar | Second rep for split deals |
| lender | varchar | Lender name (denormalized) |
| lender_id | uuid | FK to lenders |
| funded_date | date | When deal funded |
| funded_amount | numeric | Amount funded |
| factor_rate | numeric | Factor rate |
| term | varchar | Term length |
| commission | numeric | Total commission earned |
| psf | numeric | Professional Service Fee |
| total_rev | numeric | Total revenue |
| rep_commission | numeric | Rep's portion |
| deal_type | varchar | Type of deal |
| lead_source | varchar | Lead origin |
| is_loc | boolean | True if Line of Credit |
| parkview_rep_paid | boolean | Has Parkview paid the rep? |
| iso_paid | boolean | Has ISO been paid? |
| funder_paid_parkview | boolean | Has funder paid Parkview? |
| business_main_id | uuid | FK to business_main |

### reps (~134 rows)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Rep name |
| iso | boolean | true = ISO partner, false = in-house rep |
| rep_commission_percent | numeric | Commission % (decimal, e.g., 0.50 = 50%) |
| email | text | Rep email |

### lenders (~112 rows)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Lender name |
| inhouse_funded | boolean | true = Parkview funded, false = brokered |

### commission_payout_reps (~2,681 rows)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| funded_deal_id | uuid | FK to funded_deals |
| rep_id | uuid | FK to reps |
| commission_amount | numeric | Commission owed |
| split_percentage | numeric | Split % if deal is split |
| is_primary_rep | boolean | Primary vs split rep |
| paid | boolean | Has commission been paid? |
| paid_date | date | When paid |
| requested | boolean | Has rep requested payment? |
| payment_status | varchar | 'Pending', 'Paid', etc. |

### commission_payout_iso (~1,077 rows)
Same structure as commission_payout_reps but for ISO partners.

### business_main (~1,879 rows)
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| deal_name_canonical | text | Canonical business name |
| deal_name_normalized | text | Normalized for search |

## Business Logic

### Deal Types
- **In-House Funded**: lenders.inhouse_funded = true. Parkview provides capital.
- **Brokered**: lenders.inhouse_funded = false. Parkview brokers to external funder.

### Payment Flow (Brokered Deals)
External Funder → pays Parkview (funder_paid_parkview = true)
    → Parkview pays Rep (parkview_rep_paid = true)
    → or pays ISO (iso_paid = true)

### Rep Types
- reps.iso = false → In-house sales rep
- reps.iso = true → ISO partner (external broker)

## Response Guidelines

1. **Be direct** - Users know the business, skip basic explanations
2. **Numbers first** - Lead with the answer, offer drill-downs after
3. **Format consistently** - Currency: $XX,XXX.XX, Percentages: XX.X%
4. **Default periods** - No date = current month (MTD)
5. **Offer next steps** - "Want me to break this down by rep?"
6. **Handle ambiguity** - Ask for clarification when needed
7. **Never expose SQL or field names** - Unless specifically asked for SQL

## Date Shortcuts
- "today" → '${getCurrentDateET()}'
- "yesterday" → CURRENT_DATE - 1
- "this week" → DATE_TRUNC('week', CURRENT_DATE)
- "this month" / "MTD" → DATE_TRUNC('month', CURRENT_DATE)
- "last month" → Previous calendar month
- "YTD" → DATE_TRUNC('year', CURRENT_DATE)

## Update Operations

When asked to update records (mark as paid, change status, etc.):
1. First confirm what will be updated with a SELECT
2. Then execute the UPDATE
3. Report how many rows were affected

Example: "Mark Sarah's pending commissions as paid"
→ First: SELECT to show which records
→ Then: UPDATE commission_payout_reps SET paid = true, paid_date = CURRENT_DATE WHERE ...

## Common Query Patterns

**Volume:** COUNT(*), SUM(funded_amount) FROM funded_deals
**Commission owed:** SUM(commission_amount) FROM commission_payout_* WHERE paid = false
**By rep:** JOIN reps, GROUP BY rep name
**By lender:** JOIN lenders, GROUP BY lender name
**In-house vs brokered:** JOIN lenders, GROUP BY inhouse_funded`
```

**Verification:**
- Ask "What's today's date?" - should return actual Eastern time date
- Ask about deals - response should not mention business_main_id or other field names
- Ask "How many new business deals this month?" - should give plain language answer

---

### Task 5: Page Header - White Text Fix

**Files:**
- Modify: `src/app/dashboard/chat/page.tsx`

**Changes:**
1. Update sidebar width from w-64 to w-72
2. Change header title to white (invisible against white header bg, effectively hidden)
3. Or remove the title entirely since the sidebar shows "New Chat"

**Code change in page.tsx:**

Change line:
```tsx
<div className="w-64 shrink-0">
```

To:
```tsx
<div className="w-72 shrink-0">
```

And change header:
```tsx
<SiteHeader title="" />
```

Or if SiteHeader requires a title, pass empty string or a space.

**Verification:**
- Sidebar is wider (288px)
- Header doesn't show "Chat with Parkview Assistant" text prominently

---

## Execution Strategy

**Parallel Execution Groups:**

| Group | Tasks | Agent Type |
|-------|-------|------------|
| A | Tasks 1, 2, 3 | react-component-developer (3 instances) |
| B | Task 4 | Backend Architect |
| C | Task 5 | Frontend Developer (after A completes) |

**Total estimated time:** 5-10 minutes with parallel execution

---

## Final Verification Checklist

After all tasks complete:

1. [ ] User messages are blue bubbles, right-aligned
2. [ ] Assistant messages are gray bubbles, left-aligned
3. [ ] No avatar icons in chat
4. [ ] Sidebar shows full title on hover
5. [ ] Delete button appears on conversation hover
6. [ ] New Chat button has scale hover effect
7. [ ] Empty state is centered
8. [ ] Example prompts are clickable
9. [ ] AI knows current date
10. [ ] AI responses don't mention field names like business_main_id
11. [ ] All text is dark gray, not muted/light gray
12. [ ] All backgrounds are white
