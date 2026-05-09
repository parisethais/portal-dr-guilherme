'use client'

import { useRef, useState, useTransition } from 'react'
import type { Profile, PatientExam, CarePlan, CarePlanAttachment, Invoice, Consulta, LabResult, ImagingResult } from '@/lib/types'
import { upsertCarePlan } from '@/app/actions/care-plans'
import { uploadCarePlanAttachment, deleteCarePlanAttachment } from '@/app/actions/care-plan-attachments'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import {
  ArrowLeft, UserRound, FileText, Image, File, Video,
  Download, ClipboardList, Calendar, Save, CheckCircle,
  Paperclip, Plus, X, Trash2, Upload, AlertTriangle,
  Stethoscope, Receipt, Contact, AlertCircle, TrendingUp, TrendingDown, FlaskConical,
} from 'lucide-react'
import { computeLabAlerts } from '@/lib/lab-alerts'
import InvoiceSection from './InvoiceSection'
import { deletePatient } from '@/app/actions/patients'
import { cn } from '@/lib/utils'
import ProntuarioTab from './prontuario/ProntuarioTab'
import PatientCadastroTab from './PatientCadastroTab'

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

function actionLabel(fileType: string | null): string {
  if (fileType?.includes('video')) return 'Assistir'
  return 'Baixar'
}

type DetailTab = 'prontuario' | 'plano' | 'faturas' | 'cadastro'

interface PatientDetailProps {
  patient: Profile
  exames: PatientExam[]
  carePlan: CarePlan | null
  attachments: CarePlanAttachment[]
  invoices: Invoice[]
  consultas: Consulta[]
  labResults: LabResult[]
  imagingResults: ImagingResult[]
  onBack: () => void
}

