'use client'

import { useState, useEffect, useCallback } from 'react'
import { getMrpaSessions, upsertMrpaReading } from '@/app/actions/mrpa'
import type { MrpaSession, MrpaPeriod } from '@/app/actions/mrpa'
import { cn } from '@/lib/utils'
import { Activity, Check, X, Loader2, Heart, Info } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────

const PERIODS: { id: MrpaPeriod; label: string; sub: string }[] = [
  { id: 'manha1', label: 'Manhã 1', sub: 'ao acordar' },
  { id: 'manha2', label: 'Manhã 2', sub: '1 min depois' },
  { id: 'noite1', label: 'Noite 1', sub: 'antes de dormir' },
  { id: 'noite2', label: 'Noite 2', sub: '1 min depois' },
]

function calcGlobalAverage(readings: MrpaSession['readings']) {
  const valid = readings.filter(r => r.day_number > 1 && r.sistolica && r.diastolica)
  if (!valid.length) return null
  return {
    sistolica:  Math.round(valid.reduce((s, r) => s + (r.sistolica  ?? 0), 0) / valid.length),
    diastolica: Math.round(valid.reduce((s, r) => s + (r.diastolica ?? 0), 0) / valid.length),
  }
}

// ── Célula editável ───────────────────────────────────────────────────────

function ReadingCell({
  value, onSave, disabled,
}: {
  value: { sistolica: number | null; diastolica: number | null } | null
  onSave: (sis: number | null, dia: number | null) => Promise<void>
  disabled?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [sis,     setSis]     = useState(String(value?.sistolica  ?? ''))
  const [dia,     setDia]     = useState(String(value?.diastolica ?? ''))
  const [saving,  setSaving]  = useState(false)

  useEffect(() => {
    setSis(String(value?.sistolica  ?? ''))
    setDia(String(value?.diastolica ?? ''))
  }, [value])

  async function handleSave() {
    setSaving(true)
    await onSave(sis ? parseInt(sis) : null, dia ? parseInt(dia) : null)
    setSaving(false)
    setEditing(false)
  }

  const hasValue = value?.sistolica && value?.diastolica

  if (disabled) {
    return (
      <div className="text-center text-sm font-mono font-medium text-gray-400 py-2">
        {hasValue ? `${value!.sistolica}/${value!.diastolica}` : '—'}
      </div>
    )
  }

  if (editing) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-1">
        <div className="flex items-center gap-1">
          <input
            autoFocus
            type="number"
            value={sis}
            onChange={e => setSis(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            className="w-14 text-sm border-2 border-primary/40 rounded-lg px-1.5 py-1 text-center focus:outline-none focus:border-primary font-mono"
            placeholder="PAS"
          />
          <span className="text-gray-300 font-bold">/</span>
          <input
            type="number"
            value={dia}
            onChange={e => setDia(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditing(false) }}
            className="w-14 text-sm border-2 border-primary/40 rounded-lg px-1.5 py-1 text-center focus:outline-none focus:border-primary font-mono"
            placeholder="PAD"
          />
        </div>
        <div className="flex gap-2">
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium bg-primary text-white hover:bg-primary-dark disabled:opacity-50 transition-colors">
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            OK
          </button>
          <button onClick={() => setEditing(false)}
            className="text-xs px-2.5 py-1 rounded-lg text-gray-400 hover:text-gray-600 border border-gray-200">
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
        'w-full text-center py-2.5 rounded-lg transition-all text-sm font-mono font-medium',
        hasValue
          ? 'text-primary bg-primary/5 hover:bg-primary/10'
          : 'text-gray-300 hover:text-gray-500 hover:bg-gray-50 border border-dashed border-gray-200'
      )}
    >
      {hasValue ? `${value!.sistolica}/${value!.diastolica}` : '+ anotar'}
    </button>
  )
}

// ── Tabela da sessão ──────────────────────────────────────────────────────

