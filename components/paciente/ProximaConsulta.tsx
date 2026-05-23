import type { Consulta } from '@/lib/types'
import { CalendarDays, MapPin, Clock, ChevronDown } from 'lucide-react'

const TIPO_LABEL: Record<string, string> = {
  primeira_consulta:          'Primeira Consulta',
  primeira_consulta_desconto: 'Primeira Consulta',
  nova_consulta:              'Nova Consulta',
  nova_consulta_desconto:     'Nova Consulta',
  retorno:                    'Retorno',
}

const LOCAL_LABEL: Record<string, string> = {
  consultorio:  'Consultório',
  telemedicina: 'Telemedicina',
  domicilio:    'Domiciliar',
}

function formatDataHora(isoString: string) {
  const d = new Date(isoString)
  const data = d.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
  const hora = d.toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
  return { data: data.charAt(0).toUpperCase() + data.slice(1), hora }
}

function formatDataCurta(isoString: string) {
  return new Date(isoString).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  })
}

function formatHora(isoString: string) {
  return new Date(isoString).toLocaleTimeString('pt-BR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
  })
}

function diasRestantes(isoString: string): number {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const consulta = new Date(isoString)
  consulta.setHours(0, 0, 0, 0)
  return Math.round((consulta.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
}

interface Props {
  consultas: Consulta[]  // todas as futuras, ordenadas por data_hora asc
}

export default function ProximaConsulta({ consultas }: Props) {
  if (!consultas || consultas.length === 0) {
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

  const proxima   = consultas[0]
  const restantes = consultas.slice(1)
  const { data, hora } = formatDataHora(proxima.data_hora)
  const dias = diasRestantes(proxima.data_hora)

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
          <span className="text-sm font-semibold" style={{ color: '#2D2B6B' }}>
            Próxima Consulta
          </span>
          {consultas.length > 1 && (
            <span className="text-xs text-gray-400 font-normal">
              + {consultas.length - 1} agendada{consultas.length - 1 > 1 ? 's' : ''}
            </span>
          )}
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

      {/* Consulta principal */}
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <p className="text-base font-semibold text-gray-900">{data}</p>
          <div className="flex items-center gap-1.5 mt-1 text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-sm">{hora}</span>
            <span className="text-gray-300">·</span>
            <span className="text-sm">{proxima.duracao_min} min</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: 'rgba(45,43,107,0.08)', color: '#2D2B6B' }}
          >
            {TIPO_LABEL[proxima.tipo] ?? proxima.tipo}
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-full">
            <MapPin className="w-3 h-3" />
            {LOCAL_LABEL[proxima.local] ?? proxima.local}
          </span>
        </div>
      </div>

      {proxima.observacoes && (
        <div className="px-5 pb-3">
          <p className="text-xs text-gray-400 leading-relaxed">{proxima.observacoes}</p>
        </div>
      )}

      {/* Próximas consultas (colapsadas) */}
      {restantes.length > 0 && (
        <details className="group">
          <summary
            className="flex items-center gap-2 px-5 py-3 text-xs font-medium text-gray-400 cursor-pointer select-none hover:text-gray-600 transition-colors list-none"
            style={{ borderTop: '1px solid rgba(45,43,107,0.06)' }}
          >
            <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
            Ver outras {restantes.length} consulta{restantes.length > 1 ? 's' : ''} agendada{restantes.length > 1 ? 's' : ''}
          </summary>
          <div className="px-5 pb-4 space-y-2">
            {restantes.map(c => (
              <div key={c.id} className="flex items-center justify-between gap-3 py-2 border-t border-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-700">{formatDataCurta(c.data_hora)}</p>
                  <p className="text-xs text-gray-400">{formatHora(c.data_hora)} · {TIPO_LABEL[c.tipo] ?? c.tipo}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                  {LOCAL_LABEL[c.local] ?? c.local}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
