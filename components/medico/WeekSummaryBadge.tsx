'use client'

import { useState, useRef, useEffect } from 'react'
import { CalendarDays, ChevronRight } from 'lucide-react'

export interface ConsultaSummaryItem {
  id:          string
  patientName: string
  dataHora:    string
}

interface Props {
  hoje:   ConsultaSummaryItem[]
  semana: ConsultaSummaryItem[]
}

function fmt(iso: string) {
  const d = new Date(iso)
  return {
    dia:  d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: 'numeric', month: 'short' }),
    hora: d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
  }
}

export default function WeekSummaryBadge({ hoje, semana }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  const nHoje   = hoje.length
  const nSemana = semana.length

  let label: string
  if (nHoje > 0) {
    label = `${nHoje} consulta${nHoje > 1 ? 's' : ''} hoje · ${nSemana} esta semana`
  } else if (nSemana > 0) {
    label = `Sem consultas hoje · ${nSemana} esta semana`
  } else {
    label = 'Nenhuma consulta esta semana.'
  }

  return (
    <div ref={ref} className="relative inline-block mt-1.5">
      <button
        onClick={() => nSemana > 0 && setOpen(v => !v)}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors group"
      >
        <CalendarDays className="w-3.5 h-3.5 shrink-0" />
        <span>{label}</span>
        {nSemana > 0 && (
          <ChevronRight
            className="w-3 h-3 transition-transform"
            style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
          />
        )}
      </button>

      {open && (
        <div
          className="absolute left-0 top-full mt-2 z-50 bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[280px]"
          style={{ boxShadow: '0 4px 24px rgba(26,31,46,0.12)' }}
        >
          {/* Hoje */}
          {nHoje > 0 && (
            <>
              <p className="px-4 pt-1 pb-1 text-[10px] font-semibold tracking-widest uppercase text-gray-400">Hoje</p>
              {hoje.map(c => {
                const { hora } = fmt(c.dataHora)
                return (
                  <div key={c.id} className="flex items-center justify-between px-4 py-1.5 hover:bg-gray-50">
                    <span className="text-sm text-gray-800 truncate max-w-[180px]">{c.patientName}</span>
                    <span className="text-xs text-gray-400 ml-3 shrink-0">{hora}</span>
                  </div>
                )
              })}
            </>
          )}

          {/* Restante da semana */}
          {semana.filter(c => !hoje.find(h => h.id === c.id)).length > 0 && (
            <>
              <p className="px-4 pt-2 pb-1 text-[10px] font-semibold tracking-widest uppercase text-gray-400">
                {nHoje > 0 ? 'Resto da semana' : 'Esta semana'}
              </p>
              {semana
                .filter(c => !hoje.find(h => h.id === c.id))
                .map(c => {
                  const { dia, hora } = fmt(c.dataHora)
                  return (
                    <div key={c.id} className="flex items-center justify-between px-4 py-1.5 hover:bg-gray-50">
                      <span className="text-sm text-gray-800 truncate max-w-[160px]">{c.patientName}</span>
                      <span className="text-xs text-gray-400 ml-3 shrink-0 capitalize">{dia} {hora}</span>
                    </div>
                  )
                })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
