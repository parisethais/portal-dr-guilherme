'use client'

import { useState, useTransition } from 'react'
import type { Profile, PatientExam, CarePlan, CarePlanAttachment, Invoice, Consulta, LabResult, ImagingResult, BiopsiaResult, Prescricao } from '@/lib/types'
import LabResultsPanel from './prontuario/LabResultsPanel'
import ImagingPanel from './prontuario/ImagingPanel'
import BiopsiaPanel from './prontuario/BiopsiaPanel'
import { formatDate } from '@/lib/utils'
import {
  ArrowLeft, UserRound,
  Stethoscope, Receipt, Contact, Activity, Pill,
  FlaskConical, ScanLine, Microscope, Pencil, X, Check, Loader2, Link2, Building2,
} from 'lucide-react'
import InvoiceSection from './InvoiceSection'
import { cn } from '@/lib/utils'
import ProntuarioTab from './prontuario/ProntuarioTab'
import PatientCadastroTab from './PatientCadastroTab'
import MonitoramentoTab from './prontuario/MonitoramentoTab'
import MemedPrescricao from './prontuario/MemedPrescricao'
import { guardNavigation } from '@/lib/prontuario-dirty'
import { updateObsPessoal } from '@/app/actions/profile'
import { getOrCreateExameToken } from '@/app/actions/exame-upload'
import { getOrCreateCadastroToken } from '@/app/actions/cadastro-link'
import InternacaoPanel from './InternacaoPanel'
import PedidoExameTab from './prontuario/PedidoExameTab'

