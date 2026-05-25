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
  events:         CalendarEvent[]
  onDateClick:    (dateStr: string, allDay: boolean) => void
  onEventClick:   (ev: { source: 'crm' | 'google'; consulta?: Consulta; googleEvent?: GoogleEvent }) => void
}

export default function FullCalendarWrapper({ events, onDateClick, onEventClick }: Props) {
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
      allDaySlot={false}
      nowIndicator={true}
      expandRows={true}
      eventDisplay="block"
      displayEventTime={true}
      dayMaxEvents={3}
    />
  )
}
