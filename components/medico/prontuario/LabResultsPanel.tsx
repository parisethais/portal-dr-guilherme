'use client'

import { useState, useTransition, useRef } from 'react'
import type { LabResult } from '@/lib/types'
import { upsertLabResults, deleteLabResult } from '@/app/actions/prontuario'
import { extractLabResultsFromFile } from '@/app/actions/lab-ocr'
import { EXAM_CATALOG, EXAM_GROUPS, classifyValue, type ExamDef } from '@/lib/lab-catalog'
import {
  Plus, Save, Loader2, Trash2, FlaskConical, X, CalendarPlus,
  Upload, PenLine, Sparkles, AlertCircle,
} from 'lucide-react'

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
  if (status === 'warn') return 'bg-amber-100 text-amber-800 font-semibold'
  return 'text-gray-800'
}

// Formata faixa de referência para exibição
function fmtN(n: number): string {
  if (Math.abs(n) >= 10000) return `${Math.round(n / 1000)}k`
  if (Number.isInteger(n)) return String(n)
  return String(n)
}

function formatRef(def: ExamDef, unit: string | null): string {
  if (def.noRef) return '—'
  if (def.qualitative) return def.normalAnswer ?? '—'
  const ranges = (unit && def.unitRanges?.[unit] ? def.unitRanges[unit] : def) as Partial<ExamDef>
  const { refMin, refMax } = ranges
  if (refMin !== undefined && refMax !== undefined) return `${fmtN(refMin)}–${fmtN(refMax)}`
  if (refMax !== undefined) return `≤ ${fmtN(refMax)}`
  if (refMin !== undefined) return `≥ ${fmtN(refMin)}`
  return '—'
}

// Direção do desvio em relação à faixa normal
function getDirection(def: ExamDef, value: string, unit: string | null): 'high' | 'low' | null {
  if (!value || def.qualitative || def.noRef) return null
  const num = parseFloat(value.replace(',', '.'))
  if (isNaN(num)) return null
  const ranges = (unit && def.unitRanges?.[unit] ? def.unitRanges[unit] : def) as Partial<ExamDef>
  if (ranges.refMax !== undefined && num > ranges.refMax) return 'high'
  if (ranges.refMin !== undefined && num < ranges.refMin) return 'low'
  return null
}

interface Props {
  labResults: LabResult[]
  patientId: string
}

