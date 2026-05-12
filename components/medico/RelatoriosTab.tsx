'use client'

import { useState, useMemo } from 'react'
import type { Profile, Consulta, ConsultaTipo, ConsultaStatus, ConsultaLocal, LabResult, ImagingResult } from '@/lib/types'
import { TIPO_LABEL } from './ConsultaModal'
import { countLabAlerts, computeLabAlerts } from '@/lib/lab-alerts'
import { parseDiagnosticos } from './prontuario/DiagnosticosPanel'
import { Users, Stethoscope, BarChart2, ChevronUp, ChevronDown, ChevronsUpDown, Search, X } from 'lucide-react'

interface RelatoriosTabProps {
  patients:       Profile[]
  consultas:      Consulta[]
  labResults:     LabResult[]
  imagingResults: ImagingResult[]
}

type SortKey = 'name' | 'sexo' | 'lastConsulta' | 'numConsultas' | 'diagnosis'
type SortDir = 'asc' | 'desc'
type AlertFilter = 'all' | 'critical' | 'warning' | 'none'

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

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: 'rgba(26,58,92,0.08)' }}>
        <span style={{ color: '#1a3a5c' }}>{icon}</span>
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, children }: {
  label: string
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
      >
        {children}
      </select>
    </div>
  )
}

export default function RelatoriosTab({ patients, consultas, labResults }: RelatoriosTabProps) {
  // ── Filters ───────────────────────────────────────────────
  const [filterSexo,    setFilterSexo]    = useState<'all' | 'M' | 'F'>('all')
  const [filterStatus,  setFilterStatus]  = useState<ConsultaStatus | 'all'>('all')
  const [filterTipo,    setFilterTipo]    = useState<ConsultaTipo | 'all'>('all')
  const [filterLocal,   setFilterLocal]   = useState<ConsultaLocal | 'all'>('all')
  const [filterAlerts,  setFilterAlerts]  = useState<AlertFilter>('all')
  const [filterExame,   setFilterExame]   = useState<string>('all')
  const [filterPeriod,  setFilterPeriod]  = useState<number>(12)
  const [filterDiag,    setFilterDiag]    = useState('')

  // ── Sort ──────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>('lastConsulta')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const cutoff = useMemo(() => periodCutoff(filterPeriod), [filterPeriod])

  // Consultas within selected period (all non-cancelled)
  const periodConsultas = useMemo(() =>
    (cutoff ? consultas.filter(c => c.data_hora >= cutoff) : consultas)
      .filter(c => c.status !== 'cancelada'),
  [consultas, cutoff])

  // All distinct exam names that have alerts (for filter dropdown)
  const examNamesWithAlerts = useMemo(() => {
    const names = new Set<string>()
    patients.forEach(p => {
      const pLabs = labResults.filter(r => r.patient_id === p.id)
      computeLabAlerts(pLabs).forEach(a => names.add(a.exam_name))
    })
    return Array.from(names).sort()
  }, [patients, labResults])

  // Per-patient computed data
  const patientData = useMemo(() => {
    return patients.map(p => {
      const pConsultas      = consultas.filter(c => c.patient_id === p.id)
      const pPeriodConsultas = periodConsultas.filter(c => c.patient_id === p.id)
      const pLabs           = labResults.filter(r => r.patient_id === p.id)
      const alerts          = countLabAlerts(pLabs)
      const labAlerts       = computeLabAlerts(pLabs)

      const sorted      = [...pConsultas].sort((a, b) => b.data_hora.localeCompare(a.data_hora))
      const lastConsulta = sorted[0] ?? null

      // Collect all diagnoses from profile + consultas
      const diagSet = new Set<string>()
      if (p.diagnostico) diagSet.add(p.diagnostico)
      pConsultas.forEach(c => {
        parseDiagnosticos(c.diagnosticos ?? null).forEach(d => {
          if (d.nome) diagSet.add(d.nome)
        })
      })
      const diagText = Array.from(diagSet).join(', ')

      return {
        patient:          p,
        consultas:        pConsultas,
        periodConsultas:  pPeriodConsultas,
        lastConsulta,
        status:           lastConsulta?.status ?? null,
        numConsultas:     pPeriodConsultas.length,
        alerts,
        labAlerts,
        diagText,
      }
    })
  }, [patients, consultas, periodConsultas, labResults])

  // Apply all filters
  const filtered = useMemo(() => {
    return patientData.filter(pd => {
      if (filterSexo !== 'all' && pd.patient.sexo !== filterSexo) return false
      if (filterStatus !== 'all' && pd.status !== filterStatus) return false
      if (filterTipo !== 'all' && !pd.periodConsultas.some(c => c.tipo === filterTipo)) return false
      if (filterLocal !== 'all' && !pd.periodConsultas.some(c => c.local === filterLocal)) return false

      if (filterAlerts === 'critical' && pd.alerts.critical === 0) return false
      if (filterAlerts === 'warning'  && pd.alerts.warning  === 0) return false
      if (filterAlerts === 'none'     && (pd.alerts.critical > 0 || pd.alerts.warning > 0)) return false

      if (filterExame !== 'all' && !pd.labAlerts.some(a => a.exam_name === filterExame)) return false

      if (filterDiag) {
        const q = filterDiag.toLowerCase()
        if (!pd.diagText.toLowerCase().includes(q) &&
            !pd.patient.full_name?.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [patientData, filterSexo, filterStatus, filterTipo, filterLocal, filterAlerts, filterExame, filterDiag])

  // Sort filtered list
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'name':         cmp = (a.patient.full_name ?? '').localeCompare(b.patient.full_name ?? ''); break
        case 'sexo':         cmp = (a.patient.sexo ?? '').localeCompare(b.patient.sexo ?? ''); break
        case 'lastConsulta': cmp = (a.lastConsulta?.data_hora ?? '').localeCompare(b.lastConsulta?.data_hora ?? ''); break
        case 'numConsultas': cmp = a.numConsultas - b.numConsultas; break
        case 'diagnosis':    cmp = a.diagText.localeCompare(b.diagText); break
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  function clearFilters() {
    setFilterSexo('all'); setFilterStatus('all'); setFilterTipo('all')
    setFilterLocal('all'); setFilterAlerts('all'); setFilterExame('all')
    setFilterPeriod(12); setFilterDiag('')
  }

  const hasActiveFilters = filterSexo !== 'all' || filterStatus !== 'all' || filterTipo !== 'all' ||
    filterLocal !== 'all' || filterAlerts !== 'all' || filterExame !== 'all' || !!filterDiag

  // ── Summary stats ──────────────────────────────────────────
  const totalConsultas = periodConsultas.length
  const avgConsultas   = patients.length > 0
    ? (totalConsultas / patients.length).toFixed(1) : '0'
  const periodLabel    = PERIOD_OPTIONS.find(p => p.months === filterPeriod)?.label ?? ''

  // ── Tipo distribution — all non-cancelled in period ────────
  const tipoDistrib = useMemo(() => {
    const tipos = Object.keys(TIPO_LABEL) as ConsultaTipo[]
    return tipos.map(t => ({
      tipo:  t,
      count: periodConsultas.filter(c => c.tipo === t).length,
      total: periodConsultas.length,
    })).filter(x => x.count > 0).sort((a, b) => b.count - a.count)
  }, [periodConsultas])

  // ── Top diagnoses (filtered patients) ─────────────────────
  const topDiagnoses = useMemo(() => {
    const counts: Record<string, number> = {}
    filtered.forEach(pd => {
      const diagSet = new Set<string>()
      if (pd.patient.diagnostico) diagSet.add(pd.patient.diagnostico)
      pd.consultas.forEach(c => {
        parseDiagnosticos(c.diagnosticos ?? null).forEach(d => { if (d.nome) diagSet.add(d.nome) })
      })
      diagSet.forEach(d => { counts[d] = (counts[d] ?? 0) + 1 })
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [filtered])

  // ── Top labs with abnormalities (all patients) ─────────────
  const topAbnormalLabs = useMemo(() => {
    const examCounts: Record<string, { warn: Set<string>; crit: Set<string> }> = {}
    patients.forEach(p => {
      computeLabAlerts(labResults.filter(r => r.patient_id === p.id)).forEach(a => {
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
    <div className="space-y-5">

      {/* ── Summary cards ─────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Pacientes cadastrados"
          value={patients.length}
          sub={`${filtered.length} no filtro atual`}
        />
        <StatCard
          icon={<Stethoscope className="w-5 h-5" />}
          label={`Consultas agendadas/realizadas (${periodLabel})`}
          value={totalConsultas}
          sub={`Média: ${avgConsultas} por paciente`}
        />
        <StatCard
          icon={<BarChart2 className="w-5 h-5" />}
          label="Pacientes com resultado no filtro"
          value={filtered.length}
          sub={`de ${patients.length} totais`}
        />
      </div>

      {/* ── Filter bar ────────────────────────────────────── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filtros</p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3 h-3" /> Limpar filtros
            </button>
          )}
        </div>

        {/* Row 1 */}
        <div className="flex flex-wrap gap-3">
          <FilterSelect label="Sexo" value={filterSexo} onChange={v => setFilterSexo(v as 'all' | 'M' | 'F')}>
            <option value="all">Todos</option>
            <option value="F">Feminino</option>
            <option value="M">Masculino</option>
          </FilterSelect>

          <FilterSelect label="Tipo de consulta" value={filterTipo} onChange={v => setFilterTipo(v as ConsultaTipo | 'all')}>
            <option value="all">Todos</option>
            {(Object.keys(TIPO_LABEL) as ConsultaTipo[]).map(t => (
              <option key={t} value={t}>{TIPO_LABEL[t]}</option>
            ))}
          </FilterSelect>

          <FilterSelect label="Local" value={filterLocal} onChange={v => setFilterLocal(v as ConsultaLocal | 'all')}>
            <option value="all">Todos</option>
            <option value="consultorio">Consultório</option>
            <option value="telemedicina">Telemedicina</option>
          </FilterSelect>

          <FilterSelect label="Status última consulta" value={filterStatus} onChange={v => setFilterStatus(v as ConsultaStatus | 'all')}>
            <option value="all">Todos</option>
            {(Object.keys(STATUS_LABEL) as ConsultaStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </FilterSelect>

          <FilterSelect label="Alertas laboratoriais" value={filterAlerts} onChange={v => setFilterAlerts(v as AlertFilter)}>
            <option value="all">Todos</option>
            <option value="critical">Com resultado crítico</option>
            <option value="warning">Com resultado alterado</option>
            <option value="none">Sem alterações</option>
          </FilterSelect>

          {examNamesWithAlerts.length > 0 && (
            <FilterSelect label="Exame específico alterado" value={filterExame} onChange={setFilterExame}>
              <option value="all">Qualquer exame</option>
              {examNamesWithAlerts.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </FilterSelect>
          )}
        </div>

        {/* Row 2: período + busca */}
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Período das consultas</label>
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

          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">Buscar por diagnóstico ou nome</label>
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
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700">Pacientes ({sorted.length})</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {([
                  { key: 'name',         label: 'Paciente'        },
                  { key: 'sexo',         label: 'Sexo'            },
                  { key: 'diagnosis',    label: 'Diagnóstico'     },
                  { key: 'lastConsulta', label: 'Última consulta' },
                  { key: 'numConsultas', label: 'Consultas'       },
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
                    <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">
                      {pd.patient.full_name || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">
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
            <span className="ml-1.5 text-xs text-gray-400 font-normal">({periodLabel}, excl. canceladas)</span>
          </p>
          {tipoDistrib.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Sem consultas no período</p>
          ) : tipoDistrib.map(({ tipo, count, total }) => (
            <div key={tipo}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 truncate">{TIPO_LABEL[tipo]}</span>
                <span className="text-xs font-semibold text-gray-700 ml-2 flex-shrink-0">
                  {count} <span className="font-normal text-gray-400">({total ? Math.round(count / total * 100) : 0}%)</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full"
                  style={{ width: `${total ? (count / total * 100) : 0}%`, backgroundColor: '#1a3a5c' }} />
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
                <div className="h-full rounded-full"
                  style={{ width: `${(count / maxDiag) * 100}%`, backgroundColor: '#0f766e' }} />
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
                  {crit > 0 && <span className="text-xs font-semibold text-red-600">{crit} crit</span>}
                  {warn > 0 && <span className="text-xs font-semibold text-amber-600">{warn} alt</span>}
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full"
                  style={{ width: `${(total / maxLab) * 100}%`, backgroundColor: '#dc2626' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
