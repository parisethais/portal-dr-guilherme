'use client'

import { useState, useTransition, useEffect, useMemo } from 'react'
import {
  getInternacoes, createInternacao, addVisita, deleteVisita,
  finalizarInternacao, deleteInternacao,
  type Internacao, type VisitaHospitalar,
} from '@/app/actions/internacoes'
import { HOSPITAIS, VISITADORES, DIALISE_OPTIONS, hospitalLabel } from '@/lib/internacao-constants'
import type { Profile } from '@/lib/types'
import {
  Building2, Plus, ChevronDown, ChevronUp, Loader2,
  Stethoscope, CheckCircle, Trash2, X, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'

// ── Helpers ────────────────────────────────────────────────────

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function todayStr() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

function calcResumo(internacao: Internacao) {
  const counts: Record<string, number> = {}
  for (const v of internacao.visitas) {
    counts[v.visitador] = (counts[v.visitador] ?? 0) + 1
  }
  const valorUnit = internacao.valor_visita ?? 0
  return Object.entries(counts).map(([visitador, qtd]) => ({
    visitador, qtd, total: qtd * valorUnit,
  }))
}

// ── Sub-componente: linha de visita ────────────────────────────
function VisitaRow({ v, finalizada, onDelete }: {
  v: VisitaHospitalar
  finalizada: boolean
  onDelete: (id: string) => void
}) {
  const [pending, start] = useTransition()
  const dialiseLabel = DIALISE_OPTIONS.find(d => d.value === v.dialise)?.label ?? v.dialise

  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 text-xs">
      <span className="text-gray-400 min-w-[70px]">{fmtDate(v.data_visita)}</span>
      <span className="font-medium text-gray-800 flex-1">{v.visitador}</span>
      <span className={cn(
        'px-2 py-0.5 rounded-full font-semibold',
        v.dialise === 'nao'
          ? 'bg-gray-100 text-gray-500'
          : 'bg-blue-100 text-blue-700'
      )}>
        {dialiseLabel}
      </span>
      {!finalizada && (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { await deleteVisita(v.id); onDelete(v.id) })}
          className="text-gray-300 hover:text-red-400 transition-colors flex-shrink-0"
        >
          {pending ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
        </button>
      )}
    </div>
  )
}

