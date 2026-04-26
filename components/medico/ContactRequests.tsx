'use client'

import { useState, useTransition } from 'react'
import type { ContactRequest } from '@/lib/types'
import { updateContactRequestStatus } from '@/app/actions/contact-requests'
import { formatDateTime } from '@/lib/utils'
import { statusBadge } from '@/components/ui/Badge'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { Inbox, ChevronDown, ChevronUp, Clock } from 'lucide-react'

interface ContactRequestsProps {
  requests: ContactRequest[]
}

type Status = 'pendente' | 'em_andamento' | 'resolvido'

export default function ContactRequests({ requests: initialRequests }: ContactRequestsProps) {
  const [requests, setRequests] = useState(initialRequests)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [filter, setFilter] = useState<Status | 'todos'>('todos')
  const [isPending, startTransition] = useTransition()

  function handleStatusChange(requestId: string, status: Status) {
    startTransition(async () => {
      const result = await updateContactRequestStatus(requestId, status)
      if (result.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status } : r))
        )
      }
    })
  }

  const filtered = filter === 'todos'
    ? requests
    : requests.filter((r) => r.status === filter)

  const pendingCount = requests.filter((r) => r.status === 'pendente').length

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {(['todos', 'pendente', 'em_andamento', 'resolvido'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f === 'todos' && 'Todas'}
            {f === 'pendente' && `Pendentes${pendingCount > 0 ? ` (${pendingCount})` : ''}`}
            {f === 'em_andamento' && 'Em andamento'}
            {f === 'resolvido' && 'Resolvidas'}
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
          {filtered.map((req) => (
            <Card key={req.id} padding="sm">
              <div
                className="cursor-pointer"
                onClick={() => setExpanded(expanded === req.id ? null : req.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                      req.status === 'pendente' ? 'bg-yellow-400' :
                      req.status === 'em_andamento' ? 'bg-blue-400' : 'bg-green-400'
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
                    {expanded === req.id
                      ? <ChevronUp className="w-4 h-4 text-gray-400" />
                      : <ChevronDown className="w-4 h-4 text-gray-400" />
                    }
                  </div>
                </div>

                <div className="flex items-center gap-1 mt-2 ml-5 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(req.created_at)}
                </div>
              </div>

              {expanded === req.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {req.message}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs text-gray-500 self-center mr-1">Alterar status:</span>
                    {(['pendente', 'em_andamento', 'resolvido'] as Status[]).map((status) => (
                      <Button
                        key={status}
                        variant={req.status === status ? 'primary' : 'outline'}
                        size="sm"
                        onClick={() => handleStatusChange(req.id, status)}
                        disabled={isPending || req.status === status}
                      >
                        {status === 'pendente' && 'Pendente'}
                        {status === 'em_andamento' && 'Em andamento'}
                        {status === 'resolvido' && 'Resolvido'}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
