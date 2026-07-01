'use client'

import { useState } from 'react'
import type { Profile, PatientExam, CarePlan, CarePlanAttachment, Invoice, Consulta, LabResult, ImagingResult, Prescricao } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import Card from '@/components/ui/Card'
import {
  ArrowLeft, UserRound, FileText, Image, File, Video,
  Download, ClipboardList,
  Stethoscope, Receipt, Contact, Activity, Pill,
} from 'lucide-react'
import InvoiceSection from './InvoiceSection'
import { cn } from '@/lib/utils'
import ProntuarioTab from './prontuario/ProntuarioTab'
import PatientCadastroTab from './PatientCadastroTab'
import MonitoramentoTab from './prontuario/MonitoramentoTab'
import MemedPrescricao from './prontuario/MemedPrescricao'
import DocumentosTab from './prontuario/DocumentosTab'
import { guardNavigation } from '@/lib/prontuario-dirty'

function FileIcon({ fileType }: { fileType: string | null }) {
  if (fileType?.includes('pdf')) return <FileText className="w-4 h-4 text-red-500" />
  if (fileType?.includes('image')) return <Image className="w-4 h-4 text-blue-500" />
  if (fileType?.includes('video')) return <Video className="w-4 h-4 text-violet-500" />
  return <File className="w-4 h-4 text-gray-500" />
}

