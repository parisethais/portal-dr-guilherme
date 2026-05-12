'use client'

import { useState, useMemo } from 'react'
import type { Profile, Consulta, ConsultaTipo, ConsultaStatus, LabResult } from '@/lib/types'
import { TIPO_LABEL } from './ConsultaModal'
import { computeLabAlerts, countLabAlerts } from '@/lib/lab-alerts'
import { parseDiagnosticos } from './prontuario/DiagnosticosPanel'
import {
  Users, Stethoscope, BarChart2, AlertTriangle, Clock, Activity,
  FlaskConical, Search, X, ChevronUp, ChevronDown, ChevronsUpDown,
  Heart, CalendarX, UserMinus, Microscope,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────────
interface RelatoriosTabProps {
  patients:       Profile[]
  consultas:      Consulta[]
  labResults:     LabResult[]
  imagingResults: unknown[]
}

type RelTab  = 'gestao' | 'pesquisa'
type SortDir = 'asc' | 'desc'

const PERIOD_OPTIONS = [
  { label: '3 meses',  months: 3  },
  { label: '6 meses',  months: 6  },
  { label: '12 meses', months: 12 },
  { label: 'Todos',    months: 0  },
]

const AGE_GROUPS = [
  { label: '< 30 anos',  min: 0,  max: 29  },
  { label: '30–44 anos', min: 30, max: 44  },
  { label: '45–59 anos', min: 45, max: 59  },
  { label: '60–74 anos', min: 60, max: 74  },
  { label: '≥ 75 anos',  min: 75, max: 999 },
]

// ── Helpers ────────────────────────────────────────────────────────────────────
function periodCutoff(months: number): string | null {
  if (!months) return null
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

function calcAge(dataNasc: string | null): number | null {
  if (!dataNasc) return null
  const today = new Date()
  const birth = new Date(dataNasc + 'T12:00:00')
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age >= 0 ? age : null
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function parseNum(v: string): number | null {
  const m = v.replace(',', '.').match(/[\d.]+/)
  if (!m) return null
  const n = parseFloat(m[0])
  return isNaN(n) ? null : n
}

// ── Shared sub-components ──────────────────────────────────────────────────────
function TabButton({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-5 py-2 text-sm font-semibold rounded-lg transition-colors ${
        active
          ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
          : 'text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  )
}

function StatCard({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; accent?: string
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: accent ? `${accent}1a` : 'rgba(26,58,92,0.08)' }}>
        <span style={{ color: accent ?? '#1a3a5c' }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium leading-tight">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function PeriodBar({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {PERIOD_OPTIONS.map(p => (
        <button
          key={p.months}
          type="button"
          onClick={() => onChange(p.months)}
          className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
            value === p.months
              ? 'bg-primary text-white border-primary'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

function SectionCard({ title, icon, count, children }: {
  title: string; icon: React.ReactNode; count?: number; children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
        <span className="text-gray-400">{icon}</span>
        <p className="text-sm font-semibold text-gray-700 flex-1">{title}</p>
        {count !== undefined && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{count}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function EmptyRow({ cols, msg }: { cols: number; msg: string }) {
  return (
    <tr>
      <td colSpan={cols} className="text-center py-8 text-gray-400 text-sm">{msg}</td>
    </tr>
  )
}

type ThKey = string
function SortTh({ col, label, sortKey, sortDir, onToggle }: {
  col: ThKey; label: string; sortKey: ThKey; sortDir: SortDir; onToggle: (k: ThKey) => void
}) {
  return (
    <th
      onClick={() => onToggle(col)}
      className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer hover:text-gray-700 select-none"
    >
      <div className="flex items-center gap-1">
        {label}
        {col === sortKey
          ? sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-primary" /> : <ChevronDown className="w-3 h-3 text-primary" />
          : <ChevronsUpDown className="w-3 h-3 text-gray-300" />}
      </div>
    </th>
  )
}

function MiniBarChart({ items, maxVal, color = '#1a3a5c' }: {
  items: { label: string; value: number; extra?: string }[]
  maxVal: number
  color?: string
}) {
  if (items.length === 0) return <p className="text-xs text-gray-400 text-center py-6">Sem dados</p>
  return (
    <div className="space-y-2.5">
      {items.map(item => (
        <div key={item.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-600 truncate pr-2" title={item.label}>{item.label}</span>
            <span className="text-xs font-semibold text-gray-700 flex-shrink-0">
              {item.value}
              {item.extra && <span className="font-normal text-gray-400"> {item.extra}</span>}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${maxVal ? (item.value / maxVal * 100) : 0}%`, backgroundColor: color }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function RelatoriosTab({ patients, consultas, labResults }: RelatoriosTabProps) {
  const [activeTab, setActiveTab] = useState<RelTab>('gestao')

  // Gestão state
  const [gPeriod,      setGPeriod]      = useState(12)
  const [gFaltaMin,    setGFaltaMin]    = useState(20)
  const [gSortKey,     setGSortKey]     = useState('faltaRate')
  const [gSortDir,     setGSortDir]     = useState<SortDir>('desc')
  const [vSortKey,     setVSortKey]     = useState('daysOverdue')
  const [vSortDir,     setVSortDir]     = useState<SortDir>('desc')

  // Pesquisa state
  const [pPeriod,    setPPeriod]    = useState(0)
  const [pSexo,      setPSexo]      = useState<'all' | 'M' | 'F'>('all')
  const [pAgeGroup,  setPAgeGroup]  = useState('all')
  const [pDiag,      setPDiag]      = useState('')
  const [exam1Name,  setExam1Name]  = useState('')
  const [exam1Dir,   setExam1Dir]   = useState<'above' | 'below'>('above')
  const [exam1Val,   setExam1Val]   = useState('')
  const [exam2Name,  setExam2Name]  = useState('')
  const [exam2Dir,   setExam2Dir]   = useState<'above' | 'below'>('above')
  const [exam2Val,   setExam2Val]   = useState('')

  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // ── Per-patient computed data (used by both tabs) ──────────────────────────
  const patientData = useMemo(() => patients.map(p => {
    const pC    = consultas.filter(c => c.patient_id === p.id)
    const pLabs = labResults.filter(r => r.patient_id === p.id)
    const alerts    = countLabAlerts(pLabs)
    const labAlerts = computeLabAlerts(pLabs)

    // Falta stats (past non-cancelled)
    const pastC      = pC.filter(c => c.status !== 'cancelada' && c.data_hora <= today)
    const faltaCount = pastC.filter(c => c.status === 'falta').length
    const faltaRate  = pastC.length > 0 ? Math.round((faltaCount / pastC.length) * 100) : 0

    // Last realized consulta
    const lastRealizada = [...pC]
      .filter(c => c.status === 'realizada')
      .sort((a, b) => b.data_hora.localeCompare(a.data_hora))[0] ?? null

    const daysSinceRealizada = lastRealizada
      ? Math.floor((Date.now() - new Date(lastRealizada.data_hora).getTime()) / 86400000)
      : null

    const hasFutureConsulta = pC.some(
      c => c.data_hora > today && (c.status === 'agendada' || c.status === 'confirmada')
    )

    // Retorno vencido logic
    const retornoVencido =
      (p.retorno_previsto && p.retorno_previsto < today) ||
      (!hasFutureConsulta && daysSinceRealizada !== null && daysSinceRealizada > 90)

    const daysOverdue = p.retorno_previsto && p.retorno_previsto < today
      ? Math.floor((Date.now() - new Date(p.retorno_previsto).getTime()) / 86400000)
      : !hasFutureConsulta && daysSinceRealizada !== null
        ? Math.max(0, daysSinceRealizada - 90)
        : 0

    // Last PA reading
    const lastPaC = [...pC]
      .filter(c => c.status === 'realizada' && c.pas !== null)
      .sort((a, b) => b.data_hora.localeCompare(a.data_hora))[0] ?? null

    // Age
    const age      = calcAge(p.data_nascimento)
    const ageGroup = age !== null
      ? (AGE_GROUPS.find(g => age >= g.min && age <= g.max)?.label ?? '—')
      : '—'

    // Diagnoses
    const diagSet = new Set<string>()
    if (p.diagnostico) diagSet.add(p.diagnostico)
    pC.forEach(c => parseDiagnosticos(c.diagnosticos ?? null).forEach(d => { if (d.nome) diagSet.add(d.nome) }))
    const diagText = Array.from(diagSet).join(', ')

    // Latest numeric lab values map
    const byExam: Record<string, LabResult[]> = {}
    pLabs.forEach(r => { (byExam[r.exam_name] ??= []).push(r) })
    const latestLabMap: Record<string, number | null> = {}
    Object.entries(byExam).forEach(([name, results]) => {
      const sorted = [...results].sort((a, b) => b.collected_at.localeCompare(a.collected_at))
      latestLabMap[name] = parseNum(sorted[0].value)
    })

    return {
      patient: p, consultas: pC, pLabs, alerts, labAlerts,
      pastC, faltaCount, faltaRate,
      lastRealizada, daysSinceRealizada, hasFutureConsulta,
      retornoVencido, daysOverdue,
      lastPaC, age, ageGroup, diagText, latestLabMap,
    }
  }), [patients, consultas, labResults, today])

  // ── Gestão Clínica ──────────────────────────────────────────────────────────
  const gCutoff    = useMemo(() => periodCutoff(gPeriod), [gPeriod])
  const gConsultas = useMemo(() =>
    (gCutoff ? consultas.filter(c => c.data_hora >= gCutoff) : consultas)
      .filter(c => c.status !== 'cancelada'),
  [consultas, gCutoff])

  const gStats = useMemo(() => {
    const ativos       = patients.filter(p => p.status_paciente === 'ativo').length
    const d            = new Date()
    const monthStart   = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    const consultasMes = consultas.filter(c => c.data_hora >= monthStart && c.status === 'realizada').length
    const pastG        = gConsultas.filter(c => c.data_hora <= today)
    const taxaFalta    = pastG.length > 0
      ? Math.round((pastG.filter(c => c.status === 'falta').length / pastG.length) * 100)
      : 0
    const critCount    = patientData.filter(pd => pd.alerts.critical > 0).length
    return { ativos, consultasMes, taxaFalta, critCount }
  }, [patients, consultas, gConsultas, patientData, today])

  const ativos = useMemo(() => patientData.filter(pd => pd.patient.status_paciente === 'ativo'), [patientData])

  const baixaAdesao = useMemo(() =>
    ativos.filter(pd => pd.faltaRate >= gFaltaMin && pd.pastC.length >= 2),
  [ativos, gFaltaMin])

  function toggleGSort(k: string) {
    if (gSortKey === k) setGSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setGSortKey(k); setGSortDir('desc') }
  }
  function toggleVSort(k: string) {
    if (vSortKey === k) setVSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setVSortKey(k); setVSortDir('desc') }
  }

  const sortedBaixaAdesao = useMemo(() => {
    return [...baixaAdesao].sort((a, b) => {
      let cmp = 0
      if (gSortKey === 'name')       cmp = (a.patient.full_name ?? '').localeCompare(b.patient.full_name ?? '')
      else if (gSortKey === 'faltaRate')  cmp = a.faltaRate - b.faltaRate
      else if (gSortKey === 'faltaCount') cmp = a.faltaCount - b.faltaCount
      else if (gSortKey === 'pastC')  cmp = a.pastC.length - b.pastC.length
      return gSortDir === 'asc' ? cmp : -cmp
    })
  }, [baixaAdesao, gSortKey, gSortDir])

  const retornoVencidoList = useMemo(() =>
    ativos.filter(pd => pd.retornoVencido),
  [ativos])

  const sortedRetorno = useMemo(() => {
    return [...retornoVencidoList].sort((a, b) => {
      let cmp = 0
      if (vSortKey === 'name')        cmp = (a.patient.full_name ?? '').localeCompare(b.patient.full_name ?? '')
      else if (vSortKey === 'daysOverdue') cmp = a.daysOverdue - b.daysOverdue
      return vSortDir === 'asc' ? cmp : -cmp
    })
  }, [retornoVencidoList, vSortKey, vSortDir])

  const criticalList = useMemo(() =>
    patientData.filter(pd => pd.alerts.critical > 0)
      .sort((a, b) => b.alerts.critical - a.alerts.critical),
  [patientData])

  const paHighList = useMemo(() =>
    patientData
      .filter(pd => pd.lastPaC && ((pd.lastPaC.pas ?? 0) > 140 || (pd.lastPaC.pad ?? 0) > 90))
      .sort((a, b) => (b.lastPaC?.pas ?? 0) - (a.lastPaC?.pas ?? 0)),
  [patientData])

  const paAvg = useMemo(() => {
    const withPa = patientData.filter(pd => pd.lastPaC)
    if (withPa.length === 0) return null
    const avgPas = Math.round(withPa.reduce((s, pd) => s + (pd.lastPaC?.pas ?? 0), 0) / withPa.length)
    const avgPad = Math.round(withPa.reduce((s, pd) => s + (pd.lastPaC?.pad ?? 0), 0) / withPa.length)
    return { avgPas, avgPad, n: withPa.length }
  }, [patientData])

  // ── Pesquisa Científica ─────────────────────────────────────────────────────
  const pCutoff = useMemo(() => periodCutoff(pPeriod), [pPeriod])

  const pFiltered = useMemo(() => patientData.filter(pd => {
    if (pSexo !== 'all' && pd.patient.sexo !== pSexo) return false
    if (pAgeGroup !== 'all' && pd.ageGroup !== pAgeGroup) return false
    if (pDiag) {
      const q = pDiag.toLowerCase()
      if (!pd.diagText.toLowerCase().includes(q) && !pd.patient.full_name?.toLowerCase().includes(q)) return false
    }
    if (exam1Name && exam1Val !== '') {
      const thr = parseNum(exam1Val)
      if (thr !== null) {
        const pv = pd.latestLabMap[exam1Name]
        if (pv == null) return false
        if (exam1Dir === 'above' && pv <= thr) return false
        if (exam1Dir === 'below' && pv >= thr) return false
      }
    }
    if (exam2Name && exam2Val !== '') {
      const thr = parseNum(exam2Val)
      if (thr !== null) {
        const pv = pd.latestLabMap[exam2Name]
        if (pv == null) return false
        if (exam2Dir === 'above' && pv <= thr) return false
        if (exam2Dir === 'below' && pv >= thr) return false
      }
    }
    return true
  }), [patientData, pSexo, pAgeGroup, pDiag, exam1Name, exam1Dir, exam1Val, exam2Name, exam2Dir, exam2Val])

  const pConsultas = useMemo(() => {
    const ids = new Set(pFiltered.map(pd => pd.patient.id))
    return (pCutoff ? consultas.filter(c => c.data_hora >= pCutoff) : consultas)
      .filter(c => c.status !== 'cancelada' && ids.has(c.patient_id))
  }, [consultas, pCutoff, pFiltered])

  const avgAge = useMemo(() => {
    const ages = pFiltered.map(pd => pd.age).filter((a): a is number => a !== null)
    return ages.length > 0 ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : null
  }, [pFiltered])

  const avgConsultasPesquisa = useMemo(() => {
    if (pFiltered.length === 0) return '—'
    return (pFiltered.reduce((s, pd) => s + pd.consultas.length, 0) / pFiltered.length).toFixed(1)
  }, [pFiltered])

  const pctAlerts = useMemo(() => {
    if (pFiltered.length === 0) return '—'
    const n = pFiltered.filter(pd => pd.alerts.critical > 0 || pd.alerts.warning > 0).length
    return `${Math.round((n / pFiltered.length) * 100)}%`
  }, [pFiltered])

  const tipoDistrib = useMemo(() => {
    const tipos = Object.keys(TIPO_LABEL) as ConsultaTipo[]
    const items = tipos
      .map(t => ({ label: TIPO_LABEL[t], value: pConsultas.filter(c => c.tipo === t).length }))
      .filter(x => x.value > 0)
      .sort((a, b) => b.value - a.value)
    return { items, max: items[0]?.value ?? 1 }
  }, [pConsultas])

  const topDiagnoses = useMemo(() => {
    const counts: Record<string, number> = {}
    pFiltered.forEach(pd => {
      const s = new Set<string>()
      if (pd.patient.diagnostico) s.add(pd.patient.diagnostico)
      pd.consultas.forEach(c => parseDiagnosticos(c.diagnosticos ?? null).forEach(d => { if (d.nome) s.add(d.nome) }))
      s.forEach(d => { counts[d] = (counts[d] ?? 0) + 1 })
    })
    const items = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, value]) => ({ label, value }))
    return { items, max: items[0]?.value ?? 1 }
  }, [pFiltered])

  const topAbnormalLabs = useMemo(() => {
    const ec: Record<string, { warn: Set<string>; crit: Set<string> }> = {}
    pFiltered.forEach(pd => {
      pd.labAlerts.forEach(a => {
        if (!ec[a.exam_name]) ec[a.exam_name] = { warn: new Set(), crit: new Set() }
        if (a.severity === 'critical') ec[a.exam_name].crit.add(pd.patient.id)
        else ec[a.exam_name].warn.add(pd.patient.id)
      })
    })
    const items = Object.entries(ec)
      .map(([name, { warn, crit }]) => ({
        label: name,
        value: warn.size + crit.size,
        extra: crit.size > 0 ? `(${crit.size} crítico${crit.size > 1 ? 's' : ''})` : undefined,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)
    return { items, max: items[0]?.value ?? 1 }
  }, [pFiltered])

  const ageGroupBreakdown = useMemo(() =>
    AGE_GROUPS.map(g => {
      const inGroup = pFiltered.filter(pd => pd.age !== null && pd.age >= g.min && pd.age <= g.max)
      const f    = inGroup.filter(pd => pd.patient.sexo === 'F').length
      const m    = inGroup.filter(pd => pd.patient.sexo === 'M').length
      const avgC = inGroup.length > 0
        ? (inGroup.reduce((acc, pd) => acc + pd.consultas.length, 0) / inGroup.length).toFixed(1)
        : '—'
      return { label: g.label, total: inGroup.length, f, m, avgC }
    }),
  [pFiltered])

  const allExamNames = useMemo(() => {
    const s = new Set<string>()
    labResults.forEach(r => s.add(r.exam_name))
    return Array.from(s).sort()
  }, [labResults])

  const hasPFilters = pSexo !== 'all' || pAgeGroup !== 'all' || !!pDiag || !!exam1Name || !!exam2Name
  function clearPFilters() {
    setPSexo('all'); setPAgeGroup('all'); setPDiag('')
    setExam1Name(''); setExam1Val(''); setExam1Dir('above')
    setExam2Name(''); setExam2Val(''); setExam2Dir('above')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Tab switcher */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
        <TabButton active={activeTab === 'gestao'}   onClick={() => setActiveTab('gestao')}>
          Gestão Clínica
        </TabButton>
        <TabButton active={activeTab === 'pesquisa'} onClick={() => setActiveTab('pesquisa')}>
          Pesquisa Científica
        </TabButton>
      </div>

      {/* ════════════════════════════════════════════════════════
          GESTÃO CLÍNICA
      ════════════════════════════════════════════════════════ */}
      {activeTab === 'gestao' && (
        <div className="space-y-5">

          {/* Period + summary cards */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-xs text-gray-500 mb-1.5">Período de referência</p>
              <PeriodBar value={gPeriod} onChange={setGPeriod} />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={<Users className="w-5 h-5" />}      label="Pacientes ativos"           value={gStats.ativos} />
            <StatCard icon={<Stethoscope className="w-5 h-5" />} label="Realizadas este mês"        value={gStats.consultasMes} />
            <StatCard
              icon={<UserMinus className="w-5 h-5" />}
              label={`Taxa de falta (${PERIOD_OPTIONS.find(p => p.months === gPeriod)?.label})`}
              value={`${gStats.taxaFalta}%`}
              accent={gStats.taxaFalta >= 20 ? '#dc2626' : gStats.taxaFalta >= 10 ? '#d97706' : undefined}
            />
            <StatCard
              icon={<AlertTriangle className="w-5 h-5" />}
              label="Com alertas críticos lab"
              value={gStats.critCount}
              accent={gStats.critCount > 0 ? '#dc2626' : undefined}
              sub={`de ${patients.length} pacientes`}
            />
          </div>

          {/* ── Baixa Adesão ── */}
          <SectionCard
            title="Baixa adesão — pacientes com maior taxa de falta"
            icon={<CalendarX className="w-4 h-4" />}
            count={sortedBaixaAdesao.length}
          >
            <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-3">
              <label className="text-xs text-gray-500 flex-shrink-0">Exibir pacientes com falta ≥</label>
              <select
                value={gFaltaMin}
                onChange={e => setGFaltaMin(Number(e.target.value))}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none bg-white"
              >
                <option value={10}>10%</option>
                <option value={15}>15%</option>
                <option value={20}>20%</option>
                <option value={33}>33%</option>
                <option value={50}>50%</option>
              </select>
              <span className="text-xs text-gray-400">(mín. 2 consultas no histórico)</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <SortTh col="name"       label="Paciente"     sortKey={gSortKey} sortDir={gSortDir} onToggle={toggleGSort} />
                    <SortTh col="pastC"      label="Consultas"    sortKey={gSortKey} sortDir={gSortDir} onToggle={toggleGSort} />
                    <SortTh col="faltaCount" label="Faltas"       sortKey={gSortKey} sortDir={gSortDir} onToggle={toggleGSort} />
                    <SortTh col="faltaRate"  label="Taxa"         sortKey={gSortKey} sortDir={gSortDir} onToggle={toggleGSort} />
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Última consulta</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedBaixaAdesao.length === 0
                    ? <EmptyRow cols={5} msg="Nenhum paciente com essa taxa de falta no período." />
                    : sortedBaixaAdesao.map(pd => (
                      <tr key={pd.patient.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                        <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{pd.patient.full_name || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-600 text-center">{pd.pastC.length}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="font-semibold text-red-700">{pd.faltaCount}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            pd.faltaRate >= 50 ? 'bg-red-100 text-red-700' :
                            pd.faltaRate >= 25 ? 'bg-amber-100 text-amber-700' :
                            'bg-yellow-50 text-yellow-700'
                          }`}>
                            {pd.faltaRate}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                          {pd.lastRealizada ? fmtDate(pd.lastRealizada.data_hora) : '—'}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* ── Retorno Vencido ── */}
          <SectionCard
            title="Retorno vencido — sem consulta agendada"
            icon={<Clock className="w-4 h-4" />}
            count={sortedRetorno.length}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <SortTh col="name"        label="Paciente"         sortKey={vSortKey} sortDir={vSortDir} onToggle={toggleVSort} />
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Diagnóstico</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Última realizada</th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Retorno previsto</th>
                    <SortTh col="daysOverdue" label="Dias vencido"     sortKey={vSortKey} sortDir={vSortDir} onToggle={toggleVSort} />
                  </tr>
                </thead>
                <tbody>
                  {sortedRetorno.length === 0
                    ? <EmptyRow cols={5} msg="Nenhum paciente com retorno vencido." />
                    : sortedRetorno.map(pd => (
                      <tr key={pd.patient.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                        <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{pd.patient.full_name || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500 max-w-[200px]">
                          <span className="line-clamp-1 block text-xs" title={pd.diagText}>{pd.diagText || '—'}</span>
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                          {pd.lastRealizada ? fmtDate(pd.lastRealizada.data_hora) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap text-xs">
                          {pd.patient.retorno_previsto
                            ? fmtDate(pd.patient.retorno_previsto)
                            : <span className="text-gray-300">Não definido</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            pd.daysOverdue > 90 ? 'bg-red-100 text-red-700' :
                            pd.daysOverdue > 30 ? 'bg-amber-100 text-amber-700' :
                            'bg-yellow-50 text-yellow-700'
                          }`}>
                            {pd.daysOverdue} dias
                          </span>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </SectionCard>

          {/* ── Alertas Críticos Lab + PA (2-col) ── */}
          <div className="grid lg:grid-cols-2 gap-4">

            {/* Alertas críticos */}
            <SectionCard
              title="Alertas laboratoriais críticos"
              icon={<FlaskConical className="w-4 h-4" />}
              count={criticalList.length}
            >
              {criticalList.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Nenhum alerta crítico no momento.</p>
              ) : (
                <div className="divide-y divide-gray-50">
                  {criticalList.map(pd => (
                    <div key={pd.patient.id} className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{pd.patient.full_name || '—'}</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {pd.labAlerts
                          .filter(a => a.severity === 'critical')
                          .map(a => (
                            <span key={a.id} className="text-xs bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded-full">
                              {a.exam_name}: {a.latestValue}{a.latestUnit ? ` ${a.latestUnit}` : ''} ({a.direction === 'high' ? '↑' : '↓'})
                            </span>
                          ))}
                        {pd.labAlerts
                          .filter(a => a.severity === 'warning')
                          .map(a => (
                            <span key={a.id} className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                              {a.exam_name}: {a.latestValue}{a.latestUnit ? ` ${a.latestUnit}` : ''}
                            </span>
                          ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Controle pressórico */}
            <SectionCard
              title="Controle pressórico — PA elevada na última consulta"
              icon={<Heart className="w-4 h-4" />}
              count={paHighList.length}
            >
              {paAvg && (
                <div className="px-4 py-2.5 border-b border-gray-50 flex items-center gap-4">
                  <span className="text-xs text-gray-500">Média da coorte:</span>
                  <span className="text-sm font-bold text-gray-800">
                    {paAvg.avgPas}/{paAvg.avgPad} mmHg
                  </span>
                  <span className="text-xs text-gray-400">({paAvg.n} pacientes com PA registrada)</span>
                </div>
              )}
              {paHighList.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Nenhum paciente com PA elevada registrada.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paciente</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">PAS</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">PAD</th>
                        <th className="text-center px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">FC</th>
                        <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paHighList.map(pd => (
                        <tr key={pd.patient.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                          <td className="px-4 py-2 font-medium text-gray-900 whitespace-nowrap text-xs">{pd.patient.full_name || '—'}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-xs font-bold ${(pd.lastPaC?.pas ?? 0) > 160 ? 'text-red-700' : (pd.lastPaC?.pas ?? 0) > 140 ? 'text-amber-700' : 'text-gray-700'}`}>
                              {pd.lastPaC?.pas ?? '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-xs font-bold ${(pd.lastPaC?.pad ?? 0) > 100 ? 'text-red-700' : (pd.lastPaC?.pad ?? 0) > 90 ? 'text-amber-700' : 'text-gray-700'}`}>
                              {pd.lastPaC?.pad ?? '—'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center text-xs text-gray-500">{pd.lastPaC?.fc ?? '—'}</td>
                          <td className="px-3 py-2 text-xs text-gray-400 whitespace-nowrap">
                            {pd.lastPaC ? fmtDate(pd.lastPaC.data_hora) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </SectionCard>
          </div>

        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          PESQUISA CIENTÍFICA
      ════════════════════════════════════════════════════════ */}
      {activeTab === 'pesquisa' && (
        <div className="space-y-5">

          {/* Filters */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Filtros da coorte</p>
              {hasPFilters && (
                <button type="button" onClick={clearPFilters}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" /> Limpar
                </button>
              )}
            </div>

            {/* Row 1: demographic + period */}
            <div className="flex flex-wrap gap-3 items-end">
              <div>
                <p className="text-xs text-gray-500 mb-1.5">Período das consultas</p>
                <PeriodBar value={pPeriod} onChange={setPPeriod} />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Sexo</label>
                <select value={pSexo} onChange={e => setPSexo(e.target.value as 'all' | 'M' | 'F')}
                  className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                  <option value="all">Todos</option>
                  <option value="F">Feminino</option>
                  <option value="M">Masculino</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Faixa etária</label>
                <select value={pAgeGroup} onChange={e => setPAgeGroup(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
                  <option value="all">Todas</option>
                  {AGE_GROUPS.map(g => <option key={g.label} value={g.label}>{g.label}</option>)}
                </select>
              </div>
              <div className="flex-1 min-w-[220px]">
                <label className="block text-xs text-gray-500 mb-1">Buscar por diagnóstico ou nome</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Ex: DRC, lúpus, HAS..."
                    value={pDiag}
                    onChange={e => setPDiag(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Multi-exam filter */}
            {allExamNames.length > 0 && (
              <div className="border-t border-gray-100 pt-3 space-y-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
                  <Microscope className="w-3.5 h-3.5" />
                  Filtro laboratorial (valor mais recente)
                </p>
                <div className="flex flex-wrap gap-3 items-end">
                  {/* Exam 1 */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Exame 1</label>
                    <select value={exam1Name} onChange={e => setExam1Name(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white">
                      <option value="">— Selecionar —</option>
                      {allExamNames.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  {exam1Name && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Direção</label>
                        <select value={exam1Dir} onChange={e => setExam1Dir(e.target.value as 'above' | 'below')}
                          className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white">
                          <option value="above">acima de</option>
                          <option value="below">abaixo de</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Valor</label>
                        <input type="number" step="any" value={exam1Val} onChange={e => setExam1Val(e.target.value)}
                          placeholder="ex: 1.3"
                          className="w-24 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                      </div>
                    </>
                  )}
                  {/* Exam 2 */}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Exame 2 (opcional)</label>
                    <select value={exam2Name} onChange={e => setExam2Name(e.target.value)}
                      className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white">
                      <option value="">— Selecionar —</option>
                      {allExamNames.map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  {exam2Name && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Direção</label>
                        <select value={exam2Dir} onChange={e => setExam2Dir(e.target.value as 'above' | 'below')}
                          className="text-sm border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white">
                          <option value="above">acima de</option>
                          <option value="below">abaixo de</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Valor</label>
                        <input type="number" step="any" value={exam2Val} onChange={e => setExam2Val(e.target.value)}
                          placeholder="ex: 60"
                          className="w-24 px-2.5 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none" />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard icon={<Users className="w-5 h-5" />}     label="Pacientes no filtro"   value={pFiltered.length} sub={`de ${patients.length} totais`} />
            <StatCard icon={<Activity className="w-5 h-5" />}  label="Idade média"            value={avgAge !== null ? `${avgAge} anos` : '—'} />
            <StatCard icon={<Stethoscope className="w-5 h-5" />} label="Média de consultas"   value={avgConsultasPesquisa} />
            <StatCard icon={<FlaskConical className="w-5 h-5" />} label="Com alertas lab"     value={pctAlerts} accent="#d97706" />
          </div>

          {/* Charts row */}
          <div className="grid lg:grid-cols-3 gap-4">

            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">
                Consultas por tipo
                <span className="ml-1.5 text-xs text-gray-400 font-normal">
                  ({PERIOD_OPTIONS.find(p => p.months === pPeriod)?.label ?? 'Todos'}, excl. canceladas)
                </span>
              </p>
              <MiniBarChart items={tipoDistrib.items} maxVal={tipoDistrib.max} color="#1a3a5c" />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">
                Diagnósticos mais frequentes
                <span className="ml-1.5 text-xs text-gray-400 font-normal">(coorte filtrada)</span>
              </p>
              <MiniBarChart items={topDiagnoses.items} maxVal={topDiagnoses.max} color="#0f766e" />
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
              <p className="text-sm font-semibold text-gray-700">
                Exames com mais alterações
                <span className="ml-1.5 text-xs text-gray-400 font-normal">(coorte filtrada)</span>
              </p>
              <MiniBarChart items={topAbnormalLabs.items} maxVal={topAbnormalLabs.max} color="#dc2626" />
            </div>
          </div>

          {/* Demographic breakdown */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-700">Distribuição por faixa etária</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Faixa etária</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Feminino</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Masculino</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                    <th className="text-center px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Média consultas</th>
                  </tr>
                </thead>
                <tbody>
                  {ageGroupBreakdown.map(row => (
                    <tr key={row.label} className="border-b border-gray-50 hover:bg-gray-50/60">
                      <td className="px-4 py-2.5 font-medium text-gray-700">{row.label}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{row.f || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-2.5 text-center text-gray-600">{row.m || <span className="text-gray-300">—</span>}</td>
                      <td className="px-4 py-2.5 text-center font-semibold text-gray-900">{row.total || <span className="text-gray-300 font-normal">—</span>}</td>
                      <td className="px-4 py-2.5 text-center text-gray-500">{row.total > 0 ? row.avgC : <span className="text-gray-300">—</span>}</td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50">
                    <td className="px-4 py-2.5 font-semibold text-gray-700">Total</td>
                    <td className="px-4 py-2.5 text-center font-semibold text-gray-700">
                      {pFiltered.filter(pd => pd.patient.sexo === 'F').length}
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold text-gray-700">
                      {pFiltered.filter(pd => pd.patient.sexo === 'M').length}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-gray-900">{pFiltered.length}</td>
                    <td className="px-4 py-2.5 text-center font-semibold text-gray-700">{avgConsultasPesquisa}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Multi-exam filter results */}
          {exam1Name && (
            <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <Microscope className="w-4 h-4 text-gray-400" />
                <p className="text-sm font-semibold text-gray-700 flex-1">
                  Resultado do filtro laboratorial
                </p>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{pFiltered.length}</span>
              </div>
              {pFiltered.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-8">Nenhum paciente encontrado com esses critérios.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Paciente</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sexo / Idade</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{exam1Name}</th>
                        {exam2Name && (
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">{exam2Name}</th>
                        )}
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Diagnóstico</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pFiltered.map(pd => (
                        <tr key={pd.patient.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                          <td className="px-4 py-2.5 font-medium text-gray-900 whitespace-nowrap">{pd.patient.full_name || '—'}</td>
                          <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                            {pd.patient.sexo || '—'} · {pd.age !== null ? `${pd.age} a` : '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            {pd.latestLabMap[exam1Name] !== undefined && pd.latestLabMap[exam1Name] !== null
                              ? <span className="text-xs font-semibold text-gray-800">{pd.latestLabMap[exam1Name]}</span>
                              : <span className="text-xs text-gray-300">—</span>}
                          </td>
                          {exam2Name && (
                            <td className="px-4 py-2.5">
                              {pd.latestLabMap[exam2Name] !== undefined && pd.latestLabMap[exam2Name] !== null
                                ? <span className="text-xs font-semibold text-gray-800">{pd.latestLabMap[exam2Name]}</span>
                                : <span className="text-xs text-gray-300">—</span>}
                            </td>
                          )}
                          <td className="px-4 py-2.5 text-gray-500 max-w-[200px]">
                            <span className="line-clamp-1 block text-xs" title={pd.diagText}>{pd.diagText || '—'}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      )}

    </div>
  )
}
