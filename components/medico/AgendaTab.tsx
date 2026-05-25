'use client'

import { useState, useEffect } from 'react'
import type { Profile, Consulta, ConsultaStatus, ConsultaTipo } from '@/lib/types'
import ConsultaModal, { TIPO_LABEL } from './ConsultaModal'
import DayViewModal from './DayViewModal'
import { CalendarDays, Plus, RefreshCw } from 'lucide-react'
import type { GoogleCalendarInfo, GoogleEvent } from '@/lib/google-calendar'

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

// Cores distintas para cada tipo — fáceis de diferenciar na legenda e no calendário
export const TIPO_COLORS: Record<ConsultaTipo, { bg: string; border: string; text: string }> = {
  primeira_consulta:          { bg: '#1e40af', border: '#1d4ed8', text: '#ffffff' }, // azul escuro
  nova_consulta:              { bg: '#0f766e', border: '#0d9488', text: '#ffffff' }, // verde-azulado
  retorno:                    { bg: '#475569', border: '#334155', text: '#ffffff' }, // cinza-ardósia
  primeira_consulta_desconto: { bg: '#b45309', border: '#d97706', text: '#ffffff' }, // âmbar/laranja
  nova_consulta_desconto:     { bg: '#6d28d9', border: '#7c3aed', text: '#ffffff' }, // roxo
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
  id:              string
  title:           string
  start:           string
  end:             string
  allDay?:         boolean
  backgroundColor: string
  borderColor:     string
  textColor:       string
  classNames:      string[]
  extendedProps:   {
    source:       'crm' | 'google'
    consulta?:    Consulta
    googleEvent?: GoogleEvent
  }
}

const CONSULTORIO_COLOR = '#2D2B6B'

// ── Google Event popup ─────────────────────────────────────

interface GoogleEventPopupProps {
  event: GoogleEvent
  onClose: () => void
}

