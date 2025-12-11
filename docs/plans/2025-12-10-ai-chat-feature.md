# AI Chat Feature Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a fully functional AI chat interface that allows Parkview team members to query and update the database through natural conversation using Grok model.

**Architecture:** Split-panel chat UI (conversation sidebar + main chat area) within the existing dashboard. Backend API routes handle conversation persistence and Grok API integration with SQL tool calling. The AI can execute SELECT, UPDATE, and INSERT queries through a secure `execute_sql` RPC function with SQL validation.

**Tech Stack:** Next.js 16 App Router, Supabase (PostgreSQL + Auth), Grok 4 via xAI API, shadcn/ui components, SWR for data fetching

---

## Implementation Overview

| Task | Description | Parallelizable | Agent Type |
|------|-------------|----------------|------------|
| 1 | Database Migration - Chat tables + execute_sql function | No (must be first) | supabase-agent |
| 2 | Core Libraries - xai.ts, sql-validator.ts, system-prompt.ts, supabase-admin.ts | Yes | Backend Architect |
| 3 | API Routes - conversations, messages endpoints | Yes (after Task 2) | Backend Architect |
| 4 | Chat UI Components - ChatSidebar, ChatInterface, ChatMessage, ChatInput | Yes | react-component-developer |
| 5 | Chat Page Integration - Wire up components to API | After Tasks 3 & 4 | Frontend Developer |
| 6 | Testing & Polish | After Task 5 | code-reviewer |

---

### Task 1: Database Migration - Chat Tables and execute_sql Function

**Agent:** supabase-agent
**MCP:** supabase-park
**Parallelizable:** No - must complete before other tasks

**Files:**
- Migration via Supabase MCP (no local file)

**Step 1: Apply chat schema migration**

Use `mcp__supabase-park__apply_migration` with the following SQL:

```sql
-- ============================================
-- CONVERSATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.conversations IS 'AI chat conversations for Parkview Assistant';

CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_user_updated ON public.conversations(user_id, updated_at DESC);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system', 'tool')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE public.messages IS 'Individual messages within AI chat conversations';

CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_conversation_created ON public.messages(conversation_id, created_at ASC);

-- ============================================
-- AUTO-UPDATE CONVERSATION TIMESTAMP
-- ============================================
CREATE OR REPLACE FUNCTION public.update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.conversations
    SET updated_at = NOW()
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_conversation_timestamp
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.update_conversation_timestamp();

-- ============================================
-- AUTO-TITLE FROM FIRST MESSAGE
-- ============================================
CREATE OR REPLACE FUNCTION public.auto_title_conversation()
RETURNS TRIGGER AS $$
DECLARE
    msg_count INTEGER;
BEGIN
    IF NEW.role = 'user' THEN
        SELECT COUNT(*) INTO msg_count
        FROM public.messages
        WHERE conversation_id = NEW.conversation_id
        AND role = 'user'
        AND id != NEW.id;

        IF msg_count = 0 THEN
            UPDATE public.conversations
            SET title = LEFT(NEW.content, 50) ||
                        CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END
            WHERE id = NEW.conversation_id
            AND title = 'New Conversation';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_title_conversation
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.auto_title_conversation();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
ON public.conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own conversations"
ON public.conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations"
ON public.conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations"
ON public.conversations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages in own conversations"
ON public.messages FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.conversations
        WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
);

CREATE POLICY "Users can create messages in own conversations"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.conversations
        WHERE conversations.id = messages.conversation_id
        AND conversations.user_id = auth.uid()
    )
);

-- ============================================
-- GRANTS
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO authenticated;
GRANT SELECT, INSERT ON public.messages TO authenticated;
```

Migration name: `add_chat_tables`

**Step 2: Apply execute_sql function migration**

Use `mcp__supabase-park__apply_migration` with:

```sql
-- ============================================
-- EXECUTE_SQL FUNCTION FOR AI AGENT
-- ============================================
-- Allows AI to execute validated SQL queries
-- SECURITY DEFINER runs with elevated privileges
-- Validation happens in application layer

CREATE OR REPLACE FUNCTION public.execute_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSONB;
    normalized_query TEXT;
BEGIN
    -- Normalize for checking
    normalized_query := UPPER(TRIM(sql_query));

    -- Block dangerous operations at DB level as safety net
    IF normalized_query ~ '(DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE)\s' THEN
        RAISE EXCEPTION 'Query contains prohibited DDL keywords';
    END IF;

    -- Execute query and aggregate results to JSON
    EXECUTE 'SELECT COALESCE(jsonb_agg(row_to_json(t)), ''[]''::jsonb) FROM (' || sql_query || ' LIMIT 500) t'
    INTO result;

    RETURN result;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM, 'detail', SQLSTATE);
END;
$$;

-- Grant execute to service role only (called from API routes)
GRANT EXECUTE ON FUNCTION public.execute_sql(TEXT) TO service_role;

COMMENT ON FUNCTION public.execute_sql IS 'Executes SQL for AI agent. SELECT/UPDATE/INSERT allowed. DDL blocked.';
```

Migration name: `add_execute_sql_function`

**Step 3: Verify tables exist**

Use `mcp__supabase-park__list_tables` and confirm `conversations` and `messages` tables appear.

**Step 4: Test execute_sql function**

Use `mcp__supabase-park__execute_sql` with:
```sql
SELECT public.execute_sql('SELECT COUNT(*) as count FROM funded_deals')
```

Expected: JSON with count ~3760

---

### Task 2: Core Libraries

**Agent:** Backend Architect
**Parallelizable:** Yes (can run alongside Task 4)

**Files:**
- Create: `src/lib/xai.ts`
- Create: `src/lib/sql-validator.ts`
- Create: `src/lib/supabase-admin.ts`
- Create: `src/lib/system-prompt.ts`
- Create: `src/types/chat.ts`

#### Step 1: Create chat types

Create `src/types/chat.ts`:

```typescript
export interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
  message_count?: number
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface GrokMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  tool_call_id?: string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface GrokResponse {
  id: string
  choices: [{
    message: {
      role: string
      content: string | null
      tool_calls?: ToolCall[]
    }
    finish_reason: string
  }]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}
```

#### Step 2: Create SQL validator

Create `src/lib/sql-validator.ts`:

```typescript
const ALLOWED_STARTS = ['SELECT', 'UPDATE', 'INSERT']
const BLOCKED_KEYWORDS = [
  'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE',
  'GRANT', 'REVOKE', 'EXEC', 'EXECUTE PROCEDURE'
]

export interface ValidationResult {
  valid: boolean
  error?: string
  operation?: 'SELECT' | 'UPDATE' | 'INSERT'
}

export function validateSQL(sql: string): ValidationResult {
  const normalized = sql.trim().toUpperCase()

  // Check starts with allowed operation
  const matchedOp = ALLOWED_STARTS.find(op => normalized.startsWith(op))
  if (!matchedOp) {
    return {
      valid: false,
      error: 'Only SELECT, UPDATE, and INSERT operations are allowed'
    }
  }

  // Check for blocked keywords
  for (const keyword of BLOCKED_KEYWORDS) {
    // Use word boundary to avoid false positives
    const regex = new RegExp(`\\b${keyword}\\b`, 'i')
    if (regex.test(sql)) {
      return {
        valid: false,
        error: `Blocked keyword detected: ${keyword}`
      }
    }
  }

  // Block multiple statements (semicolon followed by more SQL)
  const statementCount = sql.split(';').filter(s => s.trim().length > 0).length
  if (statementCount > 1) {
    return {
      valid: false,
      error: 'Multiple statements not allowed'
    }
  }

  return {
    valid: true,
    operation: matchedOp as 'SELECT' | 'UPDATE' | 'INSERT'
  }
}
```

