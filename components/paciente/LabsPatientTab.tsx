'use client'

import { EXAM_CATALOG } from '@/lib/lab-catalog'
import { FlaskConical } from 'lucide-react'

interface LabResult {
  id:           string
  exam_name:    string
  value:        string
  unit:         string | null
  collected_at: string
}

interface Props {
  labResults: LabResult[]
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function getStatus(examName: string, value: string): 'normal' | 'atencao' | 'alterado' {
  const def = EXAM_CATALOG.find(d => d.name === examName)
  if (!def || def.noRef) return 'normal'
  const num = parseFloat(value.replace(',', '.'))
  if (isNaN(num)) return 'normal'
  if (def.critLow  !== undefined && num <= def.critLow)  return 'alterado'
  if (def.critHigh !== undefined && num >= def.critHigh) return 'alterado'
  if (def.warnLow  !== undefined && num <  def.warnLow)  return 'atencao'
  if (def.warnHigh !== undefined && num >  def.warnHigh) return 'atencao'
  if (def.refMin   !== undefined && num <  def.refMin)   return 'atencao'
  if (def.refMax   !== undefined && num >  def.refMax)   return 'atencao'
  return 'normal'
}

function getRef(examName: string): string {
  const def = EXAM_CATALOG.find(d => d.name === examName)
  if (!def || def.noRef) return '—'
  if (def.refMin !== undefined && def.refMax !== undefined) return `${def.refMin}–${def.refMax}`
  if (def.refMax !== undefined) return `≤ ${def.refMax}`
  if (def.refMin !== undefined) return `≥ ${def.refMin}`
  return '—'
}

export default function LabsPatientTab({ labResults }: Props) {
  if (labResults.length === 0) {
    return (
      <div className="py-12 text-center">
        <FlaskConical className="w-8 h-8 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Nenhum resultado laboratorial disponível ainda.</p>
      </div>
    )
  }

  // Agrupa por data de coleta
  const byDate: Record<string, LabResult[]> = {}
  for (const r of labResults) {
    ;(byDate[r.collected_at] ??= []).push(r)
  }
  const dates = Object.keys(byDate).sort().reverse()

  return (
    <div className="space-y-6">
      {dates.map(date => (
        <div key={date}>
          {/* Cabeçalho da coleta */}
          <div className="flex items-center gap-2 mb-3">
            <FlaskConical className="w-3.5 h-3.5 text-primary/60" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Coleta de {fmtDate(date)}
            </span>
          </div>

          {/* Tabela */}
          <div className="rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">Exame</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide">Resultado</th>
                  <th className="px-4 py-2.5 text-right text-xs font-semibold text-gray-400 uppercase tracking-wide hidden sm:table-cell">Referência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {byDate[date].map(r => {
                  const status = getStatus(r.exam_name, r.value)
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-700">{r.exam_name}</td>
                      <td className="px-4 py-2.5 text-right font-semibold">
                        <span className={
                          status === 'alterado' ? 'text-red-600' :
                          status === 'atencao'  ? 'text-amber-600' :
                          'text-gray-800'
                        }>
                          {r.value}{r.unit ? ` ${r.unit}` : ''}
                        </span>
                        {status !== 'normal' && (
                          <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                            status === 'alterado'
                              ? 'bg-red-50 text-red-500'
                              : 'bg-amber-50 text-amber-500'
                          }`}>
                            {status === 'alterado' ? 'Alterado' : 'Atenção'}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-gray-400 hidden sm:table-cell">
                        {getRef(r.exam_name)}
                        {r.unit ? ` ${r.unit}` : ''}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <p className="text-[11px] text-gray-300 text-center pt-2">
        Valores marcados como "Alterado" ou "Atenção" podem ter sido discutidos com seu médico. Em caso de dúvidas, entre em contato com o consultório.
      </p>
    </div>
  )
}
