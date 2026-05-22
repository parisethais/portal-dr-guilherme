'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getMrpaSessions, createMrpaSession,
  upsertMrpaReading, concludeMrpaSession, deleteMrpaSession,
} from '@/app/actions/mrpa'
import { getPatientGoal, upsertPatientGoal } from '@/app/actions/monitoring'
import type { MrpaSession, MrpaPeriod } from '@/app/actions/mrpa'
import type { PatientGoal } from '@/app/actions/monitoring'
import { cn } from '@/lib/utils'
import {
  Target, Plus, Pencil, Check, X, Trash2, Loader2,
  Heart, Scale, Activity, ChevronDown, ChevronUp,
  ClipboardList, CheckCircle2, Clock,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────

const PERIODS: { id: MrpaPeriod; label: string; sub: string }[] = [
  { id: 'manha1', label: 'Manhã 1', sub: 'ao acordar' },
  { id: 'manha2', label: 'Manhã 2', sub: '1 min depois' },
  { id: 'noite1', label: 'Noite 1', sub: 'antes de dormir' },
  { id: 'noite2', label: 'Noite 2', sub: '1 min depois' },
]

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/** Calcula a média ignorando o dia 1 (protocolo MRPA) */
function calcAverage(readings: MrpaSession['readings'], period: MrpaPeriod) {
  const valid = readings.filter(r => r.period === period && r.day_number > 1 && r.sistolica && r.diastolica)
  if (!valid.length) return null
  const avgSis = Math.round(valid.reduce((s, r) => s + (r.sistolica ?? 0), 0) / valid.length)
  const avgDia = Math.round(valid.reduce((s, r) => s + (r.diastolica ?? 0), 0) / valid.length)
  return { sistolica: avgSis, diastolica: avgDia }
}

function calcGlobalAverage(readings: MrpaSession['readings']) {
  const valid = readings.filter(r => r.day_number > 1 && r.sistolica && r.diastolica)
  if (!valid.length) return null
  const avgSis = Math.round(valid.reduce((s, r) => s + (r.sistolica ?? 0), 0) / valid.length)
  const avgDia = Math.round(valid.reduce((s, r) => s + (r.diastolica ?? 0), 0) / valid.length)
  return { sistolica: avgSis, diastolica: avgDia }
}

function paColor(sis: number | null, dia: number | null, paAlvo: string | null) {
  if (!sis || !dia) return 'text-gray-400'
  // Referência padrão MRPA: < 130/80
  const targetSis = 130, targetDia = 80
  if (sis >= targetSis || dia >= targetDia) return 'text-red-600 font-bold'
  if (sis >= targetSis - 10 || dia >= targetDia - 5) return 'text-amber-600 font-semibold'
  return 'text-emerald-700 font-semibold'
}

// ── Célula editável da tabela ─────────────────────────────────────────────

function ReadingCell({
  value, onSave, paAlvo, isDay1,
}: {
  value: { sistolica: number | null; diastolica: number | null } | null
  onSave: (sis: number | null, dia: number | null) => Promise<void>
  paAlvo: string | null
  isDay1: boolean
}) {
  const [editing, setEditing]   = useState(false)
  const [sis,     setSis]       = useState(String(value?.sistolica ?? ''))
  const [dia,     setDia]       = useState(String(value?.diastolica ?? ''))
  const [saving,  setSaving]    = useState(false)

  useEffect(() => {
    setSis(String(value?.sistolica ?? ''))
    setDia(String(value?.diastolica ?? ''))
  }, [value])

  async function handleSave() {
    setSaving(true)
    await onSave(sis ? parseInt(sis) : null, dia ? parseInt(dia) : null)
    setSaving(false)
    setEditing(false)
  }

  const hasValue = value?.sistolica && value?.diastolica
  const color = paColor(value?.sistolica ?? null, value?.diastolica ?? null, paAlvo)

  if (editing) {
    return (
      <div className="flex flex-col gap-1 items-center min-w-[80px]">
        <div className="flex items-center gap-0.5">
          <input
            autoFocus
            type="number"
            value={sis}
            onChange={e => setSis(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            className="w-12 text-xs border border-primary/30 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-primary/40"
            placeholder="PAS"
          />
          <span className="text-gray-300 text-xs">/</span>
          <input
            type="number"
            value={dia}
            onChange={e => setDia(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            className="w-12 text-xs border border-primary/30 rounded px-1 py-0.5 text-center focus:outline-none focus:ring-1 focus:ring-primary/40"
            placeholder="PAD"
          />
        </div>
        <div className="flex gap-1">
          <button onClick={handleSave} disabled={saving}
            className="p-0.5 text-emerald-600 hover:text-emerald-700">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          </button>
          <button onClick={() => setEditing(false)} className="p-0.5 text-gray-400 hover:text-gray-600">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      onClick={() => setEditing(true)}
      className={cn(
        'group text-xs px-2 py-1.5 rounded-md w-full text-center transition-colors min-w-[70px]',
        isDay1 ? 'opacity-60' : '',
        hasValue
          ? `${color} hover:bg-gray-50`
          : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50'
      )}
      title="Clique para editar"
    >
      {hasValue
        ? `${value!.sistolica}/${value!.diastolica}`
        : <span className="text-gray-200 group-hover:text-gray-400">—/—</span>
      }
    </button>
  )
}

// ── Tabela MRPA ───────────────────────────────────────────────────────────

function MrpaTable({
  session, paAlvo, onUpdate, onConclude, onDelete,
}: {
  session:    MrpaSession
  paAlvo:     string | null
  onUpdate:   (s: MrpaSession) => void
  onConclude: (id: string) => void
  onDelete:   (id: string) => void
}) {
  const [expanded, setExpanded] = useState(session.status === 'em_andamento')

  const days = Array.from({ length: session.days }, (_, i) => i + 1)

  function getReading(day: number, period: MrpaPeriod) {
    return session.readings.find(r => r.day_number === day && r.period === period) ?? null
  }

  async function handleCellSave(day: number, period: MrpaPeriod, sis: number | null, dia: number | null) {
    await upsertMrpaReading({
      session_id: session.id,
      patient_id: session.patient_id,
      day_number: day,
      period,
      sistolica:  sis,
      diastolica: dia,
    })
    // Atualiza localmente
    const updated: MrpaSession = {
      ...session,
      readings: [
        ...session.readings.filter(r => !(r.day_number === day && r.period === period)),
        ...(sis || dia ? [{
          id: `${session.id}-${day}-${period}`,
          session_id: session.id,
          patient_id: session.patient_id,
          day_number: day,
          period,
          sistolica: sis,
          diastolica: dia,
          fc: null,
          created_at: new Date().toISOString(),
        }] : []),
      ],
    }
    onUpdate(updated)
  }

  const globalAvg = calcGlobalAverage(session.readings)
  const isConcluded = session.status === 'concluida'

  return (
    <div className={cn(
      'rounded-xl border overflow-hidden',
      isConcluded ? 'border-gray-200' : 'border-primary/20',
    )} style={{ backgroundColor: 'rgba(255,255,255,0.90)', boxShadow: '0 2px 8px rgba(26,31,46,0.05)' }}>

      {/* Header da sessão */}
      <div
        className={cn('flex items-center justify-between px-4 py-3 cursor-pointer select-none',
          isConcluded ? 'bg-gray-50' : 'bg-primary/5')}
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-3">
          <div className={cn('w-2 h-2 rounded-full shrink-0',
            isConcluded ? 'bg-emerald-400' : 'bg-amber-400')} />
          <div>
            <p className="text-sm font-semibold text-gray-800">
              MRPA — {fmtDate(session.start_date)}
            </p>
            <p className="text-xs text-gray-400">
              {session.days} dias ·{' '}
              {isConcluded
                ? <span className="text-emerald-600 font-medium">Concluída</span>
                : <span className="text-amber-600 font-medium">Em andamento</span>}
              {globalAvg && ` · Média: ${globalAvg.sistolica}/${globalAvg.diastolica} mmHg`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isConcluded && (
            <button
              onClick={e => { e.stopPropagation(); onConclude(session.id) }}
              className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: 'rgba(122,158,126,0.12)', color: '#4E7A52' }}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Concluir
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); if (confirm('Excluir esta sessão de MRPA?')) onDelete(session.id) }}
            className="p-1.5 text-gray-300 hover:text-red-400 transition-colors rounded-lg"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {/* Tabela */}
      {expanded && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 w-16">Dia</th>
                {PERIODS.map(p => (
                  <th key={p.id} className="text-center px-2 py-2.5 text-xs font-semibold text-gray-500">
                    <div>{p.label}</div>
                    <div className="text-[10px] text-gray-400 font-normal">{p.sub}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {days.map(day => (
                <tr key={day} className={cn(
                  'hover:bg-gray-50/50 transition-colors',
                  day === 1 && 'bg-gray-50/40'
                )}>
                  <td className="px-4 py-2 text-xs font-medium text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <span>Dia {day}</span>
                      {day === 1 && (
                        <span className="text-[10px] text-gray-400 italic">(excl.)</span>
                      )}
                    </div>
                  </td>
                  {PERIODS.map(p => {
                    const r = getReading(day, p.id)
                    return (
                      <td key={p.id} className="px-2 py-1.5 text-center">
                        <ReadingCell
                          value={r ? { sistolica: r.sistolica, diastolica: r.diastolica } : null}
                          onSave={(sis, dia) => handleCellSave(day, p.id, sis, dia)}
                          paAlvo={paAlvo}
                          isDay1={day === 1}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}

              {/* Linha de médias */}
              <tr className="border-t-2 border-gray-200 bg-primary/4">
                <td className="px-4 py-2.5 text-xs font-bold text-gray-700">
                  Média*
                </td>
                {PERIODS.map(p => {
                  const avg = calcAverage(session.readings, p.id)
                  return (
                    <td key={p.id} className="px-2 py-2.5 text-center">
                      {avg ? (
                        <span className={cn('text-xs font-bold', paColor(avg.sistolica, avg.diastolica, paAlvo))}>
                          {avg.sistolica}/{avg.diastolica}
                        </span>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>

          {/* Rodapé */}
          <div className="px-4 py-2.5 border-t border-gray-100 flex flex-wrap items-center gap-4 bg-gray-50/60">
            <p className="text-[11px] text-gray-400 italic">* Média calculada excluindo o dia 1 (protocolo MRPA)</p>
            {globalAvg && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500">Média geral:</span>
                <span className={cn('text-xs font-bold', paColor(globalAvg.sistolica, globalAvg.diastolica, paAlvo))}>
                  {globalAvg.sistolica}/{globalAvg.diastolica} mmHg
                </span>
                {paAlvo && (
                  <span className="text-[11px] text-gray-400">(meta: {paAlvo})</span>
                )}
              </div>
            )}
            {/* Legenda de cores */}
            <div className="flex items-center gap-3 ml-auto text-[10px]">
              <span className="text-emerald-700">● Controlada</span>
              <span className="text-amber-600">● Limítrofe</span>
              <span className="text-red-600">● Elevada</span>
            </div>
          </div>

          {session.notes && (
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500 italic bg-gray-50/40">
              {session.notes}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Nova sessão MRPA ──────────────────────────────────────────────────────

function NewSessionForm({
  patientId, onCreated, onCancel,
}: { patientId: string; onCreated: (s: MrpaSession) => void; onCancel: () => void }) {
  const [days,      setDays]      = useState(5)
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10))
  const [notes,     setNotes]     = useState('')
  const [saving,    setSaving]    = useState(false)

  async function handleCreate() {
    setSaving(true)
    const res = await createMrpaSession({ patient_id: patientId, start_date: startDate, days, notes: notes.trim() || undefined })
    setSaving(false)
    if (res.error || !res.session) { alert(res.error ?? 'Erro ao criar sessão'); return }
    onCreated({ ...res.session, readings: [] } as MrpaSession)
  }

  return (
    <div className="rounded-xl border p-4 space-y-4"
      style={{ borderColor: 'rgba(45,43,107,0.12)', backgroundColor: 'rgba(245,240,232,0.5)' }}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" /> Nova sessão de MRPA
        </h4>
        <button onClick={onCancel}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data de início</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Número de dias</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {[5, 7, 14].map(d => (
              <button key={d} onClick={() => setDays(d)}
                className={cn('flex-1 py-2 font-medium transition-colors',
                  days === d ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50')}>
                {d}d
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Observação (opcional)</label>
        <input
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="ex: Paciente em ajuste de anti-hipertensivo"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancelar</button>
        <button
          onClick={handleCreate}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Criar tabela
        </button>
      </div>
    </div>
  )
}

// ── GoalsCard (simplificado para MRPA) ───────────────────────────────────

function GoalsCard({ patientId }: { patientId: string }) {
  const [goal,    setGoal]    = useState<PatientGoal | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState({ pa_alvo: '', peso_alvo_kg: '', notas: '' })

  useEffect(() => {
    getPatientGoal(patientId).then(g => {
      setGoal(g)
      if (g) setForm({
        pa_alvo:      g.pa_alvo      ?? '',
        peso_alvo_kg: g.peso_alvo_kg != null ? String(g.peso_alvo_kg) : '',
        notas:        g.notas        ?? '',
      })
      setLoading(false)
    })
  }, [patientId])

  async function handleSave() {
    setSaving(true)
    await upsertPatientGoal({
      patient_id:   patientId,
      pa_alvo:      form.pa_alvo.trim()    || undefined,
      peso_alvo_kg: form.peso_alvo_kg ? parseFloat(form.peso_alvo_kg) : null,
      notas:        form.notas.trim()       || undefined,
      frequencia:   'quinzenal',
    })
    setSaving(false)
    const updated = await getPatientGoal(patientId)
    setGoal(updated)
    setEditing(false)
  }

  if (loading) return null

  return (
    <div className="rounded-xl border border-white/60 p-4 flex flex-wrap items-center gap-4"
      style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,255,255,0.80)', boxShadow: '0 2px 12px rgba(26,31,46,0.06)' }}>

      <div className="flex items-center gap-2 shrink-0">
        <Target className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold text-gray-700">Metas</span>
      </div>

      {editing ? (
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <input
            autoFocus
            value={form.pa_alvo}
            onChange={e => setForm(f => ({ ...f, pa_alvo: e.target.value }))}
            placeholder="PA alvo (ex: < 130/80)"
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 w-44"
          />
          <input
            type="number"
            step="0.1"
            value={form.peso_alvo_kg}
            onChange={e => setForm(f => ({ ...f, peso_alvo_kg: e.target.value }))}
            placeholder="Peso alvo (kg)"
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 w-36"
          />
          <input
            value={form.notas}
            onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
            placeholder="Observação"
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/20 flex-1 min-w-40"
          />
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setEditing(false)} className="p-1.5 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 flex-1">
          {goal?.pa_alvo && (
            <span className="flex items-center gap-1 text-sm text-gray-700">
              <Heart className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-medium">PA:</span> {goal.pa_alvo}
            </span>
          )}
          {goal?.peso_alvo_kg != null && (
            <span className="flex items-center gap-1 text-sm text-gray-700">
              <Scale className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-medium">Peso:</span> {goal.peso_alvo_kg} kg
            </span>
          )}
          {goal?.notas && (
            <span className="text-xs text-gray-400 italic">{goal.notas}</span>
          )}
          {!goal?.pa_alvo && !goal?.peso_alvo_kg && (
            <span className="text-xs text-gray-400 italic">Nenhuma meta definida</span>
          )}
          <button onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors ml-auto">
            <Pencil className="w-3.5 h-3.5" />
            {goal ? 'Editar' : 'Definir metas'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────

interface Props {
  patientId:   string
  patientName: string
}

export default function MonitoramentoTab({ patientId, patientName }: Props) {
  const [sessions,  setSessions]  = useState<MrpaSession[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [goal,      setGoal]      = useState<PatientGoal | null>(null)

  useEffect(() => {
    Promise.all([
      getMrpaSessions(patientId),
      getPatientGoal(patientId),
    ]).then(([s, g]) => {
      setSessions(s)
      setGoal(g)
      setLoading(false)
    })
  }, [patientId])

  const handleUpdate = useCallback((updated: MrpaSession) => {
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
  }, [])

  function handleCreated(s: MrpaSession) {
    setSessions(prev => [s, ...prev])
    setShowForm(false)
  }

  async function handleConclude(id: string) {
    await concludeMrpaSession(id)
    setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'concluida' } : s))
  }

  async function handleDelete(id: string) {
    await deleteMrpaSession(id)
    setSessions(prev => prev.filter(s => s.id !== id))
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Carregando MRPA…</span>
    </div>
  )

  const active    = sessions.filter(s => s.status === 'em_andamento')
  const concluded = sessions.filter(s => s.status === 'concluida')

  return (
    <div className="space-y-5">

      {/* Metas */}
      <GoalsCard patientId={patientId} />

      {/* Cabeçalho + botão nova sessão */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-800">MRPA — Medida Residencial da Pressão Arterial</h3>
          {active.length > 0 && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: 'rgba(184,148,63,0.10)', color: '#B8943F' }}>
              <Clock className="w-3 h-3" />
              {active.length} em andamento
            </span>
          )}
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova MRPA
          </button>
        )}
      </div>

      {/* Formulário de nova sessão */}
      {showForm && (
        <NewSessionForm
          patientId={patientId}
          onCreated={handleCreated}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Sessões em andamento */}
      {active.map(s => (
        <MrpaTable
          key={s.id}
          session={s}
          paAlvo={goal?.pa_alvo ?? null}
          onUpdate={handleUpdate}
          onConclude={handleConclude}
          onDelete={handleDelete}
        />
      ))}

      {/* Sessões concluídas */}
      {concluded.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Concluídas ({concluded.length})
          </p>
          {concluded.map(s => (
            <MrpaTable
              key={s.id}
              session={s}
              paAlvo={goal?.pa_alvo ?? null}
              onUpdate={handleUpdate}
              onConclude={handleConclude}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Vazio */}
      {sessions.length === 0 && !showForm && (
        <div className="py-12 text-center rounded-xl border border-dashed border-gray-200">
          <Activity className="w-8 h-8 text-gray-200 mx-auto mb-2" />
          <p className="text-sm text-gray-400 mb-1">Nenhuma MRPA registrada ainda.</p>
          <p className="text-xs text-gray-300 mb-3">Crie uma tabela para iniciar o monitoramento residencial de pressão.</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-sm text-primary hover:underline"
          >
            Criar primeira MRPA
          </button>
        </div>
      )}

      {/* Referência do protocolo */}
      <p className="text-[11px] text-gray-300 text-center">
        Protocolo: 2 medidas manhã + 2 medidas noite · Dia 1 excluído da média ·
        Referência MRPA: &lt; 130/80 mmHg
      </p>
    </div>
  )
}
