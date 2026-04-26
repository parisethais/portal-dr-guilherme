'use client'

import { useState, useTransition } from 'react'
import type { Message } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { markMessageAsRead } from '@/app/actions/messages'
import Card from '@/components/ui/Card'
import { MessageSquare, Circle } from 'lucide-react'

interface MessageListProps {
  messages: Message[]
}

export default function MessageList({ messages: initialMessages }: MessageListProps) {
  const [messages, setMessages] = useState(initialMessages)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleOpen(msg: Message) {
    setExpanded(expanded === msg.id ? null : msg.id)
    if (!msg.read) {
      startTransition(async () => {
        await markMessageAsRead(msg.id)
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m))
        )
      })
    }
  }

  const unreadCount = messages.filter((m) => !m.read).length

  if (messages.length === 0) {
    return (
      <div className="text-center py-16">
        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Nenhuma mensagem recebida ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="flex items-center gap-2 text-sm text-primary font-medium">
          <Circle className="w-3 h-3 fill-current" />
          {unreadCount} {unreadCount === 1 ? 'mensagem não lida' : 'mensagens não lidas'}
        </div>
      )}

      {messages.map((msg) => (
        <Card
          key={msg.id}
          padding="sm"
          className={`cursor-pointer hover:shadow-md transition-all ${
            !msg.read ? 'border-primary/30 bg-blue-50/30' : ''
          }`}
          onClick={() => handleOpen(msg)}
        >
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    Consultório Dr. Guilherme
                  </span>
                  {!msg.read && (
                    <span className="w-2 h-2 bg-primary rounded-full" />
                  )}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatDateTime(msg.created_at)}
                </span>
              </div>

              <p
                className={`text-sm mt-1 transition-all ${
                  expanded === msg.id
                    ? 'text-gray-700 whitespace-pre-wrap'
                    : 'text-gray-500 truncate'
                }`}
              >
                {msg.content}
              </p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
