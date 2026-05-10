'use client'

import Modal from '@/components/ui/Modal'
import type { Consulta, Profile } from '@/lib/types'
import { STATUS_COLORS } from './AgendaTab'
import { TIPO_LABEL, LOCAL_LABEL, STATUS_LABEL } from './ConsultaModal'
import { CalendarDays, Clock, MapPin, Plus, UserRound } from 'lucide-react'

interface DayViewModalProps {
  open: boolean
  onClose: () => void
  date: string           // YYYY-MM-DD
  consultas: Consulta[]  // já filtradas para o dia
  patients: Profile[]
  onSelectConsulta: (c: Consulta) => void
  onNewConsulta: (dateStr: string) => void
}

function formatDayTitle(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00') // evita problema de timezone
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).replace(/^\w/, (c) => c.toUpperCase())
}

function formatHora(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function DayViewModal({
  open,
  onClose,
  date,
  consultas,
  patients,
  onSelectConsulta,
  onNewConsulta,
}: DayViewModalProps) {
  const patientMap: Record<string, string> = {}
  patients.forEach((p) => { patientMap[p.id] = p.full_name ?? 'Paciente' })

  const sorted = [...consultas].sort((a, b) => a.data_hora.localeCompare(b.data_hora))

  return (
    <Modal open={open} onClose={onClose} title={formatDayTitle(date)} className="max-w-md">
      <div className="space-y-4">
        {/* Consultas do dia */}
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-2 text-gray-400">
            <CalendarDays className="w-8 h-8" />
            <p className="text-sm">Nenhuma consulta agendada para este dia.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((c) => {
              const colors = STATUS_COLORS[c.status]
              const name   = c.patient?.full_name ?? patientMap[c.patient_id] ?? 'Paciente'
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => { onClose(); setTimeout(() => onSelectConsulta(c), 80) }}
                  className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50 transition-all duration-100 group"
                >
                  {/* Status bar */}
                  <div
                    className="w-1 self-stretch rounded-full flex-shrink-0"
                    style={{ backgroundColor: colors.bg }}
                  />

                  {/* Time */}
                  <div className="flex-shrink-0 text-center w-12">
                    <p className="text-sm font-bold text-gray-900">{formatHora(c.data_hora)}</p>
                    <p className="text-[10px] text-gray-400">{c.duracao_min}min</p>
                  </div>

                  {/* Patient + info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(26,31,46,0.07)' }}>
                        <UserRound className="w-3 h-3" style={{ color: '#1A1F2E' }} />
                      </div>
                      <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-500">{TIPO_LABEL[c.tipo]}</span>
                      <span className="text-gray-300">·</span>
                      <span className="flex items-center gap-0.5 text-xs text-gray-400">
                        <MapPin className="w-3 h-3" />
                        {LOCAL_LABEL[c.local]}
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className="flex-shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: colors.bg, color: colors.text }}
                  >
                    {STATUS_LABEL[c.status]}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Separator */}
        <div className="border-t border-gray-100 pt-3">
          <button
            type="button"
            onClick={() => { onClose(); setTimeout(() => onNewConsulta(date + 'T08:00'), 80) }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors text-white"
            style={{ backgroundColor: '#1A1F2E' }}
          >
            <Plus className="w-4 h-4" />
            Nova consulta neste dia
          </button>
        </div>
      </div>
    </Modal>
  )
}
