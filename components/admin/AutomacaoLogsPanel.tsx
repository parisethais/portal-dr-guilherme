'use client'

import { useState, useEffect, useTransition } from 'react'
import { getAutomationLogs } from '@/app/actions/automations'
import { AUTOMATION_CATALOG, type AutomationLog, type ClinicAutomation } from '@/lib/automation-catalog'
import { CheckCircle2, XCircle, MinusCircle, ChevronDown, Loader2, RefreshCw, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

// ── Linha de log ─────────────────────────────────────────────────────────

function LogRow({ log, automations }: { log: AutomationLog; automations: ClinicAutomation[] }) {
  const [open, setOpen] = useState(false)

  const def      = AUTOMATION_CATALOG.find(d => {
    const a = automations.find(a => a.id === log.automation_id)
    return a && d.type === a.type
  })
  const mensagem = log.result?.mensagem as string | undefined
  const telefone = log.result?.telefone as string | undefined

  return (
    <div className="border-b border-gray-50 last:border-0">
      {/* Linha principal */}
      <div
        className={cn(
          'flex items-center gap-3 px-4 py-2.5 text-xs',
          mensagem && 'cursor-pointer hover:bg-gray-50/60',
        )}
        onClick={() => mensagem && setOpen(v => !v)}
      >
        {/* Status */}
        {log.status === 'enviado'  && <CheckCircle2  className="w-3.5 h-3.5 text-green-500 shrink-0" />}
        {log.status === 'erro'     && <XCircle        className="w-3.5 h-3.5 text-red-400   shrink-0" />}
        {log.status === 'ignorado' && <MinusCircle    className="w-3.5 h-3.5 text-gray-300  shrink-0" />}

        {/* Automação */}
        <span className="shrink-0 text-base leading-none">{def?.icon ?? '⚙️'}</span>
        <span className="text-gray-500 hidden sm:block shrink-0">{def?.label ?? log.automation_id.slice(0, 8)}</span>

        {/* Paciente */}
        <span className="flex-1 font-medium text-gray-700 truncate">
          {log.patient_name ?? '—'}
          {telefone && <span className="font-normal text-gray-400 ml-1.5">{telefone}</span>}
        </span>

        {/* Data */}
        <span className="text-gray-400 shrink-0">{fmtDateTime(log.triggered_at)}</span>

        {/* Expandir */}
        {mensagem && (
          <ChevronDown className={cn(
            'w-3.5 h-3.5 text-gray-300 shrink-0 transition-transform',
            open && 'rotate-180',
          )} />
        )}
      </div>

      {/* Mensagem expandida */}
      {open && mensagem && (
        <div className="px-4 pb-3 pt-0.5">
          <div className="flex items-start gap-2 bg-gray-50 rounded-xl px-3 py-2.5">
            <MessageSquare className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap">{mensagem}</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Painel principal ──────────────────────────────────────────────────────

const STATUS_OPTS = [
  { value: '',         label: 'Todos os status' },
  { value: 'enviado',  label: '✅ Enviado' },
  { value: 'erro',     label: '❌ Erro' },
  { value: 'ignorado', label: '— Ignorado' },
]

export default function AutomacaoLogsPanel({
  clinicId,
  automations,
}: {
  clinicId:    string
  automations: ClinicAutomation[]
}) {
  const [logs,       setLogs]       = useState<AutomationLog[]>([])
  const [filterType, setFilterType] = useState('')   // automation type
  const [filterStatus, setFilterStatus] = useState('')
  const [limit,      setLimit]      = useState(30)
  const [isPending,  startTransition] = useTransition()

  function load(lim = limit) {
    startTransition(async () => {
      // Filtra pelo automation_id correspondente ao tipo selecionado
      const automationId = filterType
        ? automations.find(a => a.type === filterType)?.id
        : undefined

      const data = await getAutomationLogs(clinicId, automationId, lim)
      setLogs(data)
    })
  }

  // Carrega na montagem e quando filtros mudam
  useEffect(() => { load(limit) }, [filterType, limit]) // eslint-disable-line

  const filtered = filterStatus
    ? logs.filter(l => l.status === filterStatus)
    : logs

  const enviados  = logs.filter(l => l.status === 'enviado').length
  const erros     = logs.filter(l => l.status === 'erro').length

  return (
    <div className="rounded-xl border border-gray-100 bg-white/60 overflow-hidden">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 flex-wrap gap-y-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-700">Histórico de envios</p>
          {logs.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">
              {enviados} enviado{enviados !== 1 ? 's' : ''}
              {erros > 0 && <span className="text-red-400 ml-2">· {erros} erro{erros !== 1 ? 's' : ''}</span>}
              {' '}nos últimos {limit} registros
            </p>
          )}
        </div>

        {/* Filtro por automação */}
        <select
          value={filterType}
          onChange={e => { setFilterType(e.target.value); setLimit(30) }}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Todas as automações</option>
          {AUTOMATION_CATALOG.filter(d => d.type !== 'lab_critico' && d.type !== 'sumario_pre_consulta').map(d => (
            <option key={d.type} value={d.type}>{d.icon} {d.label}</option>
          ))}
        </select>

        {/* Filtro por status */}
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
        >
          {STATUS_OPTS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Refresh */}
        <button
          onClick={() => load(limit)}
          disabled={isPending}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          title="Atualizar"
        >
          <RefreshCw className={cn('w-3.5 h-3.5', isPending && 'animate-spin')} />
        </button>
      </div>

      {/* Lista */}
      {isPending ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-sm text-gray-400">Nenhum registro encontrado.</p>
          <p className="text-xs text-gray-300 mt-1">Os logs aparecem aqui após a primeira execução.</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {filtered.map(log => (
            <LogRow key={log.id} log={log} automations={automations} />
          ))}
        </div>
      )}

      {/* Carregar mais */}
      {filtered.length >= limit && (
        <div className="px-4 py-3 border-t border-gray-50">
          <button
            onClick={() => setLimit(l => l + 30)}
            disabled={isPending}
            className="text-xs text-primary hover:underline disabled:opacity-50"
          >
            Carregar mais 30 registros
          </button>
        </div>
      )}
    </div>
  )
}