export default function PatientDetail({
  patient,
  exames,
  carePlan,
  attachments: initialAttachments,
  invoices,
  consultas,
  labResults,
  imagingResults,
  onBack,
}: PatientDetailProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [activeDetailTab, setActiveDetailTab] = useState<DetailTab>('prontuario')

  // Care plan text state
  const [content, setContent] = useState(carePlan?.content ?? '')
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isSaving, startSaveTransition] = useTransition()

  // Attachment upload state
  const [showUpload, setShowUpload] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [attachTitle, setAttachTitle] = useState('')
  const [uploadError, setUploadError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isUploading, startUploadTransition] = useTransition()

  // Delete patient state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, startDeleteTransition] = useTransition()

  function handleDeletePatient() {
    setDeleteError('')
    startDeleteTransition(async () => {
      const result = await deletePatient(patient.id)
      if (!result.success) {
        setDeleteError(result.error)
        return
      }
      onBack()
    })
  }

  function handleSave() {
    setSaveError('')
    setSaved(false)
    startSaveTransition(async () => {
      const result = await upsertCarePlan(patient.id, content)
      if (!result.success) { setSaveError(result.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    setAttachTitle(file.name.replace(/\.[^.]+$/, ''))
    setUploadError('')
  }

  function cancelUpload() {
    setShowUpload(false)
    setSelectedFile(null)
    setAttachTitle('')
    setUploadError('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFile) return
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('title', attachTitle)
    startUploadTransition(async () => {
      const result = await uploadCarePlanAttachment(patient.id, formData)
      if (!result.success) { setUploadError(result.error); return }
      cancelUpload()
      router.refresh()
    })
  }

  function handleDelete(id: string) {
    setDeletingId(id)
    startUploadTransition(async () => {
      await deleteCarePlanAttachment(id)
      setDeletingId(null)
      router.refresh()
    })
  }

  const detailTabs: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
    { id: 'prontuario', label: 'Prontuário',    icon: <Stethoscope   className="w-4 h-4" /> },
    { id: 'plano',      label: 'Plano e Exames', icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'faturas',    label: 'Faturas',        icon: <Receipt       className="w-4 h-4" /> },
    { id: 'cadastro',   label: 'Cadastro',       icon: <Contact       className="w-4 h-4" /> },
  ]

  return (
    <div className="space-y-6">
      {/* Back + patient header */}
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </button>

      <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
          <UserRound className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{patient.full_name || 'Nome não informado'}</h3>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {patient.cpf && <span className="text-xs text-gray-500">CPF: {patient.cpf}</span>}
            <span className="text-xs text-gray-400">Desde {formatDate(patient.created_at)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              patient.lgpd_accepted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {patient.lgpd_accepted ? 'LGPD aceita' : 'LGPD pendente'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Alertas laboratoriais ── */}
      {(() => {
        const alerts = computeLabAlerts(labResults)
        if (alerts.length === 0) return null
        const critCount = alerts.filter(a => a.severity === 'critical').length
        const warnCount = alerts.filter(a => a.severity === 'warning').length
        return (
          <div className="rounded-xl border overflow-hidden -mt-2">
            {/* Header */}
            <div className={`flex items-center gap-2 px-4 py-2.5 ${critCount > 0 ? 'bg-red-50 border-b border-red-200' : 'bg-amber-50 border-b border-amber-200'}`}>
              <FlaskConical className={`w-3.5 h-3.5 flex-shrink-0 ${critCount > 0 ? 'text-red-500' : 'text-amber-500'}`} />
              <span className={`text-xs font-semibold ${critCount > 0 ? 'text-red-700' : 'text-amber-700'}`}>
                Alertas laboratoriais
              </span>
              {critCount > 0 && (
                <span className="text-[10px] bg-red-600 text-white font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {critCount} crítico{critCount > 1 ? 's' : ''}
                </span>
              )}
              {warnCount > 0 && (
                <span className="text-[10px] bg-amber-200 text-amber-800 font-semibold px-1.5 py-0.5 rounded-full leading-none">
                  {warnCount} atenção
                </span>
              )}
              <span className="ml-auto text-[10px] text-gray-400">ver em Prontuário → Laboratorial</span>
            </div>
            {/* Alert rows */}
            <div className={`divide-y ${critCount > 0 ? 'divide-red-100 border-red-200' : 'divide-amber-100 border-amber-200'} border`}>
              {alerts.map(alert => {
                const isCrit = alert.severity === 'critical'
                const fmt = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
                return (
                  <div key={alert.id} className={`flex items-center gap-3 px-4 py-2.5 ${isCrit ? 'bg-red-50/60' : 'bg-amber-50/40'}`}>
                    <div className={`flex-shrink-0 ${isCrit ? 'text-red-500' : 'text-amber-500'}`}>
                      {isCrit
                        ? <AlertCircle className="w-3.5 h-3.5" />
                        : alert.direction === 'high'
                          ? <TrendingUp className="w-3.5 h-3.5" />
                          : <TrendingDown className="w-3.5 h-3.5" />}
                    </div>
                    <p className={`text-xs font-medium flex-1 ${isCrit ? 'text-red-800' : 'text-amber-800'}`}>
                      {alert.message}
                    </p>
                    <span className={`text-xs flex-shrink-0 ${isCrit ? 'text-red-500' : 'text-amber-600'}`}>
                      <strong>{alert.latestValue}{alert.latestUnit ? ` ${alert.latestUnit}` : ''}</strong>
                      {' '}· {fmt(alert.latestDate)}
                      {alert.count > 1 && ` · ${alert.count}×`}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Main tab bar */}
      <div className="flex border-b border-gray-200 gap-0">
        {detailTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveDetailTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px',
              activeDetailTab === tab.id
                ? 'text-primary border-primary'
                : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-200'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Prontuário ── */}
      {activeDetailTab === 'prontuario' && (
        <ProntuarioTab
          consultas={consultas}
          labResults={labResults}
          imagingResults={imagingResults}
          patientId={patient.id}
        />
      )}

      {/* ── Tab: Plano e Exames ── */}
      {activeDetailTab === 'plano' && (
        <div className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Exames enviados pelo paciente */}
            <div>
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                Exames enviados pelo paciente
              </h4>
              {exames.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-200">
                  <File className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Nenhum exame enviado ainda.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {exames.map((exame) => (
                    <Card key={exame.id} padding="sm">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <FileIcon fileType={exame.file_type} />
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
                        <a
                          href={exame.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-gray-400 hover:text-primary transition-colors flex-shrink-0"
                          title="Baixar"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Plano de Cuidados + Anexos */}
            <div className="space-y-5">
              {/* Texto do plano */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Plano de Cuidados
                </h4>
                <div className="space-y-3">
                  <textarea
                    value={content}
                    onChange={(e) => { setContent(e.target.value); setSaved(false) }}
                    placeholder="Escreva as orientações personalizadas para este paciente..."
                    rows={6}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-800 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-gray-400"
                  />
                  {saveError && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      {saveError}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    {carePlan && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Salvo em {formatDate(carePlan.updated_at)}</span>
                      </div>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                      {saved && (
                        <div className="flex items-center gap-1.5 text-xs text-green-600">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Salvo
                        </div>
                      )}
                      <button
                        onClick={handleSave}
                        disabled={isSaving || !content.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {isSaving ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Anexos */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    <Paperclip className="w-4 h-4" />
                    Anexos
                    {initialAttachments.length > 0 && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full normal-case font-medium">
                        {initialAttachments.length}
                      </span>
                    )}
                  </h4>
                  {!showUpload && (
                    <button
                      onClick={() => setShowUpload(true)}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Adicionar
                    </button>
                  )}
                </div>

                {/* Formulário inline de upload */}
                {showUpload && (
                  <Card padding="sm" className="border-primary/30 bg-blue-50/40 mb-3">
                    <form onSubmit={handleUpload} className="space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-600">Novo anexo</p>
                        <button type="button" onClick={cancelUpload} className="text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

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
                          accept="application/pdf,image/*,video/mp4,video/webm,video/quicktime"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        {selectedFile ? (
                          <div className="flex items-center justify-center gap-2">
                            <FileIcon fileType={selectedFile.type} />
                            <span className="text-xs text-gray-700 truncate max-w-[180px]">{selectedFile.name}</span>
                            <span className="text-xs text-gray-400">{formatSize(selectedFile.size)}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <Upload className="w-5 h-5 text-gray-400" />
                            <p className="text-xs text-gray-500">PDF, imagem ou vídeo · até 100 MB</p>
                          </div>
                        )}
                      </div>

                      {selectedFile && (
                        <div>
                          <label className="text-xs font-medium text-gray-600 block mb-1">Título</label>
                          <input
                            type="text"
                            value={attachTitle}
                            onChange={(e) => setAttachTitle(e.target.value)}
                            placeholder="Nome do arquivo..."
                            className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>
                      )}

                      {uploadError && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
                          {uploadError}
                        </p>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={!selectedFile || isUploading}
                          className="flex-1 py-1.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isUploading ? 'Enviando...' : 'Enviar'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelUpload}
                          className="px-3 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs hover:bg-gray-50 transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </Card>
                )}

                {/* Lista de anexos */}
                {initialAttachments.length === 0 && !showUpload ? (
                  <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-lg border border-gray-100">
                    Nenhum anexo adicionado.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {initialAttachments.map((att) => (
                      <div
                        key={att.id}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-100 group"
                      >
                        <div className="w-7 h-7 bg-white rounded-md border border-gray-200 flex items-center justify-center flex-shrink-0">
                          <FileIcon fileType={att.file_type} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{att.title}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-xs text-gray-400">{formatDate(att.created_at)}</span>
                            {att.file_size && (
                              <span className="text-xs text-gray-400">· {formatSize(att.file_size)}</span>
                            )}
                          </div>
                        </div>
                        <a
                          href={att.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-gray-400 hover:text-primary transition-colors"
                          title={actionLabel(att.file_type)}
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => handleDelete(att.id)}
                          disabled={deletingId === att.id || isUploading}
                          className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-40 transition-colors"
                          title="Remover"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Faturas ── */}
      {activeDetailTab === 'faturas' && (
        <InvoiceSection patient={patient} invoices={invoices} />
      )}

      {/* ── Tab: Cadastro ── */}
      {activeDetailTab === 'cadastro' && (
        <PatientCadastroTab patient={patient} />
      )}

      {/* Zona de perigo — deletar paciente */}
      <div className="border-t border-red-100 pt-5 mt-2">
        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Deletar paciente
          </button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-700">Deletar paciente permanentemente?</p>
                <p className="text-xs text-red-600 mt-0.5">
                  Todos os dados serão removidos: documentos, exames, mensagens, consultas e notas fiscais.
                  Esta ação não pode ser desfeita.
                </p>
              </div>
            </div>

            {deleteError && (
              <p className="text-xs text-red-700 bg-red-100 rounded-lg px-3 py-2">{deleteError}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowDeleteConfirm(false); setDeleteError('') }}
                disabled={isDeleting}
                className="flex-1 py-1.5 border border-gray-300 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeletePatient}
                disabled={isDeleting}
                className="flex-1 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Deletando...' : 'Sim, deletar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
