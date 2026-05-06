import type { CarePlan, CarePlanAttachment } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { ClipboardList, Calendar, FileText, Image, File, Video, Download, Paperclip } from 'lucide-react'

function FileIcon({ fileType }: { fileType: string | null }) {
  if (fileType?.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />
  if (fileType?.includes('image')) return <Image className="w-4 h-4 text-blue-500" />
  if (fileType?.includes('video')) return <Video className="w-4 h-4 text-violet-500" />
  return <File className="w-4 h-4 text-gray-500" />
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface CuidadosTabProps {
  carePlan: CarePlan | null
  attachments: CarePlanAttachment[]
}

export default function CuidadosTab({ carePlan, attachments }: CuidadosTabProps) {
  const hasContent = carePlan || attachments.length > 0

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <ClipboardList className="w-12 h-12 text-gray-300 mb-3" />
        <p className="text-gray-500 text-sm font-medium">Nenhuma orientação cadastrada ainda</p>
        <p className="text-gray-400 text-xs mt-1">
          Seu médico adicionará orientações personalizadas aqui.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Texto do plano */}
      {carePlan && (
        <div className="rounded-xl border border-primary/20 bg-blue-50/60 p-5">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">Plano de Cuidados</h3>
              <p className="text-xs text-gray-500 mt-0.5">Orientações personalizadas do seu médico</p>
            </div>
          </div>

          <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap bg-white rounded-lg border border-primary/10 px-4 py-3">
            {carePlan.content}
          </div>

          <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            <span>Atualizado em {formatDate(carePlan.updated_at)}</span>
          </div>
        </div>
      )}

      {/* Anexos */}
      {attachments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Paperclip className="w-4 h-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Materiais de apoio
            </h3>
            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
              {attachments.length}
            </span>
          </div>
          <div className="space-y-2">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-3 px-3 py-2.5 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow"
              >
                <div className="w-8 h-8 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-center flex-shrink-0">
                  <FileIcon fileType={att.file_type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{att.title}</p>
                  {att.file_size && (
                    <p className="text-xs text-gray-400 mt-0.5">{formatSize(att.file_size)}</p>
                  )}
                </div>
                <a
                  href={att.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors flex-shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  {att.file_type?.includes('video') ? 'Assistir' : 'Baixar'}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
