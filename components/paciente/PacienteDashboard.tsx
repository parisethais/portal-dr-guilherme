'use client'

import { useState } from 'react'
import type { Document, PatientExam, CarePlan, CarePlanAttachment, Invoice, Profile } from '@/lib/types'
import DocumentList from './DocumentList'
import CuidadosTab from './CuidadosTab'
import InvoiceList from './InvoiceList'
import MeuCadastroTab from './MeuCadastroTab'
import MrpaTab from './MrpaTab'
import { FileText, ClipboardList, Receipt, User, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PacienteDashboardProps {
  profile: Profile
  documents: Document[]
  exames: PatientExam[]
  carePlan: CarePlan | null
  carePlanAttachments: CarePlanAttachment[]
  invoices: Invoice[]
}

type Tab = 'documentos' | 'cuidados' | 'pressao' | 'notas' | 'cadastro'

export default function PacienteDashboard({
  profile,
  documents = [],
  exames = [],
  carePlan,
  carePlanAttachments = [],
  invoices = [],
}: PacienteDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('documentos')

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'documentos',
      label: 'Documentos',
      icon: <FileText className="w-4 h-4" />,
      badge: documents.length + exames.length || undefined,
    },
    {
      id: 'cuidados',
      label: 'Cuidados',
      icon: <ClipboardList className="w-4 h-4" />,
    },
    {
      id: 'pressao' as Tab,
      label: 'Pressão',
      icon: <Activity className="w-4 h-4" />,
    },
    {
      id: 'notas',
      label: 'Notas Fiscais',
      icon: <Receipt className="w-4 h-4" />,
      badge: invoices.filter((i) => !i.downloaded_at).length || undefined,
    },
    {
      id: 'cadastro',
      label: 'Meu Cadastro',
      icon: <User className="w-4 h-4" />,
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
              'flex items-center justify-center gap-2 px-4 py-3.5 text-sm whitespace-nowrap relative border-b-2 transition-all duration-150 touch-manipulation',
              activeTab === tab.id
                ? 'text-primary font-semibold border-primary-light'
                : 'text-gray-400 font-medium border-transparent hover:text-gray-600 hover:bg-black/[0.018]'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 text-xs rounded-full font-bold bg-gray-200 text-gray-600">
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'documentos' && <DocumentList documents={documents} exames={exames} />}
        {activeTab === 'cuidados'   && <CuidadosTab carePlan={carePlan} attachments={carePlanAttachments} />}
        {activeTab === 'pressao'    && <MrpaTab patientId={profile.id} />}
        {activeTab === 'notas'      && <InvoiceList invoices={invoices} />}
        {activeTab === 'cadastro'   && <MeuCadastroTab profile={profile} />}
      </div>
    </div>
  )
}
