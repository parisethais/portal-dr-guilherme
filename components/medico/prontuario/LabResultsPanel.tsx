'use client'

import { useState, useTransition } from 'react'
import type { LabResult } from '@/lib/types'
import { upsertLabResults, deleteLabResult } from '@/app/actions/prontuario'
import { EXAM_CATALOG, EXAM_GROUPS, EXAM_BY_NAME, classifyValue } from '@/lib/lab-catalog'
import { Plus, Save, Loader2, Trash2, FlaskConical, X, CalendarPlus } from 'lucide-react'

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// Constrói grid: examName → date → {value, unit, id}
function buildGrid(results: LabResult[]) {
  const map: Record<string, Record<string, { value: string; unit: string | null; id: string }>> = {}
  for (const r of results) {
    if (!map[r.exam_name]) map[r.exam_name] = {}
    map[r.exam_name][r.collected_at] = { value: r.value, unit: r.unit, id: r.id }
  }
  return map
}

// Cor da célula baseada na classificação
function cellCls(status: 'normal' | 'warn' | 'crit' | null) {
  if (status === 'crit') return 'bg-red-100 text-red-800 font-bold'
  if (status === 'warn') return 'bg-amber-50 text-amber-800 font-semibold'
  return 'text-gray-800'
}

interface Props {
  labResults: LabResult[]
  patientId: string
}