#### Step 3: Create Supabase admin client

Create `src/lib/supabase-admin.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'

// Service role client for SQL execution (bypasses RLS)
// Only use in API routes, never expose to client
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

export async function executeSQL(sql: string): Promise<{ data: unknown; error: string | null }> {
  try {
    const { data, error } = await supabaseAdmin.rpc('execute_sql', {
      sql_query: sql
    })

    if (error) {
      return { data: null, error: error.message }
    }

    // Check if the function returned an error object
    if (data && typeof data === 'object' && 'error' in data) {
      return { data: null, error: (data as { error: string }).error }
    }

    return { data, error: null }
  } catch (e) {
    return {
      data: null,
      error: e instanceof Error ? e.message : 'Unknown error executing SQL'
    }
  }
}
```

#### Step 4: Create Grok API client

Create `src/lib/xai.ts`:

```typescript
import type { GrokMessage, GrokResponse } from '@/types/chat'

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'
const MODEL = 'grok-4-1-fast-non-reasoning-latest'

const SQL_TOOL = {
  type: 'function' as const,
  function: {
    name: 'execute_sql',
    description: 'Execute SQL query against Parkview database. Supports SELECT (queries), UPDATE (status changes), and INSERT (new records). Returns JSON array of results or affected row count.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'SQL statement to execute. Use SELECT for queries, UPDATE for changing payment status/names, INSERT for new records.'
        }
      },
      required: ['query']
    }
  }
}

export async function callGrok(
  messages: GrokMessage[],
  includeTools: boolean = true
): Promise<GrokResponse> {
  const response = await fetch(XAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.XAI_API_KEY}`
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools: includeTools ? [SQL_TOOL] : undefined,
      tool_choice: includeTools ? 'auto' : undefined,
      temperature: 0,
      stream: false
    })
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Grok API error ${response.status}: ${errorText}`)
  }

  return response.json()
}

export { SQL_TOOL }
```

#### Step 5: Create system prompt module

Create `src/lib/system-prompt.ts`:

```typescript
export const SYSTEM_PROMPT = `You are Parkview Assistant, an internal AI for Parkview Advance LLC. You help team members query deal data, commissions, and business metrics through natural conversation.

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
7. **Don't expose SQL** - Unless specifically asked

## Date Shortcuts
- "today" → CURRENT_DATE
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

---

### Task 3: API Routes

**Agent:** Backend Architect
**Parallelizable:** Yes (after Task 2 libraries exist)

**Files:**
- Create: `src/app/api/chat/conversations/route.ts`
- Create: `src/app/api/chat/conversations/[id]/route.ts`
- Create: `src/app/api/chat/conversations/[id]/messages/route.ts`

#### Step 1: Create conversations list/create endpoint

Create `src/app/api/chat/conversations/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - List user's conversations
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

// POST - Create new conversation
export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: user.id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

#### Step 2: Create single conversation endpoint

Create `src/app/api/chat/conversations/[id]/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// GET - Get conversation with messages
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get conversation
  const { data: conversation, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (convError || !conversation) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // Get messages
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', id)
    .order('created_at', { ascending: true })

  if (msgError) {
    return NextResponse.json({ error: msgError.message }, { status: 500 })
  }

  return NextResponse.json({ conversation, messages })
}

// DELETE - Delete conversation
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

#### Step 3: Create messages endpoint (main AI logic)

