'use client'

import { useState } from 'react'
import type { Profile, PatientExam, CarePlan, CarePlanAttachment, Invoice, Consulta, LabResult, ImagingResult, Prescricao } from '@/lib/types'
import LabResultsPanel from './prontuario/LabResultsPanel'
import ImagingPanel from './prontuario/ImagingPanel'
import { formatDate } from '@/lib/utils'
import {
  ArrowLeft, UserRound,
  Stethoscope, Receipt, Contact, Activity, Pill,
  FlaskConical, ScanLine, Microscope,
} from 'lucide-react'
import InvoiceSection from './InvoiceSection'
import { cn } from '@/lib/utils'
import ProntuarioTab from './prontuario/ProntuarioTab'
import PatientCadastroTab from './PatientCadastroTab'
import MonitoramentoTab from './prontuario/MonitoramentoTab'
import MemedPrescricao from './prontuario/MemedPrescricao'
import { guardNavigation } from '@/lib/prontuario-dirty'

function calcAge(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null
  const birth = new Date(dataNascimento)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

type DetailTab = 'consultas' | 'laboratoriais' | 'imagem' | 'anatomia' | 'monitoramento' | 'prescricao' | 'faturas' | 'cadastro'

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

const VALID_DETAIL_TABS: DetailTab[] = ['consultas', 'laboratoriais', 'imagem', 'anatomia', 'monitoramento', 'prescricao', 'faturas', 'cadastro']

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
  const defaultTab: DetailTab = canSeeProntuario ? 'consultas' : 'faturas'

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
    ...(canSeeProntuario ? [{ id: 'consultas'     as DetailTab, label: 'Consultas',          icon: <Stethoscope  className="w-4 h-4" /> }] : []),
    ...(canSeeProntuario ? [{ id: 'laboratoriais' as DetailTab, label: 'Laboratoriais',       icon: <FlaskConical className="w-4 h-4" /> }] : []),
    ...(canSeeProntuario ? [{ id: 'imagem'        as DetailTab, label: 'Imagem',              icon: <ScanLine     className="w-4 h-4" /> }] : []),
    ...(canSeeProntuario ? [{ id: 'anatomia'      as DetailTab, label: 'Anatomia Pat.',       icon: <Microscope   className="w-4 h-4" /> }] : []),
    { id: 'monitoramento', label: 'Monitoramento', icon: <Activity  className="w-4 h-4" /> },
    ...(canSeeProntuario ? [{ id: 'prescricao'    as DetailTab, label: 'Prescrição',          icon: <Pill         className="w-4 h-4" /> }] : []),
    { id: 'faturas',       label: 'NF',            icon: <Receipt   className="w-4 h-4" /> },
    { id: 'cadastro',      label: 'Cadastro',      icon: <Contact   className="w-4 h-4" /> },
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

      {/* ── Tab: Consultas ── */}
      {activeDetailTab === 'consultas' && canSeeProntuario && (
        <ProntuarioTab
          consultas={consultas}
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

      {/* ── Tab: Laboratoriais ── */}
      {activeDetailTab === 'laboratoriais' && canSeeProntuario && (
        <LabResultsPanel labResults={labResults} patientId={patient.id} />
      )}

      {/* ── Tab: Imagem ── */}
      {activeDetailTab === 'imagem' && canSeeProntuario && (
        <ImagingPanel imagingResults={imagingResults} patientId={patient.id} />
      )}

      {/* ── Tab: Anatomia Patológica ── */}
      {activeDetailTab === 'anatomia' && canSeeProntuario && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Microscope className="w-10 h-10 text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">Nenhum resultado de anatomia patológica registrado.</p>
        </div>
      )}

      {/* ── Tab: Monitoramento ── */}
      {activeDetailTab === 'monitoramento' && (
        <MonitoramentoTab
          patientId={patient.id}
          patientName={patient.full_name ?? 'Paciente'}
        />
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

      {/* ── Tab: NF ── */}
      {activeDetailTab === 'faturas' && (
        <InvoiceSection patient={patient} invoices={invoices} />
      )}

      {/* ── Tab: Cadastro ── */}
      {activeDetailTab === 'cadastro' && (
        <PatientCadastroTab patient={patient} currentRole={currentRole} onDeleted={onBack} />
      )}

    </div>
  )
}
