'use client'

import { useState } from 'react'
import type { Document, Message } from '@/lib/types'
import DocumentList from './DocumentList'
import MessageList from './MessageList'
import ContactRequestForm from './ContactRequestForm'
import { FileText, MessageSquare, Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PacienteDashboardProps {
  documents: Document[]
  messages: Message[]
  unreadCount: number
}

type Tab = 'documentos' | 'mensagens' | 'contato'

export default function PacienteDashboard({
  documents,
  messages,
  unreadCount,
}: PacienteDashboardProps) {
  const [activeTab, setActiveTab] = useState<Tab>('documentos')

  const tabs: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'documentos',
      label: 'Documentos',
      icon: <FileText className="w-4 h-4" />,
      badge: documents.length,
    },
    {
      id: 'mensagens',
      label: 'Mensagens',
      icon: <MessageSquare className="w-4 h-4" />,
      badge: unreadCount || undefined,
    },
    {
      id: 'contato',
      label: 'Solicitar Contato',
      icon: <Phone className="w-4 h-4" />,
    },
  ]

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition-colors relative',
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                className={cn(
                  'inline-flex items-center justify-center w-5 h-5 text-xs rounded-full font-bold',
                  tab.id === 'mensagens'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                )}
              >
                {tab.badge > 99 ? '99+' : tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'documentos' && <DocumentList documents={documents} />}
        {activeTab === 'mensagens' && <MessageList messages={messages} />}
        {activeTab === 'contato' && <ContactRequestForm />}
      </div>
    </div>
  )
}
