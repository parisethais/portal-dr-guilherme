'use client'

import { useState, useTransition } from 'react'
import type { ImagingResult, ImagingTipo } from '@/lib/types'
import { upsertImagingResult, deleteImagingResult } from '@/app/actions/prontuario'
import { Plus, Save, Loader2, Trash2, ScanLine, X } from 'lucide-react'

// ── Labels ────────────────────────────────────────────────────
const TIPO_LABELS: Record<ImagingTipo, string> = {
  usg_rins:   'USG Rins e Vias Urinárias',
  eco:        'Ecocardiograma',
  tc_torax:   'TC Tórax',
  tc_abdomen: 'TC Abdômen',
  ecg:        'Eletrocardiograma (ECG)',
  outro:      'Outro',
}

const TIPOS: ImagingTipo[] = ['usg_rins', 'eco', 'tc_torax', 'tc_abdomen', 'ecg', 'outro']

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

interface Props {
  imagingResults: ImagingResult[]
  patientId: string
}

interface FormState {
  tipo: ImagingTipo
  data_realizado: string
  laudo_resumido: string
}

export default function ImagingPanel({ imagingResults: initial, patientId }: Props) {
  const [results, setResults]        = useState<ImagingResult[]>(initial)
  const [showForm, setShowForm]      = useState(false)
  const [form, setForm]              = useState<FormState>({ tipo: 'usg_rins', data_realizado: '', laudo_resumido: '' })
  const [editingId, setEditingId]    = useState<string | null>(null)
  const [formError, setFormError]    = useState('')
  const [deletingId, setDeletingId]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Most recent per tipo
  const latestByTipo: Partial<Record<ImagingTipo, ImagingResult>> = {}
  for (const r of [...results].sort((a, b) => b.data_realizado.localeCompare(a.data_realizado))) {
    if (!latestByTipo[r.tipo]) latestByTipo[r.tipo] = r
  }
  const displayTipos = TIPOS.filter(t => latestByTipo[t])

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setForm({ tipo: 'usg_rins', data_realizado: '', laudo_resumido: '' })
    setFormError('')
  }

  function openEdit(r: ImagingResult) {
    setEditingId(r.id)
    setForm({ tipo: r.tipo, data_realizado: r.data_realizado, laudo_resumido: r.laudo_resumido ?? '' })
    setShowForm(true)
    setFormError('')
  }

  function handleSave() {
    if (!form.data_realizado) { setFormError('Informe a data de realização.'); return }
    setFormError('')
    startTransition(async () => {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        patient_id:     patientId,
        tipo:           form.tipo,
        data_realizado: form.data_realizado,
        laudo_resumido: form.laudo_resumido.trim() || null,
      }
      const res = await upsertImagingResult(payload)
      if (!res.success) { setFormError(res.error); return }

      const newId = res.data?.id ?? editingId ?? crypto.randomUUID()
      setResults(prev => {
        const without = prev.filter(r => r.id !== newId)
        return [...without, {
          id:             newId,
          patient_id:     patientId,
          tipo:           form.tipo,
          data_realizado: form.data_realizado,
          laudo_resumido: form.laudo_resumido.trim() || null,
          created_at:     new Date().toISOString(),
        }]
      })
      resetForm()
    })
  }

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      await deleteImagingResult(id)
      setResults(prev => prev.filter(r => r.id !== id))
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScanLine className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-800">Exames de Imagem</h3>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-light transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Registrar exame
          </button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              {editingId ? 'Editar exame' : 'Novo exame de imagem'}
            </p>
            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Tipo de exame</label>
              <select
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value as ImagingTipo }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                {TIPOS.map(t => (
                  <option key={t} value={t}>{TIPO_LABELS[t]}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Data de realização</label>
              <input
                type="date"
                value={form.data_realizado}
                onChange={e => setForm(f => ({ ...f, data_realizado: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Laudo resumido <span className="text-gray-400 font-normal">(opcional)</span></label>
            <textarea
              value={form.laudo_resumido}
              onChange={e => setForm(f => ({ ...f, laudo_resumido: e.target.value }))}
              rows={4}
              placeholder="Ex: Rins de tamanho normal, sem litíase. Bexiga sem alterações."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {formError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
          )}

          <div className="flex gap-2 justify-end">
            <button type="button" onClick={resetForm}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 rounded-lg transition-colors">
              Cancelar
            </button>
            <button type="button" onClick={handleSave} disabled={isPending}
              className="flex items-center gap-2 px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors">
              {isPending ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</> : <><Save className="w-3.5 h-3.5" /> Salvar</>}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {displayTipos.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-200">
          Nenhum exame de imagem registrado ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {displayTipos.map(tipo => {
            const r = latestByTipo[tipo]!
            // All results for this tipo sorted desc
            const history = results
              .filter(x => x.tipo === tipo)
              .sort((a, b) => b.data_realizado.localeCompare(a.data_realizado))
            return (
              <div key={tipo} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <ScanLine className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm font-semibold text-gray-800">{TIPO_LABELS[tipo]}</span>
                    <span className="text-xs text-gray-400 font-normal">· mais recente: {formatDate(r.data_realizado)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="text-xs text-primary hover:text-primary-light font-medium transition-colors"
                  >
                    Editar
                  </button>
                </div>

                {r.laudo_resumido && (
                  <div className="px-4 py-3">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{r.laudo_resumido}</p>
                  </div>
                )}

                {/* Histórico de outras datas */}
                {history.length > 1 && (
                  <div className="px-4 pb-3 pt-1 space-y-1">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Histórico</p>
                    {history.slice(1).map(h => (
                      <div key={h.id} className="flex items-start gap-3 py-1.5 border-t border-gray-100">
                        <span className="text-xs text-gray-400 whitespace-nowrap mt-0.5">{formatDate(h.data_realizado)}</span>
                        <span className="text-xs text-gray-600 flex-1">{h.laudo_resumido ?? '—'}</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(h.id)}
                          disabled={deletingId === h.id}
                          className="p-1 text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors flex-shrink-0"
                          title="Remover"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Delete most recent if it's the only one */}
                {history.length === 1 && (
                  <div className="flex justify-end px-3 pb-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="p-1 text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors"
                      title="Remover exame"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
