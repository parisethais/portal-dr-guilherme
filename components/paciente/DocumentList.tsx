'use client'

import { useState } from 'react'
import type { Document } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import { FileText, Image, File, Download, Search, Inbox } from 'lucide-react'

interface DocumentListProps {
  documents: Document[]
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

export default function DocumentList({ documents }: DocumentListProps) {
  const [search, setSearch] = useState('')

  const filtered = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.description?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">
            {search ? 'Nenhum documento encontrado.' : 'Nenhum documento disponível ainda.'}
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-primary text-sm mt-2 hover:underline"
            >
              Limpar busca
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
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
                    <span className="text-xs bg-blue-50 text-primary px-2 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0">
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
  )
}
