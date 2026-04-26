'use client'

import { useState, useTransition } from 'react'
import type { Document } from '@/lib/types'
import { deleteDocument } from '@/app/actions/documents'
import { formatDate } from '@/lib/utils'
import { FileText, File, Image, Trash2, Download, Inbox } from 'lucide-react'

interface MedicoDocumentListProps {
  documents: Document[]
}

function DocIcon({ fileType }: { fileType: string | null }) {
  if (fileType?.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />
  if (fileType?.includes('image')) return <Image className="w-4 h-4 text-blue-500" />
  return <File className="w-4 h-4 text-gray-500" />
}

export default function MedicoDocumentList({ documents: initialDocs }: MedicoDocumentListProps) {
  const [docs, setDocs] = useState(initialDocs)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  function handleDelete(docId: string) {
    if (!confirm('Deseja remover este documento? Esta ação não pode ser desfeita.')) return

    setDeleting(docId)
    startTransition(async () => {
      const result = await deleteDocument(docId)
      if (result.success) {
        setDocs((prev) => prev.filter((d) => d.id !== docId))
      }
      setDeleting(null)
    })
  }

  if (docs.length === 0) {
    return (
      <div className="text-center py-10">
        <Inbox className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">Nenhum documento enviado ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
      {docs.map((doc) => (
        <div
          key={doc.id}
          className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors group"
        >
          <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <DocIcon fileType={doc.file_type} />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{doc.title}</p>
            <p className="text-xs text-gray-500">
              Para: {doc.patient?.full_name || 'Paciente'} · {formatDate(doc.created_at)}
            </p>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={doc.file_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-gray-400 hover:text-primary hover:bg-blue-50 transition-colors"
              title="Baixar"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => handleDelete(doc.id)}
              disabled={deleting === doc.id}
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Remover"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
