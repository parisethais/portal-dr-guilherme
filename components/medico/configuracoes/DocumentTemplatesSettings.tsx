'use client'

import { useState, useEffect } from 'react'
import { FilePlus2, Bookmark, Trash2, Pencil, X, Loader2, BookMarked, ChevronDown, Copy } from 'lucide-react'
import {
  listClinicDocumentTemplates,
  createClinicDocumentTemplate,
  deleteClinicDocumentTemplate,
} from '@/app/actions/documentos-clinicos'
import type { ClinicDocumentTemplate } from '@/app/actions/documentos-clinicos'
import { SYSTEM_TEMPLATES } from '@/components/medico/prontuario/DocumentosTab'
import { formatDate } from '@/lib/utils'

export default function DocumentTemplatesSettings() {
  const [templates,     setTemplates]     = useState<ClinicDocumentTemplate[]>([])
  const [loading,       setLoading]       = useState(true)
  const [modal,         setModal]         = useState(false)
  const [editing,       setEditing]       = useState<ClinicDocumentTemplate | null>(null)
  const [title,         setTitle]         = useState('')
  const [content,       setContent]       = useState('')
  const [saving,        setSaving]        = useState(false)
  const [deleting,      setDeleting]      = useState<string | null>(null)
  const [error,         setError]         = useState('')
  const [expanded,      setExpanded]      = useState<string | null>(null)  // key do modelo expandido
  const [duplicating,   setDuplicating]   = useState<string | null>(null)

  useEffect(() => {
    listClinicDocumentTemplates().then(t => { setTemplates(t); setLoading(false) })
  }, [])

  function openCreate() {
    setEditing(null); setTitle(''); setContent(''); setError(''); setModal(true)
  }

  function openEdit(t: ClinicDocumentTemplate) {
    setEditing(t); setTitle(t.title); setContent(t.content); setError(''); setModal(true)
  }

  async function duplicateSystemTemplate(t: typeof SYSTEM_TEMPLATES[number]) {
    setDuplicating(t.key)
    const { data, error: err } = await createClinicDocumentTemplate({ title: t.title, content: t.content })
    if (!err && data) setTemplates(prev => [data, ...prev])
    setDuplicating(null)
  }

  async function handleSave() {
    if (!title.trim()) { setError('O título é obrigatório.'); return }
    setSaving(true); setError('')

    if (editing) {
      await deleteClinicDocumentTemplate(editing.id)
      const { data, error: err } = await createClinicDocumentTemplate({ title: title.trim(), content })
      if (err) { setError(err); setSaving(false); return }
      setTemplates(prev => [data!, ...prev.filter(t => t.id !== editing.id)])
    } else {
      const { data, error: err } = await createClinicDocumentTemplate({ title: title.trim(), content })
      if (err) { setError(err); setSaving(false); return }
      setTemplates(prev => [data!, ...prev])
    }

    setSaving(false); setModal(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este modelo?')) return
    setDeleting(id)
    await deleteClinicDocumentTemplate(id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    setDeleting(null)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Modelos de documentos</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            Crie modelos reutilizáveis para orientações, atestados e relatórios
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          <FilePlus2 className="w-3.5 h-3.5" />
          Novo modelo
        </button>
      </div>

      {/* ── Modelos padrão ── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Modelos padrão</p>
        <div className="space-y-1.5">
          {SYSTEM_TEMPLATES.map(t => (
            <div key={t.key} className="rounded-xl border border-gray-100 overflow-hidden">
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <Bookmark className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-sm text-gray-700 flex-1">{t.title}</span>
                <button
                  onClick={() => duplicateSystemTemplate(t)}
                  disabled={duplicating === t.key}
                  title="Duplicar para Meus modelos"
                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-primary transition-colors disabled:opacity-50 px-2 py-1 rounded-md hover:bg-primary/5"
                >
                  {duplicating === t.key
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Copy className="w-3 h-3" />}
                  Duplicar
                </button>
                <button
                  onClick={() => setExpanded(prev => prev === t.key ? null : t.key)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
                  title="Ver conteúdo"
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded === t.key ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {expanded === t.key && (
                <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50">
                  <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">{t.content}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Meus modelos ── */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">Meus modelos</p>
        {loading ? (
          <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />Carregando…
          </div>
        ) : templates.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded-xl border border-dashed border-gray-200">
            <BookMarked className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
            <p className="text-xs text-gray-400">Nenhum modelo personalizado ainda.</p>
            <p className="text-xs text-gray-400 mt-1">
              Clique em "Duplicar" em um modelo padrão, ou em "Novo modelo" para criar do zero.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {templates.map(t => (
              <div key={t.id} className="rounded-xl border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2.5 px-3 py-2.5 group">
                  <BookMarked className="w-3.5 h-3.5 text-primary/60 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.title}</p>
                    <p className="text-xs text-gray-400">{formatDate(t.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(t)}
                      className="p-1.5 text-gray-400 hover:text-primary rounded-md transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting === t.id}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-md transition-colors disabled:opacity-50"
                      title="Excluir"
                    >
                      {deleting === t.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => setExpanded(prev => prev === t.id ? null : t.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md transition-colors"
                    >
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded === t.id ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                </div>
                {expanded === t.id && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50">
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-mono leading-relaxed">{t.content}</pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-12 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col mb-8">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">
                {editing ? 'Editar modelo' : 'Novo modelo'}
              </h2>
              <button onClick={() => setModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Título do modelo</label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="Ex: Orientações pós-litotripsia"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Conteúdo</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={18}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 font-mono resize-y"
                  placeholder="Use _[campo]_ para marcar espaços que serão personalizados por paciente…"
                />
              </div>
              {error && <p className="text-xs text-red-500">{error}</p>}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 pb-5">
              <button onClick={() => setModal(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editing ? 'Salvar alterações' : 'Criar modelo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
