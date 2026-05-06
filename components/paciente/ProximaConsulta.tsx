import type { Consulta } from '@/lib/types'
import { CalendarDays, MapPin, Clock } from 'lucide-react'

const TIPO_LABEL: Record<string, string> = {
  primeira_consulta: 'Primeira Consulta',
  retorno:           'Retorno',
  urgencia:          'Urgência',
  telemedicina:      'Telemedicina',
}

const LOCAL_LABEL: Record<string, string> = {
  consultorio:  'Consultório',
  telemedicina: 'Telemedicina',
}

function formatDataHora(isoString: string) {
  const d = new Date(isoString)
  const data = d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  // Capitalize first letter
  return { data: data.charAt(0).toUpperCase() + data.slice(1), hora }
}

function diasRestantes(isoString: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const consulta = new Date(isoString)
  consulta.setHours(0, 0, 0, 0)
  return Math.round((consulta.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

interface Props {
  consulta: Consulta | null
}

export default function ProximaConsulta({ consulta }: Props) {
  if (!consulta) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-500 mb-6">
        <CalendarDays className="w-4 h-4 text-gray-400 flex-shrink-0" />
        <span>Nenhuma consulta agendada no momento.</span>
      </div>
    )
  }

  const { data, hora } = formatDataHora(consulta.data_hora)
  const dias = diasRestantes(consulta.data_hora)

  let diasLabel = ''
  if (dias === 0) diasLabel = 'Hoje'
  else if (dias === 1) diasLabel = 'Amanhã'
  else if (dias > 1) diasLabel = `Em ${dias} dias`

  return (
    <div className="mb-6 bg-white border border-primary/20 rounded-2xl shadow-sm overflow-hidden">
      {/* Header strip */}
      <div className="flex items-center justify-between px-5 py-3 bg-primary/5 border-b border-primary/10">
        <div className="flex items-center gap-2 text-primary">
          <CalendarDays className="w-4 h-4" />
          <span className="text-sm font-semibold">Próxima Consulta</span>
        </div>
        {diasLabel && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            dias === 0
              ? 'bg-amber-100 text-amber-700'
              : dias <= 3
              ? 'bg-blue-100 text-primary'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {diasLabel}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Date/time block */}
        <div className="flex-1">
          <p className="text-base font-semibold text-gray-900">{data}</p>
          <div className="flex items-center gap-1.5 mt-1 text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-sm">{hora}</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm">{consulta.duracao_min} min</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-primary/10 text-primary rounded-full">
            {TIPO_LABEL[consulta.tipo] ?? consulta.tipo}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
            <MapPin className="w-3 h-3" />
            {LOCAL_LABEL[consulta.local] ?? consulta.local}
          </span>
        </div>
      </div>

      {consulta.observacoes && (
        <div className="px-5 pb-4">
          <p className="text-xs text-gray-500 leading-relaxed">{consulta.observacoes}</p>
        </div>
      )}
    </div>
  )
}
