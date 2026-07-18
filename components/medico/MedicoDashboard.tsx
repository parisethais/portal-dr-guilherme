'use client'

import { useState } from 'react'
import type { Profile, Document, Consulta } from '@/lib/types'
import { resolvePermissions, type MemberPermissions } from '@/lib/admin-constants'
import { guardNavigation } from '@/lib/prontuario-dirty'
import PatientList from './PatientList'
import DocumentUpload from './DocumentUpload'
import MedicoDocumentList from './MedicoDocumentList'
import AgendaTab from './AgendaTab'
import SalasTab from './SalasTab'
import { Users, Upload, CalendarDays, LayoutDashboard, BarChart2, DollarSign, Loader2, Stethoscope, ArrowRight, Building2, FileText, ChevronDown, ChevronUp, Star, DoorOpen } from 'lucide-react'
import InternacaoPanel from './InternacaoPanel'
import { TIPO_LABEL } from './ConsultaModal'
import RelatoriosTab from './RelatoriosTab'
import FinanceiroTab from './FinanceiroTab'
import KpiSecretariaTab from './KpiSecretariaTab'
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
  memberRole?: string
  permissions?: MemberPermissions
  isMultiMedico?: boolean
  showSalasTab?: boolean
  doctorId: string
  doctorName?:  string | null
  doctorCrm?:   string | null
  calendarUrl?:     string | null
  patients: Profile[]
  documents: Document[]
  consultas: Consulta[]
  financialEntries: FinancialEntry[]
  patientsWithExames?: string[]
}

type Tab = 'panorama' | 'pacientes' | 'agenda' | 'salas' | 'documentos' | 'relatorios' | 'financeiro' | 'hospitais' | 'kpi'

