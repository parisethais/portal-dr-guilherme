'use client'

import { useState } from 'react'
import type { Profile, Document, ContactRequest, PatientExam, CarePlan, CarePlanAttachment, Invoice, Consulta, LabResult, ImagingResult } from '@/lib/types'
import PatientList from './PatientList'
import DocumentUpload from './DocumentUpload'
import SendMessageForm from './SendMessageForm'
import ContactRequests from './ContactRequests'
import MedicoDocumentList from './MedicoDocumentList'
import AgendaTab from './AgendaTab'
import PanoramaTab from './PanoramaTab'
import { Users, Upload, MessageSquare, Phone, CalendarDays, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MedicoDashboardProps {
  patients: Profile[]
  requests: ContactRequest[]
  documents: Document[]
  patientExams: PatientExam[]
  carePlans: CarePlan[]
  carePlanAttachments: CarePlanAttachment[]
  invoices: Invoice[]
  consultas: Consulta[]
  labResults: LabResult[]
  imagingResults: ImagingResult[]
  pendingCount: number
}

type Tab = 'panorama' | 'pacientes' | 'agenda' | 'documentos' | 'mensagem' | 'solicitacoes'

export default function MedicoDashboard({
  patients,
  requests,
  documents,
  patientExams,
  carePlans,
  carePlanAttachments,
  invoices,
  consultas,
  labResults,
  imagingResults,
  pendingCount,
}: MedicoDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('panorama')

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'panorama',     label: 'Panorama',     icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'pacientes',    label: 'Pacientes',    icon: <Users className="w-4 h-4" /> },
    { id: 'agenda',       label: 'Agenda',        icon: <CalendarDays className="w-4 h-4" /> },
    { id: 'documentos',   label: 'Documentos',   icon: <Upload className="w-4 h-4" /> },
    { id: 'mensagem',     label: 'Mensagem',     icon: <MessageSquare className="w-4 h-4" /> },
    {
      id: 'solicitacoes',
      label: 'Solicitações',
      icon: <Phone className="w-4 h-4" />,
      badge: pendingCount || undefined,
    },
  ]

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
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs rounded-full font-bold bg-red-500 text-white">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab headers */}
      <div className="px-6 pt-5 pb-3" style={{ borderBottom: '1px solid rgba(126,184,212,0.12)' }}>
        {[
          { id: 'panorama',     title: 'Panorama',               sub: 'Clique no nome ou no lápis para editar o cadastro completo do paciente.' },
          { id: 'pacientes',    title: 'Lista de Pacientes',      sub: 'Clique em um paciente para ver exames e gerenciar o plano de cuidados.' },
          { id: 'agenda',       title: 'Agenda',                  sub: 'Clique em um horário para agendar uma consulta. Clique em uma consulta para ver detalhes.' },
          { id: 'documentos',   title: 'Documentos',              sub: 'Envie laudos, receitas e orientações para pacientes.' },
          { id: 'mensagem',     title: 'Enviar Mensagem',         sub: 'Envie uma mensagem diretamente para um paciente.' },
          { id: 'solicitacoes', title: 'Solicitações de Contato', sub: pendingCount > 0 ? `${pendingCount} solicitação${pendingCount > 1 ? 'ões' : ''} pendente${pendingCount > 1 ? 's' : ''}.` : 'Gerencie as solicitações de contato dos pacientes.' },
        ].filter(t => t.id === activeTab).map(t => (
          <div key={t.id} className="flex items-start gap-3">
            <div className="w-0.5 h-9 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: '#7EB8D4' }} />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{t.title}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{t.sub}</p>
            </div>
          </div>
        ))}
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
        {activeTab === 'mensagem' && <SendMessageForm patients={patients} />}
        {activeTab === 'solicitacoes' && <ContactRequests requests={requests} />}
      </div>
    </div>
  )
}