Create `src/app/api/chat/conversations/[id]/messages/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { callGrok } from '@/lib/xai'
import { validateSQL } from '@/lib/sql-validator'
import { executeSQL } from '@/lib/supabase-admin'
import { SYSTEM_PROMPT } from '@/lib/system-prompt'
import type { GrokMessage } from '@/types/chat'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: conversationId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { message } = await request.json()

  if (!message || typeof message !== 'string') {
    return NextResponse.json({ error: 'Message required' }, { status: 400 })
  }

  // Verify user owns this conversation
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  }

  // Save user message
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: message
  })

  // Load conversation history (last 20 messages for context)
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(20)

  // Build messages for Grok
  const messages: GrokMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...(history || []).map(m => ({
      role: m.role as GrokMessage['role'],
      content: m.content
    }))
  ]

  try {
    // Call Grok (with tool loop)
    let response = await callGrok(messages)
    let assistantMessage = response.choices[0].message
    let toolCallsLog: Array<{ query: string; result: unknown }> = []

    // Handle tool calls (max 5 iterations to prevent infinite loops)
    let iterations = 0
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && iterations < 5) {
      iterations++
      const toolCall = assistantMessage.tool_calls[0]
      const args = JSON.parse(toolCall.function.arguments)

      let toolResult: unknown

      if (toolCall.function.name === 'execute_sql') {
        const validation = validateSQL(args.query)

        if (!validation.valid) {
          toolResult = { error: validation.error }
        } else {
          const { data, error } = await executeSQL(args.query)
          toolResult = error ? { error } : data
          toolCallsLog.push({ query: args.query, result: toolResult })
        }
      } else {
        toolResult = { error: `Unknown tool: ${toolCall.function.name}` }
      }

      // Add assistant message with tool call and tool result
      messages.push({
        role: 'assistant',
        content: assistantMessage.content || '',
        ...({ tool_calls: assistantMessage.tool_calls } as any)
      })
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult)
      })

      // Call Grok again with tool result
      response = await callGrok(messages)
      assistantMessage = response.choices[0].message
    }

    // Save assistant response
    const finalContent = assistantMessage.content || 'I processed your request.'

    const { data: savedMessage } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role: 'assistant',
        content: finalContent,
        metadata: {
          tool_calls: toolCallsLog,
          tokens: response.usage
        }
      })
      .select()
      .single()

    return NextResponse.json({
      message: finalContent,
      id: savedMessage?.id,
      metadata: {
        tool_calls_count: toolCallsLog.length
      }
    })
  } catch (e) {
    console.error('Chat error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to process message' },
      { status: 500 }
    )
  }
}
```

---

### Task 4: Chat UI Components

**Agent:** react-component-developer
**Parallelizable:** Yes (can run alongside Tasks 2 & 3)
**Use:** shadcn MCP for component examples

**Files:**
- Create: `src/components/chat/ChatSidebar.tsx`
- Create: `src/components/chat/ChatInterface.tsx`
- Create: `src/components/chat/ChatMessage.tsx`
- Create: `src/components/chat/ChatInput.tsx`

#### Step 1: Create ChatMessage component

Create `src/components/chat/ChatMessage.tsx`:

```typescript
import { cn } from '@/lib/utils'
import { Bot, User } from 'lucide-react'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
}

export function ChatMessage({ role, content, timestamp }: ChatMessageProps) {
  const isUser = role === 'user'

  return (
    <div className={cn('flex gap-3 p-4', isUser && 'flex-row-reverse')}>
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted'
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          'flex flex-col gap-1 max-w-[80%]',
          isUser && 'items-end'
        )}
      >
        <div
          className={cn(
            'rounded-lg px-4 py-2 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          )}
        >
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
        {timestamp && (
          <span className="text-xs text-muted-foreground">
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

#### Step 2: Create ChatInput component

Create `src/components/chat/ChatInput.tsx`:

```typescript
'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Loader2 } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  isLoading?: boolean
}

