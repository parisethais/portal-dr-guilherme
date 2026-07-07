'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Invoice, Profile } from '@/lib/types'
import { uploadInvoice, deleteInvoice, getMedicoInvoiceUrl } from '@/app/actions/invoices'
import Card from '@/components/ui/Card'
import { Receipt, Plus, X, Trash2, Download, Loader2, FileText, Stethoscope, BedDouble, Copy, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const LOCAIS_INTERNACAO = ['Hospital Israelita Albert Einstein', 'Hospital Vila Nova Star', 'Hospital Sírio-Libanês']

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(amount)
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function InvoiceReferencia({ inv }: { inv: Invoice }) {
  if (inv.tipo === 'internacao') {
    const parts: string[] = []
    if (inv.internacao_local) parts.push(inv.internacao_local)
    if (inv.internacao_inicio && inv.internacao_fim) {
      parts.push(`${formatDate(inv.internacao_inicio)} – ${formatDate(inv.internacao_fim)}`)
    } else if (inv.internacao_inicio) {
      parts.push(`a partir de ${formatDate(inv.internacao_inicio)}`)
    }
    if (inv.internacao_dias) parts.push(`${inv.internacao_dias} dias`)
    return (
      <div>
        <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 mb-0.5">
          <BedDouble className="w-3 h-3" /> Internação
        </span>
        {parts.length > 0 && <p className="text-gray-500 text-[11px] leading-tight">{parts.join(' · ')}</p>}
      </div>
    )
  }
  return (
    <div>
      <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 mb-0.5">
        <Stethoscope className="w-3 h-3" /> Consulta
      </span>
      {inv.consulta_date && <p className="text-gray-500 text-[11px]">{formatDate(inv.consulta_date)}</p>}
    </div>
  )
}

function gerarTextoContador(inv: Invoice, patient: Profile): string {
  const nome = patient.full_name ?? '—'
  const cpf  = patient.cpf       ?? '—'

  if (inv.tipo === 'internacao') {
    const hospital   = inv.internacao_local ?? '[hospital]'
    const inicio     = inv.internacao_inicio ? formatDate(inv.internacao_inicio) : '—'
    const fim        = inv.internacao_fim    ? formatDate(inv.internacao_fim)    : '—'
    const dias       = inv.internacao_dias   ?? 0
    const valorUnit  = dias > 0 ? inv.amount / dias : inv.amount

    // Lista de datas dia a dia
    let datasAtendimentos = `${inicio} a ${fim}`
    if (inv.internacao_inicio && inv.internacao_fim) {
      const start = new Date(inv.internacao_inicio + 'T12:00:00')
      const end   = new Date(inv.internacao_fim   + 'T12:00:00')
      if (start <= end) {
        const lista: string[] = []
        const cur = new Date(start)
        while (cur <= end) {
          lista.push(cur.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }))
          cur.setDate(cur.getDate() + 1)
        }
        datasAtendimentos = lista.join(', ')
      }
    }

    return [
      'internação hospitalar',
      '',
      `Descrição: Honorários médicos referentes a avaliações médicas hospitalares em regime de internação, realizadas no Hospital ${hospital}, entre os dias ${inicio} e ${fim}, pelo Dr. Guilherme Parise Santa Catharina (CRM-SP 170.281  |  Clínica Médica RQE 72444 / Nefrologia RQE 80434)`,
      '',
      `Paciente: ${nome}`,
      `CPF: ${cpf}`,
      `Datas dos atendimentos: ${datasAtendimentos}`,
      `Número total de avaliações: ${dias}`,
      `Valor unitário por avaliação: ${formatCurrency(valorUnit)}`,
      `Valor total: ${formatCurrency(inv.amount)}`,
    ].join('\n')
  }

  // consulta
  const dataConsulta = inv.consulta_date ? formatDate(inv.consulta_date) : '—'
  return [
    'consulta médica',
    '',
    `Descrição: Consulta médica ambulatorial realizada pelo Dr. Guilherme Parise Santa Catharina (CRM-SP 170.281  |  Clínica Médica RQE 72444 / Nefrologia RQE 80434)`,
    '',
    `Paciente: ${nome}`,
    `CPF: ${cpf}`,
    `Data da consulta: ${dataConsulta}`,
  ].join('\n')
}

