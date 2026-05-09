'use client'

import { useState, useTransition } from 'react'
import type { Message } from '@/lib/types'
import { formatDateTime } from '@/lib/utils'
import { markMessageAsRead, sendMessage } from '@/app/actions/messages'
import Card from '@/components/ui/Card'
import { MessageSquare, Circle, Send, Loader2, CheckCircle, CornerDownRight } from 'lucide-react'

interface MessageListProps {
  messages: Message[]
}

export default function MessageList({ messages: initialMessages }: MessageListProps) {
  const [messages, setMessages]     = useState(initialMessages)
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText]   = useState('')
  const [replySent, setReplySent]   = useState<string | null>(null)
  const [replyError, setReplyError] = useState('')
  const [, startReadTransition]     = useTransition()
  const [isSending, startSend]      = useTransition()

  const unreadCount = messages.filter(m => !m.read).length

  function handleOpen(msg: Message) {
    const next = expanded === msg.id ? null : msg.id
    setExpanded(next)
    if (next === null) { setReplyingTo(null); setReplyText(''); setReplyError('') }
    if (!msg.read) {
      startReadTransition(async () => {
        await markMessageAsRead(msg.id)
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, read: true } : m))
      })
    }
  }

  function handleReply(msg: Message) {
    setReplyingTo(msg.id)
    setReplyText('')
    setReplyError('')
    setReplySent(null)
  }

  function handleSendReply(msg: Message) {
    if (!replyText.trim()) return
    setReplyError('')
    startSend(async () => {
      const fd = new FormData()
      fd.append('recipient_id', msg.sender_id)
      fd.append('content', replyText.trim())
      const res = await sendMessage(fd)
      if (!res.success) {
        setReplyError(res.error)
        return
      }
      setReplySent(msg.id)
      setReplyingTo(null)
      setReplyText('')
    })
  }

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

      {messages.map(msg => (
        <Card
          key={msg.id}
          padding="sm"
          className={`transition-all ${!msg.read ? 'border-primary/30 bg-blue-50/30' : ''}`}
        >
          {/* Cabeçalho clicável */}
          <div
            className="flex items-start gap-3 cursor-pointer"
            onClick={() => handleOpen(msg)}
          >
            <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <MessageSquare className="w-4 h-4 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    Consultório Dr. Guilherme
                  </span>
                  {!msg.read && <span className="w-2 h-2 bg-primary rounded-full" />}
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {formatDateTime(msg.created_at)}
                </span>
              </div>

              <p className={`text-sm mt-1 ${
                expanded === msg.id
                  ? 'text-gray-700 whitespace-pre-wrap'
                  : 'text-gray-500 truncate'
              }`}>
                {msg.content}
              </p>
            </div>
          </div>

          {/* Expandido: ações + resposta */}
          {expanded === msg.id && (
            <div className="mt-3 ml-12 space-y-3">

              {/* Confirmação de envio */}
              {replySent === msg.id && (
                <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  Resposta enviada ao consultório.
                </div>
              )}

              {/* Form de resposta */}
              {replyingTo === msg.id ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
                    <CornerDownRight className="w-3.5 h-3.5" />
                    Responder ao consultório
                  </div>
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={3}
                    autoFocus
                    placeholder="Digite sua resposta..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {replyError && (
                    <p className="text-xs text-red-600">{replyError}</p>
                  )}
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { setReplyingTo(null); setReplyText(''); setReplyError('') }}
                      className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSendReply(msg)}
                      disabled={isSending || !replyText.trim()}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-light disabled:opacity-50 transition-colors"
                    >
                      {isSending
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Enviando...</>
                        : <><Send className="w-3 h-3" /> Enviar</>}
                    </button>
                  </div>
                </div>
              ) : (
                replySent !== msg.id && (
                  <button
                    type="button"
                    onClick={() => handleReply(msg)}
                    className="flex items-center gap-1.5 text-xs text-primary font-medium hover:text-primary-light transition-colors"
                  >
                    <CornerDownRight className="w-3.5 h-3.5" />
                    Responder
                  </button>
                )
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
