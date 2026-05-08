'use client'

import { useState, useTransition } from 'react'
import { updatePatientTracking, resetPatientPassword } from '@/app/actions/profile'
import type { Profile, StatusPaciente, Consulta } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { Check, X, Pencil, AlertCircle, KeyRound, Copy } from 'lucide-react'

const STATUS_CONFIG: Record<StatusPaciente, { label: string; className: string }> = {
  ativo:   { label: 'Ativo',   className: 'bg-green-100 text-green-700' },
  inativo: { label: 'Inativo', className: 'bg-gray-100 text-gray-600' },
  obito:   { label: 'Óbito',   className: 'bg-red-100 text-red-700' },
}

function calcIdade(dataNasc: string | null): string {
  if (!dataNasc) return '—'
  const diff = Date.now() - new Date(dataNasc).getTime()
  return `${Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25))} anos`
}

interface EditState {
  clinica: string
  diagnostico: string
  status_paciente: StatusPaciente
  obs_secretaria: string
}

interface RowProps {
  patient: Profile
  ultimaConsulta: string | null
  proximaConsulta: string | null
}

function PanoramaRow({ patient, ultimaConsulta, proximaConsulta }: RowProps) {
  const [editing, setEditing]         = useState(false)
  const [isPending, startTransition]  = useTransition()
  const [newPassword, setNewPassword] = useState<string | null>(null)
  const [copiedPwd, setCopiedPwd]     = useState(false)
  const [form, setForm] = useState<EditState>({
    clinica:         patient.clinica         ?? 'MedRenal',
    diagnostico:     patient.diagnostico     ?? '',
    status_paciente: patient.status_paciente ?? 'ativo',
    obs_secretaria:  patient.obs_secretaria  ?? '',
  })

  function handleSave() {
    startTransition(async () => {
      await updatePatientTracking(patient.id, {
        clinica:         form.clinica || 'MedRenal',
        diagnostico:     form.diagnostico || null as unknown as string,
        status_paciente: form.status_paciente,
        obs_secretaria:  form.obs_secretaria || null as unknown as string,
      })
      setEditing(false)
    })
  }

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

  const statusCfg = STATUS_CONFIG[form.status_paciente]

  return (
    <>
    <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${form.status_paciente === 'obito' ? 'opacity-60' : ''}`}>
      {/* Nome + perfil */}
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-gray-900 text-sm">{patient.full_name ?? '—'}</p>
          <p className="text-xs text-gray-400">
            {patient.sexo === 'F' ? 'F' : patient.sexo === 'M' ? 'M' : '—'} · {calcIdade(patient.data_nascimento)}
            {!patient.perfil_completo && (
              <span className="ml-2 text-amber-500 inline-flex items-center gap-0.5">
                <AlertCircle className="w-3 h-3" /> cadastro incompleto
              </span>
            )}
          </p>
        </div>
      </td>

      {/* Como conheceu */}
      <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px]">
        <span className="line-clamp-2">{patient.como_conheceu ?? '—'}</span>
      </td>

      {/* Clínica */}
      <td className="px-4 py-3 text-sm">
        {editing ? (
          <input
            value={form.clinica}
            onChange={e => setForm(f => ({ ...f, clinica: e.target.value }))}
            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="MedRenal"
          />
        ) : (
          <span className="text-gray-700 text-xs">{form.clinica || 'MedRenal'}</span>
        )}
      </td>

      {/* Diagnóstico */}
      <td className="px-4 py-3">
        {editing ? (
          <input
            value={form.diagnostico}
            onChange={e => setForm(f => ({ ...f, diagnostico: e.target.value }))}
            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Ex: Hipotireoidismo"
          />
        ) : (
          <span className="text-xs text-gray-700">{form.diagnostico || <span className="text-gray-300">—</span>}</span>
        )}
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
        {editing ? (
          <select
            value={form.status_paciente}
            onChange={e => setForm(f => ({ ...f, status_paciente: e.target.value as StatusPaciente }))}
            className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="obito">Óbito</option>
          </select>
        ) : (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusCfg.className}`}>
            {statusCfg.label}
          </span>
        )}
      </td>

      {/* Observações */}
      <td className="px-4 py-3 max-w-[180px]">
        {editing ? (
          <input
            value={form.obs_secretaria}
            onChange={e => setForm(f => ({ ...f, obs_secretaria: e.target.value }))}
            className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            placeholder="Observações..."
          />
        ) : (
          <span className="text-xs text-gray-500 line-clamp-2">{form.obs_secretaria || <span className="text-gray-300">—</span>}</span>
        )}
      </td>

      {/* Ações */}
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="p-1.5 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
              title="Salvar"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="p-1.5 bg-gray-50 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
              title="Cancelar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="p-1.5 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
              title="Editar"
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
        )}
      </td>
    </tr>

    {/* Card de nova senha — aparece abaixo da linha */}
    {newPassword && (
      <tr>
        <td colSpan={9} className="px-4 pb-3">
          <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <KeyRound className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-amber-700 font-medium">Nova senha gerada para {patient.full_name?.split(' ')[0]}</p>
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
            <button
              type="button"
              onClick={() => setNewPassword(null)}
              className="p-1 text-amber-400 hover:text-amber-600"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    )}
    </>
  )
}

