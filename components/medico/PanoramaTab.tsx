'use client'

import { useState, useTransition } from 'react'
import { resetPatientPassword, updatePatientStatus } from '@/app/actions/profile'
import type { Profile, StatusPaciente, Consulta } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Check, X, Pencil, AlertCircle, KeyRound, Copy, CalendarDays, TrendingUp, UserCheck, AlertTriangle, MessageCircle } from 'lucide-react'
import PatientEditModal from './PatientEditModal'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LabelList, PieChart, Pie, Cell, Legend,
} from 'recharts'

// ── Cores ────────────────────────────────────────────────────
const PRIMARY    = '#1A1F2E'
// Cores bem distintas para o donut
const COLORS_PIE = ['#1e3a8a', '#0891b2', '#7c3aed', '#be185d', '#059669']

// Label customizado fora do donut
const RADIAN = Math.PI / 180
function PieLabel({ cx, cy, midAngle, outerRadius, value, percent }: any) {
  if (!value || percent < 0.04) return null
  const r  = outerRadius + 22
  const x  = cx + r * Math.cos(-midAngle * RADIAN)
  const y  = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="#374151" textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central" fontSize={12} fontWeight={700}>
      {value}
    </text>
  )
}

// ── Status config ─────────────────────────────────────────────
const STATUS_CONFIG: Record<StatusPaciente, { label: string; className: string }> = {
  ativo:   { label: 'Ativo',   className: 'bg-green-100 text-green-700' },
  inativo: { label: 'Inativo', className: 'bg-gray-100 text-gray-600' },
  obito:   { label: 'Óbito',   className: 'bg-red-100 text-red-700' },
}

// ── Helpers ───────────────────────────────────────────────────
function calcIdade(dataNasc: string | null): string {
  if (!dataNasc) return '—'
  const diff = Date.now() - new Date(dataNasc).getTime()
  return `${Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))} anos`
}

function normalizarComoConheceu(raw: string | null): string {
  if (!raw) return 'Não informado'
  const s = raw.trim()
  if (s.toLowerCase().startsWith('indicaç')) return 'Indicação'
  if (s.toLowerCase() === 'google') return 'Google'
  if (s.toLowerCase() === 'instagram') return 'Instagram'
  if (s.toLowerCase().startsWith('outro')) return 'Outro'
  return 'Outro'
}

// Retorna os últimos N meses no formato { key: 'YYYY-MM', label: 'Mai/25' }
function ultimosMeses(n: number) {
  const result = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      .replace('.', '').replace(' ', '/')
    result.push({ key, label })
  }
  return result
}

// ── Tooltip customizado para o BarChart ───────────────────────
function CustomBarTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-primary">{payload[0].value} consulta{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ── Tooltip customizado para o PieChart ───────────────────────
function CustomPieTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700">{payload[0].name}</p>
      <p className="text-gray-500">{payload[0].value} paciente{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  )
}

// ── Linha da tabela ───────────────────────────────────────────
interface RowProps {
  patient: Profile
  ultimaConsulta: string | null
  proximaConsulta: string | null
}

