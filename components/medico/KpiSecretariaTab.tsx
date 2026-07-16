'use client'

import { useState, useTransition, useEffect } from 'react'
import { getKpiSecretaria, type KpiData } from '@/app/actions/kpi'
import { cn } from '@/lib/utils'
import {
  Loader2, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle,
  AlertTriangle, ChevronDown, ChevronUp, Settings2
} from 'lucide-react'

// ── Pesos e metas (defaults) ────────────────────────────────────────────

const DEFAULT_CONFIG = {
  pesoRetencao:    40,
  pesoNovos:       20,
  pesoCrm:         20,
  pesoNf:          10,
  pesoConfirmacao: 10,
  metaRetencao:    80,
  metaNovos:       8,
  metaCrm:         95,
  metaNf:          100,
  metaConfirmacao: 90,
  bonusMax:        500,
}

type Cfg = typeof DEFAULT_CONFIG

function calcScores(kpi: KpiData, cfg: Cfg) {
  const pctRetencao    = kpi.retornoTotal > 0 ? (kpi.retornoAgendado / kpi.retornoTotal) * 100 : 100
  const pctNovos       = cfg.metaNovos > 0 ? Math.min((kpi.novosConsulta / cfg.metaNovos) * 100, 100) : 100
  const pctCrm         = kpi.crmScore
  const pctNf          = kpi.nfElegiveis > 0 ? (kpi.nfEmDia / kpi.nfElegiveis) * 100 : 100
  const pctConfirmacao = kpi.consultasAgendadas > 0 ? (kpi.consultasConfirmadas / kpi.consultasAgendadas) * 100 : 100

  const ach = (pct: number, meta: number) => Math.min((pct / meta) * 100, 100)

  const scores = {
    retencao:    ach(pctRetencao, cfg.metaRetencao),
    novos:       pctNovos,
    crm:         ach(pctCrm, cfg.metaCrm),
    nf:          ach(pctNf, cfg.metaNf),
    confirmacao: ach(pctConfirmacao, cfg.metaConfirmacao),
  }

  const total = cfg.pesoRetencao + cfg.pesoNovos + cfg.pesoCrm + cfg.pesoNf + cfg.pesoConfirmacao || 100
  const scoreTotal = Math.round(
    scores.retencao    * (cfg.pesoRetencao    / total) +
    scores.novos       * (cfg.pesoNovos       / total) +
    scores.crm         * (cfg.pesoCrm         / total) +
    scores.nf          * (cfg.pesoNf          / total) +
    scores.confirmacao * (cfg.pesoConfirmacao / total)
  )

  return { scores, scoreTotal, pctRetencao, pctCrm, pctNf, pctConfirmacao }
}

// ── Gauge ───────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const color = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'
  const label = score >= 80 ? 'Ótimo' : score >= 60 ? 'Regular' : 'Atenção'
  const r = 52, cx = 64, cy = 68
  const circ = 2 * Math.PI * r
  const arc  = Math.min(score / 100, 1) * circ * 0.75

  return (
    <svg width="128" height="104" viewBox="0 0 128 104">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth="10"
        strokeDasharray={`${circ * 0.75} ${circ}`} strokeLinecap="round"
        transform={`rotate(-225 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth="10"
        strokeDasharray={`${arc} ${circ}`} strokeLinecap="round"
        transform={`rotate(-225 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }} />
      <text x={cx} y={cy - 2} textAnchor="middle" fontSize="24" fontWeight="700" fill={color}>{score}</text>
      <text x={cx} y={cy + 15} textAnchor="middle" fontSize="10" fill="#9ca3af">{label}</text>
    </svg>
  )
}

// ── KPI Card ────────────────────────────────────────────────────────────

