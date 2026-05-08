'use client'

import { useState, useTransition, useEffect } from 'react'
import type { Consulta } from '@/lib/types'
import { salvarConsultaFields } from '@/app/actions/prontuario'
import { Save, ClipboardCopy, CheckCircle, Loader2, FileText } from 'lucide-react'

function formatConsultaLabel(c: Consulta) {
  const d = new Date(c.data_hora)
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const tipo = c.tipo === 'primeira_consulta' ? 'Primeira consulta'
    : c.tipo === 'retorno'      ? 'Retorno'
    : c.tipo === 'urgencia'     ? 'Urgência'
    : 'Telemedicina'
  return `${data} — ${tipo}`
}

interface Props {
  consultas: Consulta[]  // já filtradas para este paciente, desc por data
}

export default function DiagnosticosPanel({ consultas }: Props) {
  const realizadas = consultas.filter(c => c.status !== 'cancelada')

  const [selectedId, setSelectedId]   = useState<string>(realizadas[0]?.id ?? '')
  const [localText, setLocalText]     = useState('')
  const [saved, setSaved]             = useState(false)
  const [error, setError]             = useState('')
  const [isPending, startTransition]  = useTransition()

  const selected = realizadas.find(c => c.id === selectedId) ?? null

  // Atualiza o textarea quando muda de consulta
  useEffect(() => {
    setLocalText(selected?.diagnosticos ?? '')
    setSaved(false)
    setError('')
  }, [selectedId])

  // Carry-forward: consulta anterior com diagnosticos preenchidos
  const carrySource = (() => {
    if (!selected || selected.diagnosticos) return null
    const idx = realizadas.findIndex(c => c.id === selected.id)
    return realizadas.slice(idx + 1).find(c => c.diagnosticos) ?? null
  })()

  function handleSave() {
    if (!selected) return
    setError('')
    startTransition(async () => {
      const res = await salvarConsultaFields(selected.id, { diagnosticos: localText })
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
    <div className="space-y-4">
      {/* Seletor de consulta */}
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
              {c.diagnosticos ? '' : ' (sem diagnóstico)'}
            </option>
          ))}
        </select>
      </div>

      {/* Carry-forward */}
      {carrySource && (
        <button
          type="button"
          onClick={() => setLocalText(carrySource.diagnosticos ?? '')}
          className="flex items-center gap-2 w-full px-3 py-2 border border-dashed border-primary/30 bg-blue-50/50 hover:bg-blue-50 text-primary rounded-lg text-xs font-medium transition-colors"
        >
          <ClipboardCopy className="w-3.5 h-3.5 flex-shrink-0" />
          Copiar diagnósticos de {new Date(carrySource.data_hora).toLocaleDateString('pt-BR')}
          <span className="ml-auto text-gray-400 font-normal">carry-forward</span>
        </button>
      )}

      {/* Textarea */}
      <textarea
        value={localText}
        onChange={e => { setLocalText(e.target.value); setSaved(false) }}
        rows={14}
        placeholder={
          `Lista de problemas ativos:\n\n• DRC estágio 3 — HAS\n   → Creatinina 1.8 em 08/05/2026. Estável.\n\n• Diabetes mellitus tipo 2\n   → Glicemia de jejum 102. Bom controle.`
        }
        className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary font-mono"
      />

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {selected?.updated_at
            ? `Consulta em ${new Date(selected.data_hora).toLocaleDateString('pt-BR')}`
            : ''}
        </p>
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
            <><Save className="w-3.5 h-3.5" /> Salvar diagnósticos</>
          )}
        </button>
      </div>
    </div>
  )
}