function calcAge(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null
  const birth = new Date(dataNascimento)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
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

type DetailTab = 'prontuario' | 'exames' | 'faturas' | 'cadastro' | 'monitoramento' | 'prescricao' | 'documentos'

interface PatientDetailProps {
  currentRole:  string
  patient:       Profile
  exames:        PatientExam[]
  carePlan:      CarePlan | null
  attachments:   CarePlanAttachment[]
  invoices:      Invoice[]
  consultas:     Consulta[]
  labResults:    LabResult[]
  imagingResults: ImagingResult[]
  prescricoes?:  { ativas: Prescricao[]; inativas: Prescricao[] }
  onBack:        () => void
  onRefresh?:    () => void
}

const VALID_DETAIL_TABS: DetailTab[] = ['prontuario', 'exames', 'faturas', 'cadastro', 'monitoramento', 'prescricao', 'documentos']

export default function PatientDetail({
  currentRole,
  patient,
  exames,
  invoices,
  consultas,
  labResults,
  imagingResults,
  prescricoes,
  onBack,
  onRefresh,
}: PatientDetailProps) {
  const canSeeProntuario = currentRole !== 'secretaria'
  const defaultTab: DetailTab = canSeeProntuario ? 'prontuario' : 'exames'

  const [activeDetailTab, setActiveDetailTabState] = useState<DetailTab>(() => {
    if (typeof window === 'undefined') return defaultTab
    const raw = new URLSearchParams(window.location.search).get('dtab') as DetailTab | null
    return raw && VALID_DETAIL_TABS.includes(raw) ? raw : defaultTab
  })

  function setActiveDetailTab(tab: DetailTab) {
    setActiveDetailTabState(tab)
    const p = new URLSearchParams(window.location.search)
    p.set('dtab', tab)
    window.history.pushState(null, '', `?${p.toString()}`)
  }

  const detailTabs: { id: DetailTab; label: string; icon: React.ReactNode }[] = [
    ...(canSeeProntuario ? [{ id: 'prontuario' as DetailTab, label: 'Prontuário', icon: <Stethoscope   className="w-4 h-4" /> }] : []),
    { id: 'monitoramento', label: 'Monitoramento', icon: <Activity      className="w-4 h-4" /> },
    { id: 'exames',        label: 'Arquivos',      icon: <ClipboardList className="w-4 h-4" /> },
    { id: 'faturas',       label: 'Faturas',       icon: <Receipt       className="w-4 h-4" /> },
    { id: 'cadastro',      label: 'Cadastro',      icon: <Contact       className="w-4 h-4" /> },
    ...(canSeeProntuario ? [{ id: 'prescricao' as DetailTab, label: 'Prescrição', icon: <Pill className="w-4 h-4" /> }] : []),
    ...(canSeeProntuario ? [{ id: 'documentos' as DetailTab, label: 'Documentos', icon: <FileText className="w-4 h-4" /> }] : []),
  ]

  return (
    <div className="space-y-6">
      {/* Back + patient header */}
      <button
        onClick={() => guardNavigation(onBack)}
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
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{patient.full_name || 'Nome não informado'}</h3>
            {calcAge(patient.data_nascimento) !== null && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/8 text-primary/80">
                {calcAge(patient.data_nascimento)} anos
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {patient.cpf && <span className="text-xs text-gray-500">CPF: {patient.cpf}</span>}
            {patient.data_nascimento && (
              <span className="text-xs text-gray-400">
                {new Date(patient.data_nascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
              </span>
            )}
            <span className="text-xs text-gray-400">Desde {formatDate(patient.created_at)}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              patient.lgpd_accepted ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {patient.lgpd_accepted ? 'LGPD aceita' : 'LGPD pendente'}
            </span>
          </div>
        </div>
      </div>

      {patient.obs_pessoal && (
        <div className="flex items-start gap-2 px-1 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
          <span className="font-semibold whitespace-nowrap">Obs.:</span>
          <span className="leading-relaxed whitespace-pre-wrap">{patient.obs_pessoal}</span>
        </div>
      )}

      {/* Main tab bar */}
      <div className="-mx-1 px-1 pb-3 border-b-2 border-gray-100 flex flex-wrap gap-1.5">
        {detailTabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => guardNavigation(() => setActiveDetailTab(tab.id))}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl transition-all',
              activeDetailTab === tab.id
                ? 'bg-primary text-white shadow-md ring-1 ring-primary/20'
                : 'bg-white text-gray-500 border border-gray-200 hover:border-gray-300 hover:text-gray-700 hover:bg-gray-50'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Monitoramento ── */}
      {activeDetailTab === 'monitoramento' && (
        <MonitoramentoTab
          patientId={patient.id}
          patientName={patient.full_name ?? 'Paciente'}
        />
      )}

      {/* ── Tab: Prontuário ── */}
      {activeDetailTab === 'prontuario' && canSeeProntuario && (
        <ProntuarioTab
          consultas={consultas}
          labResults={labResults}
          imagingResults={imagingResults}
          patientId={patient.id}
          patientName={patient.full_name ?? 'Paciente'}
          patientPhone={patient.phone}
          patientBirthday={patient.data_nascimento}
          patientGender={patient.sexo}
          patientRetorno={patient.retorno_previsto}
          initialPrescricoes={prescricoes}
          onRefresh={onRefresh}
        />
      )}

      {/* ── Tab: Exames ── */}
      {activeDetailTab === 'exames' && (
        <div>
          {exames.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
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
      )}

      {/* ── Tab: Faturas ── */}
      {activeDetailTab === 'faturas' && (
        <InvoiceSection patient={patient} invoices={invoices} />
      )}

      {/* ── Tab: Cadastro ── */}
      {activeDetailTab === 'cadastro' && (
        <PatientCadastroTab patient={patient} currentRole={currentRole} onDeleted={onBack} />
      )}

      {/* ── Tab: Prescrição ── */}
      {activeDetailTab === 'prescricao' && canSeeProntuario && (
        <MemedPrescricao
          patientId={patient.id}
          consultaId={null}
          patientName={patient.full_name ?? 'Paciente'}
          patientCpf={patient.cpf}
          patientPhone={patient.phone}
          patientBirthday={patient.data_nascimento}
          patientGender={patient.sexo}
        />
      )}

      {/* ── Tab: Documentos ── */}
      {activeDetailTab === 'documentos' && canSeeProntuario && (
        <DocumentosTab
          patientId={patient.id}
          patientName={patient.full_name ?? 'Paciente'}
        />
      )}

    </div>
  )
}