function calcAge(dataNascimento: string | null): number | null {
  if (!dataNascimento) return null
  const birth = new Date(dataNascimento)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

type DetailTab = 'consultas' | 'laboratoriais' | 'imagem' | 'biopsias' | 'monitoramento' | 'prescricao' | 'pedidos_exame' | 'faturas' | 'cadastro' | 'hospitalar'

interface PatientDetailProps {
  currentRole:  string
  patient:       Profile
  exames:        PatientExam[]
  carePlan:      CarePlan | null
  attachments:   CarePlanAttachment[]
  invoices:      Invoice[]
  consultas:     Consulta[]
  labResults:     LabResult[]
  imagingResults: ImagingResult[]
  biopsiaResults: BiopsiaResult[]
  prescricoes?:   { ativas: Prescricao[]; inativas: Prescricao[] }
  onBack:        () => void
  onRefresh?:    () => void
}

const VALID_DETAIL_TABS: DetailTab[] = ['consultas', 'laboratoriais', 'imagem', 'biopsias', 'monitoramento', 'prescricao', 'pedidos_exame', 'faturas', 'cadastro', 'hospitalar']

export default function PatientDetail({
  currentRole,
  patient,
  exames,
  invoices,
  consultas,
  labResults,
  imagingResults,
  biopsiaResults,
  prescricoes,
  onBack,
  onRefresh,
}: PatientDetailProps) {
  // Prontuário e dados clínicos: apenas médico (staff não-médico vê NF/cadastro)
  const canSeeProntuario = currentRole === 'medico' || currentRole === 'superadmin'
  const defaultTab: DetailTab = canSeeProntuario ? 'consultas' : 'faturas'

  // ── Obs. do paciente — edição inline ─────────────────────────
  const [obsLocal,   setObsLocal]   = useState(patient.obs_pessoal ?? '')
  const [obsEditing, setObsEditing] = useState(false)
  const [obsPending, startObsTransition] = useTransition()
  const [obsSaved,   setObsSaved]   = useState(false)

  function handleObsSave() {
    startObsTransition(async () => {
      const res = await updateObsPessoal(patient.id, obsLocal.trim() || null)
      if (res.success) {
        setObsEditing(false)
        setObsSaved(true)
        setTimeout(() => setObsSaved(false), 2000)
        onRefresh?.()
      }
    })
  }

  // ── Links do paciente ─────────────────────────────────────────
  const [linkExameCopied,    setLinkExameCopied]    = useState(false)
  const [linkLgpdCopied,     setLinkLgpdCopied]     = useState(false)
  const [linkCadastroCopied, setLinkCadastroCopied] = useState(false)
  const [linkPending,        startLinkTransition]    = useTransition()

  function handleCopyExameLink() {
    startLinkTransition(async () => {
      const res = await getOrCreateExameToken(patient.id)
      if (!res.success || !res.data) return
      const url = `${window.location.origin}/p/${res.data.token}/exames`
      await navigator.clipboard.writeText(url)
      setLinkExameCopied(true)
      setTimeout(() => setLinkExameCopied(false), 2500)
    })
  }

  function handleCopyLgpdLink() {
    startLinkTransition(async () => {
      const res = await getOrCreateExameToken(patient.id)
      if (!res.success || !res.data) return
      const url = `${window.location.origin}/p/${res.data.token}/lgpd`
      await navigator.clipboard.writeText(url)
      setLinkLgpdCopied(true)
      setTimeout(() => setLinkLgpdCopied(false), 2500)
    })
  }

  function handleCopyCadastroLink() {
    startLinkTransition(async () => {
      const res = await getOrCreateCadastroToken(patient.id)
      if (!res.success || !res.data) return
      const url = `${window.location.origin}/p/${res.data.token}/cadastro`
      await navigator.clipboard.writeText(url)
      setLinkCadastroCopied(true)
      setTimeout(() => setLinkCadastroCopied(false), 2500)
    })
  }

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
    ...(canSeeProntuario ? [{ id: 'biopsias'      as DetailTab, label: 'Biópsias',             icon: <Microscope   className="w-4 h-4" /> }] : []),
    { id: 'monitoramento', label: 'Monitoramento', icon: <Activity  className="w-4 h-4" /> },
    ...(canSeeProntuario ? [{ id: 'prescricao'    as DetailTab, label: 'Prescrição',    icon: <Pill         className="w-4 h-4" /> }] : []),
    ...(canSeeProntuario ? [{ id: 'pedidos_exame' as DetailTab, label: 'Ped. Exame',  icon: <FlaskConical className="w-4 h-4" /> }] : []),
    { id: 'faturas',       label: 'NF',            icon: <Receipt   className="w-4 h-4" /> },
    { id: 'cadastro',      label: 'Cadastro',      icon: <Contact   className="w-4 h-4" /> },
    ...(canSeeProntuario ? [{ id: 'hospitalar' as DetailTab, label: 'Hospitalar', icon: <Building2 className="w-4 h-4" /> }] : []),
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

      <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <UserRound className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{patient.full_name || 'Nome não informado'}</h3>
            {calcAge(patient.data_nascimento) !== null && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/8 text-primary/80">
                {calcAge(patient.data_nascimento)} anos
              </span>
            )}
            {canSeeProntuario && (
              <>
                <button
                  type="button"
                  onClick={handleCopyExameLink}
                  disabled={linkPending}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
                  title="Copiar link de envio de exames para o paciente"
                >
                  {linkPending ? <Loader2 className="w-3 h-3 animate-spin" /> : linkExameCopied ? <Check className="w-3 h-3 text-green-500" /> : <Link2 className="w-3 h-3" />}
                  {linkExameCopied ? 'Copiado!' : 'Enviar exames'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyCadastroLink}
                  disabled={linkPending}
                  className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 hover:border-primary/40 hover:text-primary transition-colors disabled:opacity-50"
                  title="Copiar link de cadastro para o paciente"
                >
                  {linkCadastroCopied ? <Check className="w-3 h-3 text-green-500" /> : <Link2 className="w-3 h-3" />}
                  {linkCadastroCopied ? 'Copiado!' : 'Cadastro'}
                </button>
                {!patient.lgpd_accepted && (
                  <button
                    type="button"
                    onClick={handleCopyLgpdLink}
                    disabled={linkPending}
                    className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border border-amber-200 text-amber-600 hover:border-amber-400 hover:text-amber-700 transition-colors disabled:opacity-50"
                    title="Copiar link para aceite de LGPD (paciente sem aceite)"
                  >
                    {linkLgpdCopied ? <Check className="w-3 h-3 text-green-500" /> : <Link2 className="w-3 h-3" />}
                    {linkLgpdCopied ? 'Copiado!' : 'Aceite LGPD'}
                  </button>
                )}
              </>
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

          {/* Obs. do paciente — apenas para médico */}
          {canSeeProntuario && (
            <div className="mt-2">
              {obsEditing ? (
                <div className="flex items-start gap-2">
                  <textarea
                    value={obsLocal}
                    onChange={e => setObsLocal(e.target.value)}
                    autoFocus
                    rows={2}
                    placeholder="Obs. sobre o paciente..."
                    className="flex-1 px-2.5 py-1.5 text-xs border border-amber-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-400 bg-amber-50 text-amber-900 placeholder:text-amber-300 resize-none"
                    onKeyDown={e => {
                      if (e.key === 'Escape') { setObsLocal(patient.obs_pessoal ?? ''); setObsEditing(false) }
                    }}
                  />
                  <div className="flex flex-col gap-1 mt-0.5">
                    <button
                      type="button"
                      onClick={handleObsSave}
                      disabled={obsPending}
                      className="p-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
                      title="Salvar"
                    >
                      {obsPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setObsLocal(patient.obs_pessoal ?? ''); setObsEditing(false) }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg transition-colors"
                      title="Cancelar"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="group flex items-start gap-1.5">
                  {obsLocal ? (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 leading-relaxed whitespace-pre-wrap flex-1">
                      <span className="font-semibold">Obs.: </span>{obsLocal}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Sem obs. do paciente</p>
                  )}
                  <button
                    type="button"
                    onClick={() => setObsEditing(true)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-amber-600 transition-all flex-shrink-0 mt-0.5"
                    title="Editar obs."
                  >
                    {obsSaved ? <Check className="w-3 h-3 text-green-500" /> : <Pencil className="w-3 h-3" />}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
          patientAntCirurgicos={patient.antecedentes_cirurgicos}
          patientAntFamiliares={patient.antecedentes_familiares}
          patientHabitos={patient.habitos}
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

      {/* ── Tab: Biópsias ── */}
      {activeDetailTab === 'biopsias' && canSeeProntuario && (
        <BiopsiaPanel biopsiaResults={biopsiaResults} patientId={patient.id} />
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

      {/* ── Tab: Pedidos de Exame ── */}
      {activeDetailTab === 'pedidos_exame' && canSeeProntuario && (
        <PedidoExameTab
          patientId={patient.id}
          patientName={patient.full_name ?? 'Paciente'}
          patientPhone={patient.phone}
          patientEmail={patient.email}
        />
      )}

      {/* ── Tab: NF ── */}
      {activeDetailTab === 'faturas' && (
        <InvoiceSection patient={patient} invoices={invoices} onRefresh={onRefresh} />
      )}

      {/* ── Tab: Cadastro ── */}
      {activeDetailTab === 'cadastro' && (
        <PatientCadastroTab patient={patient} currentRole={currentRole} onDeleted={onBack} />
      )}

      {activeDetailTab === 'hospitalar' && canSeeProntuario && (
        <InternacaoPanel patientId={patient.id} />
      )}

    </div>
  )
}
