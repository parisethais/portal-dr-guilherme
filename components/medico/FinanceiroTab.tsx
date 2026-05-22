'use client'

import React, { useState, useTransition, useMemo } from 'react'
import type { FinancialEntry, EntryInput } from '@/app/actions/financial'
import type { Profile, Consulta } from '@/lib/types'
import { createFinancialEntry, updateFinancialEntry, deleteFinancialEntry } from '@/app/actions/financial'
import {
  FINANCIAL_CATEGORIES, PAYMENT_METHODS,
  categoryLabel, categoryColor, categoriesByType,
} from '@/lib/financial-categories'
import { cn } from '@/lib/utils'
import {
  Plus, TrendingUp, TrendingDown, Wallet, Clock,
  Pencil, Trash2, X, Check, Loader2, ChevronDown,
  CalendarCheck, UserMinus, Info,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtBRL(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
}

function monthKey(d: string) { return d.slice(0, 7) } // YYYY-MM

function periodStart(period: string): string {
  const now = new Date()
  if (period === 'mes')      return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  if (period === 'trimestre') return new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().slice(0, 10)
  if (period === 'ano')      return `${now.getFullYear()}-01-01`
  return '2000-01-01'
}

// ── Mini bar chart por mês ────────────────────────────────────────────────

function MonthlyChart({ entries }: { entries: FinancialEntry[] }) {
  const months = useMemo(() => {
    const map: Record<string, { receita: number; despesa: number }> = {}
    entries.filter(e => e.status !== 'cancelado').forEach(e => {
      const k = monthKey(e.date)
      if (!map[k]) map[k] = { receita: 0, despesa: 0 }
      map[k][e.type] += e.amount
    })
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-6)
  }, [entries])

  if (months.length === 0) return null

  const max = Math.max(...months.flatMap(([, v]) => [v.receita, v.despesa]), 1)

  return (
    <div className="flex items-end gap-2 h-20">
      {months.map(([month, v]) => {
        const label = new Date(month + '-15').toLocaleDateString('pt-BR', { month: 'short' })
        return (
          <div key={month} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="w-full flex items-end gap-0.5 h-14">
              <div
                className="flex-1 rounded-t-sm transition-all"
                style={{ height: `${(v.receita / max) * 100}%`, minHeight: v.receita > 0 ? 2 : 0, backgroundColor: 'rgba(122,158,126,0.7)' }}
                title={`Receita: ${fmtBRL(v.receita)}`}
              />
              <div
                className="flex-1 rounded-t-sm transition-all"
                style={{ height: `${(v.despesa / max) * 100}%`, minHeight: v.despesa > 0 ? 2 : 0, backgroundColor: 'rgba(193,112,112,0.65)' }}
                title={`Despesa: ${fmtBRL(v.despesa)}`}
              />
            </div>
            <span className="text-[10px] text-gray-400 capitalize">{label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ── Formulário de lançamento ──────────────────────────────────────────────

const EMPTY: Partial<EntryInput> = {
  scope: 'clinic', type: 'receita', category: 'consulta_particular',
  status: 'pago', payment_method: 'pix',
  date: new Date().toISOString().slice(0, 10),
  amount: undefined, description: '', notes: '',
}

function EntryForm({
  initial, doctorId, onSave, onCancel, saving,
}: {
  initial?: Partial<EntryInput>
  doctorId: string
  onSave: (data: EntryInput) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<Partial<EntryInput>>({ ...EMPTY, ...initial })
  const set = <K extends keyof EntryInput>(k: K, v: EntryInput[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  const cats = categoriesByType(form.type ?? 'receita')
  const valid = form.amount && form.amount > 0 && form.category && form.date

  // Ajusta categoria quando muda o tipo
  function setType(t: 'receita' | 'despesa') {
    const firstCat = categoriesByType(t)[0]?.value ?? ''
    setForm(f => ({ ...f, type: t, category: firstCat }))
  }

  return (
    <div className="space-y-4">
      {/* Tipo + Escopo */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Tipo *</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(['receita', 'despesa'] as const).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={cn(
                  'flex-1 py-2 text-sm font-medium transition-colors',
                  form.type === t
                    ? t === 'receita' ? 'bg-sage-dark text-white' : 'bg-rose-500 text-white'
                    : 'text-gray-500 hover:bg-gray-50'
                )}
              >
                {t === 'receita' ? '↑ Receita' : '↓ Despesa'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Origem</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {([['clinic', 'Clínica'], ['personal', 'Pessoal']] as const).map(([s, l]) => (
              <button
                key={s}
                onClick={() => set('scope', s)}
                className={cn(
                  'flex-1 py-2 text-sm font-medium transition-colors',
                  form.scope === s ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50'
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Categoria + Valor */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Categoria *</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
          >
            {cats.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Valor (R$) *</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.amount ?? ''}
            onChange={e => set('amount', parseFloat(e.target.value) || 0)}
            placeholder="0,00"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Data + Status + Pagamento */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data *</label>
          <input
            type="date"
            value={form.date ?? ''}
            onChange={e => set('date', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select
            value={form.status}
            onChange={e => set('status', e.target.value as EntryInput['status'])}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
          >
            <option value="pago">Pago</option>
            <option value="pendente">Pendente</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Pagamento</label>
          <select
            value={form.payment_method ?? ''}
            onChange={e => set('payment_method', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
          >
            <option value="">—</option>
            {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
        <input
          value={form.description ?? ''}
          onChange={e => set('description', e.target.value)}
          placeholder="Ex: Plantão HRSJ – jan/2026"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
          Cancelar
        </button>
        <button
          onClick={() => valid && onSave({ ...EMPTY, ...form, doctor_id: doctorId } as EntryInput)}
          disabled={!valid || saving}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            valid && !saving ? 'bg-primary text-white hover:bg-primary-dark' : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Salvar
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────

interface Props {
  initialEntries: FinancialEntry[]
  doctorId: string
  consultas?: Consulta[]
  patients?: Profile[]
}

export default function FinanceiroTab({ initialEntries, doctorId, consultas = [], patients = [] }: Props) {
  const [entries, setEntries] = useState<FinancialEntry[]>(initialEntries)
  const [period, setPeriod]   = useState<'mes' | 'trimestre' | 'ano' | 'tudo'>('mes')
  const [scope,  setScope]    = useState<'all' | 'clinic' | 'personal'>('all')
  const [type,   setType]     = useState<'all' | 'receita' | 'despesa'>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null)
  const [pending, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)

  // ── Filtro ──────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const from = periodStart(period)
    return entries.filter(e => {
      if (e.date < from) return false
      if (scope !== 'all' && e.scope !== scope) return false
      if (type  !== 'all' && e.type  !== type)  return false
      return true
    })
  }, [entries, period, scope, type])

  // ── KPIs ────────────────────────────────────────────────────────────────

  const { receita, despesa, pendente } = useMemo(() => {
    let receita = 0, despesa = 0, pendente = 0
    filtered.forEach(e => {
      if (e.status === 'cancelado') return
      if (e.type === 'receita') {
        if (e.status === 'pago')     receita  += e.amount
        if (e.status === 'pendente') pendente += e.amount
      } else {
        despesa += e.amount
      }
    })
    return { receita, despesa, pendente }
  }, [filtered])

  const saldo = receita - despesa

  // ── Projeções financeiras ────────────────────────────────────────────────
  const { projecaoMes, receitaPotencial, ticketMedio, agendadasMes } = useMemo(() => {
    const hoje  = new Date()
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`

    // Ticket médio: média das receitas históricas registradas
    const receitasHistoricas = entries.filter(e => e.type === 'receita' && e.status === 'pago' && e.amount > 0)
    const ticketMedio = receitasHistoricas.length > 0
      ? receitasHistoricas.reduce((s, e) => s + e.amount, 0) / receitasHistoricas.length
      : 0

    // Consultas agendadas/confirmadas ainda não ocorridas neste mês
    const agora = hoje.toISOString()
    const agendadasMes = consultas.filter(c =>
      c.data_hora.startsWith(mesAtual) &&
      (c.status === 'agendada' || c.status === 'confirmada') &&
      c.data_hora > agora
    )

    // Receita já realizada no mês (registrada nos lançamentos)
    const receitaMesAtual = entries
      .filter(e => e.type === 'receita' && e.status === 'pago' && monthKey(e.date) === mesAtual)
      .reduce((s, e) => s + e.amount, 0)

    const projecaoMes = receitaMesAtual + (agendadasMes.length * ticketMedio)

    // Pacientes inativos: sem consulta realizada nos últimos 2 anos
    const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 2)
    const cutoffISO = cutoff.toISOString()

    const ultimaConsultaMap = new Map<string, string>()
    consultas.forEach(c => {
      if (c.status === 'realizada') {
        const ult = ultimaConsultaMap.get(c.patient_id)
        if (!ult || c.data_hora > ult) ultimaConsultaMap.set(c.patient_id, c.data_hora)
      }
    })

    const inativos = patients.filter(p => {
      if (p.status_paciente === 'obito') return false
      const ultima = ultimaConsultaMap.get(p.id)
      return !ultima || ultima < cutoffISO
    })

    // Frequência média: total de consultas realizadas ÷ pacientes com histórico ÷ meses de histórico
    const ativosComHistorico = patients.filter(p => ultimaConsultaMap.has(p.id))
    const totalRealizadas    = consultas.filter(c => c.status === 'realizada').length
    const mesesHistorico     = 24 // janela de referência
    const freqMensal         = ativosComHistorico.length > 0
      ? totalRealizadas / ativosComHistorico.length / mesesHistorico
      : 0

    const receitaPotencial = inativos.length * freqMensal * ticketMedio * 12 // anual

    return { projecaoMes, receitaPotencial, ticketMedio, agendadasMes }
  }, [entries, consultas, patients])

  // ── Handlers ────────────────────────────────────────────────────────────

  async function handleCreate(data: EntryInput) {
    setSaving(true)
    const res = await createFinancialEntry(data)
    setSaving(false)
    if (res.error) { alert(res.error); return }
    const fake: FinancialEntry = { ...data, id: `tmp-${Date.now()}`, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    setEntries(prev => [fake, ...prev])
    setShowForm(false)
  }

  async function handleUpdate(data: EntryInput) {
    if (!editingEntry) return
    setSaving(true)
    const res = await updateFinancialEntry(editingEntry.id, data)
    setSaving(false)
    if (res.error) { alert(res.error); return }
    setEntries(prev => prev.map(e => e.id === editingEntry.id ? { ...e, ...data } : e))
    setEditingEntry(null)
  }

  function handleDelete(entry: FinancialEntry) {
    if (!confirm(`Remover "${categoryLabel(entry.category)}" de ${fmtBRL(entry.amount)}?`)) return
    setEntries(prev => prev.filter(e => e.id !== entry.id))
    startTransition(async () => {
      const res = await deleteFinancialEntry(entry.id)
      if (res.error) {
        setEntries(prev => [entry, ...prev])
        alert(res.error)
      }
    })
  }

  const statusBadgeStyle = (s: string): React.CSSProperties => ({
    pago:      { backgroundColor: 'rgba(122,158,126,0.12)', color: '#4E7A52' },
    pendente:  { backgroundColor: 'rgba(184,148,63,0.10)',  color: '#B8943F' },
    cancelado: { backgroundColor: 'rgba(0,0,0,0.05)',       color: '#9CA3AF' },
  }[s] ?? { backgroundColor: 'rgba(0,0,0,0.05)', color: '#9CA3AF' })

  return (
    <div className="space-y-5">
      {/* ── KPI Cards ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Receita',  value: receita,  icon: TrendingUp,   iconColor: '#7A9E7E', iconBg: 'rgba(122,158,126,0.12)', valueColor: '#4E7A52' },
          { label: 'Despesa',  value: despesa,  icon: TrendingDown, iconColor: '#C17070', iconBg: 'rgba(193,112,112,0.10)', valueColor: '#C17070' },
          { label: 'Saldo',    value: saldo,    icon: Wallet,       iconColor: saldo >= 0 ? '#2D2B6B' : '#C17070', iconBg: saldo >= 0 ? 'rgba(45,43,107,0.08)' : 'rgba(193,112,112,0.10)', valueColor: saldo >= 0 ? '#2D2B6B' : '#C17070' },
          { label: 'Pendente', value: pendente, icon: Clock,        iconColor: '#B8943F', iconBg: 'rgba(184,148,63,0.10)', valueColor: '#B8943F' },
        ].map(({ label, value, icon: Icon, iconColor, iconBg, valueColor }) => (
          <div key={label} className="rounded-xl border border-white/60 p-4"
            style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,255,255,0.72)', boxShadow: '0 2px 12px rgba(26,31,46,0.06)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 font-medium">{label}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: iconBg }}>
                <Icon className="w-4 h-4" style={{ color: iconColor }} />
              </div>
            </div>
            <p className="text-lg font-bold" style={{ color: valueColor }}>{fmtBRL(value)}</p>
          </div>
        ))}
      </div>

      {/* ── Projeções ──────────────────────────────────────────────────── */}
      {ticketMedio > 0 && (
        <div className="grid sm:grid-cols-2 gap-3">

          {/* Projeção do mês */}
          <div className="rounded-xl border border-white/60 p-4"
            style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,255,255,0.72)', boxShadow: '0 2px 12px rgba(26,31,46,0.06)' }}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#7A9E7E' }}>Projeção — este mês</p>
                <p className="text-2xl font-bold mt-1" style={{ color: '#2D2B6B' }}>{fmtBRL(projecaoMes)}</p>
              </div>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(122,158,126,0.12)' }}>
                <CalendarCheck className="w-4 h-4" style={{ color: '#7A9E7E' }} />
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Realizado no mês</span>
                <span className="font-medium text-gray-700">{fmtBRL(receita)}</span>
              </div>
              <div className="flex justify-between">
                <span>Consultas agendadas ({agendadasMes.length}× {fmtBRL(ticketMedio)})</span>
                <span className="font-medium" style={{ color: '#7A9E7E' }}>+{fmtBRL(agendadasMes.length * ticketMedio)}</span>
              </div>
              <div className="pt-1.5 mt-1 border-t border-gray-100 flex items-center gap-1 text-gray-400" style={{ fontSize: 10 }}>
                <Info className="w-3 h-3 shrink-0" />
                Baseado no ticket médio histórico ({fmtBRL(ticketMedio)}/consulta)
              </div>
            </div>
          </div>

          {/* Receita potencial de inativos */}
          <div className="rounded-xl border border-white/60 p-4"
            style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,255,255,0.72)', boxShadow: '0 2px 12px rgba(26,31,46,0.06)' }}>
            <div className="flex items-start justify-between gap-2 mb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: '#B8943F' }}>Receita potencial — inativos</p>
                <p className="text-2xl font-bold mt-1" style={{ color: '#2D2B6B' }}>{fmtBRL(receitaPotencial)}</p>
              </div>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'rgba(184,148,63,0.10)' }}>
                <UserMinus className="w-4 h-4" style={{ color: '#B8943F' }} />
              </div>
            </div>
            <div className="space-y-1.5 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Pacientes sem consulta há +2 anos</span>
                <span className="font-medium text-gray-700">{patients.filter(p => p.status_paciente !== 'obito' && !consultas.some(c => c.patient_id === p.id && c.status === 'realizada' && c.data_hora >= new Date(new Date().setFullYear(new Date().getFullYear()-2)).toISOString())).length}</span>
              </div>
              <div className="flex justify-between">
                <span>Ticket médio</span>
                <span className="font-medium text-gray-700">{fmtBRL(ticketMedio)}</span>
              </div>
              <div className="pt-1.5 mt-1 border-t border-gray-100 flex items-center gap-1 text-gray-400" style={{ fontSize: 10 }}>
                <Info className="w-3 h-3 shrink-0" />
                Estimativa anual baseada na frequência histórica da base ativa
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ── Gráfico + Filtros ───────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/60 p-5"
        style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,255,255,0.72)', boxShadow: '0 2px 12px rgba(26,31,46,0.06)' }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Período */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {([['mes', 'Este mês'], ['trimestre', 'Trimestre'], ['ano', 'Este ano'], ['tudo', 'Tudo']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setPeriod(v)}
                  className={cn('px-3 py-1.5 font-medium transition-colors', period === v ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50')}>
                  {l}
                </button>
              ))}
            </div>
            {/* Escopo */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {([['all', 'Tudo'], ['clinic', 'Clínica'], ['personal', 'Pessoal']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setScope(v)}
                  className={cn('px-3 py-1.5 font-medium transition-colors', scope === v ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50')}>
                  {l}
                </button>
              ))}
            </div>
            {/* Tipo */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {([['all', 'Todos'], ['receita', 'Receitas'], ['despesa', 'Despesas']] as const).map(([v, l]) => (
                <button key={v} onClick={() => setType(v)}
                  className={cn('px-3 py-1.5 font-medium transition-colors', type === v ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50')}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => { setShowForm(true); setEditingEntry(null) }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo lançamento
          </button>
        </div>

        <MonthlyChart entries={filtered} />

        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: 'rgba(122,158,126,0.7)' }} /> Receita</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm inline-block" style={{ backgroundColor: 'rgba(193,112,112,0.65)' }} /> Despesa</span>
        </div>
      </div>

      {/* ── Formulário ──────────────────────────────────────────────────── */}
      {(showForm || editingEntry) && (
        <div className="rounded-xl border p-5" style={{ borderColor: 'rgba(45,43,107,0.15)', backgroundColor: 'rgba(245,240,232,0.5)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-800">
              {editingEntry ? 'Editar lançamento' : 'Novo lançamento'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditingEntry(null) }}>
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          </div>
          <EntryForm
            initial={editingEntry ? {
              scope:          editingEntry.scope,
              type:           editingEntry.type,
              category:       editingEntry.category,
              amount:         editingEntry.amount,
              date:           editingEntry.date,
              description:    editingEntry.description ?? '',
              payment_method: editingEntry.payment_method ?? '',
              status:         editingEntry.status,
              doctor_id:      editingEntry.doctor_id,
              clinic_id:      editingEntry.clinic_id,
              notes:          editingEntry.notes ?? '',
            } : undefined}
            doctorId={doctorId}
            onSave={editingEntry ? handleUpdate : handleCreate}
            onCancel={() => { setShowForm(false); setEditingEntry(null) }}
            saving={saving}
          />
        </div>
      )}

      {/* ── Tabela de lançamentos ────────────────────────────────────────── */}
      <div className="rounded-xl border border-white/60 overflow-hidden"
        style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,255,255,0.72)', boxShadow: '0 2px 12px rgba(26,31,46,0.06)' }}>
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Wallet className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum lançamento no período.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Adicionar primeiro lançamento
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Categoria</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Descrição</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Origem</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(e => (
                <tr key={e.id} className={cn('hover:bg-gray-50/60 transition-colors', e.status === 'cancelado' && 'opacity-40')}>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(e.date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: categoryColor(e.category) }}
                      />
                      <span className="text-gray-800 font-medium">{categoryLabel(e.category)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell max-w-xs truncate">
                    {e.description || '—'}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={e.scope === 'clinic'
                        ? { backgroundColor: 'rgba(45,43,107,0.08)', color: '#2D2B6B' }
                        : { backgroundColor: 'rgba(122,158,126,0.12)', color: '#4E7A52' }}
                    >
                      {e.scope === 'clinic' ? 'Clínica' : 'Pessoal'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={statusBadgeStyle(e.status)}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold whitespace-nowrap"
                    style={{ color: e.type === 'receita' ? '#4E7A52' : '#C17070' }}>
                    {e.type === 'receita' ? '+' : '−'} {fmtBRL(e.amount)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => { setEditingEntry(e); setShowForm(false) }}
                        className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(e)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
