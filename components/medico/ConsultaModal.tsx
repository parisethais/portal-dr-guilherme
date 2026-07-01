'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { createConsulta, updateConsulta, updateConsultaStatus, deleteConsulta, gerarLinksLembrete } from '@/app/actions/consultas'
import { createPlaceholderPatient } from '@/app/actions/patients'
import { getConsultationTypes } from '@/app/actions/consultation-types'
import type { ConsultationTypeDB } from '@/app/actions/consultation-types'
import type { Profile, Consulta, ConsultaTipo, ConsultaLocal, ConsultaStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  UserRound, MapPin, Clock, CalendarDays,
  CheckCircle2, XCircle, AlertCircle, Pencil, ChevronDown, UserPlus, Stethoscope, Trash2, Link2, Check, Phone,
} from 'lucide-react'

// ── Labels (fallback estático — fonte de verdade é o DB) ──────────────────

export const TIPO_LABEL: Record<ConsultaTipo, string> = {
  primeira_consulta:          'Primeira Consulta',
  nova_consulta:              'Nova Consulta',
  retorno:                    'Retorno',
  primeira_consulta_desconto: 'Primeira Consulta (Desconto)',
  nova_consulta_desconto:     'Nova Consulta (Desconto)',
  reuniao:                    'Reunião',
}

export const TIPO_INFO: Record<ConsultaTipo, { duracao: number; preco: string }> = {
  primeira_consulta:          { duracao: 75, preco: 'R$1.000' },
  nova_consulta:              { duracao: 45, preco: 'R$1.000' },
  retorno:                    { duracao: 45, preco: 'Gratuito' },
  primeira_consulta_desconto: { duracao: 75, preco: 'R$500'   },
  nova_consulta_desconto:     { duracao: 45, preco: 'R$500'   },
  reuniao:                    { duracao: 45, preco: 'Gratuito' },
}

// ── Helpers ───────────────────────────────────────────────

function formatPreco(valor: number): string {
  if (valor === 0) return 'Gratuito'
  return `R$${valor.toLocaleString('pt-BR')}`
}

function tipoOptionsFromDB(types: ConsultationTypeDB[]) {
  return types.map(t => ({
    value: t.slug as ConsultaTipo,
    label: t.name,
    duracao: t.duration_min,
    preco: formatPreco(t.default_value),
  }))
}

const TIPO_OPTIONS_FALLBACK = (Object.keys(TIPO_LABEL) as ConsultaTipo[]).map(key => ({
  value: key,
  label: TIPO_LABEL[key],
  duracao: TIPO_INFO[key].duracao,
  preco: TIPO_INFO[key].preco,
}))

export const LOCAL_LABEL: Record<ConsultaLocal, string> = {
  consultorio:  'Consultório',
  telemedicina: 'Telemedicina',
}

export const STATUS_LABEL: Record<ConsultaStatus, string> = {
  agendada:       'Agendada',
  confirmada:     'Confirmada',
  em_atendimento: 'Em atendimento',
  realizada:      'Realizada',
  falta:          'Falta',
  cancelada:      'Cancelada',
}

export const STATUS_BADGE_VARIANT: Record<ConsultaStatus, 'blue' | 'green' | 'gray' | 'red' | 'orange'> = {
  agendada:       'blue',
  confirmada:     'green',
  em_atendimento: 'orange',
  realizada:      'gray',
  falta:          'red',
  cancelada:      'gray',
}

// ── Patient search sub-component ──────────────────────────

