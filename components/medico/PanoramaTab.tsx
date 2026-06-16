'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { resetPatientPassword, updatePatientStatus } from '@/app/actions/profile'
import type { Profile, StatusPaciente, Consulta } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Check, X, Pencil, AlertCircle, KeyRound, Copy, CalendarDays, TrendingUp, UserCheck, AlertTriangle, MessageCircle, Clock, Users, UserMinus, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react'
import PatientEditModal from './PatientEditModal'
import { updateRetornoPrevisto } from '@/app/actions/profile'
import { TIPO_LABEL } from './ConsultaModal'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LabelList, PieChart, Pie, Cell, Legend,
} from 'recharts'

// ── Paginação ─────────────────────────────────────────────────
const PAGE_SIZE = 15

// ── Busca sem acento ──────────────────────────────────────────
function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// ── Cores ────────────────────────────────────────────────────
const PRIMARY    = '#2D2B6B'
// Cores bem distintas para o donut
// Cores do gráfico "Como conheceram" — 5 categorias fixas
const COLORS_PIE: Record<string, string> = {
  'Indicação':      '#7c3aed',   // roxo
  'Hospital':       '#059669',   // verde
  'Internet':       '#f59e0b',   // âmbar
  'Outro':          '#ef4444',   // vermelho
  'Não informado':  '#1e3a8a',   // azul escuro
}
const COLORS_PIE_LIST = Object.values(COLORS_PIE)

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
  ativo:   { label: 'Ativo',    className: 'bg-green-100 text-green-700' },
  inativo: { label: 'Inativo',  className: 'bg-gray-100 text-gray-600' },
  dialise: { label: 'Diálise',  className: 'bg-blue-100 text-blue-700' },
  alta:    { label: 'Alta',     className: 'bg-purple-100 text-purple-700' },
  obito:   { label: 'Óbito',    className: 'bg-red-100 text-red-700' },
}

// ── Helpers ───────────────────────────────────────────────────
function calcIdade(dataNasc: string | null): string {
  if (!dataNasc) return '—'
  const diff = Date.now() - new Date(dataNasc).getTime()
  return `${Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))} anos`
}

function normalizarComoConheceu(raw: string | null): string {
  if (!raw) return 'Não informado'
  const s = raw.trim().toLowerCase()

  // Internet / redes sociais / plataformas digitais
  if (s === 'internet' || s.includes('instagram') || s.includes('google') ||
      s.includes('doctoralia') || s.includes('linkedin') || s.includes('facebook') ||
      s.includes('youtube') || s.includes('site') || s.includes('internet'))
    return 'Internet'

  // Hospital / clínica / instituição de saúde
  if (s === 'hospital' || s.includes('hospital') || s.includes('sírio') || s.includes('sirio') ||
      s.includes('santa casa') || s.includes('einstein') || s.includes('síria') ||
      s.includes('clínica') || s.includes('clinica') || s.includes('ubs') || s.includes('upa'))
    return 'Hospital'

  // Outro explícito
  if (s === 'outro') return 'Outro'

  // Não informado explícito
  if (s === 'não informado' || s === 'nao informado') return 'Não informado'

  // Tudo mais (nomes de médicos, pacientes, clínicas não mapeadas, texto livre) = Indicação
  return 'Indicação'
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
  patient:         Profile
  ultimaConsulta:  string | null
  proximaConsulta: string | null
  ultimoTipo:      string | null    // tipo da última consulta (label)
  alertRetorno:    'atrasado' | 'chegando' | null
  mobileCard?:     boolean
}