export default function LabResultsPanel({ labResults: initial, patientId }: Props) {
  const [results, setResults]         = useState<LabResult[]>(initial)
  const [editingDate, setEditingDate] = useState<string | null>(null)
  const [pickerDate, setPickerDate]   = useState('')
  // 'idle' | 'choose' | 'manual-picker' | 'upload-picker'
  const [mode, setMode]               = useState<'idle' | 'choose' | 'manual-picker' | 'upload-picker'>('idle')
  const [editValues, setEditValues]   = useState<Record<string, { value: string; unit: string }>>({})
  const [isOcrReview, setIsOcrReview] = useState(false)
  const [ocrLoading, setOcrLoading]   = useState(false)
  const [ocrError, setOcrError]       = useState('')
  const [formError, setFormError]     = useState('')
  const [isPending, startTransition]  = useTransition()
  const [deletingDate, setDeletingDate] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFileName, setSelectedFileName] = useState('')

  const grid     = buildGrid(results)
  const allDates = [...new Set(results.map(r => r.collected_at))].sort().reverse()

  // ── Helpers ──────────────────────────────────────────────────
  function prefillEmpty() {
    const fill: Record<string, { value: string; unit: string }> = {}
    for (const def of EXAM_CATALOG) fill[def.name] = { value: '', unit: def.unit }
    return fill
  }

  function prefillFromGrid(date: string) {
    const fill: Record<string, { value: string; unit: string }> = {}
    for (const def of EXAM_CATALOG) {
      const existing = grid[def.name]?.[date]
      fill[def.name] = existing
        ? { value: existing.value, unit: existing.unit ?? def.unit }
        : { value: '', unit: def.unit }
    }
    return fill
  }

  function cancelAll() {
    setMode('idle')
    setEditingDate(null)
    setPickerDate('')
    setEditValues({})
    setIsOcrReview(false)
    setOcrLoading(false)
    setOcrError('')
    setFormError('')
    setSelectedFileName('')
  }

  // ── Manual flow ───────────────────────────────────────────────
  function confirmManualDate() {
    if (!pickerDate) return
    setEditingDate(pickerDate)
    setEditValues(prefillFromGrid(pickerDate))
    setIsOcrReview(false)
    setMode('idle')
    setFormError('')
  }

  // ── Upload / OCR flow ─────────────────────────────────────────
  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFileName(file.name)
    setOcrError('')
  }

  async function handleAnalyze() {
    if (!pickerDate) { setOcrError('Selecione a data da coleta.'); return }
    const file = fileInputRef.current?.files?.[0]
    if (!file) { setOcrError('Selecione um arquivo PDF ou imagem.'); return }

    // Limite de 20 MB
    if (file.size > 20 * 1024 * 1024) {
      setOcrError('Arquivo muito grande. Use arquivos de até 20 MB.')
      return
    }

    setOcrLoading(true)
    setOcrError('')

    try {
      const base64 = await fileToBase64(file)
      const mimeType = file.type || 'application/pdf'
      const res = await extractLabResultsFromFile(base64, mimeType)

      if (!res.success) {
        setOcrError(res.error)
        setOcrLoading(false)
        return
      }

      // Monta editValues: OCR preenche os que encontrou, resto fica vazio
      const fill = prefillEmpty()
      let filled = 0
      for (const [name, extracted] of Object.entries(res.data ?? {})) {
        if (fill[name] !== undefined) {
          fill[name] = { value: extracted.value, unit: extracted.unit || fill[name].unit }
          if (extracted.value) filled++
        }
      }

      setEditValues(fill)
      setEditingDate(pickerDate)
      setIsOcrReview(true)
      setMode('idle')
      setOcrLoading(false)
      setFormError(`${filled} resultado${filled !== 1 ? 's' : ''} extraído${filled !== 1 ? 's' : ''} automaticamente`)
    } catch {
      setOcrError('Erro ao processar o arquivo. Tente novamente.')
      setOcrLoading(false)
    }
  }

  function setExamEdit(name: string, field: 'value' | 'unit', val: string) {
    setEditValues(prev => ({ ...prev, [name]: { ...prev[name], [field]: val } }))
  }

  // ── Save ──────────────────────────────────────────────────────
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
      cancelAll()
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

  const displayDates = editingDate && !allDates.includes(editingDate)
    ? [editingDate, ...allDates]
    : allDates

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-3">

      {/* ── Cabeçalho ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-800">Resultados Laboratoriais</h3>
        </div>
        <div className="flex items-center gap-4">
          {/* Legenda sempre visível */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block flex-shrink-0" />
              Atenção
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-red-100 border border-red-300 inline-block flex-shrink-0" />
              Alterado
            </span>
          </div>
          {mode === 'idle' && !editingDate && (
            <button
              type="button"
              onClick={() => setMode('choose')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-light transition-colors"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              Novo registro
            </button>
          )}
        </div>
      </div>

      {/* ── Escolha do modo ── */}
      {mode === 'choose' && (
        <div className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-xs font-semibold text-gray-500 mr-1">Como deseja inserir?</p>
          <button
            type="button"
            onClick={() => { setMode('upload-picker'); setPickerDate(''); setOcrError(''); setSelectedFileName('') }}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-light transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload de laudo (PDF/imagem)
          </button>
          <button
            type="button"
            onClick={() => { setMode('manual-picker'); setPickerDate('') }}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-xs font-semibold hover:bg-gray-100 transition-colors"
          >
            <PenLine className="w-3.5 h-3.5" />
            Inserir manualmente
          </button>
          <button type="button" onClick={cancelAll} className="ml-auto text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Seletor de data — Manual ── */}
      {mode === 'manual-picker' && (
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
            onClick={confirmManualDate}
            disabled={!pickerDate}
            className="px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold disabled:opacity-40 hover:bg-primary-light transition-colors"
          >
            Iniciar
          </button>
          <button type="button" onClick={cancelAll} className="ml-auto text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Seletor de data + arquivo — Upload ── */}
      {mode === 'upload-picker' && (
        <div className="p-4 bg-blue-50/60 border border-primary/20 rounded-xl space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-xs font-semibold text-gray-600 whitespace-nowrap">Data da coleta</p>
            <input
              type="date"
              value={pickerDate}
              onChange={e => setPickerDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button type="button" onClick={cancelAll} className="ml-auto text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* File drop area */}
          <div
            className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-primary/30 rounded-xl py-6 px-4 bg-white cursor-pointer hover:border-primary/60 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-5 h-5 text-primary/50" />
            {selectedFileName
              ? <p className="text-sm font-medium text-gray-700">{selectedFileName}</p>
              : <p className="text-sm text-gray-400">Clique para selecionar PDF ou imagem do laudo</p>
            }
            <p className="text-[11px] text-gray-300">PDF, JPG, PNG — até 20 MB</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={onFileSelect}
            />
          </div>

          {ocrError && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {ocrError}
            </div>
          )}

          <div className="space-y-2">
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={ocrLoading || !pickerDate || !selectedFileName}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-light disabled:opacity-40 transition-colors"
            >
              {ocrLoading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando laudo...</>
                : <><Sparkles className="w-3.5 h-3.5" /> Analisar automaticamente</>
              }
            </button>
            {ocrLoading && (
              <p className="text-[11px] text-gray-400 italic">Isso pode levar até 30 segundos para PDFs grandes…</p>
            )}
          </div>
        </div>
      )}

      {/* ── Banner de revisão OCR ── */}
      {editingDate && isOcrReview && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
          <span>
            <strong>Leitura automática concluída</strong> — revise os valores extraídos antes de salvar. Você pode editar qualquer célula.
          </span>
        </div>
      )}

      {/* ── Tabela ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="text-xs" style={{ tableLayout: 'fixed', width: '100%', minWidth: displayDates.length > 0 ? 360 + displayDates.length * 100 : 360 }}>
          <colgroup>
            <col style={{ width: 150 }} />
            <col style={{ width: 65 }} />
            <col style={{ width: 90 }} />
            {displayDates.map(d => <col key={d} style={{ width: 100 }} />)}
          </colgroup>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2.5 text-left font-semibold text-gray-500 uppercase tracking-wide truncate overflow-hidden">
                Exame
              </th>
              <th className="px-2 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide truncate overflow-hidden">
                Un.
              </th>
              <th className="px-2 py-2.5 text-left font-semibold text-gray-400 uppercase tracking-wide truncate overflow-hidden">
                Ref.
              </th>
              {displayDates.map(d => (
                <th key={d} className="px-3 py-2.5 text-center font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap overflow-hidden">
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
                  <tr key={`g-${group}`} className="bg-gray-50/80 border-y border-gray-100">
                    <td
                      colSpan={3 + displayDates.length}
                      className="sticky left-0 px-4 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-widest"
                    >
                      {group}
                    </td>
                  </tr>
                  {groupExams.map((def, idx) => {
                    const hasAltUnits   = (def.altUnits?.length ?? 0) > 0
                    const recordedUnit  = allDates.map(d => grid[def.name]?.[d]?.unit).find(Boolean) ?? null

                    return (
                      <tr
                        key={def.name}
                        className={`border-b border-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                      >
                        {/* Nome (sticky) */}
                        <td
                          className={`sticky left-0 z-10 px-3 py-2 font-medium text-gray-700 truncate overflow-hidden ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}`}
                          title={def.name}
                        >
                          {def.name}
                        </td>

                        {/* Unidade */}
                        <td className="px-2 py-2 text-gray-400 truncate overflow-hidden whitespace-nowrap">
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

                        {/* Referência */}
                        <td className="px-2 py-2 text-gray-400 truncate overflow-hidden whitespace-nowrap">
                          {formatRef(def, editingDate ? (editValues[def.name]?.unit ?? def.unit) : (recordedUnit ?? def.unit))}
                        </td>

                        {/* Células de dados */}
                        {displayDates.map(d => {
                          const isEditing    = d === editingDate
                          const cell         = grid[def.name]?.[d]
                          const unitForStatus = isEditing
                            ? (editValues[def.name]?.unit ?? def.unit)
                            : (cell?.unit ?? recordedUnit ?? def.unit)
                          const valForStatus = isEditing
                            ? (editValues[def.name]?.value ?? '')
                            : (cell?.value ?? '')
                          const status = classifyValue(def, valForStatus, unitForStatus)

                          const direction = getDirection(def, valForStatus, unitForStatus)

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
                                ? <span className="inline-flex items-center gap-0.5 justify-center">
                                    {direction === 'high' && (
                                      <span className={`text-[10px] leading-none ${status === 'crit' ? 'text-red-600' : 'text-amber-600'}`}>↑</span>
                                    )}
                                    {direction === 'low' && (
                                      <span className={`text-[10px] leading-none ${status === 'crit' ? 'text-red-600' : 'text-amber-600'}`}>↓</span>
                                    )}
                                    {cell.value}
                                  </span>
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

      {/* ── Ações de edição ── */}
      {editingDate && (
        <div className="flex items-center gap-4 flex-wrap">
          {formError && (
            <p className={`text-xs ${isOcrReview && !formError.startsWith('Preencha') ? 'text-emerald-700' : 'text-red-600'}`}>
              {formError}
            </p>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button type="button" onClick={cancelAll} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg transition-colors">
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

      {/* ── Modal de confirmar exclusão de coluna ── */}
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

// ── Utilitário ────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove o prefixo "data:...;base64,"
      const base64 = result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