function PatientSearch({
  patients,
  value,
  onChange,
}: {
  patients: Profile[]
  value: Profile | null
  onChange: (p: Profile) => void
}) {
  const [query, setQuery] = useState(value?.full_name ?? '')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = patients
    .filter((p) => p.full_name?.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 8)

  return (
    <div ref={ref} className="relative w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        Paciente <span className="text-red-500 ml-0.5">*</span>
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <UserRound className="w-4 h-4 text-gray-400" />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar paciente..."
          className="w-full pl-9 pr-9 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          {filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onMouseDown={() => {
                onChange(p)
                setQuery(p.full_name ?? '')
                setOpen(false)
              }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 transition-colors flex items-center gap-2"
            >
              <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <UserRound className="w-3.5 h-3.5 text-primary" />
              </div>
              <span className="font-medium text-gray-800">{p.full_name}</span>
            </button>
          ))}
        </div>
      )}

      {open && query.length > 0 && filtered.length === 0 && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
          <p className="text-xs text-gray-400 px-4 pt-2.5 pb-1.5">Nenhum paciente encontrado.</p>
          <button
            type="button"
            onMouseDown={() => {
              // Marca como provisório — criado no handleSubmit
              onChange({ id: '__placeholder__', full_name: query } as Profile)
              setOpen(false)
            }}
            className="w-full text-left px-4 py-2.5 text-sm hover:bg-amber-50 transition-colors flex items-center gap-2 border-t border-gray-100"
          >
            <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <UserPlus className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <span className="font-medium text-amber-700">Agendar sem cadastro: &ldquo;{query}&rdquo;</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Date/time helpers ──────────────────────────────────────

function toDatetimeLocal(isoOrPartial: string): string {
  if (!isoOrPartial) return ''
  // Clique em dia inteiro (YYYY-MM-DD) → padrão 08:00 local
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrPartial)) {
    return isoOrPartial + 'T08:00'
  }
  // Converte o ISO UTC para horário local antes de exibir no input datetime-local
  // (sem isso, "2026-05-26T20:00:00Z" = 17h BRT aparecia como 20:00 no formulário)
  const d = new Date(isoOrPartial)
  if (isNaN(d.getTime())) return isoOrPartial.slice(0, 16)
  const offsetMs = d.getTimezoneOffset() * 60_000
  const local    = new Date(d.getTime() - offsetMs)
  return local.toISOString().slice(0, 16)
}