function PanoramaRow({ patient, ultimaConsulta, proximaConsulta, ultimoTipo, alertRetorno, mobileCard }: RowProps) {
  const [modalOpen, setModalOpen]     = useState(false)
  const [isPending, startTransition]  = useTransition()
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [copiedPwd, setCopiedPwd]     = useState(false)
  const [retornoPrevisto, setRetornoPrevisto] = useState(patient.retorno_previsto ?? '')
  const [savingRetorno, setSavingRetorno]     = useState(false)

  function handleResetPassword() {
    if (!confirm(`Gerar nova senha para ${patient.full_name}?`)) return
    startTransition(async () => {
      const res = await resetPatientPassword(patient.id)
      if (res.success && res.data) setNewPassword(res.data.password)
    })
  }

  function handleRetornoPrevisto(value: string) {
    setRetornoPrevisto(value)
    setSavingRetorno(true)
    startTransition(async () => {
      await updateRetornoPrevisto(patient.id, value || null)
      setSavingRetorno(false)
    })
  }

  function handleCopyPassword() {
    if (!newPassword || !patient.email) return
    const texto = `Portal Dr. Guilherme\n\nOlá! Sua senha foi redefinida.\n\nE-mail: ${patient.email}\nNova senha: ${newPassword}\n\nAcesse: https://portal-dr-guilherme.vercel.app`
    navigator.clipboard.writeText(texto)
    setCopiedPwd(true)
    setTimeout(() => setCopiedPwd(false), 2000)
  }

  // ── Render mobile card ───────────────────────────────────────
  if (mobileCard) {
    return (
      <>
        {modalOpen && <PatientEditModal patient={patient} onClose={() => setModalOpen(false)} />}
        <div
          className={`rounded-xl border border-white/60 bg-white/80 px-4 py-3 space-y-2 ${patient.status_paciente === 'obito' ? 'opacity-50' : ''}`}
          style={{ boxShadow: '0 1px 4px rgba(26,31,46,0.06)' }}
        >
          {/* Nome + ações */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 text-sm truncate">{patient.full_name ?? '—'}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {patient.sexo ?? '—'} · {calcIdade(patient.data_nascimento)}
                {patient.phone && <> · <span className="font-mono">{patient.phone}</span></>}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
            >
              <Pencil className="w-4 h-4" />
            </button>
          </div>

          {/* Badges de status */}
          <div className="flex flex-wrap gap-1.5">
            {ultimoTipo && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-primary font-medium">{ultimoTipo}</span>
            )}
            {patient.status_paciente === 'obito' && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Óbito</span>
            )}
            {patient.status_paciente === 'inativo' && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium">Inativo</span>
            )}
            {patient.status_paciente === 'dialise' && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">Diálise</span>
            )}
            {patient.status_paciente === 'alta' && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Alta</span>
            )}
            {!patient.perfil_completo && patient.status_paciente === 'ativo' && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">Cadastro incompleto</span>
            )}
          </div>

          {/* Retorno + última consulta */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Última</span>
              <span className="text-xs text-gray-600">{ultimaConsulta ? formatDate(ultimaConsulta) : '—'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Retorno</span>
              <input
                type="date"
                value={retornoPrevisto}
                onChange={e => handleRetornoPrevisto(e.target.value)}
                className={`text-xs border rounded-lg px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary transition-colors ${
                  !proximaConsulta && alertRetorno === 'atrasado'
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : !proximaConsulta && alertRetorno === 'chegando'
                    ? 'border-amber-300 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              />
              {savingRetorno && <Clock className="w-3 h-3 text-gray-300 animate-spin" />}
            </div>
          </div>

          {/* Alerta de retorno */}
          {!proximaConsulta && alertRetorno === 'atrasado' && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700">
              <AlertTriangle className="w-2.5 h-2.5" /> Retorno atrasado
            </span>
          )}
          {!proximaConsulta && alertRetorno === 'chegando' && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">
              <AlertTriangle className="w-2.5 h-2.5" /> Agendar em breve
            </span>
          )}
          {proximaConsulta && (
            <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">
              <Check className="w-2.5 h-2.5" /> Agendado · {formatDate(proximaConsulta)}
            </span>
          )}

          {/* Obs */}
          {patient.obs_secretaria && (
            <p className="text-xs text-gray-500 line-clamp-2 border-t border-gray-100 pt-2">{patient.obs_secretaria}</p>
          )}

          {newPassword && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 mt-1">
              <KeyRound className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-amber-700 font-medium">Nova senha</p>
                <p className="text-sm font-bold text-amber-900 tracking-widest">{newPassword}</p>
              </div>
              <button type="button" onClick={handleCopyPassword} className="p-1.5 text-amber-600 hover:text-amber-800">
                {copiedPwd ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </>
    )
  }

  return (
    <>
      {modalOpen && (
        <PatientEditModal patient={patient} onClose={() => setModalOpen(false)} />
      )}

      <tr className={`transition-colors ${patient.status_paciente === 'obito' ? 'opacity-50' : ''}`} style={{ borderBottom: '1px solid rgba(26,31,46,0.05)' }} onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(122,158,126,0.06)')} onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}>

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
            {patient.status_paciente === 'obito' && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 font-medium mt-0.5 inline-block">
                Óbito
              </span>
            )}
            {patient.status_paciente === 'inativo' && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 font-medium mt-0.5 inline-block">
                Inativo
              </span>
            )}
            {patient.status_paciente === 'dialise' && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium mt-0.5 inline-block">
                Diálise
              </span>
            )}
            {patient.status_paciente === 'alta' && (
              <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium mt-0.5 inline-block">
                Alta
              </span>
            )}
            {!patient.perfil_completo && patient.status_paciente === 'ativo' && (
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

        {/* Última consulta */}
        <td className="px-4 py-3 text-xs text-gray-500">
          {ultimaConsulta ? formatDate(ultimaConsulta) : '—'}
        </td>

        {/* Retorno Previsto — editável + alertas + badge de agendado */}
        <td className="px-4 py-3">
          <div className="space-y-1.5">
            {/* Input de data */}
            <div className="flex items-center gap-1.5">
              <input
                type="date"
                value={retornoPrevisto}
                onChange={e => handleRetornoPrevisto(e.target.value)}
                className={`text-xs border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary w-[126px] transition-colors ${
                  !proximaConsulta && alertRetorno === 'atrasado'
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : !proximaConsulta && alertRetorno === 'chegando'
                    ? 'border-amber-300 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              />
              {savingRetorno && <Clock className="w-3 h-3 text-gray-300 animate-spin" />}
            </div>

            {/* Badge: consulta já agendada */}
            {proximaConsulta && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-700">
                <Check className="w-2.5 h-2.5" />
                Agendado · {formatDate(proximaConsulta)}
              </span>
            )}

            {/* Alertas — só quando sem agendamento */}
            {!proximaConsulta && alertRetorno === 'atrasado' && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-red-100 text-red-700">
                <AlertTriangle className="w-2.5 h-2.5" />
                Retorno atrasado
              </span>
            )}
            {!proximaConsulta && alertRetorno === 'chegando' && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-700">
                <AlertTriangle className="w-2.5 h-2.5" />
                Agendar em breve
              </span>
            )}
          </div>
        </td>

        {/* Status = tipo da última consulta */}
        <td className="px-4 py-3">
          {ultimoTipo ? (
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-primary">
              {ultimoTipo}
            </span>
          ) : (
            <span className="text-gray-300 text-xs">—</span>
          )}
        </td>

        {/* Observações */}
        <td className="px-4 py-3 text-xs text-gray-500">
          <span className="line-clamp-2">{patient.obs_secretaria || <span className="text-gray-300">—</span>}</span>
        </td>
      </tr>

      {newPassword && (
        <tr>
          <td colSpan={7} className="px-4 pb-3">
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
  lista:         Profile[]
  total:         number
  getUltima:     (id: string) => string | null
  getUltimoTipo: (id: string) => string | null
  getAlerta:     (p: Profile) => 'atrasado' | 'chegando' | null
}

function SemRetornoRow({ patient, ultima, ultimoTipo, alerta }: {
  patient:    Profile
  ultima:     string | null
  ultimoTipo: string | null
  alerta:     'atrasado' | 'chegando' | null
}) {
  const firstName = patient.full_name?.split(' ')[0] ?? 'paciente'
  const phone     = patient.phone?.replace(/\D/g, '')
  const waMessage = encodeURIComponent(
    `Olá, ${firstName}! Aqui é a equipe do consultório do Dr. Guilherme. Percebemos que você está sem consulta de retorno agendada e gostaríamos de marcar um horário para continuarmos seu acompanhamento. Quando seria melhor para você? 😊`
  )
  const waUrl = phone ? `https://wa.me/55${phone}?text=${waMessage}` : null

  const bgClass     = alerta === 'atrasado' ? 'bg-red-50/60 border-red-100'    : 'bg-amber-50/60 border-amber-100'
  const alertaBadge = alerta === 'atrasado'
    ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold flex-shrink-0 mt-0.5 whitespace-nowrap">Atrasado</span>
    : <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold flex-shrink-0 mt-0.5 whitespace-nowrap">Em breve</span>

  return (
    <div className={`rounded-lg border px-3 py-2.5 space-y-2 ${bgClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-800 truncate">{patient.full_name ?? '—'}</p>
          <p className="text-[11px] text-gray-400">
            {ultima ? `Última: ${formatDate(ultima)}` : 'Sem consultas'}
            {patient.retorno_previsto && (
              <> · Previsto: {formatDate(patient.retorno_previsto)}</>
            )}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          {alertaBadge}
          {ultimoTipo && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-primary font-medium whitespace-nowrap">
              {ultimoTipo}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center">
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
      </div>
    </div>
  )
}

function SemRetornoPanel({ lista, total, getUltima, getUltimoTipo, getAlerta }: SemRetornoPanelProps) {
  return (
    <div className="rounded-xl border border-white/60 backdrop-blur-sm p-5" style={{ backgroundColor: 'rgba(255,255,255,0.75)' }}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-semibold text-gray-800">Retorno previsto sem agendamento</h3>
        <span className="text-xs text-gray-400 ml-auto">{total} pacientes</span>
      </div>
      {lista.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Nenhum retorno pendente no momento 🎉</p>
      ) : (
        <div className="space-y-2 overflow-y-auto pr-1" style={{ maxHeight: 420 }}>
          {lista.map(p => (
            <SemRetornoRow
              key={p.id}
              patient={p}
              ultima={getUltima(p.id)}
              ultimoTipo={getUltimoTipo(p.id)}
              alerta={getAlerta(p)}
            />
          ))}
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
  const [filterStatus, setFilterStatus] = useState<'ativo' | 'inativos' | 'todos'>('ativo')
  const [filterAlerta, setFilterAlerta] = useState<'all' | 'atrasado' | 'chegando'>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  // Volta pra página 1 sempre que filtros mudam
  useEffect(() => { setPage(1) }, [search, filterStatus, filterAlerta])

  // Datas estáveis — calculadas uma só vez por montagem do componente
  const { nowISO, em7Dias, mesAtual, cutoffISO } = useMemo(() => {
    const now = new Date()
    const em7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const vin  = new Date(now)
    vin.setMonth(vin.getMonth() - 24)
    return {
      nowISO:    now.toISOString(),
      em7Dias:   em7.toISOString(),
      mesAtual:  `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      cutoffISO: vin.toISOString(),
    }
  }, [])

  // ── UMA única passagem sobre consultas (de O(n²) para O(n)) ───
  const {
    ultimaConsultaMap,
    primeiraConsultaMap,
    proximaConsultaMap,
    ultimoTipoMap,
    dadosConsultasMes,
    proximasConsultas,
    consultasMesCount,
  } = useMemo(() => {
    const ultimaConsultaMap    = new Map<string, string>()
    const primeiraConsultaMap  = new Map<string, string>()
    const proximaConsultaMap   = new Map<string, string>()
    const ultimoTipoMap        = new Map<string, string>()
    const mesesBuckets: Record<string, number> = {}
    const proximas7dias: typeof consultas = []

    consultas.forEach(c => {
      // Última + primeira consulta realizada
      if (c.status === 'realizada') {
        const ult = ultimaConsultaMap.get(c.patient_id)
        if (!ult || c.data_hora > ult) {
          ultimaConsultaMap.set(c.patient_id, c.data_hora)
          ultimoTipoMap.set(c.patient_id, c.tipo)
        }
        const pri = primeiraConsultaMap.get(c.patient_id)
        if (!pri || c.data_hora < pri) primeiraConsultaMap.set(c.patient_id, c.data_hora)
        // Bucket por mês para o gráfico
        const key = c.data_hora.slice(0, 7)
        mesesBuckets[key] = (mesesBuckets[key] ?? 0) + 1
      }
      // Próxima consulta agendada/confirmada
      if (['agendada', 'confirmada'].includes(c.status) && c.data_hora >= nowISO) {
        const prox = proximaConsultaMap.get(c.patient_id)
        if (!prox || c.data_hora < prox) proximaConsultaMap.set(c.patient_id, c.data_hora)
        if (c.data_hora <= em7Dias) proximas7dias.push(c)
      }
    })

    const meses = ultimosMeses(6)
    const dadosConsultasMes = meses.map(({ key, label }) => ({
      label,
      total: mesesBuckets[key] ?? 0,
    }))

    const proximasConsultas = proximas7dias
      .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
      .slice(0, 8)
      .map(c => ({ ...c, patient: patients.find(p => p.id === c.patient_id) }))

    return {
      ultimaConsultaMap,
      primeiraConsultaMap,
      proximaConsultaMap,
      ultimoTipoMap,
      dadosConsultasMes,
      proximasConsultas,
      consultasMesCount: mesesBuckets[mesAtual] ?? 0,
    }
  }, [consultas, patients, nowISO, em7Dias, mesAtual])

  // ── Helpers O(1) usando os mapas pré-computados ───────────────
  const getUltima     = (id: string) => ultimaConsultaMap.get(id)   ?? null
  const getProxima    = (id: string) => proximaConsultaMap.get(id)  ?? null
  const getUltimoTipo = (id: string) => {
    const tipo = ultimoTipoMap.get(id)
    return tipo ? (TIPO_LABEL[tipo as keyof typeof TIPO_LABEL] ?? tipo) : null
  }

  const getAlertRetorno = (patient: Profile): 'atrasado' | 'chegando' | null => {
    const rp = patient.retorno_previsto
    if (!rp) return null
    if (getProxima(patient.id)) return null
    const hoje   = new Date(); hoje.setHours(0, 0, 0, 0)
    const data   = new Date(rp + 'T00:00:00')
    const dias   = Math.ceil((data.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    if (dias < 0)   return 'atrasado'
    if (dias <= 30) return 'chegando'
    return null
  }

  // ── Derivados — todos com useMemo para não recomputar a cada render ─
  const isAtivo = useMemo(() =>
    (p: Profile) => p.status_paciente !== 'obito' && (ultimaConsultaMap.get(p.id) ?? '') >= cutoffISO
  , [ultimaConsultaMap, cutoffISO])

  const { totais, dadosComo, semRetornoLista, totaisAlerta } = useMemo(() => {
    const comoMap: Record<string, number> = {}
    let semRetornoCount = 0
    const semRetornoLista: Profile[] = []

    patients.forEach(p => {
      // Como conheceu
      const cat = normalizarComoConheceu(p.como_conheceu)
      comoMap[cat] = (comoMap[cat] ?? 0) + 1
      // Sem retorno
      if (isAtivo(p) && !getProxima(p.id)) semRetornoCount++
    })

    const ativo   = patients.filter(isAtivo).length
    const inativo = patients.filter(p => p.status_paciente !== 'obito' && !isAtivo(p)).length
    const obito   = patients.filter(p => p.status_paciente === 'obito').length
    const novosMes = patients.filter(p => primeiraConsultaMap.get(p.id)?.startsWith(mesAtual)).length

    const dadosComo = Object.entries(comoMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }))

    let atrasadoCount = 0, chegandoCount = 0
    patients.forEach(p => {
      if (!isAtivo(p) || getProxima(p.id)) return
      const alerta = getAlertRetorno(p)
      if (!alerta) return
      semRetornoLista.push(p)
      if (alerta === 'atrasado') atrasadoCount++
      else chegandoCount++
    })

    semRetornoLista.sort((a, b) => {
      const pa = getAlertRetorno(a) === 'atrasado' ? 0 : 1
      const pb = getAlertRetorno(b) === 'atrasado' ? 0 : 1
      if (pa !== pb) return pa - pb
      return (a.retorno_previsto ?? '').localeCompare(b.retorno_previsto ?? '')
    })

    return {
      totais: { ativo, inativo, obito, semRetorno: semRetornoCount, consultasMes: consultasMesCount, novosMes },
      dadosComo,
      semRetornoLista,
      totaisAlerta: { atrasado: atrasadoCount, chegando: chegandoCount },
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients, isAtivo, primeiraConsultaMap, mesAtual, consultasMesCount, proximaConsultaMap])

  // ── Tabela filtrada ────────────────────────────────────────
  const filtered = useMemo(() => patients
    .filter(p => {
      const matchSearch = !search || normalizeStr(p.full_name ?? '').includes(normalizeStr(search))
      const matchStatus =
        filterStatus === 'todos'   ? true :
        filterStatus === 'ativo'   ? isAtivo(p) :
        /* inativos */               !isAtivo(p)
      const alerta = getAlertRetorno(p)
      const matchAlerta =
        filterAlerta === 'all'      ? true :
        filterAlerta === 'atrasado' ? (p.status_paciente === 'ativo' && !getProxima(p.id) && alerta === 'atrasado') :
        /* chegando */                (p.status_paciente === 'ativo' && !getProxima(p.id) && alerta === 'chegando')
      return matchSearch && matchStatus && matchAlerta
    })
    .sort((a, b) => {
      const da = ultimaConsultaMap.get(a.id) ?? ''
      const db = ultimaConsultaMap.get(b.id) ?? ''
      if (da === db) return (a.full_name ?? '').localeCompare(b.full_name ?? '', 'pt-BR')
      return db.localeCompare(da) // mais recente primeiro
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  , [patients, search, filterStatus, filterAlerta, isAtivo, proximaConsultaMap, ultimaConsultaMap])

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── 1. Stats band — desktop ── */}
      <div className="hidden sm:flex gap-3">

        {/* Painel: Base de pacientes */}
        <div
          className="flex-1 rounded-xl border border-white/60 backdrop-blur-sm overflow-hidden"
          style={{ backgroundColor: 'rgba(255,255,255,0.75)', boxShadow: '0 2px 12px rgba(26,31,46,0.06)' }}
        >
          <div className="px-5 pt-3 pb-2.5 border-b border-black/[0.05]">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.14em]">Base de pacientes</span>
          </div>
          <div className="grid grid-cols-4 divide-x divide-black/[0.05]">
            {([
              { label: 'Ativos',      value: totais.ativo,      color: '#2D2B6B', iconColor: 'rgba(45,43,107,0.45)',   Icon: Users      },
              { label: 'Inativos',    value: totais.inativo,    color: '#C4C9D4', iconColor: 'rgba(196,201,212,0.8)',  Icon: UserMinus  },
              { label: 'Óbitos',      value: totais.obito,      color: '#C17070', iconColor: 'rgba(193,112,112,0.55)', Icon: null       },
              { label: 'Sem retorno', value: totais.semRetorno, color: '#B8943F', iconColor: 'rgba(184,148,63,0.55)',  Icon: Clock      },
            ] as const).map(({ label, value, color, iconColor, Icon }) => (
              <div key={label} className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-3">
                  {Icon && <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: iconColor }} />}
                  <span className="text-[11px] font-medium text-gray-400 leading-none">{label}</span>
                </div>
                <p className="text-[2rem] font-bold tracking-tight leading-none" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Painel: Atividade do mês */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{ borderColor: 'rgba(122,158,126,0.22)', backgroundColor: 'rgba(122,158,126,0.07)', boxShadow: '0 2px 12px rgba(26,31,46,0.06)' }}
        >
          <div className="px-5 pt-3 pb-2.5 border-b" style={{ borderColor: 'rgba(122,158,126,0.15)' }}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#7A9E7E' }}>Este mês</span>
          </div>
          <div className="grid grid-cols-2">
            {([
              { label: 'Consultas', value: totais.consultasMes, Icon: CalendarDays },
              { label: 'Novos',     value: totais.novosMes,     Icon: UserPlus     },
            ] as const).map(({ label, value, Icon }, i) => (
              <div
                key={label}
                className="px-5 py-4"
                style={i > 0 ? { borderLeft: '1px solid rgba(122,158,126,0.15)' } : {}}
              >
                <div className="flex items-center gap-1.5 mb-3">
                  <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: 'rgba(122,158,126,0.75)' }} />
                  <span className="text-[11px] font-medium leading-none" style={{ color: '#7A9E7E' }}>{label}</span>
                </div>
                <p className="text-[2rem] font-bold tracking-tight leading-none" style={{ color: '#2D2B6B' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 1. Stats band — mobile fallback ── */}
      <div className="grid grid-cols-2 gap-3 sm:hidden">
        {[
          { label: 'Ativos',        value: totais.ativo,        color: '#2D2B6B', bg: 'rgba(255,255,255,0.75)' },
          { label: 'Inativos',      value: totais.inativo,      color: '#C4C9D4', bg: 'rgba(255,255,255,0.60)' },
          { label: 'Óbitos',        value: totais.obito,        color: '#C17070', bg: 'rgba(255,255,255,0.65)' },
          { label: 'Sem retorno',   value: totais.semRetorno,   color: '#B8943F', bg: 'rgba(255,255,255,0.65)' },
          { label: 'Consultas/mês', value: totais.consultasMes, color: '#2D2B6B', bg: 'rgba(122,158,126,0.09)' },
          { label: 'Novos/mês',     value: totais.novosMes,     color: '#2D2B6B', bg: 'rgba(122,158,126,0.09)' },
        ].map(card => (
          <div
            key={card.label}
            className="rounded-xl border border-white/60 backdrop-blur-sm p-4"
            style={{ backgroundColor: card.bg }}
          >
            <p className="text-3xl font-bold tracking-tight leading-none" style={{ color: card.color }}>{card.value}</p>
            <p className="text-sm font-medium text-gray-500 mt-2">{card.label}</p>
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
                  {dadosComo.map((entry, i) => (
                    <Cell key={i} fill={COLORS_PIE[entry.name] ?? COLORS_PIE_LIST[i % COLORS_PIE_LIST.length]} />
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
                      <p className="text-[11px] text-gray-400">{TIPO_LABEL[c.tipo] ?? c.tipo}</p>
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
          total={semRetornoLista.length}
          getUltima={getUltima}
          getUltimoTipo={getUltimoTipo}
          getAlerta={getAlertRetorno}
        />
      </div>

      {/* ── 4. Filtros + Tabela ── */}
      <div className="space-y-3">
        {/* Linha 1: busca + status */}
        <div className="flex gap-2 flex-wrap items-center">
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {([
            { key: 'ativo',    label: `Ativos — últimos 2 anos (${totais.ativo})`    },
            { key: 'inativos', label: `Sem atividade (${totais.inativo + totais.obito})` },
            { key: 'todos',    label: `Todos (${patients.length})`                  },
          ] as const).map(s => (
            <button
              key={s.key}
              type="button"
              onClick={() => { setFilterStatus(s.key); setFilterAlerta('all') }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s.key && filterAlerta === 'all' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Linha 2: filtros de alerta de retorno */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-400 font-medium">Retorno:</span>
          <button
            type="button"
            onClick={() => { setFilterAlerta('atrasado'); setFilterStatus('ativo') }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filterAlerta === 'atrasado'
                ? 'bg-red-600 text-white border-red-600'
                : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Atrasado ({totaisAlerta.atrasado})
          </button>
          <button
            type="button"
            onClick={() => { setFilterAlerta('chegando'); setFilterStatus('ativo') }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${
              filterAlerta === 'chegando'
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            Agendar em breve ({totaisAlerta.chegando})
          </button>
          {filterAlerta !== 'all' && (
            <button
              type="button"
              onClick={() => setFilterAlerta('all')}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors px-2"
            >
              × limpar
            </button>
          )}
        </div>

        {/* Tabela paginada */}
        {(() => {
          const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
          const safePage   = Math.min(page, totalPages)
          const pageSlice  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
          const from       = filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1
          const to         = Math.min(safePage * PAGE_SIZE, filtered.length)

          return (
            <>
              {/* ── Tabela — desktop (sm+) ── */}
              <div className="hidden sm:block rounded-xl border border-white/60 backdrop-blur-sm overflow-x-auto" style={{ backgroundColor: 'rgba(255,255,255,0.75)' }}>
                <table className="w-full text-sm" style={{ minWidth: 950 }}>
                  <colgroup>
                    <col style={{ width:  60 }} />
                    <col style={{ width: 190 }} />
                    <col style={{ width: 160 }} />
                    <col style={{ width: 120 }} />
                    <col style={{ width: 170 }} />
                    <col style={{ width: 150 }} />
                    <col style={{ width: 160 }} />
                  </colgroup>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(26,31,46,0.08)', backgroundColor: 'rgba(26,31,46,0.03)' }}>
                      {['', 'Paciente', 'Como conheceu', 'Última consulta', 'Retorno previsto', 'Status', 'Observações'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">
                          Nenhum paciente encontrado.
                        </td>
                      </tr>
                    ) : (
                      pageSlice.map(p => (
                        <PanoramaRow
                          key={p.id}
                          patient={p}
                          ultimaConsulta={getUltima(p.id)}
                          proximaConsulta={getProxima(p.id)}
                          ultimoTipo={getUltimoTipo(p.id)}
                          alertRetorno={getAlertRetorno(p)}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* ── Cards — mobile (< sm) ── */}
              <div className="block sm:hidden space-y-2">
                {pageSlice.length === 0 ? (
                  <p className="text-center text-sm text-gray-400 py-10">Nenhum paciente encontrado.</p>
                ) : (
                  pageSlice.map(p => {
                    const ultima   = getUltima(p.id)
                    const proxima  = getProxima(p.id)
                    const tipo     = getUltimoTipo(p.id)
                    const alerta   = getAlertRetorno(p)
                    return (
                      <PanoramaRow
                        key={p.id}
                        patient={p}
                        ultimaConsulta={ultima}
                        proximaConsulta={proxima}
                        ultimoTipo={tipo}
                        alertRetorno={alerta}
                        mobileCard
                      />
                    )
                  })
                )}
              </div>

              {/* Paginação */}
              {filtered.length > PAGE_SIZE && (
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs text-gray-400">
                    {from}–{to} de {filtered.length} pacientes
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Números de página */}
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                      .filter(n => n === 1 || n === totalPages || Math.abs(n - safePage) <= 1)
                      .reduce<(number | '...')[]>((acc, n, i, arr) => {
                        if (i > 0 && typeof arr[i - 1] === 'number' && (n as number) - (arr[i - 1] as number) > 1) acc.push('...')
                        acc.push(n)
                        return acc
                      }, [])
                      .map((n, i) =>
                        n === '...' ? (
                          <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-300 select-none">…</span>
                        ) : (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setPage(n as number)}
                            className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                              safePage === n
                                ? 'bg-primary text-white'
                                : 'text-gray-500 hover:bg-gray-100'
                            }`}
                          >
                            {n}
                          </button>
                        )
                      )
                    }

                    <button
                      type="button"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-primary/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}
