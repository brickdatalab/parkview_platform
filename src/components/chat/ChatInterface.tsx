'use client'

import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput, type ChatInputHandle } from './ChatInput'
import { Bot, MessageSquare } from 'lucide-react'
import type { Message } from '@/types/chat'

interface ChatInterfaceProps {
  messages: Message[]
  onSendMessage: (message: string) => void
  isLoading?: boolean
}

export interface ChatInterfaceHandle {
  focusInput: () => void
}

export const ChatInterface = forwardRef<ChatInterfaceHandle, ChatInterfaceProps>(
  function ChatInterface({ messages, onSendMessage, isLoading }, ref) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<ChatInputHandle>(null)

  useImperativeHandle(ref, () => ({
    focusInput: () => inputRef.current?.focus()
  }))

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const filteredMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant')

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
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
                <span className="text-[#3c3c43]">&quot;How many deals did we fund this month?&quot;</span>
              </button>
              <button
                onClick={() => onSendMessage("What do we owe Sarah in commissions?")}
                className="flex items-center gap-2 rounded-xl border border-[#e5e5ea] px-4 py-2.5 hover:bg-[#f5f5f7] transition-colors w-full"
              >
                <MessageSquare className="h-4 w-4 text-[#0b93f6]" />
                <span className="text-[#3c3c43]">&quot;What do we owe Sarah in commissions?&quot;</span>
              </button>
              <button
                onClick={() => onSendMessage("Mark the ABC Trucking commission as paid")}
                className="flex items-center gap-2 rounded-xl border border-[#e5e5ea] px-4 py-2.5 hover:bg-[#f5f5f7] transition-colors w-full"
              >
                <MessageSquare className="h-4 w-4 text-[#0b93f6]" />
                <span className="text-[#3c3c43]">&quot;Mark the ABC Trucking commission as paid&quot;</span>
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
      </div>

      <div className="shrink-0 border-t bg-white">
        <ChatInput ref={inputRef} onSend={onSendMessage} isLoading={isLoading} />
      </div>
    </div>
  )
})
