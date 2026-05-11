'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import type { Profile, Document, PatientExam, CarePlan, CarePlanAttachment, Invoice, Consulta, LabResult, ImagingResult } from '@/lib/types'
import PatientList from './PatientList'
import DocumentUpload from './DocumentUpload'
import MedicoDocumentList from './MedicoDocumentList'
import AgendaTab from './AgendaTab'
import PanoramaTab from './PanoramaTab'
import { Users, Upload, CalendarDays, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MedicoDashboardProps {
  patients: Profile[]
  documents: Document[]
  patientExams: PatientExam[]
  carePlans: CarePlan[]
  carePlanAttachments: CarePlanAttachment[]
  invoices: Invoice[]
  consultas: Consulta[]
  labResults: LabResult[]
  imagingResults: ImagingResult[]
}

type Tab = 'panorama' | 'pacientes' | 'agenda' | 'documentos'

const VALID_TABS: Tab[] = ['panorama', 'pacientes', 'agenda', 'documentos']

export default function MedicoDashboard({
  patients,
  documents,
  patientExams,
  carePlans,
  carePlanAttachments,
  invoices,
  consultas,
  labResults,
  imagingResults,
}: MedicoDashboardProps) {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const rawTab   = searchParams.get('tab') as Tab | null
  const activeTab: Tab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'panorama'

  function setActiveTab(tab: Tab) {
    const p = new URLSearchParams(searchParams.toString())
    p.set('tab', tab)
    // Limpa seleção de paciente ao trocar de aba
    p.delete('p')
    router.push(`?${p.toString()}`, { scroll: false })
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'panorama',   label: 'Panorama',   icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'pacientes',  label: 'Pacientes',  icon: <Users className="w-4 h-4" /> },
    { id: 'agenda',     label: 'Agenda',     icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'documentos', label: 'Documentos', icon: <Upload className="w-4 h-4" /> },
  ]

  const headers: Record<Tab, { title: string; sub: string }> = {
    panorama:   { title: 'Panorama',          sub: 'Clique no nome ou no lápis para editar o cadastro completo do paciente.' },
    pacientes:  { title: 'Lista de Pacientes', sub: 'Clique em um paciente para ver exames e gerenciar o plano de cuidados.' },
    agenda:     { title: 'Agenda',             sub: 'Clique em um dia para ver as consultas. Clique em uma consulta para ver detalhes.' },
    documentos: { title: 'Documentos',         sub: 'Envie laudos, receitas e orientações para pacientes.' },
  }

  return (
    <div
      className="rounded-2xl overflow-hidden border border-white/60"
      style={{
        backdropFilter: 'blur(14px)',
        backgroundColor: 'rgba(255,255,255,0.72)',
        boxShadow: '0 2px 24px rgba(26,31,46,0.08), 0 1px 4px rgba(26,31,46,0.04)',
      }}
    >
      {/* Tab bar */}
      <div className="flex overflow-x-auto" style={{ borderBottom: '1px solid rgba(26,31,46,0.07)' }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-5 py-3.5 text-sm whitespace-nowrap relative border-b-2 transition-all duration-150',
              activeTab === tab.id
                ? 'text-primary font-semibold border-primary-light'
                : 'text-gray-400 font-medium border-transparent hover:text-gray-600 hover:bg-black/[0.018]'
            )}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab header */}
      <div className="px-6 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(126,184,212,0.12)' }}>
        <div className="flex items-start gap-3">
          <div className="w-0.5 h-9 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: '#7EB8D4' }} />
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{headers[activeTab].title}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{headers[activeTab].sub}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 pt-4">
        {activeTab === 'panorama' && (
          <PanoramaTab patients={patients} consultas={consultas} />
        )}
        {activeTab === 'pacientes' && (
          <PatientList
            patients={patients}
            patientExams={patientExams}
            carePlans={carePlans}
            carePlanAttachments={carePlanAttachments}
            invoices={invoices}
            consultas={consultas}
            labResults={labResults}
            imagingResults={imagingResults}
          />
        )}
        {activeTab === 'agenda' && (
          <AgendaTab consultas={consultas} patients={patients} />
        )}
        {activeTab === 'documentos' && (
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                Enviar novo documento
              </h3>
              <DocumentUpload patients={patients} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wide">
                Documentos enviados
              </h3>
              <MedicoDocumentList documents={documents} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
