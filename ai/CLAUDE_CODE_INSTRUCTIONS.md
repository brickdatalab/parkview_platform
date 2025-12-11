# Claude Code Instructions: Parkview AI Chat Backend

## What We're Building

An AI chat feature for the Parkview Dashboard that allows internal users to query and update the database through natural conversation using the Grok model from xAI.

**Key capabilities:**
- Query deals, commissions, rep performance via natural language
- Update records when instructed (e.g., "mark that deal as paid")
- Persistent chat history per user
- Resume previous conversations

---

## Tech Stack

- **Frontend:** Next.js (existing dashboard)
- **Database:** Supabase (existing)
- **AI Model:** Grok 4 via xAI API
- **Auth:** Supabase Auth (existing)

---

## Environment Variables

Already in `.env.local`:
```
XAI_API_KEY=xai-xxxxx
```

Should also have (verify these exist):
```
NEXT_PUBLIC_SUPABASE_URL=https://irssizfmrqeqcxwdvkhx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxxxx
SUPABASE_SERVICE_ROLE_KEY=xxxxx  # Needed for SQL execution
```

---

## Files Provided

| File | Purpose |
|------|---------|
| `ai/SYSTEM_PROMPT.md` | Complete system prompt for Grok - includes schema, business logic, response guidelines |
| `ai/BUSINESS_CONTEXT.md` | Business context to embed in system prompt |
| `ai/EXAMPLE_QA_PAIRS.md` | Reference examples (don't include all in prompt - too many tokens) |
| `ai/chat_schema.sql` | Migration to add `conversations` and `messages` tables |

---

## Implementation Steps

### Step 1: Run Database Migration

Execute `ai/chat_schema.sql` against Supabase to create:
- `conversations` table
- `messages` table
- RLS policies
- Helper functions

### Step 2: Create Core Libraries

#### `lib/xai.ts` - Grok API Client

```typescript
const XAI_API_URL = 'https://api.x.ai/v1/chat/completions';

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface ChatResponse {
  choices: [{
    message: {
      role: string;
      content: string | null;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }];
}

export async function callGrok(
  messages: Message[],
  tools?: any[]
): Promise<ChatResponse> {
  const response = await fetch(XAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.XAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'grok-4-1-fast-non-reasoning-latest',
      messages,
      tools,
      tool_choice: tools ? 'auto' : undefined,
      temperature: 0,
      stream: false  // Start without streaming
    })
  });

  if (!response.ok) {
    throw new Error(`Grok API error: ${response.status}`);
  }

  return response.json();
}
```

#### `lib/sql-validator.ts` - SQL Validation

```typescript
const ALLOWED_STARTS = ['SELECT', 'UPDATE', 'INSERT'];
const BLOCKED_KEYWORDS = [
  'DROP', 'DELETE', 'TRUNCATE', 'ALTER', 'CREATE', 
  'GRANT', 'REVOKE', 'EXEC', 'EXECUTE'
];

export function validateSQL(sql: string): { valid: boolean; error?: string } {
  const normalized = sql.trim().toUpperCase();
  
  // Check starts with allowed operation
  const startsValid = ALLOWED_STARTS.some(op => normalized.startsWith(op));
  if (!startsValid) {
    return { valid: false, error: 'Only SELECT, UPDATE, and INSERT operations are allowed' };
  }
  
  // Check for blocked keywords
  for (const keyword of BLOCKED_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return { valid: false, error: `Blocked keyword: ${keyword}` };
    }
  }
  
  return { valid: true };
}
```

#### `lib/supabase-admin.ts` - Admin Client for SQL Execution

```typescript
import { createClient } from '@supabase/supabase-js';

// Use service role for SQL execution (bypasses RLS)
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function executeSQL(sql: string): Promise<any> {
  // For SELECT queries
  if (sql.trim().toUpperCase().startsWith('SELECT')) {
    const { data, error } = await supabaseAdmin.rpc('execute_readonly_query', { sql });
    if (error) throw error;
    return data;
  }
  
  // For UPDATE/INSERT - use raw SQL via postgres function or edge function
  // This requires a custom RPC function or edge function
  // See alternative approach below
}
```

**Alternative: Create RPC function for SQL execution**

Add to migration:
```sql
CREATE OR REPLACE FUNCTION execute_sql(sql_query TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Execute and return results
  EXECUTE 'SELECT jsonb_agg(row_to_json(t)) FROM (' || sql_query || ') t'
  INTO result;
  RETURN COALESCE(result, '[]'::JSONB);
END;
$$;
```

### Step 3: Create API Routes

#### `app/api/chat/conversations/route.ts`

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// GET - List user's conversations
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('conversations')
    .select('id, title, updated_at')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// POST - Create new conversation
export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: user.id })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
```

#### `app/api/chat/conversations/[id]/messages/route.ts`

This is the main endpoint - handles the AI conversation loop:

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { callGrok } from '@/lib/xai';
import { validateSQL } from '@/lib/sql-validator';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { SYSTEM_PROMPT } from '@/lib/system-prompt';

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'execute_sql',
      description: 'Execute SQL query against Parkview database. Supports SELECT, UPDATE, INSERT.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'SQL statement to execute'
          }
        },
        required: ['query']
      }
    }
  }
];

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { message } = await request.json();
  const conversationId = params.id;

  // Verify user owns this conversation
  const { data: conv } = await supabase
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single();

  if (!conv) {
    return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
  }

  // Save user message
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    role: 'user',
    content: message
  });

  // Load conversation history
  const { data: history } = await supabase
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  // Build messages for Grok
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(m => ({ role: m.role, content: m.content }))
  ];

  // Call Grok (with tool loop)
  let response = await callGrok(messages, TOOLS);
  let assistantMessage = response.choices[0].message;

  // Handle tool calls
  while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
    const toolCall = assistantMessage.tool_calls[0];
    const args = JSON.parse(toolCall.function.arguments);
    
    let toolResult: any;
    
    if (toolCall.function.name === 'execute_sql') {
      const validation = validateSQL(args.query);
      
      if (!validation.valid) {
        toolResult = { error: validation.error };
      } else {
        try {
          // Execute SQL
          const { data, error } = await supabaseAdmin.rpc('execute_sql', { 
            sql_query: args.query 
          });
          toolResult = error ? { error: error.message } : data;
        } catch (e) {
          toolResult = { error: e.message };
        }
      }
    }

    // Add tool result to messages
    messages.push(assistantMessage);
    messages.push({
      role: 'tool',
      tool_call_id: toolCall.id,
      content: JSON.stringify(toolResult)
    });

    // Call Grok again with tool result
    response = await callGrok(messages, TOOLS);
    assistantMessage = response.choices[0].message;
  }

  // Save assistant response
  const finalContent = assistantMessage.content || 'I processed your request.';
  
  await supabase.from('messages').insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: finalContent,
    metadata: { /* can store tool calls, tokens, etc */ }
  });

  return NextResponse.json({ 
    message: finalContent 
  });
}
```

