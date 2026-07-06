'use client'

import { useRef, useState, useTransition } from 'react'
import type { BiopsiaResult } from '@/lib/types'
import { upsertBiopsiaResult, deleteBiopsiaResult } from '@/app/actions/prontuario'
import { uploadImagingFile } from '@/app/actions/imaging'
import {
  Plus, Save, Loader2, Trash2, Microscope, X,
  Paperclip, Download, FileText, CheckCircle2,
} from 'lucide-react'

const PERSONALIZADO_KEY = '__personalizado__'

const TIPO_LABELS: Record<string, string> = {
  renal:         'Biópsia Renal',
  hepatica:      'Biópsia Hepática',
  prostata:      'Biópsia de Próstata',
  pele:          'Biópsia de Pele',
  medula:        'Biópsia de Medula Óssea',
  nodulo:        'Biópsia de Nódulo',
  outro:         'Outro',
}

const TIPOS = Object.keys(TIPO_LABELS)

function getTipoLabel(tipo: string): string {
  return TIPO_LABELS[tipo] ?? tipo
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

interface Props {
  biopsiaResults: BiopsiaResult[]
  patientId: string
}

interface FormState {
  tipo:           string
  tipo_custom:    string
  data_realizado: string
  laudo_resumido: string
  file_url:       string | null
  file_name:      string | null
  extra_files:    { url: string; name: string }[]
}

export default function BiopsiaPanel({ biopsiaResults: initial, patientId }: Props) {
  const fileInputRef      = useRef<HTMLInputElement>(null)
  const extraFileInputRef = useRef<HTMLInputElement>(null)

  const [results, setResults]         = useState<BiopsiaResult[]>(initial)
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState<FormState>({
    tipo: 'renal', tipo_custom: '', data_realizado: '', laudo_resumido: '',
    file_url: null, file_name: null, extra_files: [],
  })
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [formError, setFormError]     = useState('')
  const [deletingId, setDeletingId]   = useState<string | null>(null)
  const [isPending, startTransition]  = useTransition()
  const [isUploading, setIsUploading] = useState(false)

  const latestByTipo: Record<string, BiopsiaResult> = {}
  for (const r of [...results].sort((a, b) => b.data_realizado.localeCompare(a.data_realizado))) {
    if (!latestByTipo[r.tipo]) latestByTipo[r.tipo] = r
  }
  const displayTipos = Object.keys(latestByTipo)

  function resetForm() {
    setShowForm(false); setEditingId(null)
    setForm({ tipo: 'renal', tipo_custom: '', data_realizado: '', laudo_resumido: '', file_url: null, file_name: null, extra_files: [] })
    setFormError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (extraFileInputRef.current) extraFileInputRef.current.value = ''
  }

  function openEdit(r: BiopsiaResult) {
    setEditingId(r.id)
    const isPreset = TIPOS.includes(r.tipo)
    setForm({
      tipo:           isPreset ? r.tipo : PERSONALIZADO_KEY,
      tipo_custom:    isPreset ? '' : r.tipo,
      data_realizado: r.data_realizado,
      laudo_resumido: r.laudo_resumido ?? '',
      file_url:       r.file_url ?? null,
      file_name:      r.file_name ?? null,
      extra_files:    r.extra_files ?? [],
    })
    setShowForm(true); setFormError('')
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true); setFormError('')
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadImagingFile(patientId, fd)
    setIsUploading(false)
    if (!res.success) { setFormError(res.error); return }
    setForm(f => ({ ...f, file_url: res.data!.url, file_name: res.data!.fileName }))
  }

  async function handleExtraFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadImagingFile(patientId, fd)
    setIsUploading(false)
    if (!res.success) { setFormError(res.error); return }
    setForm(f => ({ ...f, extra_files: [...f.extra_files, { url: res.data!.url, name: res.data!.fileName }] }))
  }

  function handleSave() {
    const tipoFinal = form.tipo === PERSONALIZADO_KEY ? form.tipo_custom.trim() : form.tipo
    if (!tipoFinal) { setFormError('Informe o tipo de biópsia.'); return }
    if (!form.data_realizado) { setFormError('Informe a data de realização.'); return }
    setFormError('')
    startTransition(async () => {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        patient_id:     patientId,
        tipo:           tipoFinal,
        data_realizado: form.data_realizado,
        laudo_resumido: form.laudo_resumido.trim() || null,
        file_url:       form.file_url,
        file_name:      form.file_name,
        extra_files:    form.extra_files.length > 0 ? form.extra_files : null,
      }
      const res = await upsertBiopsiaResult(payload)
      if (!res.success) { setFormError(res.error); return }

      const newId = res.data?.id ?? editingId ?? crypto.randomUUID()
      setResults(prev => {
        const without = prev.filter(r => r.id !== newId)
        return [...without, {
          id:             newId,
          patient_id:     patientId,
          tenant_id:      '',
          tipo:           tipoFinal,
          data_realizado: form.data_realizado,
          laudo_resumido: form.laudo_resumido.trim() || null,
          file_url:       form.file_url,
          file_name:      form.file_name,
          extra_files:    form.extra_files.length > 0 ? form.extra_files : null,
          created_at:     new Date().toISOString(),
        }]
      })
      resetForm()
    })
  }

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      await deleteBiopsiaResult(id)
      setResults(prev => prev.filter(r => r.id !== id))
      setDeletingId(null)
    })
  }

  return (
    <div className="space-y-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Microscope className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-800">Biópsias</h3>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white rounded-lg text-xs font-semibold hover:bg-primary-light transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Registrar biópsia
          </button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              {editingId ? 'Editar biópsia' : 'Nova biópsia'}
            </p>
            <button type="button" onClick={resetForm} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-medium text-gray-600">Tipo</label>
              <select
                value={form.tipo}
                onChange={e => setForm(f => ({ ...f, tipo: e.target.value, tipo_custom: '' }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABELS[t]}</option>)}
                <option value={PERSONALIZADO_KEY}>Personalizado...</option>
              </select>
              {form.tipo === PERSONALIZADO_KEY && (
                <input
                  type="text"
                  value={form.tipo_custom}
                  onChange={e => setForm(f => ({ ...f, tipo_custom: e.target.value }))}
                  placeholder="Nome da biópsia..."
                  className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              )}
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

          {/* Upload */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">
              Arquivo <span className="text-gray-400 font-normal">(PDF ou imagem)</span>
            </label>
            {form.file_url ? (
              <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="text-xs text-emerald-800 flex-1 truncate font-medium">{form.file_name}</span>
                <button
                  type="button"
                  onClick={() => {
                    setForm(f => ({ ...f, file_url: null, file_name: null }))
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2.5 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
              >
                {isUploading
                  ? <><Loader2 className="w-4 h-4 animate-spin text-primary" /><span className="text-xs text-gray-500">Enviando...</span></>
                  : <><Paperclip className="w-4 h-4 text-gray-400" /><span className="text-xs text-gray-500">Clique para anexar PDF ou imagem</span></>
                }
              </div>
            )}
            <input ref={fileInputRef} type="file" accept=".pdf,image/*" className="hidden" onChange={handleFileChange} />

            {form.file_url && (
              <div className="space-y-1.5 pt-1">
                {form.extra_files.map((ef, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5">
                    <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span className="truncate flex-1">{ef.name}</span>
                    <button
                      type="button"
                      onClick={() => setForm(f => ({ ...f, extra_files: f.extra_files.filter((_, j) => j !== i) }))}
                      className="text-gray-300 hover:text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => extraFileInputRef.current?.click()}
                  disabled={isUploading}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-light font-medium transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Adicionar outro arquivo
                </button>
                <input ref={extraFileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleExtraFileChange} className="hidden" />
              </div>
            )}
          </div>

          {/* Resultado */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">
              Resultado / Laudo <span className="text-gray-400 font-normal">(opcional)</span>
            </label>
            <textarea
              value={form.laudo_resumido}
              onChange={e => setForm(f => ({ ...f, laudo_resumido: e.target.value }))}
              rows={4}
              placeholder="Ex: Biópsia renal — glomerulonefrite IgA. Proliferação mesangial difusa grau II."
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
          Nenhuma biópsia registrada ainda.
        </div>
      ) : (
        <div className="space-y-3">
          {displayTipos.map(tipo => {
            const r = latestByTipo[tipo]!
            const history = results
              .filter(x => x.tipo === tipo)
              .sort((a, b) => b.data_realizado.localeCompare(a.data_realizado))
            return (
              <div key={tipo} className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Microscope className="w-3.5 h-3.5 text-primary" />
                    <span className="text-sm font-semibold text-gray-800">{getTipoLabel(tipo)}</span>
                    <span className="text-xs text-gray-400 font-normal">· mais recente: {fmtDate(r.data_realizado)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(r)}
                    className="text-xs text-primary hover:text-primary-light font-medium transition-colors"
                  >
                    Editar
                  </button>
                </div>

                {r.file_url && (
                  <div className="px-4 pt-3 pb-1 space-y-1.5">
                    <a
                      href={r.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200 text-blue-700 rounded-md text-xs font-medium hover:bg-blue-100 transition-colors"
                    >
                      <FileText className="w-3 h-3" />
                      {r.file_name ?? 'Ver arquivo'}
                      <Download className="w-3 h-3 ml-0.5" />
                    </a>
                    {r.extra_files?.map((ef, i) => (
                      <a
                        key={i}
                        href={ef.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-primary hover:underline"
                      >
                        <FileText className="w-3 h-3" />
                        {ef.name}
                      </a>
                    ))}
                  </div>
                )}

                {r.laudo_resumido && (
                  <div className="px-4 py-3">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{r.laudo_resumido}</p>
                  </div>
                )}

                {history.length > 1 && (
                  <div className="px-4 pb-3 pt-1 space-y-1">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Histórico</p>
                    {history.slice(1).map(h => (
                      <div key={h.id} className="flex items-start gap-3 py-1.5 border-t border-gray-100">
                        <span className="text-xs text-gray-400 whitespace-nowrap mt-0.5">{fmtDate(h.data_realizado)}</span>
                        <div className="flex-1 min-w-0">
                          {h.file_url && (
                            <a
                              href={h.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-0.5"
                            >
                              <FileText className="w-3 h-3" />
                              {h.file_name ?? 'Arquivo'}
                            </a>
                          )}
                          {h.extra_files?.map((ef, i) => (
                            <a
                              key={i}
                              href={ef.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-blue-600 hover:underline mb-0.5"
                            >
                              <FileText className="w-3 h-3" />
                              {ef.name}
                            </a>
                          ))}
                          <p className="text-xs text-gray-600">{h.laudo_resumido ?? '—'}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDelete(h.id)}
                          disabled={deletingId === h.id}
                          className="p-1 text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {history.length === 1 && (
                  <div className="flex justify-end px-3 pb-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(r.id)}
                      disabled={deletingId === r.id}
                      className="p-1 text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors"
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
