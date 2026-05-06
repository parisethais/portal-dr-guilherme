'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { uploadExame, deleteExame } from '@/app/actions/exames'
import type { PatientExam } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import { FileText, Image, File, Download, Trash2, Upload, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'

function ExameIcon({ fileType }: { fileType: string | null }) {
  if (fileType?.includes('pdf')) return <FileText className="w-5 h-5 text-red-500" />
  if (fileType?.includes('image')) return <Image className="w-5 h-5 text-blue-500" />
  return <File className="w-5 h-5 text-gray-500" />
}

function formatSize(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface ExameUploadProps {
  exames: PatientExam[]
}

export default function ExameUpload({ exames }: ExameUploadProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setTitle(file.name.replace(/\.[^.]+$/, ''))
    setError('')
  }

  function handleCancel() {
    setShowForm(false)
    setSelectedFile(null)
    setTitle('')
    setError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile) return

    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('title', title)

    startTransition(async () => {
      const result = await uploadExame(formData)
      if (!result.success) {
        setError(result.error)
        return
      }
      handleCancel()
      router.refresh()
    })
  }

  function handleDelete(exameId: string) {
    setDeletingId(exameId)
    startTransition(async () => {
      const result = await deleteExame(exameId)
      setDeletingId(null)
      if (!result.success) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {/* Botão / formulário de upload */}
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Enviar Exame
        </button>
      ) : (
        <Card padding="sm" className="border-primary/30 bg-blue-50/40">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-gray-700">Novo exame</p>
              <button type="button" onClick={handleCancel} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Seletor de arquivo */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
                selectedFile
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-300 hover:border-primary hover:bg-primary/5'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              {selectedFile ? (
                <div className="flex items-center justify-center gap-2">
                  <ExameIcon fileType={selectedFile.type} />
                  <span className="text-sm text-gray-700 truncate max-w-[200px]">{selectedFile.name}</span>
                  <span className="text-xs text-gray-400">{formatSize(selectedFile.size)}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Upload className="w-6 h-6 text-gray-400" />
                  <p className="text-sm text-gray-500">Clique para selecionar</p>
                  <p className="text-xs text-gray-400">PDF ou imagem, até 10 MB</p>
                </div>
              )}
            </div>

            {/* Título */}
            {selectedFile && (
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Título</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Hemograma, Raio-X tórax..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={!selectedFile || isPending}
                className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPending ? 'Enviando...' : 'Enviar'}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Lista de exames enviados */}
      {exames.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Nenhum exame enviado ainda.</p>
      ) : (
        <div className="space-y-2">
          {exames.map((exame) => (
            <Card key={exame.id} padding="sm" className="hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <ExameIcon fileType={exame.file_type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{exame.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{formatDate(exame.created_at)}</span>
                    {exame.file_size && (
                      <span className="text-xs text-gray-400">· {formatSize(exame.file_size)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <a
                    href={exame.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-gray-400 hover:text-primary transition-colors"
                    title="Baixar"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleDelete(exame.id)}
                    disabled={deletingId === exame.id || isPending}
                    className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
