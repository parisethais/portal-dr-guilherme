'use client'

import { useState, useTransition, useEffect } from 'react'
import type { Consulta } from '@/lib/types'
import { salvarConsultaFields } from '@/app/actions/prontuario'
import { Save, CheckCircle, Loader2, FileText } from 'lucide-react'

function formatConsultaLabel(c: Consulta) {
  const d = new Date(c.data_hora)
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const tipo = c.tipo === 'primeira_consulta' ? 'Primeira consulta'
    : c.tipo === 'retorno'      ? 'Retorno'
    : c.tipo === 'urgencia'     ? 'Urgência'
    : 'Telemedicina'
  return `${data} ${hora} — ${tipo}`
}

interface Props {
  consultas: Consulta[]
}

export default function EvolucaoPanel({ consultas }: Props) {
  const realizadas = consultas.filter(c => c.status !== 'cancelada')

  const [selectedId, setSelectedId]  = useState<string>(realizadas[0]?.id ?? '')
  const [evolucao, setEvolucao]      = useState('')
  const [conduta, setConduta]        = useState('')
  const [saved, setSaved]            = useState(false)
  const [error, setError]            = useState('')
  const [isPending, startTransition] = useTransition()

  const selected = realizadas.find(c => c.id === selectedId) ?? null

  useEffect(() => {
    setEvolucao(selected?.evolucao ?? '')
    setConduta(selected?.conduta ?? '')
    setSaved(false)
    setError('')
  }, [selectedId])

  function handleSave() {
    if (!selected) return
    setError('')
    startTransition(async () => {
      const res = await salvarConsultaFields(selected.id, { evolucao, conduta })
      if (!res.success) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  if (realizadas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-10 h-10 text-gray-200 mb-3" />
        <p className="text-sm text-gray-400">Nenhuma consulta registrada para este paciente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Seletor */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
          Consulta
        </label>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
        >
          {realizadas.map(c => (
            <option key={c.id} value={c.id}>
              {formatConsultaLabel(c)}
            </option>
          ))}
        </select>
      </div>

      {/* Evolução */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Evolução
        </label>
        <textarea
          value={evolucao}
          onChange={e => { setEvolucao(e.target.value); setSaved(false) }}
          rows={6}
          placeholder="Descreva o que aconteceu nessa consulta, queixas do paciente, exame físico relevante..."
          className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Conduta */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Conduta
        </label>
        <textarea
          value={conduta}
          onChange={e => { setConduta(e.target.value); setSaved(false) }}
          rows={6}
          placeholder={`1. Manter losartana 50mg 1x/dia\n2. Solicitar creatinina, ureia e potássio\n3. Retorno em 3 meses`}
          className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary font-mono"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors"
        >
          {isPending ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
          ) : saved ? (
            <><CheckCircle className="w-3.5 h-3.5" /> Salvo!</>
          ) : (
            <><Save className="w-3.5 h-3.5" /> Salvar evolução e conduta</>
          )}
        </button>
      </div>
    </div>
  )
}