function KpiCard({ label, score, valor, meta, peso, children }: {
  label:     string
  score:     number
  valor:     string
  meta:      string
  peso:      number
  children?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const barColor  = score >= 80 ? 'bg-emerald-500' : score >= 60 ? 'bg-amber-400' : 'bg-red-400'
  const textColor = score >= 80 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-500'

  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-bold text-gray-900">{valor}</p>
            <p className="text-[10px] text-gray-400">meta: {meta}</p>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>0%</span>
            <span className={cn('font-semibold', textColor)}>{Math.round(score)}% atingido</span>
            <span>100%</span>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <div className={cn('h-full rounded-full transition-all duration-500', barColor)} style={{ width: `${score}%` }} />
          </div>
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-gray-400">Peso: <span className="font-semibold text-gray-600">{peso}%</span></span>
          <span className={cn('font-bold', textColor)}>+{Math.round(score * peso / 100)} pts</span>
        </div>
      </div>

      {children && (
        <>
          <button
            onClick={() => setOpen(v => !v)}
            className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <span>Ver detalhes</span>
            {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
          {open && (
            <div className="border-t border-gray-100 p-4 bg-gray-50 max-h-56 overflow-y-auto">
              {children}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Helpers ─────────────────────────────────────────────────────────────

function mesLabel(mes: string) {
  const [y, m] = mes.split('-')
  return new Date(+y, +m - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function hoje() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

function shiftMes(mes: string, dir: number) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(y, m - 1 + dir)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function NumInput({ label, value, onChange, suffix }: {
  label:     string
  value:     number
  onChange:  (v: number) => void
  suffix?:   string
}) {
  return (
    <div>
      <label className="text-[10px] text-gray-500 font-medium block mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number" min={0} step={1} value={value}
          onChange={e => onChange(Math.max(0, +e.target.value))}
          className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        {suffix && <span className="text-[10px] text-gray-400 flex-shrink-0">{suffix}</span>}
      </div>
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────

export default function KpiSecretariaTab() {
  const [mes,     setMes]     = useState(hoje)
  const [kpi,     setKpi]     = useState<KpiData | null>(null)
  const [pending, startLoad]  = useTransition()
  const [cfg,     setCfg]     = useState<Cfg>(DEFAULT_CONFIG)
  const [showCfg, setShowCfg] = useState(false)

  function setCfgField<K extends keyof Cfg>(k: K, v: number) {
    setCfg(c => ({ ...c, [k]: v }))
  }

  useEffect(() => {
    startLoad(async () => { setKpi(await getKpiSecretaria(mes)) })
  }, [mes])

  if (pending && !kpi) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Carregando KPIs…</span>
      </div>
    )
  }

  const { scores, scoreTotal, pctRetencao, pctCrm, pctNf, pctConfirmacao } = kpi
    ? calcScores(kpi, cfg)
    : { scores: { retencao: 0, novos: 0, crm: 0, nf: 0, confirmacao: 0 }, scoreTotal: 0, pctRetencao: 0, pctCrm: 0, pctNf: 0, pctConfirmacao: 0 }

  const bonus = Math.round((scoreTotal / 100) * cfg.bonusMax)
  const pesoTotal = cfg.pesoRetencao + cfg.pesoNovos + cfg.pesoCrm + cfg.pesoNf + cfg.pesoConfirmacao

  return (
    <div className="space-y-5">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-900">
            KPI — {kpi?.secretariaNome ?? 'Secretária'}
          </h3>
          <p className="text-xs text-gray-400 mt-0.5">Score de desempenho mensal e calculadora de bônus variável</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowCfg(v => !v)}
            title="Configurações"
            className={cn('p-1.5 rounded-lg border transition-colors', showCfg ? 'border-primary/30 bg-primary/5 text-primary' : 'border-gray-200 hover:bg-gray-50 text-gray-400')}
          >
            <Settings2 className="w-4 h-4" />
          </button>
          <button onClick={() => setMes(m => shiftMes(m, -1))} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
          <span className="text-sm font-semibold text-gray-700 min-w-[140px] text-center capitalize">{mesLabel(mes)}</span>
          <button onClick={() => setMes(m => shiftMes(m, 1))} disabled={mes >= hoje()} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-30">
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          {pending && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />}
        </div>
      </div>

      {/* Painel de configuração */}
      {showCfg && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Configurações</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <NumInput label="Bônus máximo (R$)" value={cfg.bonusMax} onChange={v => setCfgField('bonusMax', v)} />
            <NumInput label="Meta novos pacientes/mês" value={cfg.metaNovos} onChange={v => setCfgField('metaNovos', v)} />
            <NumInput label="Meta retenção" value={cfg.metaRetencao} onChange={v => setCfgField('metaRetencao', v)} suffix="%" />
            <NumInput label="Meta qualidade CRM" value={cfg.metaCrm} onChange={v => setCfgField('metaCrm', v)} suffix="%" />
            <NumInput label="Meta confirmação" value={cfg.metaConfirmacao} onChange={v => setCfgField('metaConfirmacao', v)} suffix="%" />
          </div>
          <div className="border-t border-gray-200 pt-3">
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide mb-2">Pesos</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <NumInput label="Retenção" value={cfg.pesoRetencao} onChange={v => setCfgField('pesoRetencao', v)} suffix="%" />
              <NumInput label="Novos" value={cfg.pesoNovos} onChange={v => setCfgField('pesoNovos', v)} suffix="%" />
              <NumInput label="CRM" value={cfg.pesoCrm} onChange={v => setCfgField('pesoCrm', v)} suffix="%" />
              <NumInput label="NF" value={cfg.pesoNf} onChange={v => setCfgField('pesoNf', v)} suffix="%" />
              <NumInput label="Confirmação" value={cfg.pesoConfirmacao} onChange={v => setCfgField('pesoConfirmacao', v)} suffix="%" />
            </div>
            <p className="text-[10px] text-gray-400 mt-2">
              Total: <span className={cn('font-semibold', pesoTotal === 100 ? 'text-emerald-600' : 'text-amber-600')}>{pesoTotal}%</span>
              {pesoTotal !== 100 && <span className="text-amber-500 ml-1">(deve somar 100%)</span>}
            </p>
          </div>
        </div>
      )}

      {kpi && (
        <>
          {/* Score + bônus */}
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-center">
              <div className="flex flex-col items-center">
                <ScoreGauge score={scoreTotal} />
                <p className="text-xs text-gray-500 font-medium -mt-1">Score geral</p>
              </div>
              <div className="sm:col-span-2">
                <div className="rounded-lg bg-primary/5 border border-primary/20 px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Bônus do mês</p>
                    <p className="text-2xl font-bold text-primary">
                      {bonus.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>{scoreTotal}/100 pontos</p>
                    <p>de {cfg.bonusMax.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} máximo</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Caixa de pendências */}
          {kpi.pendencias.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-2">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wide flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Pendências que impedem score máximo
              </p>
              <ul className="space-y-1.5">
                {kpi.pendencias.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-amber-800">
                    <span className="text-amber-400 flex-shrink-0 mt-0.5">•</span>
                    {p.texto}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            <KpiCard
              label="Retenção de pacientes"
              score={scores.retencao}
              valor={kpi.retornoTotal > 0 ? `${Math.round(pctRetencao)}%` : '—'}
              meta={`${cfg.metaRetencao}%`}
              peso={cfg.pesoRetencao}
            >
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 font-semibold mb-2">
                  {kpi.retornoAgendado} de {kpi.retornoTotal} retornaram conforme previsto
                </p>
                {kpi.retornoNomes.map((r, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    {r.status === 'ok'
                      ? <CheckCircle2 className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      : <AlertCircle  className="w-3 h-3 text-amber-500 flex-shrink-0" />
                    }
                    <span className={cn('flex-1 truncate', r.status === 'pendente' && 'font-semibold text-amber-700')}>{r.nome}</span>
                    <span className="text-gray-400 text-[10px] flex-shrink-0">
                      {new Date(r.retorno + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </KpiCard>

            <KpiCard
              label="Novos pacientes"
              score={scores.novos}
              valor={String(kpi.novosConsulta)}
              meta={`${cfg.metaNovos} pacientes`}
              peso={cfg.pesoNovos}
            >
              <p className="text-xs text-gray-500">
                {kpi.novosConsulta} primeira{kpi.novosConsulta !== 1 ? 's' : ''} consulta{kpi.novosConsulta !== 1 ? 's' : ''} no mês.
              </p>
            </KpiCard>

            <KpiCard
              label="Qualidade do cadastro"
              score={scores.crm}
              valor={kpi.crmTotal > 0 ? `${pctCrm}%` : '—'}
              meta={`${cfg.metaCrm}%`}
              peso={cfg.pesoCrm}
            >
              <div className="space-y-2">
                <p className="text-[10px] text-gray-500 font-semibold mb-1">
                  {kpi.crmTotal} paciente{kpi.crmTotal !== 1 ? 's' : ''} avaliado{kpi.crmTotal !== 1 ? 's' : ''} · {kpi.crmPendencias.length} com pendência
                </p>
                {kpi.crmPendencias.map((p, i) => (
                  <div key={i} className="text-xs border-l-2 border-amber-200 pl-2">
                    <p className="font-semibold text-gray-700">{p.nome}</p>
                    <p className="text-gray-400">{p.campos.join(', ')}</p>
                  </div>
                ))}
              </div>
            </KpiCard>

            <KpiCard
              label="NF em dia"
              score={scores.nf}
              valor={kpi.nfElegiveis > 0 ? `${Math.round(pctNf)}%` : '—'}
              meta={`${cfg.metaNf}%`}
              peso={cfg.pesoNf}
            >
              <div className="space-y-1.5">
                <p className="text-[10px] text-gray-500 font-semibold mb-1">
                  {kpi.nfEmDia} de {kpi.nfElegiveis} receitas com NF solicitada
                </p>
                {kpi.nfPendencias.map((p, i) => (
                  <div key={i} className="text-xs text-amber-700 border-l-2 border-amber-200 pl-2">
                    <p className="font-semibold">{p.paciente || p.descricao}</p>
                    {p.paciente && <p className="text-gray-400">{p.descricao}</p>}
                  </div>
                ))}
              </div>
            </KpiCard>

            <KpiCard
              label="Taxa de confirmação"
              score={scores.confirmacao}
              valor={kpi.consultasAgendadas > 0 ? `${Math.round(pctConfirmacao)}%` : '—'}
              meta={`${cfg.metaConfirmacao}%`}
              peso={cfg.pesoConfirmacao}
            >
              <p className="text-xs text-gray-500">
                {kpi.consultasConfirmadas} de {kpi.consultasAgendadas} consultas confirmadas antes do atendimento.
              </p>
            </KpiCard>

          </div>
        </>
      )}
    </div>
  )
}
