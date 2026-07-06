'use client'

import { useState, useTransition } from 'react'
import type { Invoice } from '@/lib/types'
import { downloadInvoice } from '@/app/actions/invoices'
import { useRouter } from 'next/navigation'
import { Receipt, Download, Loader2, Stethoscope, BedDouble } from 'lucide-react'

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
  })
}

function InvoiceDescricao({ inv }: { inv: Invoice }) {
  if (inv.tipo === 'internacao') {
    const parts: string[] = []
    if (inv.internacao_local) parts.push(inv.internacao_local)
    if (inv.internacao_inicio && inv.internacao_fim) {
      parts.push(`${formatDate(inv.internacao_inicio)} a ${formatDate(inv.internacao_fim)}`)
    }
    if (inv.internacao_dias) parts.push(`${inv.internacao_dias} dias`)
    return (
      <div>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
          <BedDouble className="w-3 h-3" /> Internação
        </span>
        {parts.length > 0 && (
          <p className="text-xs text-gray-500 mt-0.5">{parts.join(' · ')}</p>
        )}
      </div>
    )
  }
  return (
    <div>
      <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
        <Stethoscope className="w-3 h-3" /> Consulta
      </span>
      {inv.consulta_date && (
        <p className="text-xs text-gray-500 mt-0.5">{formatDate(inv.consulta_date)}</p>
      )}
    </div>
  )
}

interface InvoiceListProps {
  invoices: Invoice[]
}

export default function InvoiceList({ invoices }: InvoiceListProps) {
  const router = useRouter()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function handleDownload(invoiceId: string) {
    setDownloadingId(invoiceId)
    setError('')
    startTransition(async () => {
      const result = await downloadInvoice(invoiceId)
      setDownloadingId(null)
      if (!result.success) { setError(result.error); return }
      window.open(result.data!.url, '_blank')
      router.refresh()
    })
  }

  if (invoices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Receipt className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm font-medium">Nenhuma nota fiscal disponível</p>
        <p className="text-gray-400 text-xs mt-1">
          As notas fiscais emitidas pelo consultório aparecerão aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      {/* Desktop: tabela */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Emissão</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Valor</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 py-3"><InvoiceDescricao inv={inv} /></td>
                <td className="px-4 py-3 text-gray-700">{formatDate(inv.issue_date)}</td>
                <td className="px-4 py-3 font-medium text-gray-900">{formatCurrency(inv.amount)}</td>
                <td className="px-4 py-3">
                  {inv.downloaded_at ? (
                    <div>
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Baixada
                      </span>
                      <p className="text-xs text-gray-400 mt-0.5">em {formatDateTime(inv.downloaded_at)}</p>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                      Pendente
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleDownload(inv.id)}
                    disabled={downloadingId === inv.id || isPending}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {downloadingId === inv.id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <Download className="w-3.5 h-3.5" />}
                    Baixar PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: cards */}
      <div className="sm:hidden space-y-2">
        {invoices.map((inv) => (
          <div key={inv.id} className="rounded-xl border border-gray-200 bg-white px-4 py-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <InvoiceDescricao inv={inv} />
                <p className="text-xs text-gray-400 mt-1">{formatDate(inv.issue_date)}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(inv.amount)}</p>
                {inv.downloaded_at ? (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">Baixada</span>
                ) : (
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">Pendente</span>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDownload(inv.id)}
              disabled={downloadingId === inv.id || isPending}
              className="w-full flex items-center justify-center gap-1.5 py-2 border border-primary/30 text-primary text-xs font-medium rounded-lg hover:bg-primary/5 disabled:opacity-50 transition-colors"
            >
              {downloadingId === inv.id
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <Download className="w-3.5 h-3.5" />}
              Baixar PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
