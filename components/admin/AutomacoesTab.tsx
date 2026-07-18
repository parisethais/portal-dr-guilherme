'use client'

import { useState, useEffect } from 'react'
import {
  AUTOMATION_CATALOG,
  type ClinicAutomation,
  type AutomationParams,
  type AutomationDef,
} from '@/lib/automation-catalog'
import { upsertClinicAutomation, runAutomacoesManual } from '@/app/actions/automations'
import AutomacaoLogsPanel from './AutomacaoLogsPanel'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, Crown, Loader2, Zap, Play, Clock, CheckCircle2, XCircle, MinusCircle, History } from 'lucide-react'

// ── Card individual de automação ──────────────────────────────────────────

function AutomationCard({
  def,
  automation,
  clinicId,
  onUpdate,
}: {
  def:        AutomationDef
  automation: ClinicAutomation | undefined
  clinicId:   string
  onUpdate:   (a: Partial<ClinicAutomation> & { type: string }) => void
}) {
  const [open,   setOpen]   = useState(false)
  const [active, setActive] = useState(automation?.active ?? false)
  const [params, setParams] = useState<AutomationParams>(() => {
    if (automation?.params && Object.keys(automation.params).length > 0) {
      return automation.params
    }
    // seed com defaults do catálogo
    const d: AutomationParams = {}
    for (const f of def.params_schema) {
      if      (f.field === 'horas_antes') d.horas_antes = f.default as number
      else if (f.field === 'dias')        d.dias        = f.default as number
      else if (f.field === 'mensagem')    d.mensagem    = f.default as string
      else if (f.field === 'canal')       d.canal       = f.default as AutomationParams['canal']
    }
    return d
  })
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [error,  setError]  = useState('')

  // Sync quando o pai recarrega dados
  useEffect(() => {
    setActive(automation?.active ?? false)
    if (automation?.params && Object.keys(automation.params).length > 0) {
      setParams(automation.params)
    }
  }, [automation])

  async function handleToggle() {
    const next = !active
    setActive(next)
    setSaving(true)
    const res = await upsertClinicAutomation(clinicId, def.type, next, params)
    setSaving(false)
    if (res.error) { setError(res.error); setActive(!next); return }
    onUpdate({ type: def.type, active: next, params })
  }

  async function handleSaveParams() {
    setSaving(true); setError('')
    const res = await upsertClinicAutomation(clinicId, def.type, active, params)
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    onUpdate({ type: def.type, active, params })
  }

  function insertTag(tag: string) {
    setParams(p => ({ ...p, mensagem: (p.mensagem ?? '') + tag }))
  }

  const hasPremium = def.premium

  return (
    <div className={cn(
      'rounded-xl border transition-all duration-150',
      active
        ? 'border-green-200 bg-green-50/25'
        : hasPremium
          ? 'border-amber-100 bg-amber-50/20'
          : 'border-gray-100 bg-white/60',
    )}>

      {/* ── Linha principal ── */}
      <div className="flex items-center gap-3 px-4 py-3.5">

        {/* Ícone */}
        <span className="text-xl leading-none shrink-0">{def.icon}</span>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-sm font-semibold text-gray-800">{def.label}</p>
            {hasPremium && (
              <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold leading-none">
                <Crown className="w-2.5 h-2.5" />
                PREMIUM
              </span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5 leading-snug">{def.description}</p>
        </div>

        {/* Canal badge */}
        <span className="hidden sm:block text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium shrink-0 capitalize">
          {def.canal_padrao}
        </span>

        {/* Toggle ativo/inativo */}
        <button
          onClick={handleToggle}
          disabled={saving}
          title={active ? 'Desativar' : 'Ativar'}
          className={cn(
            'relative inline-flex items-center w-10 h-5 rounded-full transition-colors shrink-0 focus:outline-none',
            active ? 'bg-green-400' : 'bg-gray-200',
            saving && 'opacity-60 cursor-not-allowed',
          )}
        >
          {saving
            ? <Loader2 className="w-3 h-3 text-white animate-spin absolute inset-0 m-auto" />
            : <span className={cn(
                'inline-block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5',
                active ? 'translate-x-4' : 'translate-x-0',
              )} />
          }
        </button>

        {/* Expandir configurações (só se tem params) */}
        {def.params_schema.length > 0 && (
          <button
            onClick={() => setOpen(v => !v)}
            className={cn(
              'p-1.5 rounded-lg transition-all',
              open ? 'text-primary bg-primary/10' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100',
            )}
          >
            <ChevronDown className={cn('w-4 h-4 transition-transform duration-150', open && 'rotate-180')} />
          </button>
        )}
      </div>

      {/* ── Painel de configurações ── */}
      {open && def.params_schema.length > 0 && (
        <div className="px-4 pb-4 pt-3.5 border-t border-gray-100/80 space-y-4">
          {def.params_schema.map(field => (
            <div key={field.field}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                {field.label}
              </label>

              {field.type === 'number' && (
                <>
                  <input
                    type="number"
                    min={1}
                    value={(params as Record<string, unknown>)[field.field] as number ?? field.default}
                    onChange={e => setParams(p => ({
                      ...p,
                      [field.field]: parseInt(e.target.value) || (field.default as number),
                    }))}
                    className="w-32 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  {field.hint && <p className="text-[11px] text-gray-400 mt-1">{field.hint}</p>}
                </>
              )}

              {field.type === 'select' && (
                <select
                  value={(params as Record<string, unknown>)[field.field] as string ?? field.default}
                  onChange={e => setParams(p => ({ ...p, [field.field]: e.target.value }))}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {field.options?.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              )}

              {field.type === 'textarea' && (
                <div className="space-y-2">
                  <textarea
                    rows={3}
                    value={params.mensagem ?? (field.default as string)}
                    onChange={e => setParams(p => ({ ...p, mensagem: e.target.value }))}
                    placeholder={field.placeholder}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                  />
                  {/* Merge tags */}
                  {def.message_tags.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-gray-400 font-medium">Inserir tag:</span>
                      {def.message_tags.map(tag => (
                        <button
                          key={tag}
                          onClick={() => insertTag(tag)}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-mono hover:bg-primary/20 transition-colors"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                  {field.hint && <p className="text-[11px] text-gray-400">{field.hint}</p>}
                </div>
              )}
            </div>
          ))}

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end pt-1">
            <button
              onClick={handleSaveParams}
              disabled={saving}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                saved
                  ? 'bg-green-100 text-green-700'
                  : 'bg-primary text-white hover:bg-primary-dark disabled:opacity-60',
              )}
            >
              {saving  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
               : saved ? <Check   className="w-3.5 h-3.5" />
               :         <Check   className="w-3.5 h-3.5" />}
              {saved ? 'Salvo!' : 'Salvar configuração'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Tab principal ─────────────────────────────────────────────────────────

interface RunResult {
  type:   string
  count:  number
  error?: string
}

export default function AutomacoesTab({
  clinicId,
  automations: initial,
  loading,
}: {
  clinicId:    string
  automations: ClinicAutomation[]
  loading:     boolean
}) {
  const [automations, setAutomations] = useState<ClinicAutomation[]>(initial)
  const [running,     setRunning]     = useState(false)
  const [runResults,  setRunResults]  = useState<RunResult[] | null>(null)
  const [runError,    setRunError]    = useState('')
  const [runTs,       setRunTs]       = useState<string | null>(null)
  const [showLogs,    setShowLogs]    = useState(false)

  useEffect(() => { setAutomations(initial) }, [initial])

  function handleUpdate(patch: Partial<ClinicAutomation> & { type: string }) {
    setAutomations(prev => {
      const exists = prev.find(a => a.type === patch.type)
      if (exists) return prev.map(a => a.type === patch.type ? { ...a, ...patch } : a)
      return [...prev, { ...patch, id: '', clinic_id: clinicId, created_at: '', updated_at: '' } as ClinicAutomation]
    })
  }

  async function handleRunNow() {
    setRunning(true); setRunError(''); setRunResults(null)
    try {
      const json = await runAutomacoesManual(clinicId)
      if (json.error) { setRunError(json.error); return }
      setRunResults(json.resultados ?? [])
      setRunTs(json.executado_em ?? new Date().toISOString())
    } catch (e) {
      setRunError((e as Error).message)
    } finally {
      setRunning(false)
    }
  }

  if (loading) {
    return (
      <div className="py-10 flex justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
      </div>
    )
  }

  const activeCount = automations.filter(a => a.active).length

  return (
    <div className="space-y-4">

      {/* Sumário + botão testar */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/5 border border-primary/10">
        <Zap className="w-4 h-4 text-primary shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-800">
            {activeCount} automação{activeCount !== 1 ? 'ões' : ''} ativa{activeCount !== 1 ? 's' : ''}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Ative o toggle para ligar · Clique na seta para configurar · Cron roda às 07h (Brasília)
          </p>
        </div>
        <button
          onClick={handleRunNow}
          disabled={running || activeCount === 0}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all shrink-0',
            activeCount > 0 && !running
              ? 'bg-primary text-white hover:bg-primary-dark'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          )}
        >
          {running
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Play    className="w-3.5 h-3.5" />}
          {running ? 'Executando…' : 'Executar agora'}
        </button>
      </div>

      {/* Resultado da execução manual */}
      {runError && (
        <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
          {runError}
        </div>
      )}

      {runResults && (
        <div className="rounded-xl border border-gray-100 bg-white/70 overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <Clock className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-xs font-semibold text-gray-600">
              Execução manual —{' '}
              {runTs
                ? new Date(runTs).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                : ''}
            </p>
          </div>
          <div className="divide-y divide-gray-50">
            {runResults.filter(r => r.type !== 'lab_critico' && r.type !== 'sumario_pre_consulta').map(r => {
              const def = AUTOMATION_CATALOG.find(d => d.type === r.type)
              return (
                <div key={r.type} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-base shrink-0">{def?.icon ?? '⚙️'}</span>
                  <span className="flex-1 text-sm text-gray-700">{def?.label ?? r.type}</span>
                  {r.error ? (
                    <span className="flex items-center gap-1 text-xs text-red-500">
                      <XCircle className="w-3.5 h-3.5" /> Erro
                    </span>
                  ) : r.count === 0 ? (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MinusCircle className="w-3.5 h-3.5" /> Nenhuma ação
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> {r.count} enviado{r.count > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cards de automação */}
      <div className="space-y-2">
        {AUTOMATION_CATALOG.map(def => (
          <AutomationCard
            key={def.type}
            def={def}
            automation={automations.find(a => a.type === def.type)}
            clinicId={clinicId}
            onUpdate={handleUpdate}
          />
        ))}
      </div>

      {/* Histórico de logs */}
      <div>
        <button
          onClick={() => setShowLogs(v => !v)}
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-800 transition-colors py-1"
        >
          <History className="w-4 h-4" />
          Histórico de envios
          <ChevronDown className={cn('w-4 h-4 text-gray-400 transition-transform', showLogs && 'rotate-180')} />
        </button>

        {showLogs && (
          <div className="mt-3">
            <AutomacaoLogsPanel clinicId={clinicId} automations={automations} />
          </div>
        )}
      </div>

    </div>
  )
}
