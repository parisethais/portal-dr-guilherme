'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Profile } from '@/lib/types'
import { uploadDocument } from '@/app/actions/documents'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import PatientCombobox from '@/components/ui/PatientCombobox'
import { Upload, X, FileText, CheckCircle } from 'lucide-react'

interface DocumentUploadProps {
  patients: Profile[]
}

export default function DocumentUpload({ patients }: DocumentUploadProps) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0]
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        setError('O arquivo deve ter no máximo 10 MB.')
        return
      }
      setFile(selected)
      setError('')
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      if (dropped.size > 10 * 1024 * 1024) {
        setError('O arquivo deve ter no máximo 10 MB.')
        return
      }
      setFile(dropped)
      setError('')
    }
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')

    if (!file) {
      setError('Selecione um arquivo para enviar.')
      return
    }

    const formData = new FormData(e.currentTarget)
    formData.set('file', file)

    startTransition(async () => {
      const result = await uploadDocument(formData)
      if (!result.success) {
        setError(result.error)
      } else {
        setSuccess(true)
        setFile(null)
        formRef.current?.reset()
        if (fileRef.current) fileRef.current.value = ''
        setTimeout(() => setSuccess(false), 4000)
        router.refresh()
      }
    })
  }

  return (
    <div className="max-w-lg space-y-4">
      {success && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-sm font-medium text-green-800">Documento enviado com sucesso!</p>
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        {/* Paciente */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Paciente <span className="text-red-500">*</span>
          </label>
          <PatientCombobox patients={patients} required />
        </div>

        <Input
          label="Título do documento"
          name="title"
          type="text"
          placeholder="Ex: Laudo de exame, Receita médica, Orientações pós-consulta..."
          required
          maxLength={120}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
          <textarea
            name="description"
            rows={2}
            placeholder="Observações adicionais sobre o documento (opcional)..."
            maxLength={500}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none placeholder:text-gray-400"
          />
        </div>

        {/* Área de upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Arquivo <span className="text-red-500">*</span>
          </label>
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              file
                ? 'border-primary bg-blue-50'
                : 'border-gray-300 hover:border-primary hover:bg-blue-50/30'
            }`}
          >
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-6 h-6 text-primary" />
                <div className="text-left">
                  <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    if (fileRef.current) fileRef.current.value = ''
                  }}
                  className="ml-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">Arraste o arquivo ou clique para selecionar</p>
                <p className="text-xs text-gray-400 mt-1">PDF, imagens, Word — máximo 10 MB</p>
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <Button type="submit" loading={isPending} size="lg">
          <Upload className="w-4 h-4" />
          Enviar Documento
        </Button>
      </form>
    </div>
  )
}