export function ChatInput({ onSend, disabled, isLoading }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [message])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled && !isLoading) {
      onSend(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 p-4 border-t bg-background">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about deals, commissions, rep performance..."
        disabled={disabled || isLoading}
        rows={1}
        className="flex-1 resize-none rounded-lg border bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
      <Button
        type="submit"
        size="icon"
        disabled={!message.trim() || disabled || isLoading}
        className="shrink-0 h-12 w-12"
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </form>
  )
}
```

#### Step 3: Create ChatSidebar component

Create `src/components/chat/ChatSidebar.tsx`:

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
    <div className="flex flex-col h-full border-r bg-muted/30">
      <div className="p-3 border-b">
        <Button onClick={onNew} className="w-full gap-2" disabled={isLoading}>
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
            <p className="text-sm text-muted-foreground text-center py-8">
              No conversations yet
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={cn(
                  'group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-colors',
                  activeId === conv.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{conv.title}</p>
                  <p className={cn(
                    'text-xs',
                    activeId === conv.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  )}>
                    {formatDate(conv.updated_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity',
                    activeId === conv.id && 'hover:bg-primary-foreground/10'
                  )}
                  onClick={(e) => handleDelete(e, conv.id)}
                  disabled={deletingId === conv.id}
                >
                  {deletingId === conv.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
```

#### Step 4: Create ChatInterface component

Create `src/components/chat/ChatInterface.tsx`:

```typescript
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

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const filteredMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant')

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1" ref={scrollRef}>
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Parkview Assistant</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              Ask me anything about deals, commissions, rep performance, or payment status.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                "How many deals did we fund this month?"
              </div>
              <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                "What do we owe Sarah in commissions?"
              </div>
              <div className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                "Mark the ABC Trucking commission as paid"
              </div>
            </div>
          </div>
        ) : (
          <div className="pb-4">
            {filteredMessages.map((msg) => (
              <ChatMessage
                key={msg.id}
                role={msg.role as 'user' | 'assistant'}
                content={msg.content}
                timestamp={msg.created_at}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3 p-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1 rounded-lg bg-muted px-4 py-2">
                  <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce" />
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

---

### Task 5: Chat Page Integration

**Agent:** Frontend Developer
**Parallelizable:** No - requires Tasks 3 & 4 complete

**Files:**
- Modify: `src/app/dashboard/chat/page.tsx`

#### Step 1: Replace placeholder with full chat implementation

Replace `src/app/dashboard/chat/page.tsx`:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import useSWR, { mutate } from 'swr'
import { SiteHeader } from '@/components/layout/site-header'
import { ChatSidebar } from '@/components/chat/ChatSidebar'
import { ChatInterface } from '@/components/chat/ChatInterface'
import type { Conversation, Message } from '@/types/chat'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function ChatPage() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Fetch conversations list
  const { data: conversations = [], isLoading: conversationsLoading } = useSWR<Conversation[]>(
    '/api/chat/conversations',
    fetcher,
    { revalidateOnFocus: false }
  )

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([])
      return
    }

    setIsLoading(true)
    fetch(`/api/chat/conversations/${activeConversationId}`)
      .then(res => res.json())
      .then(data => {
        setMessages(data.messages || [])
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [activeConversationId])

  // Create new conversation
  const handleNewConversation = useCallback(async () => {
    try {
      setIsLoading(true)
      const res = await fetch('/api/chat/conversations', { method: 'POST' })
      const newConv = await res.json()
      await mutate('/api/chat/conversations')
      setActiveConversationId(newConv.id)
      setMessages([])
    } catch (e) {
      console.error('Failed to create conversation:', e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Delete conversation
  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`/api/chat/conversations/${id}`, { method: 'DELETE' })
      await mutate('/api/chat/conversations')
      if (activeConversationId === id) {
        setActiveConversationId(null)
        setMessages([])
      }
    } catch (e) {
      console.error('Failed to delete conversation:', e)
    }
  }, [activeConversationId])

  // Send message
  const handleSendMessage = useCallback(async (content: string) => {
    if (!activeConversationId) {
      // Create new conversation first
      try {
        const res = await fetch('/api/chat/conversations', { method: 'POST' })
        const newConv = await res.json()
        await mutate('/api/chat/conversations')
        setActiveConversationId(newConv.id)

        // Now send to the new conversation
        sendToConversation(newConv.id, content)
      } catch (e) {
        console.error('Failed to create conversation:', e)
      }
    } else {
      sendToConversation(activeConversationId, content)
    }
  }, [activeConversationId])

  const sendToConversation = async (convId: string, content: string) => {
    // Optimistically add user message
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: convId,
      role: 'user',
      content,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMsg])
    setIsSending(true)

    try {
      const res = await fetch(`/api/chat/conversations/${convId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content })
      })

      const data = await res.json()

      if (data.error) {
        // Add error message
        setMessages(prev => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            conversation_id: convId,
            role: 'assistant',
            content: `Error: ${data.error}`,
            created_at: new Date().toISOString()
          }
        ])
      } else {
        // Add assistant response
        setMessages(prev => [
          ...prev,
          {
            id: data.id || `resp-${Date.now()}`,
            conversation_id: convId,
            role: 'assistant',
            content: data.message,
            created_at: new Date().toISOString()
          }
        ])
      }

      // Refresh conversations to update title
      await mutate('/api/chat/conversations')
    } catch (e) {
      console.error('Failed to send message:', e)
      setMessages(prev => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          conversation_id: convId,
          role: 'assistant',
          content: 'Failed to send message. Please try again.',
          created_at: new Date().toISOString()
        }
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex h-full flex-col">
      <SiteHeader title="Chat with Parkview Assistant" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - conversation list */}
        <div className="w-64 shrink-0">
          <ChatSidebar
            conversations={conversations}
            activeId={activeConversationId}
            onSelect={setActiveConversationId}
            onNew={handleNewConversation}
            onDelete={handleDeleteConversation}
            isLoading={conversationsLoading || isLoading}
          />
        </div>

        {/* Main chat area */}
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isSending}
          />
        </div>
      </div>
    </div>
  )
}
```

---

### Task 6: Testing & Polish

**Agent:** code-reviewer
**Parallelizable:** No - final verification

**Steps:**

#### Step 1: Verify database tables
Use `mcp__supabase-park__list_tables` to confirm `conversations` and `messages` tables exist.

#### Step 2: Test conversation flow manually
1. Open http://localhost:3456/dashboard/chat
2. Click "New Chat"
3. Send: "How many deals this month?"
4. Verify response appears with data
5. Send: "Break it down by rep"
6. Verify follow-up works with context

#### Step 3: Test update operations
1. Send: "Show me Sarah's pending commissions"
2. Send: "Mark the first one as paid"
3. Verify UPDATE executes and confirmation appears

#### Step 4: Test conversation persistence
1. Refresh page
2. Verify conversation appears in sidebar
3. Click it and verify messages load

#### Step 5: Security verification
1. Try: "DROP TABLE funded_deals" - should be blocked
2. Try: "DELETE FROM reps" - should be blocked
3. Verify error messages are user-friendly

#### Step 6: Run code review

Check for:
- [ ] No console.log statements left in production code
- [ ] Error handling in all API routes
- [ ] Loading states in UI
- [ ] TypeScript strict mode compliance
- [ ] No hardcoded API keys

---

## Summary

| Task | Description | Agent | Dependencies |
|------|-------------|-------|--------------|
| 1 | Database Migration | supabase-agent | None |
| 2 | Core Libraries | Backend Architect | Task 1 |
| 3 | API Routes | Backend Architect | Task 2 |
| 4 | Chat UI Components | react-component-developer | None |
| 5 | Chat Page Integration | Frontend Developer | Tasks 3, 4 |
| 6 | Testing & Polish | code-reviewer | Task 5 |

**Parallel Execution Strategy:**
- Task 1 runs first (database must exist)
- Tasks 2 and 4 run in parallel (libraries + UI)
- Task 3 runs after Task 2 (needs libraries)
- Task 5 runs after Tasks 3 and 4 complete
- Task 6 runs last (final verification)

**Estimated Total:** 6 tasks, ~3-4 parallel execution rounds
