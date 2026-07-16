'use client'

import { useRef, useState, useTransition } from 'react'
import { Paperclip, Download, Trash2, Loader2 } from 'lucide-react'
import { uploadNfFile, deleteNfFile, getNfSignedUrl } from '@/app/actions/nf-upload'

type NfSource = 'honorario' | 'financial'

interface Props {
  source:     NfSource
  recordId:   string
  filePath:   string | null
  onUploaded: (filePath: string) => void
  onDeleted:  () => void
}

export default function NfUploadButton({ source, recordId, filePath, onUploaded, onDeleted }: Props) {
  const fileRef                          = useRef<HTMLInputElement>(null)
  const [isPending, startTransition]     = useTransition()
  const [downloading, setDownloading]    = useState(false)
  const [error, setError]                = useState('')

  function handleClick() {
    if (filePath) return
    fileRef.current?.click()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)
    setError('')
    startTransition(async () => {
      const res = await uploadNfFile(source, recordId, formData)
      if (!res.success) { setError(res.error); return }
      onUploaded(res.data!.filePath)
    })
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleDownload() {
    if (!filePath) return
    setDownloading(true)
    setError('')
    const res = await getNfSignedUrl(filePath)
    setDownloading(false)
    if (!res.success) { setError(res.error); return }
    window.open(res.data!.url, '_blank')
  }

  function handleDelete() {
    if (!filePath || !confirm('Remover NF anexada?')) return
    setError('')
    startTransition(async () => {
      const res = await deleteNfFile(source, recordId, filePath)
      if (!res.success) { setError(res.error); return }
      onDeleted()
    })
  }

  const loading = isPending || downloading

  return (
    <div className="flex items-center gap-0.5">
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {filePath ? (
        <>
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading}
            title="Ver / baixar NF"
            className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition-colors"
          >
            {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            title="Remover NF"
            className="p-1.5 rounded-md text-gray-300 hover:text-red-400 disabled:opacity-40 transition-colors"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          disabled={loading}
          title="Anexar NF (PDF)"
          className="p-1.5 rounded-md text-gray-300 hover:text-primary hover:bg-primary/5 disabled:opacity-40 transition-colors"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
        </button>
      )}

      {error && (
        <span className="text-[10px] text-red-500 max-w-[120px] leading-tight">{error}</span>
      )}
    </div>
  )
}