function PanoramaRow({ patient, ultimaConsulta, proximaConsulta }: RowProps) {
  const [modalOpen, setModalOpen]     = useState(false)
  const [isPending, startTransition]  = useTransition()
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [copiedPwd, setCopiedPwd]     = useState(false)

  const statusCfg = STATUS_CONFIG[patient.status_paciente ?? 'ativo']

  function handleResetPassword() {
    if (!confirm(`Gerar nova senha para ${patient.full_name}?`)) return
    startTransition(async () => {
      const res = await resetPatientPassword(patient.id)
      if (res.success && res.data) setNewPassword(res.data.password)
    })
  }

  function handleCopyPassword() {
    if (!newPassword || !patient.email) return
    const texto = `Portal Dr. Guilherme\n\nOlá! Sua senha foi redefinida.\n\nE-mail: ${patient.email}\nNova senha: ${newPassword}\n\nAcesse: https://portal-dr-guilherme.vercel.app`
    navigator.clipboard.writeText(texto)
    setCopiedPwd(true)
    setTimeout(() => setCopiedPwd(false), 2000)
  }

  return (
    <>
      {modalOpen && (
        <PatientEditModal patient={patient} onClose={() => setModalOpen(false)} />
      )}

      <tr className={`transition-colors ${patient.status_paciente === 'obito' ? 'opacity-50' : ''}`} style={{ borderBottom: '1px solid rgba(26,31,46,0.05)' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(126,184,212,0.05)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>

        {/* Ações */}
        <td className="px-3 py-3">
          <div className="flex flex-col gap-1 items-center">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar cadastro completo"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={isPending}
              className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
              title="Gerar nova senha"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          </div>
        </td>

        {/* Nome */}
        <td className="px-4 py-3">
          <button type="button" onClick={() => setModalOpen(true)} className="text-left group">
            <p className="font-semibold text-gray-900 text-sm group-hover:text-primary transition-colors">
              {patient.full_name ?? '—'}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              {patient.sexo ?? '—'} · {calcIdade(patient.data_nascimento)}
            </p>
            {patient.phone && (
              <p className="text-xs text-gray-400 mt-0.5 font-mono">{patient.phone}</p>
            )}
            {!patient.perfil_completo && (
              <span className="text-[11px] text-amber-500 inline-flex items-center gap-0.5 mt-0.5">
                <AlertCircle className="w-3 h-3" /> incompleto
              </span>
            )}
          </button>
        </td>

        {/* Como conheceu */}
        <td className="px-4 py-3 text-xs text-gray-600">
          {patient.como_conheceu
            ? <span className="line-clamp-2">{patient.como_conheceu}</span>
            : <span className="text-gray-300">—</span>
          }
        </td>

        {/* Clínica */}
        <td className="px-4 py-3 text-xs text-gray-700">
          {patient.clinica || 'MedRenal'}
        </td>

        {/* Diagnóstico */}
        <td className="px-4 py-3 text-xs text-gray-700">
          {patient.diagnostico || <span className="text-gray-300">—</span>}
        </td>

        {/* Última consulta */}
        <td className="px-4 py-3 text-xs text-gray-500">
          {ultimaConsulta ? formatDate(ultimaConsulta) : '—'}
        </td>

        {/* Próxima consulta */}
        <td className="px-4 py-3 text-xs">
          {proximaConsulta ? (
            <span className="text-primary font-medium">{formatDate(proximaConsulta)}</span>
          ) : (
            <span className="text-amber-500 font-medium">Sem retorno</span>
          )}
        </td>

        {/* Status */}
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}>
            {statusCfg.label}
          </span>
        </td>

        {/* Observações */}
        <td className="px-4 py-3 text-xs text-gray-500">
          <span className="line-clamp-2">{patient.obs_secretaria || <span className="text-gray-300">—</span>}</span>
        </td>
      </tr>

      {newPassword && (
        <tr>
          <td colSpan={9} className="px-4 pb-3">
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <KeyRound className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-700 font-medium">Nova senha para {patient.full_name?.split(' ')[0]}</p>
                <p className="text-sm font-bold text-amber-900 tracking-widest mt-0.5">{newPassword}</p>
              </div>
              <button
                type="button"
                onClick={handleCopyPassword}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors flex-shrink-0"
              >
                {copiedPwd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedPwd ? 'Copiado!' : 'Copiar'}
              </button>
              <button type="button" onClick={() => setNewPassword(null)} className="p-1 text-amber-400 hover:text-amber-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Painel: sem retorno com CTAs ─────────────────────────────
interface SemRetornoPanelProps {
  lista: Profile[]
  total: number
  getUltima: (id: string) => string | null
}

function SemRetornoRow({ patient, ultima }: { patient: Profile; ultima: string | null }) {
  const [isPending, startTransition] = useTransition()
  const [localStatus, setLocalStatus] = useState<StatusPaciente>(patient.status_paciente ?? 'ativo')
  const [statusSaved, setStatusSaved] = useState(false)

  const firstName  = patient.full_name?.split(' ')[0] ?? 'paciente'
  const phone      = patient.phone?.replace(/\D/g, '')
  const waMessage  = encodeURIComponent(
    `Olá, ${firstName}! Aqui é a equipe do consultório do Dr. Guilherme. Percebemos que você está sem consulta de retorno agendada e gostaríamos de marcar um horário para continuarmos seu acompanhamento. Quando seria melhor para você? 😊`
  )
  const waUrl = phone ? `https://wa.me/55${phone}?text=${waMessage}` : null

  function handleStatusChange(s: StatusPaciente) {
    setLocalStatus(s)
    startTransition(async () => {
      const res = await updatePatientStatus(patient.id, s)
      if (res.success) { setStatusSaved(true); setTimeout(() => setStatusSaved(false), 2000) }
    })
  }

  return (
    <div className="rounded-lg bg-amber-50/60 border border-amber-100 px-3 py-2.5 space-y-2">
      {/* Nome + última consulta */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate">{patient.full_name ?? '—'}</p>
          <p className="text-[11px] text-gray-400">
            {ultima ? `Última consulta: ${formatDate(ultima)}` : 'Sem consultas registradas'}
          </p>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium flex-shrink-0 mt-0.5">
          Sem retorno
        </span>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* WhatsApp */}
        {waUrl ? (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[11px] font-semibold transition-colors"
          >
            <MessageCircle className="w-3 h-3" />
            WhatsApp
          </a>
        ) : (
          <span className="text-[11px] text-gray-300 italic">sem telefone</span>
        )}

        {/* Status inline */}
        <div className="flex items-center gap-1.5 ml-auto">
          {statusSaved && <Check className="w-3 h-3 text-green-500" />}
          <select
            value={localStatus}
            disabled={isPending}
            onChange={e => handleStatusChange(e.target.value as StatusPaciente)}
            className="text-[11px] border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="obito">Óbito</option>
          </select>
        </div>
      </div>
    </div>
  )
}

function SemRetornoPanel({ lista, total, getUltima }: SemRetornoPanelProps) {
  return (
    <div className="rounded-xl border border-white/60 backdrop-blur-sm p-5" style={{ backgroundColor: 'rgba(255,255,255,0.75)' }}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-800">Ativos sem retorno agendado</h3>
        <span className="text-xs text-gray-400 ml-auto">{total} total</span>
      </div>
      {lista.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Todos os pacientes têm retorno agendado 🎉</p>
      ) : (
        <div className="space-y-2">
          {lista.map(p => (
            <SemRetornoRow key={p.id} patient={p} ultima={getUltima(p.id)} />
          ))}
          {total > 6 && (
            <p className="text-xs text-gray-400 text-center pt-1">
              + {total - 6} outros pacientes
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
interface PanoramaTabProps {
  patients: Profile[]
  consultas: Consulta[]
}

export default function PanoramaTab({ patients, consultas }: PanoramaTabProps) {
  const [filterStatus, setFilterStatus] = useState<StatusPaciente | 'todos'>('todos')
  const [search, setSearch] = useState('')

  const now      = new Date()
  const nowISO   = now.toISOString()
  const em7Dias  = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const mesAtual = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  // ── Helpers por paciente ──────────────────────────────────
  function getUltima(patientId: string) {
    return consultas
      .filter(c => c.patient_id === patientId && c.data_hora < nowISO && c.status === 'realizada')
      .sort((a, b) => b.data_hora.localeCompare(a.data_hora))[0]?.data_hora ?? null
  }

  function getProxima(patientId: string) {
    return consultas
      .filter(c => c.patient_id === patientId && c.data_hora >= nowISO && ['agendada', 'confirmada'].includes(c.status))
      .sort((a, b) => a.data_hora.localeCompare(b.data_hora))[0]?.data_hora ?? null
  }

  // ── Totais / cards ────────────────────────────────────────
  const totais = {
    ativo:      patients.filter(p => p.status_paciente === 'ativo').length,
    inativo:    patients.filter(p => p.status_paciente === 'inativo').length,
    obito:      patients.filter(p => p.status_paciente === 'obito').length,
    semRetorno: patients.filter(p => p.status_paciente === 'ativo' && !getProxima(p.id)).length,
    consultasMes: consultas.filter(c =>
      c.data_hora.startsWith(mesAtual) && c.status === 'realizada'
    ).length,
    novosMes: patients.filter(p =>
      p.created_at?.startsWith(mesAtual)
    ).length,
  }

  // ── Gráfico: consultas por mês (últimos 6) ─────────────────
  const meses = ultimosMeses(6)
  const dadosConsultasMes = meses.map(({ key, label }) => ({
    label,
    total: consultas.filter(c =>
      c.data_hora.startsWith(key) && c.status === 'realizada'
    ).length,
  }))

  // ── Gráfico: como conheceu (pizza) ─────────────────────────
  const comoMap: Record<string, number> = {}
  patients.forEach(p => {
    const cat = normalizarComoConheceu(p.como_conheceu)
    comoMap[cat] = (comoMap[cat] ?? 0) + 1
  })
  const dadosComo = Object.entries(comoMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  // ── Lista: próximas consultas (7 dias) ─────────────────────
  const proximasConsultas = consultas
    .filter(c => c.data_hora >= nowISO && c.data_hora <= em7Dias && ['agendada', 'confirmada'].includes(c.status))
    .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
    .slice(0, 8)
    .map(c => ({
      ...c,
      patient: patients.find(p => p.id === c.patient_id),
    }))

  // ── Lista: ativos sem retorno ──────────────────────────────
  const semRetornoLista = patients
    .filter(p => p.status_paciente === 'ativo' && !getProxima(p.id))
    .sort((a, b) => {
      const ua = getUltima(a.id) ?? ''
      const ub = getUltima(b.id) ?? ''
      return ua.localeCompare(ub) // mais antigos primeiro
    })
    .slice(0, 6)

  // ── Tabela filtrada ────────────────────────────────────────
  const filtered = patients.filter(p => {
    const matchSearch = !search || p.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'todos' || p.status_paciente === filterStatus
    return matchSearch && matchStatus
  })

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── 1. Cards resumo ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Ativos',          value: totais.ativo,        valueColor: 'text-primary',       bg: 'rgba(255,255,255,0.75)', accent: '#1A1F2E' },
          { label: 'Inativos',        value: totais.inativo,      valueColor: 'text-gray-400',      bg: 'rgba(255,255,255,0.60)', accent: '#D1D5DB' },
          { label: 'Óbitos',          value: totais.obito,        valueColor: 'text-red-500',       bg: 'rgba(254,242,242,0.65)', accent: '#EF4444' },
          { label: 'Sem retorno',     value: totais.semRetorno,   valueColor: 'text-amber-500',     bg: 'rgba(255,251,235,0.65)', accent: '#F59E0B' },
          { label: 'Consultas / mês', value: totais.consultasMes, valueColor: 'text-primary',       bg: 'rgba(126,184,212,0.1)',  accent: '#7EB8D4' },
          { label: 'Novos / mês',     value: totais.novosMes,     valueColor: 'text-primary',       bg: 'rgba(126,184,212,0.1)',  accent: '#7EB8D4' },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-xl border border-white/60 backdrop-blur-sm overflow-hidden"
            style={{ backgroundColor: card.bg }}
          >
            <div className="h-0.5 w-full" style={{ backgroundColor: card.accent, opacity: 0.4 }} />
            <div className="p-4">
              <p className={`text-4xl font-bold tracking-tight ${card.valueColor}`}>{card.value}</p>
              <p className="text-sm font-semibold text-gray-700 mt-2 leading-none">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── 2. Gráficos ── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Consultas por mês */}
        <div className="rounded-xl border border-white/60 backdrop-blur-sm p-5 flex flex-col" style={{ minHeight: 300, backgroundColor: 'rgba(255,255,255,0.75)' }}>
          <div className="flex items-center gap-2 mb-3 flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-800">Consultas realizadas</h3>
            <span className="text-xs text-gray-400 ml-auto">últimos 6 meses</span>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosConsultasMes} barSize={42} margin={{ top: 20, right: 8, left: -28, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f1f5f9' }} />
                <Bar dataKey="total" fill={PRIMARY} radius={[6, 6, 0, 0]}>
                  <LabelList dataKey="total" position="top" style={{ fontSize: 11, fontWeight: 700, fill: PRIMARY }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Como conheceu */}
        <div className="rounded-xl border border-white/60 backdrop-blur-sm p-5" style={{ backgroundColor: 'rgba(255,255,255,0.75)' }}>
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-800">Como conheceram o consultório</h3>
          </div>
          {dadosComo.length === 0 || (dadosComo.length === 1 && dadosComo[0].name === 'Não informado') ? (
            <div className="h-[180px] flex items-center justify-center text-sm text-gray-400">
              Nenhum dado disponível ainda
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={225}>
              <PieChart margin={{ top: 28, right: 28, bottom: 28, left: 28 }}>
                <Pie
                  data={dadosComo}
                  cx="40%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={false}
                  label={<PieLabel />}
                >
                  {dadosComo.map((_, i) => (
                    <Cell key={i} fill={COLORS_PIE[i % COLORS_PIE.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ fontSize: 11, color: '#6b7280' }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── 3. Próximas consultas + Sem retorno ── */}
      <div className="grid lg:grid-cols-2 gap-4">

        {/* Próximas consultas — 7 dias */}
        <div className="rounded-xl border border-white/60 backdrop-blur-sm p-5" style={{ backgroundColor: 'rgba(255,255,255,0.75)' }}>
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold text-gray-800">Próximas consultas</h3>
            <span className="text-xs text-gray-400 ml-auto">próximos 7 dias</span>
          </div>
          {proximasConsultas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Nenhuma consulta nos próximos 7 dias</p>
          ) : (
            <div className="space-y-2">
              {proximasConsultas.map(c => {
                const d = new Date(c.data_hora)
                const dataStr = d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
                const hora    = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                return (
                  <div key={c.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
                    <div className="text-center min-w-[54px]">
                      <p className="text-xs font-bold text-primary leading-tight">{hora}</p>
                      <p className="text-[11px] text-gray-400 capitalize">{dataStr}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {c.patient?.full_name ?? '—'}
                      </p>
                      <p className="text-[11px] text-gray-400 capitalize">{c.tipo.replace('_', ' ')}</p>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      c.status === 'confirmada' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-600'
                    }`}>
                      {c.status === 'confirmada' ? 'Confirmada' : 'Agendada'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pacientes ativos sem retorno */}
        <SemRetornoPanel
          lista={semRetornoLista}
          total={totais.semRetorno}
          getUltima={getUltima}
        />
      </div>

      {/* ── 4. Filtros + Tabela ── */}
      <div className="space-y-3">
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {(['todos', 'ativo', 'inativo', 'obito'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s === 'todos' ? 'Todos' : s === 'ativo' ? 'Ativos' : s === 'inativo' ? 'Inativos' : 'Óbitos'}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-white/60 backdrop-blur-sm overflow-x-auto" style={{ backgroundColor: 'rgba(255,255,255,0.75)' }}>
          <table className="w-full text-sm" style={{ minWidth: 1100 }}>
            <colgroup>
              <col style={{ width:  60 }} />
              <col style={{ width: 170 }} />
              <col style={{ width: 140 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 150 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 110 }} />
              <col style={{ width: 100 }} />
              <col style={{ width: 150 }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(26,31,46,0.08)', backgroundColor: 'rgba(26,31,46,0.03)' }}>
                {['', 'Paciente', 'Como conheceu', 'Clínica', 'Diagnóstico', 'Última consulta', 'Próxima consulta', 'Status', 'Observações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-400 text-sm">
                    Nenhum paciente encontrado.
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <PanoramaRow
                    key={p.id}
                    patient={p}
                    ultimaConsulta={getUltima(p.id)}
                    proximaConsulta={getProxima(p.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