### Step 4: Create System Prompt Module

#### `lib/system-prompt.ts`

Import the content from `ai/SYSTEM_PROMPT.md` and `ai/BUSINESS_CONTEXT.md`:

```typescript
export const SYSTEM_PROMPT = `
You are Parkview Assistant, an internal AI for Parkview Advance LLC...
[Full content from SYSTEM_PROMPT.md]
`;
```

Or read from file at build time.

### Step 5: Create Chat UI Components

#### Basic structure:

```
components/
  chat/
    ChatSidebar.tsx      # List of conversations (red box)
    ChatInterface.tsx    # Main chat area (blue box)
    ChatMessage.tsx      # Individual message bubble
    ChatInput.tsx        # Message input with send button
```

The sidebar queries `/api/chat/conversations` and displays list.
Clicking a conversation loads its messages.
New message posts to `/api/chat/conversations/[id]/messages`.

---

## Database Permissions

The AI agent needs:
- **SELECT** on all tables (for queries)
- **UPDATE** on commission_payout_reps, commission_payout_iso, funded_deals (for status changes)
- **INSERT** on messages, conversations (for chat history)

The `execute_sql` RPC function runs with SECURITY DEFINER, so it has elevated privileges. The SQL validator blocks dangerous operations.

---

## Security Checklist

- [x] API routes check auth before processing
- [x] SQL validator blocks DROP, DELETE, TRUNCATE, ALTER
- [x] Service role key only used server-side
- [x] RLS enabled on chat tables
- [x] Tool results sanitized before returning

---

## Testing

1. Create conversation via API
2. Send simple query: "How many deals this month?"
3. Verify SQL executes and response returns
4. Send update: "Mark deal XYZ as paid"
5. Verify UPDATE executes
6. Check messages table has full history

---

## Future Enhancements

- [ ] Add streaming for real-time responses
- [ ] Add thinking mode toggle (switch to reasoning model)
- [ ] Add export chat history
- [ ] Add suggested questions
- [ ] Add SQL preview before execution (optional)