function SessionTable({
  session, onUpdate,
}: {
  session:  MrpaSession
  onUpdate: (s: MrpaSession) => void
}) {
  const days      = Array.from({ length: session.days }, (_, i) => i + 1)
  const isClosed  = session.status === 'concluida'
  const globalAvg = calcGlobalAverage(session.readings)

  // Dia atual em relação ao início da sessão
  const startMs    = new Date(session.start_date + 'T00:00:00').getTime()
  const todayMs    = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00').getTime()
  const currentDay = Math.round((todayMs - startMs) / 86_400_000) + 1

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

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{
        borderColor: isClosed ? 'rgba(0,0,0,0.07)' : 'rgba(45,43,107,0.15)',
        boxShadow: '0 2px 12px rgba(26,31,46,0.06)',
      }}>

      {/* Cabeçalho da sessão */}
      <div className="px-5 py-4"
        style={{ backgroundColor: isClosed ? 'rgba(0,0,0,0.02)' : 'rgba(45,43,107,0.04)' }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <p className="text-sm font-bold text-gray-800">
              Medição residencial de pressão
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {session.days} dias ·{' '}
              {isClosed
                ? <span className="text-emerald-600 font-medium">Concluída pelo médico</span>
                : <span className="font-medium" style={{ color: '#2D2B6B' }}>Em andamento — preencha seus valores abaixo</span>
              }
            </p>
          </div>
          {globalAvg && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Média geral</p>
              <p className="text-lg font-bold" style={{ color: '#2D2B6B' }}>
                {globalAvg.sistolica}/{globalAvg.diastolica}
                <span className="text-xs font-normal text-gray-400 ml-1">mmHg</span>
              </p>
            </div>
          )}
        </div>
        {session.notes && (
          <p className="text-xs text-gray-500 italic mt-2 flex items-start gap-1">
            <Info className="w-3 h-3 shrink-0 mt-0.5 text-gray-400" />
            {session.notes}
          </p>
        )}
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', backgroundColor: 'rgba(0,0,0,0.02)' }}>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-20">Dia</th>
              {PERIODS.map(p => (
                <th key={p.id} className="text-center px-3 py-3 text-xs font-semibold text-gray-500 min-w-[110px]">
                  <div>{p.label}</div>
                  <div className="text-[10px] text-gray-400 font-normal">{p.sub}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map(day => {
              const isToday   = day === currentDay
              const isPast    = day < currentDay
              const isFuture  = day > currentDay

              return (
                <tr key={day}
                  className={cn('transition-colors', isToday && !isClosed && 'ring-1 ring-inset ring-primary/20')}
                  style={{
                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                    backgroundColor: isToday && !isClosed
                      ? 'rgba(45,43,107,0.03)'
                      : day % 2 === 0 ? 'rgba(0,0,0,0.01)' : 'transparent',
                  }}
                >
                  <td className="px-4 py-2">
                    <div className="flex flex-col">
                      <span className={cn(
                        'text-xs font-semibold',
                        isToday && !isClosed ? 'text-primary' : 'text-gray-500'
                      )}>
                        Dia {day}
                      </span>
                      {isToday && !isClosed && (
                        <span className="text-[10px] text-primary/70 font-medium">hoje</span>
                      )}
                      {day === 1 && (
                        <span className="text-[10px] text-gray-300">(ref.)</span>
                      )}
                    </div>
                  </td>
                  {PERIODS.map(p => {
                    const r = getReading(day, p.id)
                    const cellDisabled = isClosed || (isFuture && !isClosed)
                    return (
                      <td key={p.id} className="px-3 py-1.5">
                        <ReadingCell
                          value={r ? { sistolica: r.sistolica, diastolica: r.diastolica } : null}
                          onSave={(sis, dia) => handleCellSave(day, p.id, sis, dia)}
                          disabled={cellDisabled}
                        />
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Rodapé */}
      <div className="px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-1"
        style={{ backgroundColor: 'rgba(0,0,0,0.02)', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
        <p className="text-[11px] text-gray-400">
          Anote os valores em <strong>mmHg</strong> · Descanse 5 min antes de medir · Sente-se com as costas apoiadas
        </p>
        <p className="text-[11px] text-gray-300 ml-auto">
          Dia 1 = referência (excluído da média)
        </p>
      </div>
    </div>
  )
}

// ── Instruções ────────────────────────────────────────────────────────────

function Instructions() {
  return (
    <div className="rounded-xl p-4 flex gap-3"
      style={{ backgroundColor: 'rgba(45,43,107,0.04)', border: '1px solid rgba(45,43,107,0.08)' }}>
      <Heart className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
      <div className="space-y-1.5">
        <p className="text-sm font-semibold text-gray-800">Como medir corretamente</p>
        <ul className="text-xs text-gray-500 space-y-1 list-none">
          <li>· Fique sentado e descanse por <strong>5 minutos</strong> antes de cada medição</li>
          <li>· Costas apoiadas, pé no chão, braço na altura do coração</li>
          <li>· Faça <strong>2 medidas</strong> de manhã (ao acordar, antes de tomar remédios) e <strong>2 à noite</strong> (antes de dormir)</li>
          <li>· Aguarde <strong>1 minuto</strong> entre a 1ª e a 2ª medida</li>
          <li>· Anote os dois números que aparecem no aparelho (ex: 128/82)</li>
        </ul>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────

export default function MrpaTab({ patientId }: { patientId: string }) {
  const [sessions, setSessions] = useState<MrpaSession[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    getMrpaSessions(patientId).then(s => {
      setSessions(s)
      setLoading(false)
    })
  }, [patientId])

  const handleUpdate = useCallback((updated: MrpaSession) => {
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center gap-2 py-16 text-gray-400">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Carregando…</span>
    </div>
  )

  const active    = sessions.filter(s => s.status === 'em_andamento')
  const concluded = sessions.filter(s => s.status === 'concluida')

  if (sessions.length === 0) return (
    <div className="py-16 text-center space-y-2">
      <Activity className="w-8 h-8 text-gray-200 mx-auto" />
      <p className="text-sm text-gray-400">Nenhuma medição solicitada ainda.</p>
      <p className="text-xs text-gray-300">Quando o Dr. Guilherme solicitar uma MRPA, a tabela aparecerá aqui.</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <Instructions />

      {/* Sessões em andamento */}
      {active.map(s => (
        <SessionTable key={s.id} session={s} onUpdate={handleUpdate} />
      ))}

      {/* Concluídas */}
      {concluded.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Medições anteriores</p>
          {concluded.map(s => (
            <SessionTable key={s.id} session={s} onUpdate={handleUpdate} />
          ))}
        </div>
      )}
    </div>
  )
}
