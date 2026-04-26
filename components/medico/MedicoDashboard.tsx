'use client'

import { useState } from 'react'
import type { Profile, Document, ContactRequest } from '@/lib/types'
import PatientList from './PatientList'
import DocumentUpload from './DocumentUpload'
import SendMessageForm from './SendMessageForm'
import ContactRequests from './ContactRequests'
import MedicoDocumentList from './MedicoDocumentList'
import { Users, Upload, MessageSquare, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MedicoDashboardProps {
  patients: Profile[]
  requests: ContactRequest[]
  documents: Document[]
  pendingCount: number
}

type Tab = 'pacientes' | 'documentos' | 'mensagem' | 'solicitacoes'

export default function MedicoDashboard({
  patients,
  requests,
  documents,
  pendingCount,
}: MedicoDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('pacientes')

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'pacientes', label: 'Pacientes', icon: <Users className="w-4 h-4" /> },
    { id: 'documentos', label: 'Documentos', icon: <Upload className="w-4 h-4" /> },
    { id: 'mensagem', label: 'Mensagem', icon: <MessageSquare className="w-4 h-4" /> },
    {
      id: 'solicitacoes',
      label: 'Solicitações',
      icon: <Phone className="w-4 h-4" />,
      badge: pendingCount || undefined,
    },
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-5 py-4 text-sm font-medium transition-colors whitespace-nowrap relative',
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
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
      <div className="px-6 pt-6 pb-2">
        {activeTab === 'pacientes' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Lista de Pacientes</h2>
            <p className="text-sm text-gray-500 mt-0.5">Todos os pacientes cadastrados no portal.</p>
          </div>
        )}
        {activeTab === 'documentos' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Documentos</h2>
            <p className="text-sm text-gray-500 mt-0.5">Envie laudos, receitas e orientações para pacientes.</p>
          </div>
        )}
        {activeTab === 'mensagem' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Enviar Mensagem</h2>
            <p className="text-sm text-gray-500 mt-0.5">Envie uma mensagem diretamente para um paciente.</p>
          </div>
        )}
        {activeTab === 'solicitacoes' && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Solicitações de Contato</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {pendingCount > 0
                ? `${pendingCount} solicitação${pendingCount > 1 ? 'ões' : ''} pendente${pendingCount > 1 ? 's' : ''}.`
                : 'Gerencie as solicitações de contato dos pacientes.'}
            </p>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-6 pt-4">
        {activeTab === 'pacientes' && <PatientList patients={patients} />}
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
