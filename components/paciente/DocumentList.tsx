'use client'

import { useState } from 'react'
import type { Document, PatientExam } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import ExameUpload from './ExameUpload'
import { FileText, Image, File, Download, Search, Inbox, Building2, FlaskConical } from 'lucide-react'

interface DocumentListProps {
  documents: Document[]
  exames: PatientExam[]
}

function DocIcon({ fileType }: { fileType: string | null }) {
  if (fileType?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />
  if (fileType?.includes('image')) return <Image className="w-5 h-5 text-blue-500" />
  return <File className="w-5 h-5 text-gray-500" />
}

function categoryLabel(title: string): string {
  const lower = title.toLowerCase()
  if (lower.includes('laudo')) return 'Laudo'
  if (lower.includes('receita')) return 'Receita'
  if (lower.includes('orientação') || lower.includes('orientacao')) return 'Orientação'
  if (lower.includes('exame')) return 'Exame'
  return 'Documento'
}

export default function DocumentList({ documents, exames }: DocumentListProps) {
  const [search, setSearch] = useState('')

  const filtered = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* ── Recebidos pelo consultório ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="w-3.5 h-3.5" style={{ color: '#7A9E7E' }} />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#7A9E7E' }}>
            Recebidos pelo consultório
          </h3>
          {documents.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {documents.length}
            </span>
          )}
        </div>

        {documents.length > 0 && (
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar documento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        )}

        {filtered.length === 0 ? (
          <div className="text-center py-8 rounded-xl border border-dashed border-black/[0.08]" style={{ backgroundColor: 'rgba(245,240,232,0.5)' }}>
            <Inbox className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-400 text-sm">
              {search ? 'Nenhum documento encontrado.' : 'Nenhum documento disponível ainda.'}
            </p>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="text-primary text-sm mt-1.5 hover:underline"
              >
                Limpar busca
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((doc) => (
              <Card key={doc.id} padding="sm" className="hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <DocIcon fileType={doc.file_type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-gray-900 text-sm">{doc.title}</h4>
                        {doc.description && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{doc.description}</p>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0" style={{ backgroundColor: 'rgba(45,43,107,0.07)', color: '#2D2B6B' }}>
                        {categoryLabel(doc.title)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-400">{formatDate(doc.created_at)}</span>
                      <a
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary-light transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Baixar
                      </a>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Divisor */}
      <div className="border-t border-gray-100" />

      {/* ── Meus Exames ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="w-3.5 h-3.5" style={{ color: '#7A9E7E' }} />
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em]" style={{ color: '#7A9E7E' }}>
            Meus Exames
          </h3>
          {exames.length > 0 && (
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
              {exames.length}
            </span>
          )}
        </div>
        <ExameUpload exames={exames} />
      </div>
    </div>
  )
}
