'use client'

import { useState, useTransition } from 'react'
import type { ContactRequest } from '@/lib/types'
import { updateContactRequestStatus, replyToContactRequest } from '@/app/actions/contact-requests'
import { formatDateTime } from '@/lib/utils'
import { statusBadge } from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Inbox, ChevronDown, ChevronUp, Clock, Send, Check, MessageSquareReply } from 'lucide-react'

interface ContactRequestsProps {
  requests: ContactRequest[]
}

type Status = 'pendente' | 'em_andamento' | 'resolvido'

function RequestCard({ req: initialReq }: { req: ContactRequest }) {
  const [req, setReq]           = useState(initialReq)
  const [expanded, setExpanded] = useState(false)
  const [showReply, setShowReply] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sent, setSent]         = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(status: Status) {
    startTransition(async () => {
      const result = await updateContactRequestStatus(req.id, status)
      if (result.success) setReq(r => ({ ...r, status }))
    })
  }

  function handleReply() {
    if (!replyText.trim()) return
    startTransition(async () => {
      const result = await replyToContactRequest(req.id, replyText)
      if (result.success) {
        setReq(r => ({
          ...r,
          response:     replyText.trim(),
          responded_at: new Date().toISOString(),
          status:       'resolvido',
        }))
        setSent(true)
        setShowReply(false)
        setReplyText('')
      }
    })
  }

  return (
    <Card padding="sm">
      {/* Cabeçalho clicável */}
      <div className="cursor-pointer" onClick={() => setExpanded(e => !e)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
              req.status === 'pendente'     ? 'bg-yellow-400' :
              req.status === 'em_andamento' ? 'bg-blue-400'   : 'bg-green-400'
            }`} />
            <div>
              <p className="font-medium text-gray-900 text-sm">{req.subject}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {req.patient?.full_name || 'Paciente desconhecido'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {statusBadge(req.status)}
            {expanded
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />
            }
          </div>
        </div>
        <div className="flex items-center gap-1 mt-2 ml-5 text-xs text-gray-400">
          <Clock className="w-3 h-3" />
          {formatDateTime(req.created_at)}
          {req.responded_at && (
            <span className="ml-2 text-green-600 flex items-center gap-0.5">
              <Check className="w-3 h-3" /> Respondida
            </span>
          )}
        </div>
      </div>

      {/* Conteúdo expandido */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">

          {/* Mensagem do paciente */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Mensagem do paciente
            </p>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {req.message}
            </p>
          </div>

          {/* Resposta já enviada */}
          {req.response && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wide mb-1.5">
                Resposta enviada {req.responded_at ? `· ${formatDateTime(req.responded_at)}` : ''}
              </p>
              <p className="text-sm text-blue-900 leading-relaxed whitespace-pre-wrap">
                {req.response}
              </p>
            </div>
          )}

          {/* Formulário de resposta */}
          {!req.response && (
            <>
              {showReply ? (
                <div className="space-y-2">
                  <textarea
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    rows={4}
                    placeholder="Escreva sua resposta ao paciente..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none text-gray-900"
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => { setShowReply(false); setReplyText('') }}
                      className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-lg transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleReply}
                      disabled={isPending || !replyText.trim()}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-light transition-colors disabled:opacity-50"
                    >
                      {isPending
                        ? <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Enviando...</>
                        : <><Send className="w-3 h-3" /> Enviar resposta</>
                      }
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowReply(true)}
                  className="flex items-center gap-2 px-3 py-2 border border-primary/20 text-primary hover:bg-blue-50 rounded-lg text-xs font-semibold transition-colors w-full justify-center"
                >
                  <MessageSquareReply className="w-3.5 h-3.5" />
                  Responder ao paciente
                </button>
              )}
            </>
          )}

          {/* Alterar status manualmente */}
          <div className="flex flex-wrap gap-2 items-center pt-1">
            <span className="text-xs text-gray-400">Status:</span>
            {(['pendente', 'em_andamento', 'resolvido'] as Status[]).map(status => (
              <Button
                key={status}
                variant={req.status === status ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleStatusChange(status)}
                disabled={isPending || req.status === status}
              >
                {status === 'pendente'     && 'Pendente'}
                {status === 'em_andamento' && 'Em andamento'}
                {status === 'resolvido'    && 'Resolvido'}
              </Button>
            ))}
          </div>

        </div>
      )}
    </Card>
  )
}

export default function ContactRequests({ requests: initialRequests }: ContactRequestsProps) {
  const [requests] = useState(initialRequests)
  const [filter, setFilter] = useState<Status | 'todos'>('todos')

  const filtered = filter === 'todos'
    ? requests
    : requests.filter(r => r.status === filter)

  const pendingCount = requests.filter(r => r.status === 'pendente').length

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {(['todos', 'pendente', 'em_andamento', 'resolvido'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              filter === f ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'todos'        && 'Todas'}
            {f === 'pendente'     && `Pendentes${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
            {f === 'em_andamento' && 'Em andamento'}
            {f === 'resolvido'    && 'Resolvidas'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {filter === 'todos'
              ? 'Nenhuma solicitação recebida ainda.'
              : 'Nenhuma solicitação com este status.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => (
            <RequestCard key={req.id} req={req} />
          ))}
        </div>
      )}
    </div>
  )
}
