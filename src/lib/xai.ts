import type { GrokMessage, GrokResponse } from '@/types/chat'

const XAI_API_URL = 'https://api.x.ai/v1/chat/completions'
const MODEL = 'grok-4-1-fast-reasoning'

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
