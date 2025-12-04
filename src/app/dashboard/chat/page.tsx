'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { MessageSquare, Send, Bot, Sparkles } from 'lucide-react'

export default function ChatPage() {
  const [message, setMessage] = useState('')

  return (
    <div className="flex h-full flex-col">
      {/* Page Header */}
      <div className="border-b bg-white px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">
              Chat with Master Funder
            </h1>
            <p className="text-sm text-zinc-500">
              Ask questions about your funded deals and commissions
            </p>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-3xl">
          {/* Coming Soon Card */}
          <Card className="border-dashed border-2 bg-gradient-to-br from-violet-50 to-purple-50">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 mb-4">
                <Bot className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-zinc-900 mb-2 text-center">
                AI Assistant is at the Bar having drinks. Check back tomorrow when they've sobered up.
              </h2>
              <p className="text-center text-zinc-600 max-w-md mb-6">
                Soon you'll be able to ask questions like:
              </p>
              <div className="space-y-2 text-sm text-zinc-600">
                <div className="flex items-center gap-2 bg-white/80 rounded-lg px-4 py-2">
                  <MessageSquare className="h-4 w-4 text-violet-500" />
                  "What were our total commissions last month?"
                </div>
                <div className="flex items-center gap-2 bg-white/80 rounded-lg px-4 py-2">
                  <MessageSquare className="h-4 w-4 text-violet-500" />
                  "Which rep had the highest funded amount in Q4?"
                </div>
                <div className="flex items-center gap-2 bg-white/80 rounded-lg px-4 py-2">
                  <MessageSquare className="h-4 w-4 text-violet-500" />
                  "Show me deals with factor rates above 1.35"
                </div>
                <div className="flex items-center gap-2 bg-white/80 rounded-lg px-4 py-2">
                  <MessageSquare className="h-4 w-4 text-violet-500" />
                  "What's the average deal size by lender?"
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t bg-white px-6 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex gap-3">
            <Input
              placeholder="Ask a question about your data..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1"
              disabled
            />
            <Button disabled className="gap-2">
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>
          <p className="mt-2 text-xs text-zinc-400 text-center">
            AI integration coming soon
          </p>
        </div>
      </div>
    </div>
  )
}