function GoogleEventPopup({ event, onClose }: GoogleEventPopupProps) {
  const start = event.start.dateTime
    ? new Date(event.start.dateTime).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })
    : event.start.date ?? ''
  const end = event.end.dateTime
    ? new Date(event.end.dateTime).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 space-y-3"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <span
            className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
            style={{ backgroundColor: event.calendarColor }}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm leading-snug">{event.summary}</p>
            <p className="text-xs text-gray-400 mt-0.5">{event.calendarName}</p>
          </div>
        </div>
        <p className="text-xs text-gray-600 pl-6">
          {start}{end ? ` → ${end}` : ''}
        </p>
        {event.location && (
          <p className="text-xs text-gray-500 pl-6">📍 {event.location}</p>
        )}
        {event.description && (
          <p className="text-xs text-gray-500 pl-6 line-clamp-3">{event.description}</p>
        )}
        {event.htmlLink && (
          <a
            href={event.htmlLink}
            target="_blank"
            rel="noreferrer"
            className="block text-center text-xs text-primary underline pl-6"
          >
            Abrir no Google Agenda
          </a>
        )}
        <button
          onClick={onClose}
          className="w-full text-sm text-gray-400 hover:text-gray-600 pt-1"
        >
          Fechar
        </button>
      </div>
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
  const [googleEventPopup, setGoogleEventPopup] = useState<GoogleEvent | null>(null)

  // Filtros de categoria
  const [consultorioHidden, setConsultorioHidden] = useState(false)
  const [hiddenTipos,       setHiddenTipos]       = useState<Set<ConsultaTipo>>(new Set())

  // Google Calendar state
  const [googleConnected,  setGoogleConnected]  = useState(false)
  const [googleCalendars,  setGoogleCalendars]  = useState<GoogleCalendarInfo[]>([])
  const [googleEvents,     setGoogleEvents]     = useState<GoogleEvent[]>([])
  const [hiddenCalendars,  setHiddenCalendars]  = useState<Set<string>>(new Set())
  const [googleLoading,    setGoogleLoading]    = useState(true)

  const LS_KEY = 'agenda_hidden_calendars'

  useEffect(() => {
    // Restaura preferências de calendários ocultos do localStorage
    try {
      const saved = localStorage.getItem(LS_KEY)
      if (saved) setHiddenCalendars(new Set(JSON.parse(saved)))
    } catch {}

    fetch('/api/google/calendars')
      .then(r => r.json())
      .then(data => {
        setGoogleConnected(data.connected ?? false)
        setGoogleCalendars(data.calendars ?? [])
        setGoogleEvents(data.events ?? [])
      })
      .catch(() => {})
      .finally(() => setGoogleLoading(false))
  }, [])

  function toggleCalendar(id: string) {
    setHiddenCalendars(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      try { localStorage.setItem(LS_KEY, JSON.stringify([...next])) } catch {}
      return next
    })
  }

  function toggleTipo(tipo: ConsultaTipo) {
    setHiddenTipos(prev => {
      const next = new Set(prev)
      next.has(tipo) ? next.delete(tipo) : next.add(tipo)
      return next
    })
  }

  // Build a patient name lookup map
  const patientMap: Record<string, string> = {}
  patients.forEach((p) => {
    patientMap[p.id] = p.full_name ?? 'Paciente'
  })

  // Transform consultas → FullCalendar events (filtradas por consultorio + tipo)
  const crmEvents: CalendarEvent[] = consultorioHidden ? [] : consultas.filter(c => !hiddenTipos.has(c.tipo)).map((c) => {
    const startDate   = new Date(c.data_hora)
    const endDate     = new Date(startDate.getTime() + c.duracao_min * 60_000)
    const tipoColors  = TIPO_COLORS[c.tipo]
    const patientName = c.patient?.full_name ?? patientMap[c.patient_id] ?? 'Paciente'
    const hora        = startDate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const isPast      = ['realizada', 'falta', 'cancelada'].includes(c.status)
    const isFalta     = c.status === 'falta'

    return {
      id:              c.id,
      title:           `${c.local === 'telemedicina' ? '📹 ' : ''}${hora} · ${patientName}`,
      start:           startDate.toISOString(),
      end:             endDate.toISOString(),
      backgroundColor: isPast ? '#9ca3af' : tipoColors.bg,
      borderColor:     isFalta ? '#dc2626' : (isPast ? '#6b7280' : tipoColors.border),
      textColor:       tipoColors.text,
      classNames:      c.status === 'cancelada' ? ['fc-event-cancelada'] : [],
      extendedProps:   { source: 'crm', consulta: c },
    }
  })

  // Transform Google events → FullCalendar events (filtered by hidden calendars)
  const gEvents: CalendarEvent[] = googleEvents
    .filter(ev => !hiddenCalendars.has(ev.calendarId))
    .map(ev => {
      const start    = ev.start.dateTime ?? ev.start.date ?? ''
      const end      = ev.end.dateTime   ?? ev.end.date   ?? ''
      const isAllDay = !ev.start.dateTime  // sem horário = dia inteiro
      const hora     = ev.start.dateTime
        ? new Date(ev.start.dateTime).toLocaleTimeString('pt-BR', {
            hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
          })
        : ''
      // Eventos com duração > 4h ficam como "all day" para não dominar a grade horária
      let displayStart = start
      let displayEnd   = end
      let allDay       = isAllDay
      if (ev.start.dateTime && ev.end.dateTime) {
        const durH = (new Date(ev.end.dateTime).getTime() - new Date(ev.start.dateTime).getTime()) / 3_600_000
        if (durH >= 4) {
          allDay       = true
          displayStart = start.slice(0, 10)
          displayEnd   = end.slice(0, 10)
        }
      }
      return {
        id:              ev.id,
        title:           allDay && !isAllDay ? `${hora} · ${ev.summary}` : (hora ? `${hora} · ${ev.summary}` : ev.summary),
        start:           displayStart,
        end:             displayEnd,
        allDay,
        backgroundColor: ev.calendarColor + 'BB',
        borderColor:     ev.calendarColor,
        textColor:       '#ffffff',
        classNames:      ['fc-google-event'],
        extendedProps:   { source: 'google', googleEvent: ev },
      }
    })

  const events = [...crmEvents, ...gEvents]

  function handleDateClick(dateStr: string, allDay: boolean) {
    const dateOnly = dateStr.slice(0, 10)
    if (allDay) {
      setDayModal({ open: true, date: dateOnly })
    } else {
      setCreateModal({ open: true, defaultDateTime: dateStr.slice(0, 16) })
    }
  }

  function handleEventClick(ev: { source: 'crm' | 'google'; consulta?: Consulta; googleEvent?: GoogleEvent }) {
    if (ev.source === 'crm' && ev.consulta) {
      setViewModal({ open: true, consulta: ev.consulta })
    } else if (ev.source === 'google' && ev.googleEvent) {
      setGoogleEventPopup(ev.googleEvent)
    }
  }

  const tipos = Object.keys(TIPO_COLORS) as ConsultaTipo[]

  return (
    <div className="space-y-3">
      {/* ── Filtros de categoria ── */}
      <div className="space-y-2">
        {/* Linha 1: categorias principais */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-wrap items-center gap-2">

            {/* Chip: Consultório (CRM) */}
            <button
              onClick={() => setConsultorioHidden(h => !h)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
              style={{
                backgroundColor: consultorioHidden ? 'transparent' : CONSULTORIO_COLOR + '18',
                borderColor:     consultorioHidden ? '#d1d5db' : CONSULTORIO_COLOR,
                color:           consultorioHidden ? '#9ca3af' : CONSULTORIO_COLOR,
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: consultorioHidden ? '#d1d5db' : CONSULTORIO_COLOR }} />
              Consultório
            </button>

            {/* Chips: Google Calendars (só os ativos) */}
            {googleCalendars.filter(cal => !hiddenCalendars.has(cal.id)).map(cal => (
              <button
                key={cal.id}
                onClick={() => toggleCalendar(cal.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                style={{
                  backgroundColor: cal.color + '22',
                  borderColor:     cal.color,
                  color:           cal.color,
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cal.color }} />
                {cal.name}
              </button>
            ))}
            {googleLoading && <RefreshCw className="w-3.5 h-3.5 text-gray-300 animate-spin" />}
          </div>

          <button
            type="button"
            onClick={() => setCreateModal({ open: true, defaultDateTime: '' })}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova consulta
          </button>
        </div>

        {/* Linha 2: subtipos do Consultório (só quando visível) */}
        {!consultorioHidden && (
          <div className="flex flex-wrap items-center gap-1.5 pl-1">
            <span className="text-[10px] text-gray-300 uppercase tracking-wider mr-0.5">Tipo:</span>
            {tipos.map(tipo => {
              const hidden = hiddenTipos.has(tipo)
              const color  = TIPO_COLORS[tipo].bg
              return (
                <button
                  key={tipo}
                  onClick={() => toggleTipo(tipo)}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-all"
                  style={{
                    backgroundColor: hidden ? 'transparent' : color + '18',
                    borderColor:     hidden ? '#e5e7eb' : color,
                    color:           hidden ? '#9ca3af' : color,
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: hidden ? '#d1d5db' : color }} />
                  {TIPO_LABEL[tipo]}
                </button>
              )
            })}
          </div>
        )}
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

      {/* Google event popup */}
      {googleEventPopup && (
        <GoogleEventPopup
          event={googleEventPopup}
          onClose={() => setGoogleEventPopup(null)}
        />
      )}
    </div>
  )
}