function formatDisplayDateTime(isoString: string): string {
  const d = new Date(isoString)
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// ── Main component ─────────────────────────────────────────

interface ConsultaModalProps {
  open: boolean
  onClose: () => void
  mode: 'create' | 'view'
  patients: Profile[]
  defaultDateTime?: string   // for create mode
  consulta?: Consulta        // for view mode
  currentRole?: string
  onIniciarAtendimento?: (patientId: string, consultaId: string) => void
  onNavigateToPatient?: (patientId: string) => void
  doctorName?: string | null
}

export default function ConsultaModal({
  open,
  onClose,
  mode,
  patients,
  defaultDateTime = '',
  consulta,
  currentRole,
  onIniciarAtendimento,
  onNavigateToPatient,
  doctorName,
}: ConsultaModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [placeholderPhone, setPlaceholderPhone] = useState('')
  const [agendadoComWhats, setAgendadoComWhats] = useState<{ nome: string; phone: string } | null>(null)

  // Tipos de consulta carregados do DB (fallback para hardcoded)
  const [tipoOptions, setTipoOptions] = useState(TIPO_OPTIONS_FALLBACK)

  useEffect(() => {
    getConsultationTypes()
      .then(types => { if (types.length > 0) setTipoOptions(tipoOptionsFromDB(types)) })
      .catch(() => {})
  }, [])

  // Create / Edit form state
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null)
  const [tipo, setTipo]         = useState<ConsultaTipo>('retorno')
  const [local, setLocal]       = useState<ConsultaLocal>('consultorio')
  const [dataHora, setDataHora] = useState('')
  const [duracao, setDuracao]   = useState(30)
  const [obs, setObs]           = useState('')

  // Reset on open — only fires when the modal transitions from closed → open,
  // not when props like `patients` update while it's already open (avoids
  // clearing the WhatsApp success screen when revalidatePath re-renders the page)
  const wasOpenRef = useRef(false)
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current
    wasOpenRef.current = open
    if (!justOpened) return

    setError('')
    setIsEditing(false)
    setPlaceholderPhone('')
    setAgendadoComWhats(null)

    if (mode === 'create') {
      setSelectedPatient(null)
      setTipo('retorno')
      setLocal('consultorio')
      setDataHora(toDatetimeLocal(defaultDateTime))
      setDuracao(30)
      setObs('')
    } else if (consulta) {
      // Pre-fill for potential edit
      const patient = patients.find((p) => p.id === consulta.patient_id) ?? null
      setSelectedPatient(patient)
      setTipo(consulta.tipo)
      setLocal(consulta.local)
      setDataHora(toDatetimeLocal(consulta.data_hora))
      setDuracao(consulta.duracao_min)
      setObs(consulta.observacoes ?? '')
    }
  }, [open, mode, defaultDateTime, consulta, patients])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!selectedPatient) {
      setError('Selecione um paciente.')
      return
    }
    if (!dataHora) {
      setError('Informe a data e hora.')
      return
    }

    const dataHoraISO = new Date(dataHora).toISOString()

    startTransition(async () => {
      // Se for paciente provisório, cria o perfil primeiro
      let patientId = selectedPatient.id
      const isPlaceholder = patientId === '__placeholder__'
      if (isPlaceholder) {
        const placeholderResult = await createPlaceholderPatient(selectedPatient.full_name ?? '', placeholderPhone || undefined)
        if (!placeholderResult.success || !placeholderResult.data) { setError((!placeholderResult.success ? placeholderResult.error : undefined) ?? 'Erro ao criar paciente'); return }
        patientId = placeholderResult.data.id
      }

      if (mode === 'create') {
        const result = await createConsulta({
          patient_id:  patientId,
          tipo,
          local,
          data_hora:   dataHoraISO,
          duracao_min: duracao,
          observacoes: obs || null,
        })
        if (!result.success) { setError(result.error); return }
        if (isPlaceholder && placeholderPhone) {
          setAgendadoComWhats({ nome: selectedPatient.full_name ?? '', phone: placeholderPhone })
          return
        }
      } else if (consulta) {
        const result = await updateConsulta(consulta.id, {
          patient_id:  patientId,
          tipo,
          local,
          data_hora:   dataHoraISO,
          duracao_min: duracao,
          observacoes: obs || null,
        })
        if (!result.success) { setError(result.error); return }
      }

      router.refresh()
      onClose()
    })
  }

  function handleStatusChange(status: ConsultaStatus) {
    if (!consulta) return
    startTransition(async () => {
      const result = await updateConsultaStatus(consulta.id, status)
      if (!result.success) { setError(result.error); return }
      router.refresh()
      onClose()
    })
  }

  const isCreateOrEdit = mode === 'create' || isEditing

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        mode === 'create'
          ? 'Nova Consulta'
          : isEditing
          ? 'Editar Consulta'
          : 'Detalhes da Consulta'
      }
      className="max-w-lg"
    >
      {/* ── VIEW MODE ─────────────────────────────────── */}
      {mode === 'view' && !isEditing && consulta && (
        <div className="space-y-5">
          {/* Patient */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
              <UserRound className="w-5 h-5 text-primary" />
            </div>
            <div>
              {onNavigateToPatient ? (
                <button
                  type="button"
                  onClick={() => { onNavigateToPatient(consulta.patient_id); onClose() }}
                  className="font-semibold text-primary hover:underline text-left"
                >
                  {consulta.patient?.full_name ?? patients.find((p) => p.id === consulta.patient_id)?.full_name ?? 'Paciente'}
                </button>
              ) : (
                <p className="font-semibold text-gray-900">
                  {consulta.patient?.full_name ?? patients.find((p) => p.id === consulta.patient_id)?.full_name ?? 'Paciente'}
                </p>
              )}
              <p className="text-xs text-gray-500 mt-0.5">
                {TIPO_LABEL[consulta.tipo]}
              </p>
            </div>
            <div className="ml-auto">
              <Badge variant={STATUS_BADGE_VARIANT[consulta.status]}>
                {STATUS_LABEL[consulta.status]}
              </Badge>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-2.5">
              <CalendarDays className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Data e hora</p>
                <p className="text-sm font-medium text-gray-800">
                  {formatDisplayDateTime(consulta.data_hora)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Duração</p>
                <p className="text-sm font-medium text-gray-800">
                  {consulta.duracao_min} minutos
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Local</p>
                <p className="text-sm font-medium text-gray-800">
                  {LOCAL_LABEL[consulta.local]}
                </p>
              </div>
            </div>
          </div>

          {/* Observações */}
          {consulta.observacoes && (
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl">
              <p className="text-xs text-gray-500 mb-1">Observações</p>
              <p className="text-sm text-gray-700 leading-relaxed">{consulta.observacoes}</p>
            </div>
          )}

          {/* Link de cadastro — aparece quando paciente não completou o cadastro */}
          {(() => {
            const patient = patients.find(p => p.id === consulta.patient_id)
            if (patient?.perfil_completo) return null
            const link = 'https://app.meden.health/cadastro'
            return (
              <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-xs text-amber-800 flex-1">Paciente ainda não fez o cadastro completo.</p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(link)
                    setLinkCopiado(true)
                    setTimeout(() => setLinkCopiado(false), 2000)
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors flex-shrink-0"
                >
                  {linkCopiado ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                  {linkCopiado ? 'Copiado!' : 'Copiar link'}
                </button>
              </div>
            )
          })()}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Lembrete WhatsApp */}
          {(() => {
            const patient = patients.find(p => p.id === consulta.patient_id)
            if (!patient?.phone || consulta.status === 'cancelada' || consulta.status === 'realizada') return null
            return (
              <button
                type="button"
                onClick={async () => {
                  const res = await gerarLinksLembrete(consulta.id, window.location.origin)
                  if (!res.success || !res.data) return
                  const dataHora = new Date(consulta.data_hora)
                  const diaSemana = dataHora.toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'America/Sao_Paulo' })
                  const data = dataHora.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' })
                  const hora = dataHora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
                  const medico = doctorName ? `Dr. ${doctorName.split(' ').slice(0, 3).join(' ')}` : 'Dr. Guilherme Santa Catharina'
                  const msg = `Oi ${patient.full_name}, este é um lembrete que você tem uma consulta com ${medico} para ${diaSemana}, dia ${data}, às ${hora}.\n\nClique neste link para confirmar:\n${res.data.confirmar}\n\nOu neste link para cancelar:\n${res.data.cancelar}`
                  const phone = (patient.phone ?? '').replace(/\D/g, '')
                  const phoneIntl = phone.startsWith('55') ? phone : `55${phone}`
                  window.open(`https://wa.me/${phoneIntl}?text=${encodeURIComponent(msg)}`, '_blank')
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-[#25D366] text-white hover:bg-[#1ebe5d] transition-colors"
              >
                <Phone className="w-4 h-4" />
                Enviar lembrete por WhatsApp
              </button>
            )
          })()}

          {/* Iniciar atendimento — só médico */}
          {(currentRole === 'medico' || currentRole === 'superadmin') && onIniciarAtendimento && (
            <button
              type="button"
              onClick={() => {
                onIniciarAtendimento(consulta.patient_id, consulta.id)
                onClose()
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: '#2D2B6B' }}
            >
              <Stethoscope className="w-4 h-4" />
              Iniciar atendimento
            </button>
          )}

          {/* Action buttons */}
          {consulta.status !== 'cancelada' && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex gap-2">
                {consulta.status !== 'realizada' && consulta.status !== 'falta' && consulta.status !== 'em_atendimento' && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </Button>
                )}
                {consulta.status !== 'realizada' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-green-700 hover:bg-green-50"
                    loading={isPending}
                    onClick={() => handleStatusChange('realizada')}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Realizada
                  </Button>
                )}
                {consulta.status !== 'falta' && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="flex-1 text-red-600 hover:bg-red-50"
                    loading={isPending}
                    onClick={() => handleStatusChange('falta')}
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Falta
                  </Button>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-gray-500 hover:bg-red-50 hover:text-red-600"
                loading={isPending}
                onClick={() => handleStatusChange('cancelada')}
              >
                <XCircle className="w-3.5 h-3.5" />
                Cancelar consulta
              </Button>
            </div>
          )}

          {consulta.status === 'cancelada' && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => handleStatusChange('agendada')}
                loading={isPending}
              >
                Reagendar (voltar para Agendada)
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full text-red-600 hover:bg-red-50"
                loading={isPending}
                onClick={async () => {
                  if (!confirm('Excluir este agendamento permanentemente?')) return
                  startTransition(async () => {
                    const res = await deleteConsulta(consulta.id)
                    if (!res.success) { setError(res.error ?? 'Erro ao excluir.'); return }
                    onClose()
                  })
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir permanentemente
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── SUCESSO COM WHATSAPP ──────────────────────── */}
      {agendadoComWhats && (
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">Consulta agendada!</p>
            <p className="text-sm text-gray-500 mt-1">Envie o link de cadastro para <strong>{agendadoComWhats.nome}</strong>.</p>
          </div>
          <a
            href={`https://wa.me/55${agendadoComWhats.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, ${agendadoComWhats.nome.split(' ')[0]}! Sua consulta com o Dr. Guilherme foi agendada. Para finalizar, preencha seu cadastro pelo link: https://app.meden.health/cadastro`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#25D366] text-white rounded-xl text-sm font-semibold hover:bg-[#1ebe5d] transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Enviar link pelo WhatsApp
          </a>
          <button type="button" onClick={onClose} className="w-full text-sm text-gray-500 hover:text-gray-700">
            Fechar
          </button>
        </div>
      )}

      {/* ── CREATE / EDIT FORM ─────────────────────────── */}
      {!agendadoComWhats && isCreateOrEdit && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient search */}
          <PatientSearch
            patients={patients}
            value={selectedPatient}
            onChange={setSelectedPatient}
          />

          {/* Aviso + telefone para paciente provisório */}
          {selectedPatient?.id === '__placeholder__' && (
            <div className="space-y-2.5 px-3 py-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2 text-xs text-amber-800">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span><strong>{selectedPatient.full_name}</strong> será agendado sem cadastro. Adicione o WhatsApp para enviar o link depois.</span>
              </div>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-500" />
                <input
                  type="tel"
                  value={placeholderPhone}
                  onChange={e => setPlaceholderPhone(e.target.value)}
                  placeholder="WhatsApp (opcional)"
                  className="w-full pl-8 pr-3 py-2 border border-amber-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-gray-400"
                />
              </div>
            </div>
          )}

          {/* Tipo + Local */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Tipo <span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                value={tipo}
                onChange={(e) => {
                  const t = e.target.value as ConsultaTipo
                  const opt = tipoOptions.find(o => o.value === t)
                  setTipo(t)
                  if (opt) setDuracao(opt.duracao)
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                {tipoOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.duracao < 60
                      ? `${opt.duracao}min`
                      : opt.duracao % 60 === 0
                        ? `${opt.duracao / 60}h`
                        : `${Math.floor(opt.duracao / 60)}h${opt.duracao % 60}`
                    } · {opt.preco}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Local <span className="text-red-500 ml-0.5">*</span>
              </label>
              <select
                value={local}
                onChange={(e) => setLocal(e.target.value as ConsultaLocal)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="consultorio">Consultório</option>
                <option value="telemedicina">Telemedicina</option>
              </select>
            </div>
          </div>

          {/* Data/hora + Duração */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Data e hora"
              type="datetime-local"
              value={dataHora}
              onChange={(e) => setDataHora(e.target.value)}
              required
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Duração (min)
              </label>
              <input
                type="number"
                min={15}
                max={240}
                step={15}
                value={duracao}
                onChange={(e) => setDuracao(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Observações <span className="text-xs font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              rows={3}
              placeholder="Instruções, preparo, motivo da consulta..."
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => { setIsEditing(false); setError('') }}
                className="flex-1"
              >
                Voltar
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={isPending}
              className={cn(isEditing ? 'flex-1' : 'w-full')}
            >
              {mode === 'create' ? 'Agendar consulta' : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