export default function LabResultsPanel({ labResults: initial, patientId }: Props) {
  const [results, setResults] = useState<LabResult[]>(initial)
  // editingDate: a data que está sendo inserida (nova coluna)
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [pickerDate, setPickerDate]   = useState('')
  const [showPicker, setShowPicker]   = useState(false)
  // editValues: examName → {value, unit}
  const [editValues, setEditValues]   = useState<Record<string, { value: string; unit: string }>>({})
  const [formError, setFormError]     = useState('')
  const [isPending, startTransition]  = useTransition()
  // deletingDate: confirmar exclusão de coluna
  const [deletingDate, setDeletingDate] = useState<string | null>(null)

  const grid    = buildGrid(results)
  const allDates = [...new Set(results.map(r => r.collected_at))].sort().reverse()

  function startNewDate() {
    setShowPicker(true)
    setPickerDate('')
    setEditingDate(null)
    setEditValues({})
    setFormError('')
  }

  function confirmDate() {
    if (!pickerDate) return
    // Se já existe, ir para edição dessa data
    setEditingDate(pickerDate)
    setShowPicker(false)
    // Pré-preenche com valores existentes para essa data
    const prefill: Record<string, { value: string; unit: string }> = {}
    for (const def of EXAM_CATALOG) {
      const existing = grid[def.name]?.[pickerDate]
      if (existing) prefill[def.name] = { value: existing.value, unit: existing.unit ?? def.unit }
      else prefill[def.name] = { value: '', unit: def.unit }
    }
    setEditValues(prefill)
    setFormError('')
  }

  function cancelEdit() {
    setEditingDate(null)
    setShowPicker(false)
    setEditValues({})
    setFormError('')
  }

  function setExamEdit(name: string, field: 'value' | 'unit', val: string) {
    setEditValues(prev => ({ ...prev, [name]: { ...prev[name], [field]: val } }))
  }

  function handleSave() {
    if (!editingDate) return
    const filled = EXAM_CATALOG
      .map(def => ({ def, v: editValues[def.name] }))
      .filter(({ v }) => v?.value?.trim())
    if (filled.length === 0) { setFormError('Preencha pelo menos um valor.'); return }
    setFormError('')
    startTransition(async () => {
      const payload = filled.map(({ def, v }) => ({
        patient_id: patientId,
        exam_name: def.name,
        value: v.value.trim(),
        unit: v.unit || def.unit,
        collected_at: editingDate,
      }))
      const res = await upsertLabResults(payload)
      if (!res.success) { setFormError(res.error); return }
      setResults(prev => {
        const updated = [...prev]
        for (const p of payload) {
          const idx = updated.findIndex(r => r.exam_name === p.exam_name && r.collected_at === p.collected_at)
          if (idx >= 0) updated[idx] = { ...updated[idx], value: p.value, unit: p.unit ?? null }
          else updated.push({ ...p, id: crypto.randomUUID(), consulta_id: null, created_at: new Date().toISOString(), unit: p.unit ?? null })
        }
        return updated
      })
      cancelEdit()
    })
  }

  function handleDeleteColumn(date: string) {
    const ids = results.filter(r => r.collected_at === date).map(r => r.id)
    startTransition(async () => {
      for (const id of ids) await deleteLabResult(id)
      setResults(prev => prev.filter(r => r.collected_at !== date))
      setDeletingDate(null)
    })
  }

  // Colunas exibidas: datas existentes + coluna em edição (se nova)
  const displayDates = editingDate && !allDates.includes(editingDate)
    ? [editingDate, ...allDates]
    : allDates

  return (
    <div className="space-y-3">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-800">Resultados Laboratoriais</h3>
        </div>
        {!editingDate && !showPicker && (
          <button
            type="button"
            onClick={startNewDate}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-light transition-colors"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Novo registro
          </button>
        )}
      </div>

      {/* ── Seletor de data ── */}
      {showPicker && (
        <div className="flex items-center gap-3 p-3 bg-blue-50/60 border border-primary/20 rounded-xl">
          <p className="text-xs font-semibold text-gray-600 whitespace-nowrap">Data da coleta</p>
          <input
            type="date"
            value={pickerDate}
            onChange={e => setPickerDate(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            type="button"
            onClick={confirmDate}
            disabled={!pickerDate}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-primary-light transition-colors"
          >
            Iniciar
          </button>
          <button type="button" onClick={cancelEdit} className="ml-auto text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Tabela ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-xs" style={{ minWidth: displayDates.length > 0 ? 420 + displayDates.length * 100 : 420 }}>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              {/* Coluna nome — sticky */}
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide min-w-[200px]">
                Exame
              </th>
              <th className="px-3 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide min-w-[80px]">
                Un.
              </th>
              {displayDates.map(d => (
                <th key={d} className="px-3 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wide min-w-[90px] whitespace-nowrap">
                  <div className="flex flex-col items-center gap-0.5">
                    <span className={d === editingDate ? 'text-primary' : ''}>{fmtDate(d)}</span>
                    {d !== editingDate && (
                      <button
                        type="button"
                        onClick={() => setDeletingDate(d)}
                        className="text-gray-200 hover:text-red-400 transition-colors"
                        title="Excluir coluna"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                    {d === editingDate && (
                      <span className="text-[9px] text-primary font-bold">editando</span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {EXAM_GROUPS.map(group => {
              const groupExams = EXAM_CATALOG.filter(e => e.group === group)
              return (
                <>
                  {/* Separador de grupo */}
                  <tr key={`g-${group}`} className="bg-gray-50/80 border-y border-gray-100">
                    <td
                      colSpan={2 + displayDates.length}
                      className="sticky left-0 px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                    >
                      {group}
                    </td>
                  </tr>
                  {groupExams.map((def, idx) => {
                    const hasAltUnits = (def.altUnits?.length ?? 0) > 0
                    // Unidade atual: pega a unidade registrada mais recente ou a padrão
                    const recordedUnit = allDates.map(d => grid[def.name]?.[d]?.unit).find(Boolean) ?? null

                    return (
                      <tr
                        key={def.name}
                        className={`border-b border-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        {/* Nome (sticky) */}
                        <td className={`sticky left-0 z-10 px-4 py-2 font-medium text-gray-700 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}>
                          {def.name}
                        </td>

                        {/* Unidade */}
                        <td className="px-3 py-2 text-gray-400 whitespace-nowrap">
                          {editingDate
                            ? (hasAltUnits
                              ? <select
                                  value={editValues[def.name]?.unit ?? def.unit}
                                  onChange={e => setExamEdit(def.name, 'unit', e.target.value)}
                                  className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-primary"
                                >
                                  {[def.unit, ...(def.altUnits ?? [])].map(u => (
                                    <option key={u} value={u}>{u}</option>
                                  ))}
                                </select>
                              : <span>{def.unit}</span>)
                            : <span>{recordedUnit ?? def.unit}</span>
                          }
                        </td>

                        {/* Células de dados */}
                        {displayDates.map(d => {
                          const isEditing = d === editingDate
                          const cell = grid[def.name]?.[d]
                          const unitForStatus = isEditing
                            ? (editValues[def.name]?.unit ?? def.unit)
                            : (cell?.unit ?? recordedUnit ?? def.unit)
                          const valForStatus = isEditing
                            ? (editValues[def.name]?.value ?? '')
                            : (cell?.value ?? '')
                          const status = classifyValue(def, valForStatus, unitForStatus)

                          if (isEditing) {
                            return (
                              <td key={d} className={`px-2 py-1.5 text-center ${status ? cellCls(status) : ''}`}>
                                <input
                                  type="text"
                                  value={editValues[def.name]?.value ?? ''}
                                  onChange={e => setExamEdit(def.name, 'value', e.target.value)}
                                  placeholder="—"
                                  className={`w-full text-center border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary ${
                                    status === 'crit' ? 'border-red-300 bg-red-50' :
                                    status === 'warn' ? 'border-amber-300 bg-amber-50' :
                                    'border-gray-200 bg-white'
                                  }`}
                                />
                              </td>
                            )
                          }

                          return (
                            <td key={d} className={`px-3 py-2 text-center ${status ? cellCls(status) : ''}`}>
                              {cell
                                ? <span>{cell.value}</span>
                                : <span className="text-gray-200">—</span>
                              }
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ── Legenda + ações de edição ── */}
      {editingDate && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 inline-block border border-amber-200" /> Pouco alterado</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block border border-red-200" /> Muito alterado</span>
          </div>
          {formError && (
            <p className="text-xs text-red-600">{formError}</p>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button type="button" onClick={cancelEdit} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors">
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors"
            >
              {isPending ? <><Loader2 className="w-3 h-3 animate-spin" /> Salvando...</> : <><Save className="w-3 h-3" /> Salvar coleta</>}
            </button>
          </div>
        </div>
      )}

      {!editingDate && allDates.length > 0 && (
        <div className="flex items-center gap-3 text-xs text-gray-400 justify-end">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-100 inline-block border border-amber-200" /> Pouco alterado</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 inline-block border border-red-200" /> Muito alterado</span>
        </div>
      )}

      {/* Modal de confirmar exclusão de coluna */}
      {deletingDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <p className="text-sm font-semibold text-gray-800">Excluir coleta de {fmtDate(deletingDate)}?</p>
            <p className="text-xs text-gray-500">Todos os resultados dessa data serão removidos permanentemente.</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setDeletingDate(null)} className="px-3 py-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button type="button" onClick={() => handleDeleteColumn(deletingDate)} disabled={isPending}
                className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50">
                {isPending ? 'Excluindo...' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
