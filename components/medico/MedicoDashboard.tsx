'use client'

import { useState } from 'react'
import type { Profile, Document, Consulta } from '@/lib/types'
import { guardNavigation } from '@/lib/prontuario-dirty'
import PatientList from './PatientList'
import DocumentUpload from './DocumentUpload'
import MedicoDocumentList from './MedicoDocumentList'
import AgendaTab from './AgendaTab'
import { Users, Upload, CalendarDays, LayoutDashboard, BarChart2, DollarSign, Loader2 } from 'lucide-react'
import RelatoriosTab from './RelatoriosTab'
import FinanceiroTab from './FinanceiroTab'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'
import type { FinancialEntry } from '@/app/actions/financial'
import { updateConsultaStatus } from '@/app/actions/consultas'

// PanoramaTab importa Recharts (~300 KB) — carregado só quando a aba é ativada
const PanoramaTab = dynamic(() => import('./PanoramaTab'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center py-16 gap-2 text-gray-400">
      <Loader2 className="w-4 h-4 animate-spin" />
      <span className="text-sm">Carregando panorama…</span>
    </div>
  ),
})

interface MedicoDashboardProps {
  currentRole: string
  doctorId: string
  doctorName?:      string | null
  doctorCrm?:       string | null
  doctorSpecialty?: string | null
  patients: Profile[]
  documents: Document[]
  consultas: Consulta[]
  financialEntries: FinancialEntry[]
}

type Tab = 'panorama' | 'pacientes' | 'agenda' | 'documentos' | 'relatorios' | 'financeiro'

const VALID_TABS: Tab[] = ['panorama', 'pacientes', 'agenda', 'documentos', 'relatorios', 'financeiro']

// Lê o tab inicial da URL sem chamar useSearchParams (evita re-render do servidor)
function getInitialTab(): Tab {
  if (typeof window === 'undefined') return 'panorama'
  const raw = new URLSearchParams(window.location.search).get('tab') as Tab | null
  return raw && VALID_TABS.includes(raw) ? raw : 'panorama'
}

function getInitialPatientId(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('p') ?? null
}

// Atualiza a URL sem acionar o router do Next.js (sem re-render do servidor)
function pushUrl(params: Record<string, string | null>) {
  const p = new URLSearchParams(window.location.search)
  for (const [key, val] of Object.entries(params)) {
    if (val === null) p.delete(key)
    else p.set(key, val)
  }
  window.history.pushState(null, '', `?${p.toString()}`)
}

export default function MedicoDashboard({
  currentRole,
  doctorId,
  doctorName,
  doctorCrm,
  doctorSpecialty,
  patients,
  documents,
  consultas,
  financialEntries,
}: MedicoDashboardProps) {
  // ── Estado local — sem useRouter/useSearchParams ──────────────
  const [activeTab,        setActiveTabState]   = useState<Tab>(getInitialTab)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(getInitialPatientId)

  function setActiveTab(tab: Tab) {
    guardNavigation(() => {
      setActiveTabState(tab)
      setSelectedPatientId(null)
      pushUrl({ tab, p: null, dtab: null, stab: null, consulta: null })
    })
  }

  function handleSelectPatient(patientId: string | null) {
    setSelectedPatientId(patientId)
    if (patientId) {
      pushUrl({ p: patientId })
    } else {
      pushUrl({ p: null, dtab: null, stab: null, consulta: null })
    }
  }

  function handleIniciarAtendimento(patientId: string, consultaId: string) {
    // Marca como "em atendimento" para aparecer na agenda (fire-and-forget)
    updateConsultaStatus(consultaId, 'em_atendimento').catch(console.error)
    setActiveTabState('pacientes')
    setSelectedPatientId(patientId)
    pushUrl({ tab: 'pacientes', p: patientId, dtab: 'prontuario', consulta: consultaId, stab: null })
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'panorama',    label: 'Panorama',    icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'pacientes',   label: 'Pacientes',   icon: <Users           className="w-4 h-4" /> },
    { id: 'agenda',      label: 'Agenda',      icon: <CalendarDays    className="w-4 h-4" /> },
    { id: 'documentos',  label: 'Documentos',  icon: <Upload          className="w-4 h-4" /> },
    { id: 'relatorios',  label: 'Relatórios',  icon: <BarChart2       className="w-4 h-4" /> },
    { id: 'financeiro',  label: 'Financeiro',  icon: <DollarSign      className="w-4 h-4" /> },
  ]

  const tabHeaders: Record<Tab, { title: string; sub: string }> = {
    panorama:   { title: 'Panorama',          sub: 'Visão geral da clínica: pacientes, consultas e indicações.' },
    pacientes:  { title: 'Lista de Pacientes', sub: 'Clique em um paciente para ver exames e gerenciar o plano de cuidados.' },
    agenda:     { title: 'Agenda',             sub: 'Clique em um dia para ver as consultas. Clique em uma consulta para ver detalhes.' },
    documentos: { title: 'Documentos',         sub: 'Envie laudos, receitas e orientações para pacientes.' },
    relatorios: { title: 'Relatórios',         sub: 'Análise de dados dos seus pacientes. Filtre e cruze informações.' },
    financeiro: { title: 'Financeiro',         sub: 'Controle receitas e despesas da clínica e renda pessoal profissional.' },
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
      {/* Tab bar — grid 3×2 em mobile, flex scrollável em sm+ */}
      <div
        className="grid grid-cols-3 sm:flex sm:overflow-x-auto"
        style={{ borderBottom: '1px solid rgba(26,31,46,0.07)' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex flex-col sm:flex-row items-center gap-1 sm:gap-2 px-2 sm:px-5 py-2.5 sm:py-3.5 text-xs sm:text-sm whitespace-nowrap relative border-b-2 transition-all duration-150',
              activeTab === tab.id
                ? 'text-primary font-semibold border-primary-light'
                : 'text-gray-400 font-medium border-transparent hover:text-gray-600 hover:bg-black/[0.018]'
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab header */}
      <div className="px-4 pt-4 pb-2 sm:px-6 sm:pt-5 sm:pb-3" style={{ borderBottom: '1px solid rgba(45,43,107,0.08)' }}>
        <div className="flex items-start gap-3">
          <div className="w-0.5 h-9 rounded-full mt-0.5 shrink-0" style={{ backgroundColor: '#7A9E7E' }} />
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">{tabHeaders[activeTab].title}</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">{tabHeaders[activeTab].sub}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 pt-3 sm:p-6 sm:pt-4">
        {activeTab === 'panorama' && (
          <PanoramaTab patients={patients} consultas={consultas} doctorName={doctorName} doctorCrm={doctorCrm} doctorSpecialty={doctorSpecialty} />
        )}
        {activeTab === 'pacientes' && (
          <PatientList
            currentRole={currentRole}
            patients={patients}
            consultas={consultas}
            selectedPatientId={selectedPatientId}
            onSelectPatient={handleSelectPatient}
          />
        )}
        {activeTab === 'agenda' && (
          <AgendaTab
            consultas={consultas}
            patients={patients}
            currentRole={currentRole}
            onIniciarAtendimento={handleIniciarAtendimento}
          />
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
        {activeTab === 'relatorios' && (
          <RelatoriosTab
            patients={patients}
            consultas={consultas}
            labResults={[]}
            imagingResults={[]}
          />
        )}
        {activeTab === 'financeiro' && (
          <FinanceiroTab
            initialEntries={financialEntries}
            doctorId={doctorId}
            doctorName={doctorName ?? null}
            doctorCrm={doctorCrm ?? null}
            consultas={consultas}
            patients={patients}
          />
        )}
      </div>
    </div>
  )
}