// ── Sub-componente: card de internação ─────────────────────────
function InternacaoCard({
  internacao: init,
  showPatient,
  onDeleted,
}: {
  internacao: Internacao
  showPatient: boolean
  onDeleted: (id: string) => void
}) {
  const [internacao, setInternacao] = useState(init)
  const [expanded, setExpanded]     = useState(!init.finalizada)
  const [showAddVisita, setShowAddVisita] = useState(false)
  const [showFinalizar, setShowFinalizar] = useState(false)
  const [addPending, startAdd]       = useTransition()
  const [finPending, startFin]       = useTransition()
  const [delPending, startDel]       = useTransition()

  const [visitaForm, setVisitaForm] = useState<{ data_visita: string; visitador: string; dialise: string }>({
    data_visita: todayStr(),
    visitador:   VISITADORES[0],
    dialise:     'nao',
  })
  const [finForm, setFinForm] = useState({
    data_alta:              todayStr(),
    diagnostico_internacao: '',
    valor_visita:           '',
    // valor por visita específico por visitador (exceto Guilherme)
    valor_por_visitador:    {} as Record<string, string>,
  })
  const [err, setErr] = useState('')

  function handleDeleteVisita(visitaId: string) {
    setInternacao(prev => ({ ...prev, visitas: prev.visitas.filter(v => v.id !== visitaId) }))
  }

  function handleAddVisita() {
    setErr('')
    startAdd(async () => {
      const res = await addVisita({ internacao_id: internacao.id, ...visitaForm })
      if (!res.success) { setErr(res.error ?? 'Erro ao adicionar'); return }
      // Reload to get new id
      const updated = await getInternacoes()
      const found = updated.find(i => i.id === internacao.id)
      if (found) setInternacao(found)
      setShowAddVisita(false)
    })
  }

  function handleFinalizar() {
    setErr('')
    startFin(async () => {
      const valorPorVisitador: Record<string, number> = {}
      for (const [vis, val] of Object.entries(finForm.valor_por_visitador)) {
        if (val && parseFloat(val) > 0) valorPorVisitador[vis] = parseFloat(val)
      }
      const res = await finalizarInternacao(internacao.id, {
        data_alta:              finForm.data_alta,
        diagnostico_internacao: finForm.diagnostico_internacao || undefined,
        valor_visita:           finForm.valor_visita ? parseFloat(finForm.valor_visita) : undefined,
        valor_por_visitador:    Object.keys(valorPorVisitador).length ? valorPorVisitador : undefined,
      })
      if (!res.success) { setErr(res.error ?? 'Erro ao finalizar'); return }
      setInternacao(prev => ({
        ...prev,
        finalizada:             true,
        data_alta:              finForm.data_alta,
        diagnostico_internacao: finForm.diagnostico_internacao || null,
        valor_visita:           finForm.valor_visita ? parseFloat(finForm.valor_visita) : null,
        valor_por_visitador:    Object.keys(valorPorVisitador).length ? valorPorVisitador : null,
      }))
      setShowFinalizar(false)
    })
  }

  const resumo = internacao.finalizada ? calcResumo(internacao) : []
  const totalGeral = resumo.reduce((s, r) => s + r.total, 0)

  return (
    <div className={cn(
      'rounded-xl border',
      internacao.finalizada
        ? 'border-gray-200 bg-gray-50/60'
        : 'border-primary/20 bg-white shadow-sm'
    )}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
      >
        <Building2 className={cn('w-4 h-4 mt-0.5 flex-shrink-0', internacao.finalizada ? 'text-gray-400' : 'text-primary')} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {showPatient && (
              <span className="text-sm font-bold text-gray-900">{internacao.patient_name ?? '—'}</span>
            )}
            <span className={cn('text-sm font-semibold', showPatient ? 'text-gray-600' : 'text-gray-900')}>
              {hospitalLabel(internacao.hospital, internacao.hospital_outro)}
            </span>
            {internacao.finalizada ? (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 font-semibold">Alta {fmtDate(internacao.data_alta)}</span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold animate-pulse">Internado</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            Internação: {fmtDate(internacao.data_internacao)}
            {internacao.motivo_internacao && ` · ${internacao.motivo_internacao}`}
            {' · '}{internacao.visitas.length} {internacao.visitas.length === 1 ? 'visita' : 'visitas'}
          </p>
        </div>
        <div className="flex-shrink-0 text-gray-300">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">

          {/* Visitas */}
          {internacao.visitas.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">Nenhuma visita registrada</p>
          ) : (
            <div className="space-y-1.5">
              {internacao.visitas.map(v => (
                <VisitaRow
                  key={v.id}
                  v={v}
                  finalizada={internacao.finalizada}
                  onDelete={handleDeleteVisita}
                />
              ))}
            </div>
          )}

          {/* Resumo financeiro (só após finalizar) */}
          {internacao.finalizada && internacao.valor_visita && resumo.length > 0 && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-100 p-3 space-y-1.5">
              <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wide">Resumo financeiro</p>
              {resumo.map(r => (
                <div key={r.visitador} className="flex justify-between text-xs">
                  <span className="text-gray-700">{r.visitador} <span className="text-gray-400">({r.qtd} {r.qtd === 1 ? 'visita' : 'visitas'})</span></span>
                  <span className="font-semibold text-gray-800">
                    {(r.total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                </div>
              ))}
              <div className="flex justify-between text-xs border-t border-emerald-200 pt-1.5 mt-1">
                <span className="font-bold text-gray-800">Total</span>
                <span className="font-bold text-emerald-700">
                  {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          )}

          {internacao.finalizada && internacao.diagnostico_internacao && (
            <p className="text-xs text-gray-500"><span className="font-semibold">Diagnóstico:</span> {internacao.diagnostico_internacao}</p>
          )}

          {/* Excluir internação finalizada */}
          {internacao.finalizada && (
            <div className="flex justify-end pt-1">
              <button type="button" disabled={delPending}
                onClick={() => startDel(async () => {
                  if (!confirm('Excluir esta internação e todas as visitas?')) return
                  await deleteInternacao(internacao.id)
                  onDeleted(internacao.id)
                })}
                className="flex items-center gap-1 text-[10px] text-gray-300 hover:text-red-400 transition-colors"
                title="Excluir internação"
              >
                {delPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                Excluir
              </button>
            </div>
          )}

          {err && <p className="text-xs text-red-500">{err}</p>}

          {/* Ações: só para internações abertas */}
          {!internacao.finalizada && (
            <div className="space-y-3 pt-1">

              {/* Adicionar visita */}
              {showAddVisita ? (
                <div className="rounded-lg border border-gray-200 p-3 space-y-2.5 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-700">Nova visita</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Data</label>
                      <input type="date" value={visitaForm.data_visita}
                        onChange={e => setVisitaForm(f => ({ ...f, data_visita: e.target.value }))}
                        className="mt-1 w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Visitador</label>
                      <select value={visitaForm.visitador}
                        onChange={e => setVisitaForm(f => ({ ...f, visitador: e.target.value }))}
                        className="mt-1 w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      >
                        {VISITADORES.map(v => <option key={v} value={v}>{v}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Diálise</label>
                      <select value={visitaForm.dialise}
                        onChange={e => setVisitaForm(f => ({ ...f, dialise: e.target.value }))}
                        className="mt-1 w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      >
                        {DIALISE_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowAddVisita(false)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                      Cancelar
                    </button>
                    <button type="button" onClick={handleAddVisita} disabled={addPending}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-light transition-colors disabled:opacity-60">
                      {addPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                      Salvar visita
                    </button>
                  </div>
                </div>
              ) : (
                <button type="button" onClick={() => setShowAddVisita(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-dashed border-primary/40 text-primary font-medium hover:bg-primary/5 transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Adicionar visita
                </button>
              )}

              {/* Finalizar */}
              {showFinalizar ? (
                <div className="rounded-lg border border-amber-200 p-3 space-y-2.5 bg-amber-50/60">
                  <p className="text-xs font-semibold text-amber-800">Finalizar internação</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Data de alta</label>
                      <input type="date" value={finForm.data_alta}
                        onChange={e => setFinForm(f => ({ ...f, data_alta: e.target.value }))}
                        className="mt-1 w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Valor por visita (R$)</label>
                      <input type="number" min="0" step="0.01" value={finForm.valor_visita}
                        onChange={e => setFinForm(f => ({ ...f, valor_visita: e.target.value }))}
                        placeholder="Ex: 1500"
                        className="mt-1 w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Diagnóstico de alta</label>
                    <textarea value={finForm.diagnostico_internacao}
                      onChange={e => setFinForm(f => ({ ...f, diagnostico_internacao: e.target.value }))}
                      rows={2} placeholder="Diagnóstico final da internação..."
                      className="mt-1 w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary bg-white resize-none"
                    />
                  </div>
                  {/* Valor por visitador + resumo financeiro */}
                  {internacao.visitas.length > 0 && (() => {
                    const counts: Record<string, number> = {}
                    for (const v of internacao.visitas) counts[v.visitador] = (counts[v.visitador] ?? 0) + 1
                    const visitadoresNaoGui = Object.keys(counts).filter(v => v !== 'Guilherme')
                    const valorPadrao = finForm.valor_visita ? parseFloat(finForm.valor_visita) : 0

                    // total cobrado da internação (valor_visita × total visitas)
                    const totalVisitas = internacao.visitas.length
                    const totalCobrado = valorPadrao * totalVisitas

                    // total a pagar por visitador (valor específico ou padrão)
                    let totalPagar = 0
                    const pagamentos = visitadoresNaoGui.map(vis => {
                      const valorEsp = finForm.valor_por_visitador[vis]
                      const rate     = valorEsp && parseFloat(valorEsp) > 0 ? parseFloat(valorEsp) : valorPadrao
                      const subtotal = rate * counts[vis]
                      totalPagar    += subtotal
                      return { vis, qtd: counts[vis], rate, subtotal }
                    })

                    return (
                      <div className="rounded-lg bg-white border border-gray-200 p-3 space-y-3">
                        {/* Total da internação */}
                        <div>
                          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Resumo da internação</p>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-500">{totalVisitas} visita{totalVisitas !== 1 ? 's' : ''} × {valorPadrao > 0 ? valorPadrao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</span>
                            <span className="font-bold text-gray-900">{totalCobrado > 0 ? totalCobrado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</span>
                          </div>
                          {counts['Guilherme'] && (
                            <p className="text-[10px] text-gray-400 mt-0.5">Guilherme: {counts['Guilherme']} visita{counts['Guilherme'] !== 1 ? 's' : ''}</p>
                          )}
                        </div>

                        {/* Valor por visitador (exceto Guilherme) */}
                        {visitadoresNaoGui.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Pagamento por visitador</p>
                            {visitadoresNaoGui.map(vis => (
                              <div key={vis} className="flex items-center gap-2">
                                <span className="text-xs text-gray-700 w-20 flex-shrink-0">{vis} ({counts[vis]}x)</span>
                                <div className="flex items-center gap-1 flex-1">
                                  <span className="text-xs text-gray-400">R$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={finForm.valor_por_visitador[vis] ?? ''}
                                    onChange={e => setFinForm(f => ({
                                      ...f,
                                      valor_por_visitador: { ...f.valor_por_visitador, [vis]: e.target.value }
                                    }))}
                                    placeholder={valorPadrao > 0 ? String(valorPadrao) : '0'}
                                    className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-white"
                                  />
                                  <span className="text-xs text-gray-400">/visita</span>
                                </div>
                                {(() => {
                                  const p = pagamentos.find(p => p.vis === vis)
                                  return p && p.subtotal > 0 ? (
                                    <span className="text-xs font-semibold text-gray-800 w-20 text-right flex-shrink-0">
                                      {p.subtotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                  ) : null
                                })()}
                              </div>
                            ))}
                            {totalPagar > 0 && (
                              <div className="flex justify-between text-xs pt-1 border-t border-gray-100">
                                <span className="text-gray-500 font-medium">Total a pagar</span>
                                <span className="font-bold text-primary">{totalPagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setShowFinalizar(false)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                      Cancelar
                    </button>
                    <button type="button" onClick={handleFinalizar} disabled={finPending || !finForm.data_alta}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-500 text-white font-semibold hover:bg-amber-600 transition-colors disabled:opacity-60">
                      {finPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />}
                      Confirmar alta
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 items-center">
                  <button type="button" onClick={() => setShowFinalizar(true)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 font-medium hover:bg-amber-50 transition-colors">
                    <CheckCircle className="w-3.5 h-3.5" /> Finalizar internação
                  </button>
                  <button type="button" disabled={delPending}
                    onClick={() => startDel(async () => {
                      if (!confirm('Excluir esta internação e todas as visitas?')) return
                      await deleteInternacao(internacao.id)
                      onDeleted(internacao.id)
                    })}
                    className="text-gray-300 hover:text-red-400 transition-colors"
                    title="Excluir internação"
                  >
                    {delPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ───────────────────────────────────────
interface Props {
  patients?:  Profile[]      // só na tab global (para o select de paciente)
  patientId?: string         // só na tab do prontuário
}

export default function InternacaoPanel({ patients, patientId }: Props) {
  const [internacoes, setInternacoes] = useState<Internacao[]>([])
  const [loading, setLoading]         = useState(true)
  const [showNova, setShowNova]       = useState(false)
  const [addPending, startAdd]        = useTransition()
  const [err, setErr]                 = useState('')

  const hoje = todayStr()
  const [novaForm, setNovaForm] = useState<{ patient_id: string; hospital: string; hospital_outro: string; data_internacao: string; motivo_internacao: string }>({
    patient_id:        patientId ?? '',
    hospital:          HOSPITAIS[0].value,
    hospital_outro:    '',
    data_internacao:   hoje,
    motivo_internacao: '',
  })

  useEffect(() => {
    getInternacoes(patientId).then(data => { setInternacoes(data); setLoading(false) })
  }, [patientId])

  function handleDeleted(id: string) {
    setInternacoes(prev => prev.filter(i => i.id !== id))
  }

  function handleAddInternacao() {
    setErr('')
    if (!novaForm.patient_id) { setErr('Selecione um paciente'); return }
    if (!novaForm.data_internacao) { setErr('Informe a data de internação'); return }
    startAdd(async () => {
      const res = await createInternacao({
        patient_id:        novaForm.patient_id,
        hospital:          novaForm.hospital,
        hospital_outro:    novaForm.hospital === 'outro' ? novaForm.hospital_outro : undefined,
        data_internacao:   novaForm.data_internacao,
        motivo_internacao: novaForm.motivo_internacao || undefined,
      })
      if (!res.success) { setErr(res.error ?? 'Erro ao criar'); return }
      const updated = await getInternacoes(patientId)
      setInternacoes(updated)
      setShowNova(false)
      setNovaForm({
        patient_id:        patientId ?? '',
        hospital:          HOSPITAIS[0].value,
        hospital_outro:    '',
        data_internacao:   hoje,
        motivo_internacao: '',
      })
    })
  }

  const ativas      = internacoes.filter(i => !i.finalizada)
  const finalizadas = internacoes.filter(i => i.finalizada)
  const showPatient = !patientId

  const now = new Date()
  const mesAtual = now.getFullYear() * 100 + (now.getMonth() + 1)
  const anoAtual = now.getFullYear()

  function anoMes(d: string) {
    const [y, m] = d.split('-').map(Number)
    return y * 100 + m
  }

  // Resumo consolidado por visitador (só na aba global)
  const resumoVisitadores = useMemo(() => {
    if (patientId) return []
    const map: Record<string, { visitas: number; pacientes: Set<string>; totalFin: number; totalPagar: number }> = {}
    for (const i of internacoes) {
      const nome = i.patient_name ?? '—'
      for (const v of i.visitas) {
        if (!map[v.visitador]) map[v.visitador] = { visitas: 0, pacientes: new Set(), totalFin: 0, totalPagar: 0 }
        map[v.visitador].visitas++
        map[v.visitador].pacientes.add(nome)
        if (i.finalizada && i.valor_visita) {
          map[v.visitador].totalFin += i.valor_visita
          // valor específico para este visitador, ou padrão
          const rateEsp = i.valor_por_visitador?.[v.visitador]
          map[v.visitador].totalPagar += rateEsp ?? i.valor_visita
        }
      }
    }
    return Object.entries(map).sort((a, b) => b[1].visitas - a[1].visitas)
  }, [internacoes, patientId])

  // Analytics (só global)
  const analytics = useMemo(() => {
    if (patientId) return null
    const fin = internacoes.filter(i => i.finalizada && i.data_alta)

    const filtrar = (lista: Internacao[], periodo: 'mes' | 'ano') =>
      lista.filter(i => {
        const am = anoMes(i.data_alta!)
        return periodo === 'mes' ? am === mesAtual : Math.floor(am / 100) === anoAtual
      })

    function calcMetrics(lista: Internacao[]) {
      const receita  = lista.reduce((s, i) => s + (i.valor_visita ?? 0) * i.visitas.length, 0)
      const visitas  = lista.reduce((s, i) => s + i.visitas.length, 0)
      const pacs     = new Set(lista.map(i => i.patient_id)).size
      return { internacoes: lista.length, receita, visitas, pacs }
    }

    const mes = calcMetrics(filtrar(fin, 'mes'))
    const ano = calcMetrics(filtrar(fin, 'ano'))

    // Por hospital (ano)
    const porHospital: Record<string, { receita: number; visitas: number }> = {}
    for (const i of filtrar(fin, 'ano')) {
      const label = hospitalLabel(i.hospital, i.hospital_outro)
      if (!porHospital[label]) porHospital[label] = { receita: 0, visitas: 0 }
      porHospital[label].receita  += (i.valor_visita ?? 0) * i.visitas.length
      porHospital[label].visitas  += i.visitas.length
    }

    // Por visitador (ano)
    const porVisitador: Record<string, { visitas: number; receita: number }> = {}
    for (const i of filtrar(fin, 'ano')) {
      for (const v of i.visitas) {
        if (!porVisitador[v.visitador]) porVisitador[v.visitador] = { visitas: 0, receita: 0 }
        porVisitador[v.visitador].visitas++
        porVisitador[v.visitador].receita += i.valor_visita ?? 0
      }
    }

    return {
      mes, ano,
      hospitalData:   Object.entries(porHospital).map(([name, d]) => ({ name, ...d })),
      visitadorData:  Object.entries(porVisitador).map(([name, d]) => ({ name, ...d })),
    }
  }, [internacoes, patientId, mesAtual, anoAtual])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Carregando internações…</span>
      </div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Botão nova internação */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400">
            {ativas.length} {ativas.length === 1 ? 'internação ativa' : 'internações ativas'}
            {finalizadas.length > 0 && ` · ${finalizadas.length} finalizada${finalizadas.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowNova(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-light transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Nova internação
        </button>
      </div>

      {/* Formulário nova internação */}
      {showNova && (
        <div className="rounded-xl border border-primary/20 p-4 space-y-3 bg-white shadow-sm">
          <p className="text-sm font-semibold text-gray-800">Nova internação</p>

          {/* Paciente (só na tab global) */}
          {!patientId && patients && (
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Paciente</label>
              <select value={novaForm.patient_id}
                onChange={e => setNovaForm(f => ({ ...f, patient_id: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="">Selecione...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Hospital</label>
              <select value={novaForm.hospital}
                onChange={e => setNovaForm(f => ({ ...f, hospital: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                {HOSPITAIS.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Data de internação</label>
              <input type="date" value={novaForm.data_internacao}
                onChange={e => setNovaForm(f => ({ ...f, data_internacao: e.target.value }))}
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              />
            </div>
          </div>

          {novaForm.hospital === 'outro' && (
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Nome do hospital</label>
              <input type="text" value={novaForm.hospital_outro}
                onChange={e => setNovaForm(f => ({ ...f, hospital_outro: e.target.value }))}
                placeholder="Nome do hospital..."
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              />
            </div>
          )}

          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Motivo da internação</label>
            <input type="text" value={novaForm.motivo_internacao}
              onChange={e => setNovaForm(f => ({ ...f, motivo_internacao: e.target.value }))}
              placeholder="Ex: Insuficiência cardíaca descompensada..."
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            />
          </div>

          {err && <p className="text-xs text-red-500">{err}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => { setShowNova(false); setErr('') }}
              className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={handleAddInternacao} disabled={addPending}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary-light transition-colors disabled:opacity-60">
              {addPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Stethoscope className="w-4 h-4" />}
              Registrar internação
            </button>
          </div>
        </div>
      )}

      {/* Analytics (só na aba global) */}
      {analytics && (analytics.mes.internacoes > 0 || analytics.ano.internacoes > 0) && (() => {
        const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        const COLORS = ['#2D2B6B', '#4F8EF7', '#10B981', '#F59E0B', '#EF4444']

        return (
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
            {/* Título */}
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Financeiro de internações</p>

            {/* Tiles este mês / acumulado no ano */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Este mês', data: analytics.mes },
                { label: 'Este ano', data: analytics.ano },
              ].map(({ label, data }) => (
                <div key={label} className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-gray-400">Receita</p>
                      <p className="text-sm font-bold text-primary">{fmt(data.receita)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Internações</p>
                      <p className="text-sm font-bold text-gray-800">{data.internacoes}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Visitas</p>
                      <p className="text-sm font-bold text-gray-800">{data.visitas}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400">Pacientes</p>
                      <p className="text-sm font-bold text-gray-800">{data.pacs}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Gráficos */}
            {analytics.hospitalData.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Receita por hospital (ano)</p>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={analytics.hospitalData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => fmt(v as number)} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="receita" radius={[4, 4, 0, 0]}>
                      {analytics.hospitalData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {analytics.visitadorData.length > 0 && (
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Visitas por médico (ano)</p>
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={analytics.visitadorData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#6B7280' }} />
                    <YAxis tick={{ fontSize: 9, fill: '#9CA3AF' }} allowDecimals={false} />
                    <Tooltip formatter={(v: any) => `${v} visita${(v as number) !== 1 ? 's' : ''}`} labelStyle={{ fontSize: 11 }} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="visitas" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )
      })()}

      {/* Resumo por visitador */}
      {resumoVisitadores.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50/60 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-3.5 h-3.5 text-gray-400" />
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Resumo por visitador</p>
          </div>
          {resumoVisitadores.map(([visitador, dados]) => (
            <div key={visitador} className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-800">{visitador}</span>
                <span className="text-xs text-gray-400 ml-2">
                  {dados.visitas} {dados.visitas === 1 ? 'visita' : 'visitas'}
                  {' · '}{[...dados.pacientes].join(', ')}
                </span>
              </div>
              <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                {dados.totalFin > 0 && (
                  <span className="text-xs font-semibold text-emerald-700">
                    {dados.totalFin.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                )}
                {visitador !== 'Guilherme' && dados.totalPagar > 0 && dados.totalPagar !== dados.totalFin && (
                  <span className="text-[10px] text-amber-600 font-medium">
                    pagar: {dados.totalPagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Internações ativas */}
      {ativas.length === 0 && !showNova && (
        <div className="text-center py-10 text-gray-400">
          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhuma internação ativa</p>
        </div>
      )}
      {ativas.map(i => (
        <InternacaoCard key={i.id} internacao={i} showPatient={showPatient} onDeleted={handleDeleted} />
      ))}

      {/* Internações finalizadas */}
      {finalizadas.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide pt-2">Internações anteriores</p>
          {finalizadas.map(i => (
            <InternacaoCard key={i.id} internacao={i} showPatient={showPatient} onDeleted={handleDeleted} />
          ))}
        </div>
      )}

    </div>
  )
}
