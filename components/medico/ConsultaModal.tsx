'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import { createConsulta, updateConsulta, updateConsultaStatus } from '@/app/actions/consultas'
import type { Profile, Consulta, ConsultaTipo, ConsultaLocal, ConsultaStatus } from '@/lib/types'
import { cn } from '@/lib/utils'
import {
  UserRound, MapPin, Clock, CalendarDays,
  CheckCircle2, XCircle, AlertCircle, Pencil, ChevronDown,
} from 'lucide-react'

// ── Labels ────────────────────────────────────────────────

export const TIPO_LABEL: Record<ConsultaTipo, string> = {
  primeira_consulta:          'Primeira Consulta',
  nova_consulta:              'Nova Consulta',
  retorno:                    'Retorno',
  primeira_consulta_desconto: 'Primeira Consulta (Desconto)',
  nova_consulta_desconto:     'Nova Consulta (Desconto)',
}

export const TIPO_INFO: Record<ConsultaTipo, { duracao: number; preco: string }> = {
  primeira_consulta:          { duracao: 75, preco: 'R$1.000' },
  nova_consulta:              { duracao: 45, preco: 'R$1.000' },
  retorno:                    { duracao: 30, preco: 'Gratuito' },
  primeira_consulta_desconto: { duracao: 75, preco: 'R$500'   },
  nova_consulta_desconto:     { duracao: 45, preco: 'R$500'   },
}

export const LOCAL_LABEL: Record<ConsultaLocal, string> = {
  consultorio:  'Consultório',
  telemedicina: 'Telemedicina',
}

export const STATUS_LABEL: Record<ConsultaStatus, string> = {
  agendada:   'Agendada',
  confirmada: 'Confirmada',
  realizada:  'Realizada',
  falta:      'Falta',
  cancelada:  'Cancelada',
}

export const STATUS_BADGE_VARIANT: Record<ConsultaStatus, 'blue' | 'green' | 'gray' | 'red'> = {
  agendada:   'blue',
  confirmada: 'green',
  realizada:  'gray',
  falta:      'red',
  cancelada:  'gray',
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
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3">
          <p className="text-sm text-gray-400">Nenhum paciente encontrado.</p>
        </div>
      )}
    </div>
  )
}

// ── Date/time helpers ──────────────────────────────────────

function toDatetimeLocal(isoOrPartial: string): string {
  if (!isoOrPartial) return ''
  // If allDay click (YYYY-MM-DD), default to 08:00
  if (/^\d{4}-\d{2}-\d{2}$/.test(isoOrPartial)) {
    return isoOrPartial + 'T08:00'
  }
  // Otherwise slice to 16 chars: YYYY-MM-DDTHH:mm
  return isoOrPartial.slice(0, 16)
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
}

export default function ConsultaModal({
  open,
  onClose,
  mode,
  patients,
  defaultDateTime = '',
  consulta,
}: ConsultaModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Create / Edit form state
  const [selectedPatient, setSelectedPatient] = useState<Profile | null>(null)
  const [tipo, setTipo]         = useState<ConsultaTipo>('retorno')
  const [local, setLocal]       = useState<ConsultaLocal>('consultorio')
  const [dataHora, setDataHora] = useState('')
  const [duracao, setDuracao]   = useState(30)
  const [obs, setObs]           = useState('')

  // Reset on open
  useEffect(() => {
    if (!open) return
    setError('')
    setIsEditing(false)

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
      if (mode === 'create') {
        const result = await createConsulta({
          patient_id:  selectedPatient.id,
          tipo,
          local,
          data_hora:   dataHoraISO,
          duracao_min: duracao,
          observacoes: obs || null,
        })
        if (!result.success) { setError(result.error); return }
      } else if (consulta) {
        const result = await updateConsulta(consulta.id, {
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
              <p className="font-semibold text-gray-900">
                {consulta.patient?.full_name ?? patients.find((p) => p.id === consulta.patient_id)?.full_name ?? 'Paciente'}
              </p>
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

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Action buttons */}
          {consulta.status !== 'cancelada' && (
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex gap-2">
                {consulta.status !== 'realizada' && consulta.status !== 'falta' && (
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
            <div className="border-t border-gray-100 pt-4">
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
            </div>
          )}
        </div>
      )}

      {/* ── CREATE / EDIT FORM ─────────────────────────── */}
      {isCreateOrEdit && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Patient search */}
          <PatientSearch
            patients={patients}
            value={selectedPatient}
            onChange={setSelectedPatient}
          />

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
                  setTipo(t)
                  setDuracao(TIPO_INFO[t].duracao)
                }}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="primeira_consulta">Primeira Consulta — 1h15 · R$1.000</option>
                <option value="nova_consulta">Nova Consulta — 45min · R$1.000</option>
                <option value="retorno">Retorno — 30min · Gratuito</option>
                <option value="primeira_consulta_desconto">Primeira Consulta (Desconto) — 1h15 · R$500</option>
                <option value="nova_consulta_desconto">Nova Consulta (Desconto) — 45min · R$500</option>
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
