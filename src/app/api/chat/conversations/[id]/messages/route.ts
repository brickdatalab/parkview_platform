import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { callGrok } from '@/lib/xai'
import { validateSQL } from '@/lib/sql-validator'
import { executeSQL } from '@/lib/supabase-admin'
import { SYSTEM_PROMPT } from '@/lib/system-prompt'
import type { GrokMessage } from '@/types/chat'

const MAX_MESSAGE_LENGTH = 10000

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

  // Validate message length
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      { error: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters allowed.` },
      { status: 400 }
    )
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
    const toolCallsLog: Array<{ query: string; result: unknown }> = []

    // Handle tool calls (max 5 iterations to prevent infinite loops)
    let iterations = 0
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && iterations < 5) {
      iterations++
      const toolCall = assistantMessage.tool_calls[0]

      let toolResult: unknown

      // Safely parse tool arguments
      let args: { query?: string }
      try {
        args = JSON.parse(toolCall.function.arguments)
      } catch {
        toolResult = { error: 'Invalid tool arguments' }
        messages.push({
          role: 'assistant',
          content: assistantMessage.content || '',
          ...({ tool_calls: assistantMessage.tool_calls } as Record<string, unknown>)
        })
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult)
        })
        response = await callGrok(messages)
        assistantMessage = response.choices[0].message
        continue
      }

      if (toolCall.function.name === 'execute_sql') {
        if (!args.query) {
          toolResult = { error: 'Query parameter required' }
        } else {
          const validation = validateSQL(args.query)

          if (!validation.valid) {
            toolResult = { error: validation.error }
          } else {
            const { data, error } = await executeSQL(args.query)
            toolResult = error ? { error } : data
            toolCallsLog.push({ query: args.query, result: toolResult })
          }
        }
      } else {
        toolResult = { error: `Unknown tool: ${toolCall.function.name}` }
      }

      // Add assistant message with tool call and tool result
      messages.push({
        role: 'assistant',
        content: assistantMessage.content || '',
        ...({ tool_calls: assistantMessage.tool_calls } as Record<string, unknown>)
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

    // Check for empty response after tool calls - this indicates a problem
    let finalContent = assistantMessage.content

    if (!finalContent || finalContent.trim() === '') {
      // If we executed queries but got no response, try one more time asking for a summary
      if (toolCallsLog.length > 0) {
        messages.push({
          role: 'user',
          content: 'Please summarize the results from the query you just ran. Show the actual data.'
        })
        const retryResponse = await callGrok(messages)
        finalContent = retryResponse.choices[0].message.content
      }

      // If still empty, generate a meaningful error based on what happened
      if (!finalContent || finalContent.trim() === '') {
        if (toolCallsLog.length > 0) {
          const lastResult = toolCallsLog[toolCallsLog.length - 1].result
          if (Array.isArray(lastResult) && lastResult.length === 0) {
            finalContent = 'The query returned no results. Try a different search term or check for typos in names.'
          } else if (Array.isArray(lastResult)) {
            finalContent = `Found ${lastResult.length} result(s) but failed to format the response. Raw data: ${JSON.stringify(lastResult).slice(0, 500)}`
          } else {
            finalContent = 'Query executed but response was empty. Please try rephrasing your question.'
          }
        } else {
          finalContent = 'I was unable to process your request. Please try rephrasing your question.'
        }
      }
    }

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
