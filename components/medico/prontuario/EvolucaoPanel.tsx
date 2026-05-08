'use client'

import { useState, useTransition, useEffect } from 'react'
import type { Consulta } from '@/lib/types'
import { salvarConsultaFields } from '@/app/actions/prontuario'
import { Save, CheckCircle, Loader2, Lock } from 'lucide-react'

interface Props {
  consulta:    Consulta
  isFinalized: boolean
}

export default function EvolucaoPanel({ consulta, isFinalized }: Props) {
  const [evolucao, setEvolucao]       = useState(consulta.evolucao ?? '')
  const [conduta, setConduta]         = useState(consulta.conduta ?? '')
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState('')
  const [isPending, startTransition]  = useTransition()

  // Sincroniza quando a consulta selecionada muda (vem do ProntuarioTab)
  useEffect(() => {
    setEvolucao(consulta.evolucao ?? '')
    setConduta(consulta.conduta ?? '')
    setSaved(false)
    setError('')
  }, [consulta.id])

  function handleSave() {
    setError('')
    startTransition(async () => {
      const res = await salvarConsultaFields(consulta.id, { evolucao, conduta })
      if (!res.success) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  // ── Modo read-only (finalizado) ───────────────────────────
  if (isFinalized) {
    return (
      <div className="space-y-5">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Evolução</p>
          {evolucao ? (
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
              {evolucao}
            </div>
          ) : (
            <div className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-400 italic">
              Não preenchido.
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Conduta</p>
          {conduta ? (
            <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-mono">
              {conduta}
            </div>
          ) : (
            <div className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-400 italic">
              Não preenchido.
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Lock className="w-3 h-3" />
          Prontuário finalizado · campos somente leitura
        </div>
      </div>
    )
  }

  // ── Modo edição ───────────────────────────────────────────
  return (
    <div className="space-y-5">

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
            <><Save className="w-3.5 h-3.5" /> Salvar rascunho</>
          )}
        </button>
      </div>

    </div>
  )
}
