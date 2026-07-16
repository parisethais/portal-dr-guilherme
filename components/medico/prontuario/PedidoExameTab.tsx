'use client'

import { useState, useEffect, useTransition, useRef, useMemo } from 'react'
import {
  getPedidosExame, createPedidoExame, deletePedidoExame, enviarDocumentoViaCopilot,
  getCatalogExamOptions, quickAddExamToCatalog,
  type PedidoExame, type TipoExame, type Urgencia, type CatalogExamOption,
} from '@/app/actions/pedidos-exame'
import {
  Plus, FlaskConical, ScanLine, FileText, Trash2, Loader2,
  ShieldCheck, Download, Printer, Send, ChevronDown, ChevronUp, AlertCircle,
  Search, Check, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import AssinaturaModal, { AssinaturaSuccessModal } from './AssinaturaModal'

interface Props {
  patientId:    string
  patientName:  string
  patientPhone: string | null | undefined
  patientEmail?: string | null
}

const TIPO_OPTS: { value: TipoExame; label: string; icon: React.ReactNode }[] = [
  { value: 'laboratorial', label: 'Laboratorial', icon: <FlaskConical className="w-4 h-4" /> },
  { value: 'imagem',       label: 'Imagem',       icon: <ScanLine     className="w-4 h-4" /> },
  { value: 'outro',        label: 'Outro',        icon: <FileText     className="w-4 h-4" /> },
]

const URGENCIA_OPTS: { value: Urgencia; label: string }[] = [
  { value: 'rotina',  label: 'Rotina'  },
  { value: 'urgente', label: 'Urgente' },
]

function todayStr() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

// ── Ações de documento ──────────────────────────────────────────
function DocumentoActions({
  pdfUrl, patientPhone, patientEmail, patientName, tipo,
}: {
  pdfUrl:        string
  patientPhone:  string | null | undefined
  patientEmail?: string | null
  patientName:   string
  tipo:          'pedido_exame' | 'prescricao'
}) {
  const [sending,  setSending]  = useState(false)
  const [sendMsg,  setSendMsg]  = useState('')

  const tipoLabel = tipo === 'pedido_exame' ? 'pedido de exame' : 'prescrição'

  async function handleEnviar() {
    setSending(true)
    setSendMsg('')
    const res = await enviarDocumentoViaCopilot({
      patient_phone: patientPhone ?? null,
      patient_email: patientEmail ?? null,
      patient_name:  patientName,
      document_url:  pdfUrl,
      document_type: tipo,
    })
    setSendMsg(res.success ? '✓ Enviado com sucesso!' : `Erro: ${res.error}`)
    setSending(false)
  }

  function handlePrint() {
    window.open(pdfUrl, '_blank')
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      <a
        href={pdfUrl}
        download
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Download className="w-3.5 h-3.5" /> Baixar PDF
      </a>
      <button
        type="button"
        onClick={handlePrint}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <Printer className="w-3.5 h-3.5" /> Imprimir
      </button>
      <button
        type="button"
        onClick={handleEnviar}
        disabled={sending}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-60"
      >
        {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
        Enviar para paciente
      </button>
      {sendMsg && (
        <p className={cn('text-xs', sendMsg.startsWith('✓') ? 'text-green-600' : 'text-red-500')}>
          {sendMsg}
        </p>
      )}
    </div>
  )
}

// ── Card de pedido ───────────────────────────────────────────────
function PedidoCard({
  pedido, patientPhone, patientEmail, patientName,
  onDeleted, onAssinado,
}: {
  pedido:        PedidoExame
  patientPhone:  string | null | undefined
  patientEmail?: string | null
  patientName:   string
  onDeleted:     (id: string) => void
  onAssinado:    (id: string, pdfUrl: string, sigUrl: string) => void
}) {
  const [expanded,     setExpanded]     = useState(false)
  const [showAssinar,  setShowAssinar]  = useState(false)
  const [showSuccess,  setShowSuccess]  = useState(false)
  const [successUrls,  setSuccessUrls]  = useState({ pdfUrl: '', sigUrl: '' })
  const [delPending,   startDel]        = useTransition()

  const tipoOpt = TIPO_OPTS.find(t => t.value === pedido.tipo)
  const pdfUrl  = pedido.pdf_url ?? successUrls.pdfUrl

  function handleAssinadoSuccess(pdf: string, sig: string) {
    setSuccessUrls({ pdfUrl: pdf, sigUrl: sig })
    setShowAssinar(false)
    setShowSuccess(true)
    onAssinado(pedido.id, pdf, sig)
  }

  return (
    <>
      <div className={cn(
        'rounded-xl border',
        pedido.assinado ? 'border-gray-200 bg-gray-50/60' : 'border-primary/20 bg-white shadow-sm'
      )}>
        {/* Header */}
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
        >
          <div className={cn('mt-0.5 flex-shrink-0', pedido.assinado ? 'text-gray-400' : 'text-primary')}>
            {tipoOpt?.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-sm font-semibold', pedido.assinado ? 'text-gray-600' : 'text-gray-900')}>
                {tipoOpt?.label ?? pedido.tipo}
              </span>
              {pedido.urgencia === 'urgente' && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                  <AlertCircle className="w-2.5 h-2.5" /> Urgente
                </span>
              )}
              {pedido.assinado ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5" /> Assinado
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">
                  Não assinado
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{fmtDate(pedido.data_pedido)}</p>
          </div>
          <span className="text-gray-300 flex-shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </button>

        {/* Body */}
        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
            {/* Exames */}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Exames solicitados</p>
              <div className="space-y-1">
                {pedido.exames.split('\n').filter(Boolean).map((ex, i) => (
                  <p key={i} className="text-sm text-gray-800 flex items-start gap-1.5">
                    <span className="text-gray-400 flex-shrink-0">{i + 1}.</span> {ex.trim()}
                  </p>
                ))}
              </div>
            </div>

            {pedido.indicacao_clinica && (
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Indicação clínica</p>
                <p className="text-xs text-gray-700">{pedido.indicacao_clinica}</p>
              </div>
            )}
            {pedido.cid && (
              <p className="text-xs text-gray-500"><span className="font-semibold">CID:</span> {pedido.cid}</p>
            )}

            {/* Ações */}
            <div className="flex flex-wrap gap-2 pt-1">
              {!pedido.assinado && (
                <button
                  type="button"
                  onClick={() => setShowAssinar(true)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Assinar pedido
                </button>
              )}
              {pdfUrl && (
                <DocumentoActions
                  pdfUrl={pdfUrl}
                  patientPhone={patientPhone}
                  patientEmail={patientEmail}
                  patientName={patientName}
                  tipo="pedido_exame"
                />
              )}
              {!pedido.assinado && (
                <button
                  type="button"
                  disabled={delPending}
                  onClick={() => startDel(async () => {
                    if (!confirm('Excluir este pedido de exame?')) return
                    await deletePedidoExame(pedido.id)
                    onDeleted(pedido.id)
                  })}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 transition-colors"
                >
                  {delPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  Excluir
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showAssinar && (
        <AssinaturaModal
          tipo="pedido_exame"
          pedidoExameId={pedido.id}
          onClose={() => setShowAssinar(false)}
          onSuccess={handleAssinadoSuccess}
        />
      )}
      {showSuccess && (
        <AssinaturaSuccessModal
          tipo="pedido_exame"
          pdfUrl={successUrls.pdfUrl}
          assinaturaUrl={successUrls.sigUrl}
          onClose={() => setShowSuccess(false)}
        />
      )}
    </>
  )
}

// ── Seletor de exames por checkbox ──────────────────────────────
function ExamePicker({
  value, onChange, catalog,
}: {
  value:    string
  onChange: (v: string) => void
  catalog:  CatalogExamOption[]
}) {
  const [open,       setOpen]       = useState(false)
  const [search,     setSearch]     = useState('')
  const [newExam,    setNewExam]    = useState('')
  const [showNew,    setShowNew]    = useState(false)
  const [addPending, startAdd]      = useTransition()
  const searchRef = useRef<HTMLInputElement>(null)

  const selected = useMemo(() => new Set(value.split('\n').filter(Boolean)), [value])

  const groups = useMemo(() => {
    const lower = search.toLowerCase()
    const filtered = search
      ? catalog.filter(e => e.name.toLowerCase().includes(lower))
      : catalog
    const map = new Map<string, string[]>()
    for (const e of filtered) {
      if (!map.has(e.group)) map.set(e.group, [])
      map.get(e.group)!.push(e.name)
    }
    return map
  }, [catalog, search])

  function toggle(name: string) {
    const next = new Set(selected)
    if (next.has(name)) next.delete(name)
    else next.add(name)
    onChange(Array.from(next).join('\n'))
  }

  function remove(name: string) {
    onChange(Array.from(selected).filter(n => n !== name).join('\n'))
  }

  function handleOpenPanel() {
    setOpen(o => !o)
    setTimeout(() => searchRef.current?.focus(), 80)
  }

  function handleAddNew() {
    const name = newExam.trim()
    if (!name) return
    startAdd(async () => {
      await quickAddExamToCatalog(name)
      toggle(name)
      setNewExam('')
      setShowNew(false)
    })
  }

  const selectedArr = Array.from(selected)

  return (
    <div className="space-y-2">
      {/* Chips dos exames selecionados */}
      {selectedArr.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedArr.map(name => (
            <span key={name} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-primary/8 text-primary font-medium">
              {name}
              <button type="button" onClick={() => remove(name)} className="text-primary/50 hover:text-red-500 leading-none ml-0.5">
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Botão de abrir painel */}
      <button
        type="button"
        onClick={handleOpenPanel}
        className={cn(
          'flex items-center gap-2 w-full px-3 py-2.5 rounded-lg border text-sm transition-colors',
          open
            ? 'border-primary/40 bg-primary/5 text-primary font-medium'
            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
        )}
      >
        <FlaskConical className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="flex-1 text-left">
          {selectedArr.length > 0
            ? `${selectedArr.length} exame${selectedArr.length > 1 ? 's' : ''} selecionado${selectedArr.length > 1 ? 's' : ''}`
            : 'Selecionar exames do catálogo'}
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Painel de checkboxes */}
      {open && (
        <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
          {/* Busca */}
          <div className="px-3 pt-3 pb-2 border-b border-gray-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar exame..."
                className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {/* Lista por grupo */}
          <div className="max-h-56 overflow-y-auto">
            {groups.size === 0 ? (
              <p className="text-center text-xs text-gray-400 py-6">Nenhum exame encontrado</p>
            ) : (
              Array.from(groups.entries()).map(([group, names]) => (
                <div key={group}>
                  <p className="px-3 pt-2.5 pb-1 text-[10px] font-bold text-gray-400 uppercase tracking-wide sticky top-0 bg-white border-b border-gray-50">
                    {group}
                  </p>
                  {names.map(name => (
                    <label
                      key={name}
                      className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-primary/4 transition-colors"
                    >
                      <div className={cn(
                        'w-4 h-4 rounded flex items-center justify-center border flex-shrink-0 transition-colors',
                        selected.has(name)
                          ? 'bg-primary border-primary'
                          : 'border-gray-300'
                      )}>
                        {selected.has(name) && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                      </div>
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selected.has(name)}
                        onChange={() => toggle(name)}
                      />
                      <span className="text-sm text-gray-800">{name}</span>
                    </label>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Adicionar novo */}
          <div className="border-t border-gray-100 px-3 py-2.5">
            {showNew ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newExam}
                  onChange={e => setNewExam(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddNew()}
                  placeholder="Nome do novo exame..."
                  autoFocus
                  className="flex-1 px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <button
                  type="button"
                  onClick={handleAddNew}
                  disabled={addPending || !newExam.trim()}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg disabled:opacity-50"
                >
                  {addPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Salvar
                </button>
                <button type="button" onClick={() => { setShowNew(false); setNewExam('') }}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowNew(true)}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar novo exame
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────
export default function PedidoExameTab({ patientId, patientName, patientPhone, patientEmail }: Props) {
  const [pedidos,    setPedidos]    = useState<PedidoExame[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showNovo,   setShowNovo]   = useState(false)
  const [saving,     startSave]     = useTransition()
  const [err,        setErr]        = useState('')
  const [catalog,    setCatalog]    = useState<CatalogExamOption[]>([])

  const [form, setForm] = useState<{
    tipo: TipoExame; exames: string; urgencia: Urgencia
    indicacao_clinica: string; cid: string; data_pedido: string
  }>({
    tipo: 'laboratorial', exames: '', urgencia: 'rotina',
    indicacao_clinica: '', cid: '', data_pedido: todayStr(),
  })

  useEffect(() => {
    getPedidosExame(patientId).then(data => { setPedidos(data); setLoading(false) })
    getCatalogExamOptions().then(setCatalog)
  }, [patientId])

  function handleSalvar() {
    setErr('')
    if (!form.exames.trim()) { setErr('Informe ao menos um exame.'); return }
    startSave(async () => {
      const res = await createPedidoExame({
        patient_id:        patientId,
        tipo:              form.tipo,
        exames:            form.exames.trim(),
        urgencia:          form.urgencia,
        indicacao_clinica: form.indicacao_clinica || undefined,
        cid:               form.cid || undefined,
        data_pedido:       form.data_pedido,
      })
      if (!res.success) { setErr(res.error ?? 'Erro ao salvar'); return }
      const updated = await getPedidosExame(patientId)
      setPedidos(updated)
      setShowNovo(false)
      setForm({ tipo: 'laboratorial', exames: '', urgencia: 'rotina', indicacao_clinica: '', cid: '', data_pedido: todayStr() })
    })
  }

  function handleDeleted(id: string) { setPedidos(prev => prev.filter(p => p.id !== id)) }
  function handleAssinado(id: string, pdfUrl: string, sigUrl: string) {
    setPedidos(prev => prev.map(p => p.id === id
      ? { ...p, assinado: true, assinado_at: new Date().toISOString(), pdf_url: pdfUrl, assinatura_url: sigUrl }
      : p
    ))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-gray-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Carregando pedidos…</span>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Botão novo */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setShowNovo(s => !s)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Novo pedido
        </button>
      </div>

      {/* Formulário */}
      {showNovo && (
        <div className="rounded-xl border border-primary/20 p-4 space-y-3 bg-white shadow-sm">
          <p className="text-sm font-semibold text-gray-800">Novo pedido de exame</p>

          {/* Tipo */}
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Tipo</label>
            <div className="flex gap-2 mt-1">
              {TIPO_OPTS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, tipo: t.value }))}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                    form.tipo === t.value
                      ? 'bg-primary text-white border-primary'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Urgência */}
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Urgência</label>
            <div className="flex gap-2 mt-1">
              {URGENCIA_OPTS.map(u => (
                <button
                  key={u.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, urgencia: u.value }))}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors',
                    form.urgencia === u.value
                      ? u.value === 'urgente' ? 'bg-red-600 text-white border-red-600' : 'bg-primary text-white border-primary'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  )}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          {/* Exames */}
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
              Exames solicitados
            </label>
            <div className="mt-1">
              <ExamePicker
                value={form.exames}
                onChange={v => setForm(f => ({ ...f, exames: v }))}
                catalog={catalog}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Indicação clínica</label>
              <input
                type="text"
                value={form.indicacao_clinica}
                onChange={e => setForm(f => ({ ...f, indicacao_clinica: e.target.value }))}
                placeholder="Ex: Hipotireoidismo suspeito"
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">CID (opcional)</label>
              <input
                type="text"
                value={form.cid}
                onChange={e => setForm(f => ({ ...f, cid: e.target.value }))}
                placeholder="Ex: E03.9"
                className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Data do pedido</label>
            <input
              type="date"
              value={form.data_pedido}
              onChange={e => setForm(f => ({ ...f, data_pedido: e.target.value }))}
              className="mt-1 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {err && <p className="text-xs text-red-500">{err}</p>}

          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={() => { setShowNovo(false); setErr('') }}
              className="text-sm text-gray-500 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={saving}
              className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-lg bg-primary text-white font-semibold hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Salvar pedido
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {pedidos.length === 0 && !showNovo && (
        <div className="text-center py-10 text-gray-400">
          <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum pedido de exame</p>
        </div>
      )}

      {pedidos.map(p => (
        <PedidoCard
          key={p.id}
          pedido={p}
          patientPhone={patientPhone}
          patientEmail={patientEmail}
          patientName={patientName}
          onDeleted={handleDeleted}
          onAssinado={handleAssinado}
        />
      ))}
    </div>
  )
}
