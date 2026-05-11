'use client'

import { useState, useMemo } from 'react'
import type { Profile, Consulta, ConsultaTipo, ConsultaStatus, LabResult, ImagingResult } from '@/lib/types'
import { TIPO_LABEL } from './ConsultaModal'
import { countLabAlerts, computeLabAlerts } from '@/lib/lab-alerts'
import { parseDiagnosticos } from './prontuario/DiagnosticosPanel'
import { Users, Stethoscope, AlertCircle, BarChart2, ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react'

interface RelatoriosTabProps {
  patients:      Profile[]
  consultas:     Consulta[]
  labResults:    LabResult[]
  imagingResults: ImagingResult[]
}

type SortKey = 'name' | 'sexo' | 'lastConsulta' | 'numConsultas' | 'diagnosis'
type SortDir = 'asc' | 'desc'

const PERIOD_OPTIONS = [
  { label: '3 meses',  months: 3  },
  { label: '6 meses',  months: 6  },
  { label: '12 meses', months: 12 },
  { label: 'Todos',    months: 0  },
]

const STATUS_LABEL: Record<ConsultaStatus, string> = {
  agendada:   'Agendada',
  confirmada: 'Confirmada',
  realizada:  'Realizada',
  falta:      'Falta',
  cancelada:  'Cancelada',
}

function periodCutoff(months: number): string | null {
  if (!months) return null
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3 h-3 text-gray-300" />
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 text-primary" />
    : <ChevronDown className="w-3 h-3 text-primary" />
}

function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
  color?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-start gap-3">
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: color ? `${color}18` : 'rgba(26,58,92,0.08)' }}
      >
        <span style={{ color: color ?? '#1a3a5c' }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function RelatoriosTab({ patients, consultas, labResults, imagingResults }: RelatoriosTabProps) {
  const [filterSexo,   setFilterSexo]   = useState<'all' | 'M' | 'F'>('all')
  const [filterStatus, setFilterStatus] = useState<ConsultaStatus | 'all'>('all')
  const [filterTipo,   setFilterTipo]   = useState<ConsultaTipo | 'all'>('all')
  const [filterPeriod, setFilterPeriod] = useState<number>(12)
  const [filterDiag,   setFilterDiag]   = useState('')
  const [sortKey,      setSortKey]      = useState<SortKey>('lastConsulta')
  const [sortDir,      setSortDir]      = useState<SortDir>('desc')

  const cutoff = useMemo(() => periodCutoff(filterPeriod), [filterPeriod])

  // Consultas within selected period
  const periodConsultas = useMemo(() =>
    cutoff ? consultas.filter(c => c.data_hora >= cutoff) : consultas,
  [consultas, cutoff])

  // Per-patient data
  const patientData = useMemo(() => {
    return patients.map(p => {
      const pConsultas = consultas.filter(c => c.patient_id === p.id)
      const pPeriodConsultas = periodConsultas.filter(c => c.patient_id === p.id)
      const pLabs = labResults.filter(r => r.patient_id === p.id)
      const alerts = countLabAlerts(pLabs)

      // Last consulta overall
      const sorted = [...pConsultas].sort((a, b) => b.data_hora.localeCompare(a.data_hora))
      const lastConsulta = sorted[0] ?? null

      // Collect all diagnoses from consultas
      const diagSet = new Set<string>()
      if (p.diagnostico) diagSet.add(p.diagnostico)
      pConsultas.forEach(c => {
        parseDiagnosticos(c.diagnosticos ?? null).forEach(d => {
          if (d.nome) diagSet.add(d.nome)
        })
      })
      const diagText = Array.from(diagSet).join(', ')

      // Status from last consulta
      const status = lastConsulta?.status ?? null

      return {
        patient: p,
        consultas: pConsultas,
        periodConsultas: pPeriodConsultas,
        lastConsulta,
        status,
        numConsultas: pPeriodConsultas.length,
        alerts,
        diagText,
      }
    })
  }, [patients, consultas, periodConsultas, labResults])

  // Filtered set
  const filtered = useMemo(() => {
    return patientData.filter(pd => {
      if (filterSexo !== 'all' && pd.patient.sexo !== filterSexo) return false
      if (filterStatus !== 'all' && pd.status !== filterStatus) return false
      if (filterTipo !== 'all' && !pd.periodConsultas.some(c => c.tipo === filterTipo)) return false
      if (filterDiag) {
        const q = filterDiag.toLowerCase()
        if (!pd.diagText.toLowerCase().includes(q) &&
            !pd.patient.full_name?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [patientData, filterSexo, filterStatus, filterTipo, filterDiag])

  // Sorted
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':
          cmp = (a.patient.full_name ?? '').localeCompare(b.patient.full_name ?? '')
          break
        case 'sexo':
          cmp = (a.patient.sexo ?? '').localeCompare(b.patient.sexo ?? '')
          break
        case 'lastConsulta':
          cmp = (a.lastConsulta?.data_hora ?? '').localeCompare(b.lastConsulta?.data_hora ?? '')
          break
        case 'numConsultas':
          cmp = a.numConsultas - b.numConsultas
          break
        case 'diagnosis':
          cmp = a.diagText.localeCompare(b.diagText)
          break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  // ── Summary stats ──────────────────────────────────────────
  const totalPatients = patients.length
  const totalPeriodConsultas = periodConsultas.filter(c => c.status === 'realizada').length
  const patientsWithAlerts = patientData.filter(pd => pd.alerts.critical > 0 || pd.alerts.warning > 0).length
  const avgConsultas = totalPatients > 0
    ? (periodConsultas.length / totalPatients).toFixed(1)
    : '0'

  // ── Tipo distribution (period) ─────────────────────────────
  const tipoDistrib = useMemo(() => {
    const tipos = Object.keys(TIPO_LABEL) as ConsultaTipo[]
    const realizadas = periodConsultas.filter(c => c.status === 'realizada')
    return tipos.map(t => ({
      tipo: t,
      count: realizadas.filter(c => c.tipo === t).length,
      total: realizadas.length,
    })).filter(x => x.count > 0).sort((a, b) => b.count - a.count)
  }, [periodConsultas])

  // ── Top diagnoses (filtered patients) ─────────────────────
  const topDiagnoses = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(pd => {
      const diagSet = new Set<string>()
      if (pd.patient.diagnostico) diagSet.add(pd.patient.diagnostico)
      pd.consultas.forEach(c => {
        parseDiagnosticos(c.diagnosticos ?? null).forEach(d => {
          if (d.nome) diagSet.add(d.nome)
        })
      })
      diagSet.forEach(d => { counts[d] = (counts[d] ?? 0) + 1 })
    })
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
  }, [filtered])

  // ── Top labs with abnormalities ────────────────────────────
  const topAbnormalLabs = useMemo(() => {
    const examCounts: Record<string, { warn: Set<string>; crit: Set<string> }> = {}
    patients.forEach(p => {
      const pLabs = labResults.filter(r => r.patient_id === p.id)
      const alerts = computeLabAlerts(pLabs)
      alerts.forEach(a => {
        if (!examCounts[a.exam_name]) examCounts[a.exam_name] = { warn: new Set(), crit: new Set() }
        if (a.severity === 'critical') examCounts[a.exam_name].crit.add(p.id)
        else examCounts[a.exam_name].warn.add(p.id)
      })
    })
    return Object.entries(examCounts)
      .map(([name, { warn, crit }]) => ({ name, warn: warn.size, crit: crit.size, total: warn.size + crit.size }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
  }, [patients, labResults])

  const maxDiag = topDiagnoses[0]?.[1] ?? 1
  const maxLab  = topAbnormalLabs[0]?.total ?? 1

  return (
    <div className="space-y-6">

      {/* ── Summary cards ─────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Pacientes ativos"
          value={totalPatients}
        />
        <StatCard
          icon={<Stethoscope className="w-5 h-5" />}
          label={`Consultas realizadas${filterPeriod ? ` (${PERIOD_OPTIONS.find(p=>p.months===filterPeriod)?.label})` : ''}`}
          value={totalPeriodConsultas}
          sub={`Média: ${avgConsultas} por paciente`}
        />
        <StatCard
          icon={<AlertCircle className="w-5 h-5" />}
          label="Pacientes c/ alertas laboratoriais"
          value={patientsWithAlerts}
          color="#dc2626"
        />
        <StatCard
          icon={<BarChart2 className="w-5 h-5" />}
          label="Pacientes no filtro atual"
          value={filtered.length}
          sub={`de ${totalPatients} totais`}
        />
      </div>

      {/* ── Filter bar ────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filtros</p>
        <div className="flex flex-wrap gap-3">
          {/* Sexo */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Sexo</label>
            <select
              value={filterSexo}
              onChange={e => setFilterSexo(e.target.value as 'all' | 'M' | 'F')}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">Todos</option>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </select>
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Tipo de consulta</label>
            <select
              value={filterTipo}
              onChange={e => setFilterTipo(e.target.value as ConsultaTipo | 'all')}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">Todos</option>
              {(Object.keys(TIPO_LABEL) as ConsultaTipo[]).map(t => (
                <option key={t} value={t}>{TIPO_LABEL[t]}</option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status última consulta</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as ConsultaStatus | 'all')}
              className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">Todos</option>
              {(Object.keys(STATUS_LABEL) as ConsultaStatus[]).map(s => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
          </div>

          {/* Período */}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Período</label>
            <div className="flex gap-1">
              {PERIOD_OPTIONS.map(p => (
                <button
                  key={p.months}
                  type="button"
                  onClick={() => setFilterPeriod(p.months)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
                    filterPeriod === p.months
                      ? 'bg-primary text-white border-primary'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Busca diagnóstico */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Diagnóstico / nome</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar..."
                value={filterDiag}
                onChange={e => setFilterDiag(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Main table ────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">
            Pacientes ({sorted.length})
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {([
                  { key: 'name',        label: 'Paciente'       },
                  { key: 'sexo',        label: 'Sexo'           },
                  { key: 'diagnosis',   label: 'Diagnóstico'    },
                  { key: 'lastConsulta',label: 'Última consulta'},
                  { key: 'numConsultas',label: 'Consultas'      },
                ] as { key: SortKey; label: string }[]).map(col => (
                  <th
                    key={col.key}
                    onClick={() => toggleSort(col.key)}
                    className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon col={col.key} sortKey={sortKey} sortDir={sortDir} />
                    </div>
                  </th>
                ))}
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Alertas lab
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-gray-400 text-sm">
                    Nenhum paciente encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : sorted.map(pd => {
                const lastDate = pd.lastConsulta
                  ? new Date(pd.lastConsulta.data_hora).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                  : '—'
                return (
                  <tr key={pd.patient.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {pd.patient.full_name || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {pd.patient.sexo === 'F' ? 'Feminino' : pd.patient.sexo === 'M' ? 'Masculino' : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 max-w-[220px]">
                      <span className="line-clamp-1 block" title={pd.diagText}>
                        {pd.diagText || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
                      {lastDate}
                      {pd.lastConsulta && (
                        <span className="ml-1.5 text-xs text-gray-400">
                          ({TIPO_LABEL[pd.lastConsulta.tipo]})
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-gray-700 font-medium">
                      {pd.numConsultas}
                    </td>
                    <td className="px-4 py-2.5">
                      {pd.alerts.critical > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold mr-1">
                          <AlertCircle className="w-3 h-3" />
                          {pd.alerts.critical} crítico{pd.alerts.critical > 1 ? 's' : ''}
                        </span>
                      )}
                      {pd.alerts.warning > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
                          {pd.alerts.warning} alerta{pd.alerts.warning > 1 ? 's' : ''}
                        </span>
                      )}
                      {pd.alerts.critical === 0 && pd.alerts.warning === 0 && (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Bottom row: tipo distribution + top diagnoses + top labs ── */}
      <div className="grid lg:grid-cols-3 gap-4">

        {/* Tipo distribution */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">
            Consultas por tipo
            <span className="ml-1.5 text-xs text-gray-400 font-normal">
              ({PERIOD_OPTIONS.find(p => p.months === filterPeriod)?.label})
            </span>
          </p>
          {tipoDistrib.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Sem dados no período</p>
          ) : tipoDistrib.map(({ tipo, count, total }) => (
            <div key={tipo}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 truncate">{TIPO_LABEL[tipo]}</span>
                <span className="text-xs font-semibold text-gray-700 ml-2 flex-shrink-0">
                  {count} <span className="font-normal text-gray-400">({total ? Math.round(count / total * 100) : 0}%)</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${total ? (count / total * 100) : 0}%`, backgroundColor: '#1a3a5c' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Top diagnoses */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">
            Diagnósticos mais frequentes
            <span className="ml-1.5 text-xs text-gray-400 font-normal">(pacientes filtrados)</span>
          </p>
          {topDiagnoses.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Sem diagnósticos registrados</p>
          ) : topDiagnoses.map(([diag, count]) => (
            <div key={diag}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 truncate" title={diag}>{diag}</span>
                <span className="text-xs font-semibold text-gray-700 ml-2 flex-shrink-0">{count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(count / maxDiag) * 100}%`, backgroundColor: '#0f766e' }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Top labs with abnormalities */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-700">Exames com mais alterações</p>
          {topAbnormalLabs.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Sem alertas laboratoriais</p>
          ) : topAbnormalLabs.map(({ name, warn, crit, total }) => (
            <div key={name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 truncate" title={name}>{name}</span>
                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                  {crit > 0 && (
                    <span className="text-xs font-semibold text-red-600">{crit}✕</span>
                  )}
                  {warn > 0 && (
                    <span className="text-xs font-semibold text-amber-600">{warn}⚠</span>
                  )}
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(total / maxLab) * 100}%`, backgroundColor: '#dc2626' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