interface InvoiceSectionProps {
  patient: Profile
  invoices: Invoice[]
}

export default function InvoiceSection({ patient, invoices }: InvoiceSectionProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showForm, setShowForm]               = useState(false)
  const [tipo, setTipo]                       = useState<'consulta' | 'internacao'>('consulta')
  const [selectedFile, setSelectedFile]       = useState<File | null>(null)
  const [amount, setAmount]                   = useState('')
  const [issueDate, setIssueDate]             = useState('')
  const [numeroNota, setNumeroNota]           = useState('')
  // consulta
  const [consultaDate, setConsultaDate]       = useState('')
  // internação
  const [internacaoInicio, setInternacaoInicio] = useState('')
  const [internacaoFim, setInternacaoFim]       = useState('')
  const [internacaoDias, setInternacaoDias]     = useState('')
  const [internacaoLocal, setInternacaoLocal]   = useState('')

  const [formError, setFormError]             = useState('')
  const [deletingId, setDeletingId]           = useState<string | null>(null)
  const [downloadingId, setDownloadingId]     = useState<string | null>(null)
  const [copiedId, setCopiedId]               = useState<string | null>(null)
  const [isPending, startTransition]          = useTransition()

  function handleCopiarTexto(inv: Invoice) {
    const texto = gerarTextoContador(inv, patient)
    navigator.clipboard.writeText(texto).then(() => {
      setCopiedId(inv.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  function cancelForm() {
    setShowForm(false)
    setTipo('consulta')
    setSelectedFile(null)
    setAmount('')
    setIssueDate('')
    setNumeroNota('')
    setConsultaDate('')
    setInternacaoInicio('')
    setInternacaoFim('')
    setInternacaoDias('')
    setInternacaoLocal('')
    setFormError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setFormError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile) return
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('patient_id', patient.id)
    formData.append('amount', amount.replace(',', '.'))
    formData.append('issue_date', issueDate)
    formData.append('tipo', tipo)
    formData.append('numero_nota', numeroNota)
    if (tipo === 'consulta') {
      formData.append('consulta_date', consultaDate)
    } else {
      formData.append('internacao_inicio', internacaoInicio)
      formData.append('internacao_fim', internacaoFim)
      formData.append('internacao_dias', internacaoDias)
      formData.append('internacao_local', internacaoLocal)
    }

    startTransition(async () => {
      const result = await uploadInvoice(formData)
      if (!result.success) { setFormError(result.error); return }
      cancelForm()
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    setDeletingId(id)
    startTransition(async () => {
      await deleteInvoice(id)
      setDeletingId(null)
      router.refresh()
    })
  }

  function handleDownload(id: string) {
    setDownloadingId(id)
    startTransition(async () => {
      const result = await getMedicoInvoiceUrl(id)
      setDownloadingId(null)
      if (result.success && result.data) window.open(result.data.url, '_blank')
    })
  }

  const inputCls = 'w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent'

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          <Receipt className="w-4 h-4" />
          Notas Fiscais
          {invoices.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full normal-case font-medium">
              {invoices.length}
            </span>
          )}
        </h4>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova NF
          </button>
        )}
      </div>

      {/* Formulário de upload */}
      {showForm && (
        <Card padding="sm" className="border-primary/30 bg-blue-50/40 mb-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-600">Nova nota fiscal</p>
              <button type="button" onClick={cancelForm} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Toggle tipo */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
              <button
                type="button"
                onClick={() => setTipo('consulta')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 transition-colors',
                  tipo === 'consulta'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                )}
              >
                <Stethoscope className="w-3.5 h-3.5" />
                Consulta
              </button>
              <button
                type="button"
                onClick={() => setTipo('internacao')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-1.5 transition-colors border-l border-gray-200',
                  tipo === 'internacao'
                    ? 'bg-purple-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                )}
              >
                <BedDouble className="w-3.5 h-3.5" />
                Internação
              </button>
            </div>

            {/* Campos comuns */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Valor (R$) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0,00"
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Nº da nota fiscal</label>
                <input
                  type="text"
                  value={numeroNota}
                  onChange={(e) => setNumeroNota(e.target.value)}
                  placeholder="000123"
                  className={inputCls}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  Data de emissão <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                  className={inputCls}
                />
              </div>
            </div>

            {/* Campos específicos — Consulta */}
            {tipo === 'consulta' && (
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Data da consulta</label>
                <input
                  type="date"
                  value={consultaDate}
                  onChange={(e) => setConsultaDate(e.target.value)}
                  className={inputCls}
                />
              </div>
            )}

            {/* Campos específicos — Internação */}
            {tipo === 'internacao' && (
              <div className="space-y-3 p-3 bg-purple-50/60 border border-purple-100 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Início da internação</label>
                    <input
                      type="date"
                      value={internacaoInicio}
                      onChange={(e) => setInternacaoInicio(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Fim da internação</label>
                    <input
                      type="date"
                      value={internacaoFim}
                      onChange={(e) => setInternacaoFim(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Dias de internação</label>
                    <input
                      type="number"
                      min="1"
                      value={internacaoDias}
                      onChange={(e) => setInternacaoDias(e.target.value)}
                      placeholder="Ex: 5"
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Local</label>
                    <input
                      type="text"
                      list="locais-internacao"
                      value={internacaoLocal}
                      onChange={(e) => setInternacaoLocal(e.target.value)}
                      placeholder="Ex: Einstein"
                      className={inputCls}
                    />
                    <datalist id="locais-internacao">
                      {LOCAIS_INTERNACAO.map(l => <option key={l} value={l} />)}
                    </datalist>
                  </div>
                </div>
              </div>
            )}

            {/* Seletor PDF */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors',
                selectedFile ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-primary hover:bg-primary/5'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-gray-700 truncate max-w-[200px]">{selectedFile.name}</span>
                </div>
              ) : (
                <p className="text-xs text-gray-500">Clique para selecionar o PDF da NF</p>
              )}
            </div>

            {formError && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                {formError}
              </p>
            )}

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!selectedFile || !amount || !issueDate || isPending}
                className="flex-1 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? 'Enviando...' : 'Enviar NF'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista */}
      {invoices.length === 0 && !showForm ? (
        <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-lg border border-gray-100">
          Nenhuma nota fiscal emitida para este paciente.
        </p>
      ) : invoices.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Nº NF</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Tipo / Referência</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Emissão</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-right px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-3 py-2.5 text-gray-500">{inv.numero_nota ?? <span className="text-gray-300">—</span>}</td>
                  <td className="px-3 py-2.5"><InvoiceReferencia inv={inv} /></td>
                  <td className="px-3 py-2.5 text-gray-700">{formatDate(inv.issue_date)}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{formatCurrency(inv.amount)}</td>
                  <td className="px-3 py-2.5">
                    {inv.downloaded_at ? (
                      <div>
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Baixada</span>
                        <p className="text-gray-400 mt-0.5">{formatDateTime(inv.downloaded_at)}</p>
                      </div>
                    ) : (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pendente</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleCopiarTexto(inv)}
                        className="p-1 transition-colors"
                        title="Copiar texto para o contador"
                        style={{ color: copiedId === inv.id ? '#16a34a' : '#9ca3af' }}
                      >
                        {copiedId === inv.id
                          ? <Check className="w-3.5 h-3.5" />
                          : <Copy className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDownload(inv.id)}
                        disabled={downloadingId === inv.id || isPending}
                        className="p-1 text-gray-400 hover:text-primary disabled:opacity-40 transition-colors"
                        title="Baixar PDF"
                      >
                        {downloadingId === inv.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Download className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(inv.id)}
                        disabled={deletingId === inv.id || isPending}
                        className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
