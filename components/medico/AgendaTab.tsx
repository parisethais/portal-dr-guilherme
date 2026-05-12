'use client'

import { useState } from 'react'
import type { Profile, Consulta, ConsultaStatus, ConsultaTipo } from '@/lib/types'
import ConsultaModal, { TIPO_LABEL } from './ConsultaModal'
import DayViewModal from './DayViewModal'
import { CalendarDays, Plus } from 'lucide-react'

// Dynamic imports to avoid SSR issues
import dynamic from 'next/dynamic'

const FullCalendarComponent = dynamic(
  () => import('./FullCalendarWrapper'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[600px] flex items-center justify-center bg-gray-50 rounded-xl border border-gray-200">
        <div className="flex flex-col items-center gap-2 text-gray-400">
          <CalendarDays className="w-8 h-8 animate-pulse" />
          <span className="text-sm">Carregando calendário...</span>
        </div>
      </div>
    ),
  }
)

// ── Cores por tipo de consulta ─────────────────────────────

export const TIPO_COLORS: Record<ConsultaTipo, { bg: string; border: string; text: string }> = {
  primeira_consulta:          { bg: '#1e40af', border: '#1d4ed8', text: '#ffffff' },
  primeira_consulta_desconto: { bg: '#2563eb', border: '#3b82f6', text: '#ffffff' },
  nova_consulta:              { bg: '#0f766e', border: '#0d9488', text: '#ffffff' },
  nova_consulta_desconto:     { bg: '#14b8a6', border: '#0d9488', text: '#ffffff' },
  retorno:                    { bg: '#1a3a5c', border: '#122840', text: '#ffffff' },
}

// Mantido para compatibilidade com DayViewModal/outros componentes
export const STATUS_COLORS: Record<ConsultaStatus, { bg: string; border: string; text: string }> = {
  agendada:   { bg: '#1a3a5c', border: '#122840', text: '#ffffff' },
  confirmada: { bg: '#16a34a', border: '#15803d', text: '#ffffff' },
  realizada:  { bg: '#9ca3af', border: '#6b7280', text: '#ffffff' },
  falta:      { bg: '#dc2626', border: '#b91c1c', text: '#ffffff' },
  cancelada:  { bg: '#d1d5db', border: '#9ca3af', text: '#6b7280' },
}

// ── Types for FullCalendarWrapper ──────────────────────────

export interface CalendarEvent {
  id:             string
  title:          string
  start:          string
  end:            string
  backgroundColor: string
  borderColor:    string
  textColor:      string
  classNames:     string[]
  extendedProps:  { consulta: Consulta }
}

// ── Legend por tipo ────────────────────────────────────────

function TipoLegend() {
  const tipos = Object.keys(TIPO_COLORS) as ConsultaTipo[]
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      {tipos.map(tipo => (
        <div key={tipo} className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm inline-block flex-shrink-0"
            style={{ backgroundColor: TIPO_COLORS[tipo].bg }}
          />
          <span className="text-xs text-gray-500">{TIPO_LABEL[tipo]}</span>
        </div>
      ))}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────

interface AgendaTabProps {
  consultas: Consulta[]
  patients:  Profile[]
}

export default function AgendaTab({ consultas, patients }: AgendaTabProps) {
  const [createModal, setCreateModal] = useState<{ open: boolean; defaultDateTime: string }>({
    open: false,
    defaultDateTime: '',
  })
  const [viewModal, setViewModal] = useState<{ open: boolean; consulta: Consulta | null }>({
    open: false,
    consulta: null,
  })
  const [dayModal, setDayModal] = useState<{ open: boolean; date: string }>({
    open: false,
    date: '',
  })

  // Build a patient name lookup map
  const patientMap: Record<string, string> = {}
  patients.forEach((p) => {
    patientMap[p.id] = p.full_name ?? 'Paciente'
  })

  // Transform consultas → FullCalendar events
  const events: CalendarEvent[] = consultas.map((c) => {
    const startDate   = new Date(c.data_hora)
    const endDate     = new Date(startDate.getTime() + c.duracao_min * 60_000)
    const tipoColors  = TIPO_COLORS[c.tipo]
    const patientName = c.patient?.full_name ?? patientMap[c.patient_id] ?? 'Paciente'
    const hora        = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

    // Consultas passadas (realizada/falta/cancelada) ficam mais apagadas
    const isPast    = ['realizada', 'falta', 'cancelada'].includes(c.status)
    const isFalta   = c.status === 'falta'

    return {
      id:              c.id,
      title:           `${c.local === 'telemedicina' ? '📹 ' : ''}${hora} · ${patientName}`,
      start:           startDate.toISOString(),
      end:             endDate.toISOString(),
      backgroundColor: isPast ? '#9ca3af' : tipoColors.bg,
      borderColor:     isFalta ? '#dc2626' : (isPast ? '#6b7280' : tipoColors.border),
      textColor:       tipoColors.text,
      classNames:      c.status === 'cancelada' ? ['fc-event-cancelada'] : [],
      extendedProps:   { consulta: c },
    }
  })

  function handleDateClick(dateStr: string, allDay: boolean) {
    const dateOnly = dateStr.slice(0, 10)
    if (allDay) {
      // Clique no dia na view mensal → abre o day modal
      setDayModal({ open: true, date: dateOnly })
    } else {
      // Clique em horário específico (view semana/dia) → abre direto para criar
      setCreateModal({ open: true, defaultDateTime: dateStr.slice(0, 16) })
    }
  }

  function handleEventClick(consulta: Consulta) {
    setViewModal({ open: true, consulta })
  }

  return (
    <div className="space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <TipoLegend />
        <button
          type="button"
          onClick={() => setCreateModal({ open: true, defaultDateTime: '' })}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-light transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nova consulta
        </button>
      </div>

      {/* Calendar */}
      <div
        className="rounded-2xl overflow-hidden p-5"
        style={{
          backgroundColor: 'rgba(255,255,255,0.80)',
          border: '1px solid rgba(26,31,46,0.07)',
          boxShadow: '0 1px 12px rgba(26,31,46,0.05)',
        }}
      >
        <FullCalendarComponent
          events={events}
          onDateClick={handleDateClick}
          onEventClick={handleEventClick}
        />
      </div>

      {/* Create modal */}
      <ConsultaModal
        open={createModal.open}
        onClose={() => setCreateModal({ open: false, defaultDateTime: '' })}
        mode="create"
        patients={patients}
        defaultDateTime={createModal.defaultDateTime}
      />

      {/* View/edit modal */}
      {viewModal.consulta && (
        <ConsultaModal
          open={viewModal.open}
          onClose={() => setViewModal({ open: false, consulta: null })}
          mode="view"
          patients={patients}
          consulta={viewModal.consulta}
        />
      )}

      {/* Day view modal */}
      <DayViewModal
        open={dayModal.open}
        onClose={() => setDayModal({ open: false, date: '' })}
        date={dayModal.date}
        consultas={consultas.filter((c) => c.data_hora.startsWith(dayModal.date))}
        patients={patients}
        onSelectConsulta={(c) => setViewModal({ open: true, consulta: c })}
        onNewConsulta={(dt) => setCreateModal({ open: true, defaultDateTime: dt })}
      />
    </div>
  )
}
