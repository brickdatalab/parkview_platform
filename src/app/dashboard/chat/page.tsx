'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import useSWR, { mutate } from 'swr'
import { SiteHeader } from '@/components/layout/site-header'
import { ChatSidebar } from '@/components/chat/ChatSidebar'
import { ChatInterface, type ChatInterfaceHandle } from '@/components/chat/ChatInterface'
import type { Conversation, Message } from '@/types/chat'

const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function ChatPage() {
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)

  // Use ref to track the active conversation for async operations
  const activeConvRef = useRef<string | null>(null)
  activeConvRef.current = activeConversationId

  // Ref to focus chat input
  const chatInterfaceRef = useRef<ChatInterfaceHandle>(null)

  // Flag to skip fetching messages when we just created a conversation
  const skipFetchRef = useRef(false)

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

    // Skip fetch if we just created this conversation (we're managing messages locally)
    if (skipFetchRef.current) {
      skipFetchRef.current = false
      return
    }

    setIsLoading(true)
    fetch(`/api/chat/conversations/${activeConversationId}`)
      .then(res => res.json())
      .then(data => {
        if (data.messages) {
          setMessages(data.messages)
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [activeConversationId])

  // Start new chat - just reset to blank state, don't create in DB yet
  const handleNewConversation = useCallback(() => {
    setActiveConversationId(null)
    setMessages([])
    // Focus the input after a brief delay to ensure state has updated
    setTimeout(() => chatInterfaceRef.current?.focusInput(), 0)
  }, [])

  // Delete conversation
  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`/api/chat/conversations/${id}`, { method: 'DELETE' })
      await mutate('/api/chat/conversations')
      if (activeConvRef.current === id) {
        setActiveConversationId(null)
        setMessages([])
      }
    } catch (e) {
      console.error('Failed to delete conversation:', e)
    }
  }, [])

  // Send message to a specific conversation
  const sendToConversation = useCallback(async (convId: string, content: string) => {
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
  }, [])

  // Handle sending a message
  const handleSendMessage = useCallback(async (content: string) => {
    if (!activeConvRef.current) {
      // Create new conversation first
      try {
        setIsSending(true)
        const res = await fetch('/api/chat/conversations', { method: 'POST' })
        const newConv = await res.json()

        if (newConv.error) {
          console.error('Failed to create conversation:', newConv.error)
          setIsSending(false)
          return
        }

        // Skip the useEffect fetch since we'll manage messages locally
        skipFetchRef.current = true
        await mutate('/api/chat/conversations')
        setActiveConversationId(newConv.id)

        // Send to the new conversation
        await sendToConversation(newConv.id, content)
      } catch (e) {
        console.error('Failed to create conversation:', e)
        setIsSending(false)
      }
    } else {
      await sendToConversation(activeConvRef.current, content)
    }
  }, [sendToConversation])

  return (
    <div className="flex h-full flex-col">
      <SiteHeader title="" />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - conversation list */}
        <div className="w-72 shrink-0 overflow-hidden">
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
            ref={chatInterfaceRef}
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isSending}
          />
        </div>
      </div>
    </div>
  )
}
