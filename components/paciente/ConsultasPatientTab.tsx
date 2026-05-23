'use client'

import { useState } from 'react'
import { Stethoscope, ChevronDown, MapPin, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Consulta {
  id:           string
  data_hora:    string
  tipo:         string
  local:        string
  status:       string
  conduta:      string | null
  retorno_previsto?: string | null
  diagnosticos: string | null
}

interface Props {
  consultas: Consulta[]
}

const TIPO_LABEL: Record<string, string> = {
  primeira_consulta:          'Primeira Consulta',
  nova_consulta:              'Nova Consulta',
  retorno:                    'Retorno',
  primeira_consulta_desconto: 'Primeira Consulta',
  nova_consulta_desconto:     'Nova Consulta',
}

const LOCAL_LABEL: Record<string, string> = {
  consultorio:    'Presencial',
  telemedicina:   'Telemedicina',
  domicilio:      'Domiciliar',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

function fmtDateShort(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function ConsultaCard({ c }: { c: Consulta }) {
  const [open, setOpen] = useState(false)

  let diagnosticos: { nome: string }[] = []
  try { if (c.diagnosticos) diagnosticos = JSON.parse(c.diagnosticos) } catch { /* ignore */ }

  const hasDetails = c.conduta || diagnosticos.length > 0

  return (
    <div className="rounded-xl border border-gray-100 overflow-hidden">
      <div
        className={cn('flex items-start gap-3 p-4', hasDetails && 'cursor-pointer hover:bg-gray-50/50 transition-colors')}
        onClick={() => hasDetails && setOpen(v => !v)}
      >
        {/* Ícone */}
        <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0 mt-0.5">
          <Stethoscope className="w-4 h-4 text-primary/70" />
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-gray-800">
              {TIPO_LABEL[c.tipo] ?? c.tipo}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {LOCAL_LABEL[c.local] ?? c.local}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{fmtDate(c.data_hora)}</p>

          {c.retorno_previsto && (
            <p className="text-xs text-primary/70 mt-1.5 flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              Retorno previsto: {fmtDateShort(c.retorno_previsto)}
            </p>
          )}
        </div>

        {hasDetails && (
          <ChevronDown className={cn('w-4 h-4 text-gray-300 shrink-0 transition-transform mt-1', open && 'rotate-180')} />
        )}
      </div>

      {/* Detalhes expandidos */}
      {open && hasDetails && (
        <div className="px-4 pb-4 pt-0 space-y-3 border-t border-gray-50">
          {diagnosticos.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Diagnósticos</p>
              <div className="flex flex-wrap gap-1.5">
                {diagnosticos.map((d, i) => (
                  <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-primary/8 text-primary/80 font-medium">
                    {d.nome}
                  </span>
                ))}
              </div>
            </div>
          )}
          {c.conduta && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Conduta</p>
              <p className="text-xs text-gray-600 leading-relaxed whitespace-pre-line">{c.conduta}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ConsultasPatientTab({ consultas }: Props) {
  const realizadas = consultas
    .filter(c => c.status === 'realizada')
    .sort((a, b) => b.data_hora.localeCompare(a.data_hora))

  if (realizadas.length === 0) {
    return (
      <div className="py-12 text-center">
        <Stethoscope className="w-8 h-8 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Nenhuma consulta realizada ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {realizadas.map(c => <ConsultaCard key={c.id} c={c} />)}
    </div>
  )
}
