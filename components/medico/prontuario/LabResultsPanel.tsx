'use client'

import { useState, useTransition } from 'react'
import type { LabResult } from '@/lib/types'
import { upsertLabResults, deleteLabResult } from '@/app/actions/prontuario'
import { Plus, Save, Loader2, Trash2, FlaskConical, X } from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────
function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

// Constrói mapa {examName → {date → {value, unit, id}}}
function buildGrid(results: LabResult[]) {
  const map: Record<string, Record<string, { value: string; unit: string | null; id: string }>> = {}
  for (const r of results) {
    if (!map[r.exam_name]) map[r.exam_name] = {}
    map[r.exam_name][r.collected_at] = { value: r.value, unit: r.unit, id: r.id }
  }
  return map
}

// ── Tipo auxiliar do formulário de inserção ───────────────────
interface NewRow { exam_name: string; value: string; unit: string }

interface Props {
  labResults: LabResult[]
  patientId:  string
}

export default function LabResultsPanel({ labResults: initial, patientId }: Props) {
  const [results, setResults]        = useState<LabResult[]>(initial)
  const [showForm, setShowForm]      = useState(false)
  const [formDate, setFormDate]      = useState('')
  const [rows, setRows]              = useState<NewRow[]>([{ exam_name: '', value: '', unit: '' }])
  const [formError, setFormError]    = useState('')
  const [deletingId, setDeletingId]  = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Grades
  const grid        = buildGrid(results)
  const examNames   = [...new Set(results.map(r => r.exam_name))].sort()
  // Datas únicas, desc, máx 8 colunas
  const allDates    = [...new Set(results.map(r => r.collected_at))].sort().reverse().slice(0, 8)

  // Form helpers
  function setRow(i: number, field: keyof NewRow, val: string) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r))
  }
  function addRow() { setRows(prev => [...prev, { exam_name: '', value: '', unit: '' }]) }
  function removeRow(i: number) { setRows(prev => prev.filter((_, idx) => idx !== i)) }

  function resetForm() {
    setShowForm(false)
    setFormDate('')
    setRows([{ exam_name: '', value: '', unit: '' }])
    setFormError('')
  }

  function handleSave() {
    if (!formDate) { setFormError('Informe a data de coleta.'); return }
    const filled = rows.filter(r => r.exam_name.trim() && r.value.trim())
    if (filled.length === 0) { setFormError('Preencha pelo menos um exame com valor.'); return }

    setFormError('')
    startTransition(async () => {
      const payload = filled.map(r => ({
        patient_id:   patientId,
        exam_name:    r.exam_name.trim(),
        value:        r.value.trim(),
        unit:         r.unit.trim() || null,
        collected_at: formDate,
      }))
      const res = await upsertLabResults(payload)
      if (!res.success) { setFormError(res.error); return }

      // Atualiza local otimisticamente
      setResults(prev => {
        const updated = [...prev]
        for (const p of payload) {
          const idx = updated.findIndex(
            r => r.exam_name === p.exam_name && r.collected_at === p.collected_at
          )
          if (idx >= 0) {
            updated[idx] = { ...updated[idx], value: p.value, unit: p.unit ?? null }
          } else {
            updated.push({
              ...p,
              id: crypto.randomUUID(),
              consulta_id: null,
              created_at: new Date().toISOString(),
              unit: p.unit ?? null,
            })
          }
        }
        return updated
      })
      resetForm()
    })
  }

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      await deleteLabResult(id)
      setResults(prev => prev.filter(r => r.id !== id))
      setDeletingId(null)
    })
  }

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-800">Resultados Laboratoriais</h3>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-light transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Registrar resultados
          </button>
        )}
      </div>

      {/* Formulário de inserção */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Novo registro</p>
            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Data de coleta */}
          <div className="flex items-center gap-3">
            <label className="text-xs font-medium text-gray-600 whitespace-nowrap">Data da coleta</label>
            <input
              type="date"
              value={formDate}
              onChange={e => setFormDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Linhas de exames */}
          <div className="space-y-2">
            <div className="grid grid-cols-12 gap-2 px-1">
              <span className="col-span-5 text-[11px] font-semibold text-gray-400 uppercase">Exame</span>
              <span className="col-span-4 text-[11px] font-semibold text-gray-400 uppercase">Valor</span>
              <span className="col-span-2 text-[11px] font-semibold text-gray-400 uppercase">Unidade</span>
            </div>
            {rows.map((row, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input
                  list={`exam-names-${i}`}
                  value={row.exam_name}
                  onChange={e => setRow(i, 'exam_name', e.target.value)}
                  placeholder="Creatinina"
                  className="col-span-5 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <datalist id={`exam-names-${i}`}>
                  {examNames.map(n => <option key={n} value={n} />)}
                </datalist>
                <input
                  value={row.value}
                  onChange={e => setRow(i, 'value', e.target.value)}
                  placeholder="1.8"
                  className="col-span-4 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <input
                  value={row.unit}
                  onChange={e => setRow(i, 'unit', e.target.value)}
                  placeholder="mg/dL"
                  className="col-span-2 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {rows.length > 1 && (
                  <button type="button" onClick={() => removeRow(i)} className="col-span-1 flex justify-center text-gray-300 hover:text-red-400">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addRow}
              className="flex items-center gap-1 text-xs text-primary hover:text-primary-light font-medium"
            >
              <Plus className="w-3 h-3" /> Adicionar exame
            </button>
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

      {/* Tabela histórica */}
      {examNames.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-200">
          Nenhum resultado registrado ainda.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide sticky left-0 bg-gray-50 min-w-[160px]">
                  Exame
                </th>
                <th className="px-3 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[60px]">
                  Un.
                </th>
                {allDates.map(d => (
                  <th key={d} className="px-3 py-2.5 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide min-w-[80px] whitespace-nowrap">
                    {formatDate(d)}
                  </th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {examNames.map((name, rowIdx) => {
                const unit = allDates.map(d => grid[name]?.[d]?.unit).find(Boolean) ?? ''
                return (
                  <tr key={name} className={`border-b border-gray-100 ${rowIdx % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="px-4 py-2.5 font-medium text-gray-800 sticky left-0 bg-inherit text-xs">
                      {name}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-400">{unit}</td>
                    {allDates.map(d => {
                      const cell = grid[name]?.[d]
                      return (
                        <td key={d} className="px-3 py-2.5 text-center text-xs">
                          {cell ? (
                            <span className="font-semibold text-gray-800">{cell.value}</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-2 py-2.5">
                      {/* Deletar a entrada mais recente desse exame */}
                      {(() => {
                        const latestDate = allDates.find(d => grid[name]?.[d])
                        const entry = latestDate ? grid[name][latestDate] : null
                        if (!entry) return null
                        return (
                          <button
                            type="button"
                            onClick={() => handleDelete(entry.id)}
                            disabled={deletingId === entry.id}
                            className="p-1 text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors"
                            title="Remover resultado mais recente"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )
                      })()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {allDates.length === 8 && (
        <p className="text-xs text-gray-400 text-center">Exibindo as 8 coletas mais recentes.</p>
      )}
    </div>
  )
}