interface PanoramaTabProps {
  patients: Profile[]
  consultas: Consulta[]
}

export default function PanoramaTab({ patients, consultas }: PanoramaTabProps) {
  const [filterStatus, setFilterStatus] = useState<StatusPaciente | 'todos'>('todos')
  const [search, setSearch] = useState('')

  const now = new Date().toISOString()

  const filtered = patients.filter(p => {
    const matchSearch = !search || p.full_name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'todos' || p.status_paciente === filterStatus
    return matchSearch && matchStatus
  })

  // Pré-calcula ultima e proxima consulta por paciente
  function getUltima(patientId: string) {
    const past = consultas
      .filter(c => c.patient_id === patientId && c.data_hora < now && c.status === 'realizada')
      .sort((a, b) => b.data_hora.localeCompare(a.data_hora))
    return past[0]?.data_hora ?? null
  }

  function getProxima(patientId: string) {
    const future = consultas
      .filter(c => c.patient_id === patientId && c.data_hora >= now && ['agendada', 'confirmada'].includes(c.status))
      .sort((a, b) => a.data_hora.localeCompare(b.data_hora))
    return future[0]?.data_hora ?? null
  }

  const totais = {
    ativo:   patients.filter(p => p.status_paciente === 'ativo').length,
    inativo: patients.filter(p => p.status_paciente === 'inativo').length,
    obito:   patients.filter(p => p.status_paciente === 'obito').length,
    semRetorno: patients.filter(p => p.status_paciente === 'ativo' && !getProxima(p.id)).length,
  }

  return (
    <div className="space-y-4">

      {/* Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Ativos',       value: totais.ativo,      color: 'bg-green-50 text-green-700' },
          { label: 'Inativos',     value: totais.inativo,    color: 'bg-gray-50 text-gray-600' },
          { label: 'Óbitos',       value: totais.obito,      color: 'bg-red-50 text-red-700' },
          { label: 'Sem retorno',  value: totais.semRetorno, color: 'bg-amber-50 text-amber-700' },
        ].map(card => (
          <div key={card.label} className={`rounded-xl p-3 ${card.color}`}>
            <p className="text-2xl font-bold">{card.value}</p>
            <p className="text-xs opacity-80 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
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
              filterStatus === s
                ? 'bg-primary text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s === 'todos' ? 'Todos' : s === 'ativo' ? 'Ativos' : s === 'inativo' ? 'Inativos' : 'Óbitos'}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              {['Paciente', 'Como conheceu', 'Clínica', 'Diagnóstico', 'Última consulta', 'Próxima consulta', 'Status', 'Observações', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
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
  )
}
