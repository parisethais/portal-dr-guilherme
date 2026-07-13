'use client'

import { useState, useRef } from 'react'
import { uploadExameByToken, classifyAndSaveExame } from '@/app/actions/exame-upload'
import type { ClassificacaoResult } from '@/app/actions/exame-upload'
import { Upload, CheckCircle, XCircle, Loader2, FileText, FlaskConical, ScanLine, Microscope } from 'lucide-react'

interface Props {
  token:        string
  patientName:  string
  lgpdAccepted: boolean
}

interface FileStatus {
  file:        File
  status:      'pending' | 'uploading' | 'classifying' | 'done' | 'error'
  result?:     ClassificacaoResult
  error?:      string
}

const CATEGORIA_ICON = {
  laboratorial: <FlaskConical className="w-4 h-4 text-blue-500" />,
  imagem:       <ScanLine     className="w-4 h-4 text-purple-500" />,
  biopsia:      <Microscope   className="w-4 h-4 text-orange-500" />,
}

const CATEGORIA_LABEL = {
  laboratorial: 'Laboratorial',
  imagem:       'Imagem',
  biopsia:      'Biópsia',
}

export default function ExameUploadClient({ token, patientName }: Omit<Props, 'lgpdAccepted'>) {
  const [files, setFiles]     = useState<FileStatus[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Upload ───────────────────────────────────────────────────
  function addFiles(newFiles: File[]) {
    const valid = newFiles.filter(f => f.size <= 30 * 1024 * 1024)
    setFiles(prev => [...prev, ...valid.map(f => ({ file: f, status: 'pending' as const }))])
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setIsDragging(false)
    addFiles(Array.from(e.dataTransfer.files).filter(f => f.type === 'application/pdf' || f.type.startsWith('image/')))
  }

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) addFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
  }

  async function handleUpload() {
    const pending = files.filter(f => f.status === 'pending')
    if (pending.length === 0) return
    setIsProcessing(true)

    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue

      // — uploading —
      setFiles(prev => prev.map((f, j) => j === i ? { ...f, status: 'uploading' } : f))

      const fd = new FormData()
      fd.append('file', files[i].file)
      const uploadRes = await uploadExameByToken(token, fd)

      if (!uploadRes.success) {
        setFiles(prev => prev.map((f, j) => j === i ? { ...f, status: 'error', error: uploadRes.error } : f))
        continue
      }

      // — classifying —
      setFiles(prev => prev.map((f, j) => j === i ? { ...f, status: 'classifying' } : f))

      if (!uploadRes.data) continue
      const classRes = await classifyAndSaveExame(token, uploadRes.data.url, uploadRes.data.fileName)

      if (!classRes.success) {
        setFiles(prev => prev.map((f, j) => j === i ? { ...f, status: 'error', error: classRes.error } : f))
        continue
      }

      setFiles(prev => prev.map((f, j) => j === i ? { ...f, status: 'done', result: classRes.data } : f))
    }

    setIsProcessing(false)
  }

  const allDone    = files.length > 0 && files.every(f => f.status === 'done' || f.status === 'error')
  const hasPending = files.some(f => f.status === 'pending')

  // ── Render Upload ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-4 flex items-center gap-3 flex-shrink-0">
        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
          <Upload className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-xs text-gray-500">Consultório Dr. Guilherme</p>
          <p className="font-semibold text-gray-900 text-sm">{patientName}</p>
        </div>
      </header>

      <div className="flex-1 px-4 py-5 max-w-lg mx-auto w-full space-y-4">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Envio de exames</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Envie seus exames em PDF antes da consulta. O médico já os verá carregados na sua ficha.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            isDragging ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white hover:border-primary/40 hover:bg-blue-50/30'
          }`}
        >
          <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-700">Toque para selecionar</p>
          <p className="text-xs text-gray-400 mt-1">PDF · até 30 MB por arquivo · vários arquivos</p>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,image/*"
            onChange={handleInput}
            className="hidden"
          />
        </div>

        {/* File list */}
        {files.length > 0 && (
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{f.file.name}</p>
                    <p className="text-xs text-gray-400">{(f.file.size / 1024 / 1024).toFixed(1)} MB</p>
                  </div>
                  {f.status === 'pending' && !isProcessing && (
                    <button type="button" onClick={() => removeFile(i)} className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                  )}
                  {f.status === 'uploading' && <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />}
                  {f.status === 'classifying' && <Loader2 className="w-4 h-4 text-amber-500 animate-spin flex-shrink-0" />}
                  {f.status === 'done' && <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />}
                  {f.status === 'error' && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                </div>

                {f.status === 'uploading' && (
                  <p className="text-xs text-primary mt-1.5 ml-7">Enviando...</p>
                )}
                {f.status === 'classifying' && (
                  <p className="text-xs text-amber-600 mt-1.5 ml-7">Identificando tipo de exame com IA...</p>
                )}
                {f.status === 'done' && f.result && (
                  <div className="mt-2 ml-7 flex items-center gap-2">
                    {CATEGORIA_ICON[f.result.categoria]}
                    <span className="text-xs font-medium text-gray-700">{f.result.tipo}</span>
                    <span className="text-xs text-gray-400">· {CATEGORIA_LABEL[f.result.categoria]}</span>
                  </div>
                )}
                {f.status === 'error' && (
                  <p className="text-xs text-red-500 mt-1.5 ml-7">{f.error ?? 'Erro ao enviar. Tente novamente.'}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        {hasPending && (
          <button
            type="button"
            onClick={handleUpload}
            disabled={isProcessing}
            className="w-full py-3 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              : <><Upload className="w-4 h-4" /> Enviar {files.filter(f => f.status === 'pending').length} arquivo{files.filter(f => f.status === 'pending').length !== 1 ? 's' : ''}</>
            }
          </button>
        )}

        {/* Success */}
        {allDone && files.some(f => f.status === 'done') && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center space-y-1">
            <CheckCircle className="w-6 h-6 text-green-500 mx-auto" />
            <p className="text-sm font-semibold text-green-800">Exames recebidos!</p>
            <p className="text-xs text-green-700">O Dr. Guilherme já pode visualizá-los na sua ficha.</p>
          </div>
        )}

        {/* Add more */}
        {allDone && (
          <button
            type="button"
            onClick={() => setFiles(prev => prev.filter(f => f.status !== 'done'))}
            className="w-full py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            Enviar mais arquivos
          </button>
        )}
      </div>
    </div>
  )
}