const VALID_TABS: Tab[] = ['panorama', 'pacientes', 'agenda', 'salas', 'documentos', 'relatorios', 'financeiro', 'hospitais', 'kpi']

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
  memberRole,
  permissions,
  isMultiMedico = false,
  showSalasTab = false,
  doctorId,
  doctorName,
  doctorCrm,
  calendarUrl,
  patients,
  documents,
  consultas,
  financialEntries,
  patientsWithExames = [],
}: MedicoDashboardProps) {
  // Permissões efetivas (fallback: preset do papel — superadmin cai em 'owner')
  const perms = permissions ?? resolvePermissions(currentRole === 'superadmin' ? 'owner' : currentRole, null)
  const role  = memberRole ?? currentRole
  // ── Estado local — sem useRouter/useSearchParams ──────────────
  const [activeTab,        setActiveTabState]   = useState<Tab>(getInitialTab)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(getInitialPatientId)
  const [showEmAberto,     setShowEmAberto]      = useState(false)

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

  function handleRetornarConsulta(patientId: string, consultaId: string) {
    setActiveTabState('pacientes')
    setSelectedPatientId(patientId)
    pushUrl({ tab: 'pacientes', p: patientId, dtab: 'prontuario', consulta: consultaId, stab: null })
  }

  // Consultas atualmente em atendimento (banner verde)
  const consultasEmAndamento = consultas
    .filter(c => c.status === 'em_atendimento')
    .map(c => ({ ...c, patient: patients.find(p => p.id === c.patient_id) }))

  // Consultas realizadas com prontuário não finalizado (banner âmbar)
  const consultasEmAberto = consultas
    .filter(c => !c.prontuario_finalizado && c.status === 'realizada')
    .sort((a, b) => b.data_hora.localeCompare(a.data_hora))
    .map(c => ({ ...c, patient: patients.find(p => p.id === c.patient_id) }))

  // Visibilidade das abas por papel + permissões (máscaras)
  const isRecepOuAdm = role === 'recepcionista' || role === 'administrativo'
  const isMedicoLike = role === 'medico' || role === 'owner' || currentRole === 'superadmin'

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = ([
    perms.pacientes  && { id: 'panorama' as Tab,   label: 'Panorama',   icon: <LayoutDashboard className="w-4 h-4" /> },
    perms.pacientes  && { id: 'pacientes' as Tab,  label: 'Pacientes',  icon: <Users           className="w-4 h-4" /> },
    perms.agenda     && { id: 'agenda' as Tab,     label: 'Agenda',     icon: <CalendarDays    className="w-4 h-4" /> },
    (showSalasTab && perms.salas) && { id: 'salas' as Tab, label: 'Clínica', icon: <DoorOpen className="w-4 h-4" /> },
    !isRecepOuAdm    && { id: 'documentos' as Tab, label: 'Documentos', icon: <Upload          className="w-4 h-4" /> },
    !isRecepOuAdm    && { id: 'relatorios' as Tab, label: 'Relatórios', icon: <BarChart2       className="w-4 h-4" /> },
    perms.financeiro && { id: 'financeiro' as Tab, label: 'Financeiro', icon: <DollarSign      className="w-4 h-4" /> },
    !isRecepOuAdm    && { id: 'hospitais' as Tab,  label: 'Hospitais',  icon: <Building2       className="w-4 h-4" /> },
    isMedicoLike     && { id: 'kpi' as Tab,        label: 'KPI Sec.',   icon: <Star            className="w-4 h-4" /> },
  ] as (false | { id: Tab; label: string; icon: React.ReactNode })[]).filter(Boolean) as { id: Tab; label: string; icon: React.ReactNode }[]

  // Aba ativa validada: se a aba da URL não é visível para este papel, cai na primeira
  const shownTab: Tab = tabs.some(t => t.id === activeTab) ? activeTab : (tabs[0]?.id ?? 'pacientes')

  const tabHeaders: Record<Tab, { title: string; sub: string }> = {
    panorama:   { title: 'Panorama',          sub: 'Visão geral da clínica: pacientes, consultas e indicações.' },
    pacientes:  { title: 'Lista de Pacientes', sub: 'Clique em um paciente para ver exames e gerenciar o plano de cuidados.' },
    agenda:     { title: 'Agenda',             sub: 'Clique em um dia para ver as consultas. Clique em uma consulta para ver detalhes.' },
    salas:      { title: 'Agenda da Clínica',  sub: 'Visão do dia por sala e por médico — inclui agendas compartilhadas.' },
    documentos: { title: 'Documentos',         sub: 'Envie laudos, receitas e orientações para pacientes.' },
    relatorios: { title: 'Relatórios',         sub: 'Análise de dados dos seus pacientes. Filtre e cruze informações.' },
    financeiro: { title: 'Financeiro',         sub: 'Controle receitas e despesas da clínica e renda pessoal profissional.' },
    hospitais:  { title: 'Hospitais',          sub: 'Controle de internações hospitalares: visitas, diálise e resumo financeiro por internação.' },
    kpi:        { title: 'KPI Secretária',     sub: 'Score de desempenho mensal e calculadora de bônus variável.' },
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
              shownTab ===tab.id
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
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">{tabHeaders[shownTab].title}</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5 hidden sm:block">{tabHeaders[shownTab].sub}</p>
          </div>
        </div>
      </div>

      {/* Banner: consultas em andamento */}
      {consultasEmAndamento.length > 0 && (
        <div className="border-b border-green-200 bg-green-50">
          {consultasEmAndamento.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => handleRetornarConsulta(c.patient_id, c.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 sm:px-6 hover:bg-green-100 transition-colors text-left"
            >
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
              <Stethoscope className="w-4 h-4 text-green-700 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-green-900">
                  Consulta em andamento
                </span>
                {c.patient && (
                  <span className="text-sm text-green-700 ml-2">
                    — {c.patient.full_name}
                    {c.tipo && <span className="text-green-600 font-normal ml-1 text-xs">({TIPO_LABEL[c.tipo] ?? c.tipo})</span>}
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-green-700 flex-shrink-0">
                Retornar <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Banner: prontuários em aberto — apenas para médico */}
      {currentRole === 'medico' && consultasEmAberto.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50">
          {consultasEmAberto.length === 1 ? (
            <button
              type="button"
              onClick={() => handleRetornarConsulta(consultasEmAberto[0].patient_id, consultasEmAberto[0].id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 sm:px-6 hover:bg-amber-100 transition-colors text-left"
            >
              <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
              <FileText className="w-4 h-4 text-amber-700 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-amber-900">Prontuário em aberto</span>
                {consultasEmAberto[0].patient && (
                  <span className="text-sm text-amber-700 ml-2">
                    — {consultasEmAberto[0].patient.full_name}
                    <span className="text-amber-600 font-normal ml-1 text-xs">
                      ({new Date(consultasEmAberto[0].data_hora).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })})
                    </span>
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 flex-shrink-0">
                Finalizar <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowEmAberto(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-2.5 sm:px-6 hover:bg-amber-100 transition-colors text-left"
              >
                <div className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" />
                <FileText className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span className="flex-1 text-sm font-semibold text-amber-900">
                  {consultasEmAberto.length} prontuários em aberto
                </span>
                {showEmAberto
                  ? <ChevronUp className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  : <ChevronDown className="w-4 h-4 text-amber-600 flex-shrink-0" />
                }
              </button>
              {showEmAberto && (
                <div className="border-t border-amber-200">
                  {consultasEmAberto.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleRetornarConsulta(c.patient_id, c.id)}
                      className="w-full flex items-center gap-3 px-6 py-2 sm:px-8 hover:bg-amber-100 transition-colors text-left"
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-300 flex-shrink-0" />
                      <span className="flex-1 text-sm text-amber-900">
                        {c.patient?.full_name ?? '—'}
                      </span>
                      <span className="text-xs text-amber-600">
                        {new Date(c.data_hora).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3 pt-3 sm:p-6 sm:pt-4">
        {shownTab ==='panorama' && (
          <PanoramaTab
            patients={patients}
            consultas={consultas}
            onSelectPatient={(patientId) => { setActiveTab('pacientes'); handleSelectPatient(patientId) }}
            onIniciarAtendimento={handleIniciarAtendimento}
            patientsWithExames={patientsWithExames}
            currentRole={currentRole}
          />
        )}
        {shownTab ==='pacientes' && (
          <PatientList
            currentRole={currentRole}
            patients={patients}
            consultas={consultas}
            selectedPatientId={selectedPatientId}
            onSelectPatient={handleSelectPatient}
          />
        )}
        {shownTab ==='agenda' && (
          <AgendaTab
            consultas={consultas}
            patients={patients}
            currentRole={currentRole}
            calendarUrl={calendarUrl ?? undefined}
            onIniciarAtendimento={handleIniciarAtendimento}
            onNavigateToPatient={(patientId) => { setActiveTab('pacientes'); handleSelectPatient(patientId) }}
            doctorName={doctorName ?? null}
          />
        )}
        {shownTab ==='salas' && (
          <SalasTab canManageRooms={['owner', 'medico', 'secretaria'].includes(role) || currentRole === 'superadmin'} />
        )}
        {shownTab ==='documentos' && (
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
        {shownTab ==='relatorios' && (
          <RelatoriosTab
            patients={patients}
            consultas={consultas}
            labResults={[]}
            imagingResults={[]}
          />
        )}
        {shownTab ==='financeiro' && (
          <FinanceiroTab
            initialEntries={financialEntries}
            doctorId={doctorId}
            doctorName={doctorName ?? null}
            doctorCrm={doctorCrm ?? null}
            consultas={consultas}
            patients={patients}
          />
        )}
        {shownTab ==='hospitais' && (
          <InternacaoPanel patients={patients} />
        )}
        {shownTab ==='kpi' && (
          <KpiSecretariaTab />
        )}
      </div>
    </div>
  )
}
