import type { Consulta } from '@/lib/types'
import { CalendarDays, MapPin, Clock } from 'lucide-react'

const TIPO_LABEL: Record<string, string> = {
  primeira_consulta:          'Primeira Consulta',
  primeira_consulta_desconto: 'Primeira Consulta (Desconto)',
  nova_consulta:              'Nova Consulta',
  nova_consulta_desconto:     'Nova Consulta (Desconto)',
  retorno:                    'Retorno',
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
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-gray-400 mb-6 border border-black/[0.06]"
        style={{ backgroundColor: 'rgba(255,255,255,0.55)', backdropFilter: 'blur(10px)' }}
      >
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
    <div
      className="mb-6 rounded-2xl overflow-hidden border border-white/60"
      style={{
        backdropFilter: 'blur(14px)',
        backgroundColor: 'rgba(255,255,255,0.72)',
        boxShadow: '0 2px 24px rgba(26,31,46,0.08), 0 1px 4px rgba(26,31,46,0.04)',
      }}
    >
      {/* Header strip */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid rgba(45,43,107,0.07)', backgroundColor: 'rgba(122,158,126,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4" style={{ color: '#7A9E7E' }} />
          <span className="text-sm font-semibold" style={{ color: '#2D2B6B' }}>Próxima Consulta</span>
        </div>
        {diasLabel && (
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full"
            style={
              dias === 0
                ? { backgroundColor: 'rgba(184,148,63,0.12)', color: '#B8943F' }
                : dias <= 3
                ? { backgroundColor: 'rgba(45,43,107,0.08)', color: '#2D2B6B' }
                : { backgroundColor: 'rgba(0,0,0,0.05)', color: '#6B7280' }
            }
          >
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
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(45,43,107,0.08)', color: '#2D2B6B' }}
          >
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
          <p className="text-xs text-gray-400 leading-relaxed">{consulta.observacoes}</p>
        </div>
      )}
    </div>
  )
}
