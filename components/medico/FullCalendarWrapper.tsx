'use client'

// Este componente é importado via dynamic() com ssr:false, portanto todos os
// imports do FullCalendar ficam isolados do servidor.
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin  from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction'
import { type EventClickArg } from '@fullcalendar/core'
import ptBrLocale from '@fullcalendar/core/locales/pt-br'
import type { CalendarEvent } from './AgendaTab'
import type { Consulta } from '@/lib/types'
import type { GoogleEvent } from '@/lib/google-calendar'

interface Props {
  events:                 CalendarEvent[]
  onDateClick:            (dateStr: string, allDay: boolean) => void
  onEventClick:           (ev: { source: 'crm' | 'google'; consulta?: Consulta; googleEvent?: GoogleEvent }) => void
  onNavigateToPatient?:   (patientId: string) => void
}

export default function FullCalendarWrapper({ events, onDateClick, onEventClick, onNavigateToPatient }: Props) {
  function handleDateClick(info: DateClickArg) {
    onDateClick(info.dateStr, info.allDay)
  }

  function handleEventClick(info: EventClickArg) {
    const props = info.event.extendedProps as CalendarEvent['extendedProps']
    onEventClick(props)
  }

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="timeGridWeek"
      locale={ptBrLocale}
      headerToolbar={{
        left:   'prev,next today',
        center: 'title',
        right:  'dayGridMonth,timeGridWeek,timeGridDay',
      }}
      buttonText={{
        today: 'Hoje',
        month: 'Mês',
        week:  'Semana',
        day:   'Dia',
      }}
      events={events}
      dateClick={handleDateClick}
      eventClick={handleEventClick}
      height="auto"
      slotMinTime="07:00:00"
      slotMaxTime="20:00:00"
      slotDuration="00:30:00"
      allDaySlot={true}
      nowIndicator={true}
      expandRows={true}
      eventDisplay="block"
      displayEventTime={false}
      dayMaxEvents={3}
      eventContent={(info) => {
        const props = info.event.extendedProps as CalendarEvent['extendedProps']
        const title = info.event.title

        const dotIndex = title.indexOf(' · ')

        if (props.source !== 'crm' || !props.consulta || !onNavigateToPatient || dotIndex === -1) {
          return (
            <div className="overflow-hidden text-ellipsis whitespace-nowrap text-[11px] leading-tight px-0.5">
              {title}
            </div>
          )
        }

        const timePart = title.slice(0, dotIndex + 3)
        const namePart = title.slice(dotIndex + 3)
        const patientId = props.consulta.patient_id

        return (
          <div className="overflow-hidden whitespace-nowrap text-[11px] leading-tight px-0.5">
            <span className="opacity-90">{timePart}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onNavigateToPatient(patientId)
              }}
              className="font-semibold hover:underline"
              title="Ver prontuário"
            >
              {namePart}
            </button>
          </div>
        )
      }}
    />
  )
}
