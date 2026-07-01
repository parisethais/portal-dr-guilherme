'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Consulta, LabResult, ImagingResult, Prescricao } from '@/lib/types'
import DiagnosticosPanel from './DiagnosticosPanel'
import EvolucaoPanel from './EvolucaoPanel'
import LabResultsPanel from './LabResultsPanel'
import ImagingPanel from './ImagingPanel'
import SumarioPanel from './SumarioPanel'
import PrescricoesPanel from './PrescricoesPanel'
import NovaConsultaModal from '@/components/medico/NovaConsultaModal'
import { finalizarProntuario } from '@/app/actions/prontuario'
import AssinaturaModal, { AssinaturaSuccessModal } from './AssinaturaModal'
import {
  ClipboardList, Stethoscope, FlaskConical, ScanLine,
  Lock, AlertTriangle, Loader2, CheckCircle, FileText, CalendarPlus, History,
  Activity, Bot, ShieldCheck, Download, Pill,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TIPO_LABEL } from '@/components/medico/ConsultaModal'
import { guardNavigation } from '@/lib/prontuario-dirty'

type SubTab = 'diagnosticos' | 'evolucao' | 'laboratorial' | 'imagem' | 'historico' | 'sumario' | 'prescricoes'

// ── Helpers para conteúdo rico (HTML do Quill / iClinic) ─────
function isHtml(text: string) {
  return /<[a-z][\s\S]*?>/i.test(text)
}

/** Remove tags HTML para previews de uma linha */
function stripHtml(text: string) {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Pré-processa HTML do iClinic:
 * - Converte **texto** (digitado manualmente) em <strong>texto</strong>
 * - Converte *texto* simples em <em>texto</em> (quando não for **)
 */
function preprocessIclinicHtml(html: string): string {
  return html
    // **texto** → <strong>texto</strong> (incluindo ** texto **)
    .replace(/\*\*\s*(.*?)\s*\*\*/g, (_, t) => t ? `<strong>${t}</strong>` : '')
    // *texto* → <em>texto</em> (somente simples, não duplo)
    .replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
}

/** Renderiza HTML do Quill ou texto puro */
function RichText({ value, className = '' }: { value: string; className?: string }) {
  if (isHtml(value)) {
    return (
      <div
        className={`prose prose-sm max-w-none text-gray-700 [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_p]:my-0.5 [&_strong]:font-semibold [&_em]:text-gray-500 ${className}`}
        dangerouslySetInnerHTML={{ __html: preprocessIclinicHtml(value) }}
      />
    )
  }
  // Texto puro: também processa markdown simples
  const processed = value
    .replace(/\*\*\s*(.*?)\s*\*\*/g, (_, t) => t ? `<strong>${t}</strong>` : '')
  return (
    <p
      className={`text-sm leading-relaxed whitespace-pre-wrap text-gray-700 ${className}`}
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  )
}

// ── Aba Histórico completo ────────────────────────────────────
function HistoricoTab({ consultas }: { consultas: Consulta[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const sorted = [...consultas].sort((a, b) => b.data_hora.localeCompare(a.data_hora))

  if (sorted.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 text-sm">
        Nenhuma consulta registrada.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sorted.map((c, i) => {
        const d       = new Date(c.data_hora)
        const data    = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        const hora    = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        const isOpen  = expanded === c.id
        const tipo    = TIPO_LABEL[c.tipo] ?? c.tipo
        const isFirst = i === 0

        return (
          <div key={c.id} className={`rounded-xl border overflow-hidden transition-all ${isFirst ? 'border-primary/30' : 'border-gray-200'}`}>
            {/* Header clicável */}
            <button
              type="button"
              onClick={() => setExpanded(isOpen ? null : c.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isOpen ? 'bg-gray-50' : 'bg-white hover:bg-gray-50/60'}`}
            >
              {/* Linha do tempo */}
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.prontuario_finalizado ? 'bg-emerald-400' : isFirst ? 'bg-amber-400 animate-pulse' : 'bg-gray-300'}`} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800">{data}</span>
                  <span className="text-xs text-gray-400">{hora}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-primary font-medium">{tipo}</span>
                  {c.prontuario_finalizado ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-semibold flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5" /> Finalizado
                    </span>
                  ) : isFirst ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold">Rascunho</span>
                  ) : null}
                </div>
                {/* Preview */}
                {!isOpen && c.evolucao && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {isHtml(c.evolucao) ? stripHtml(c.evolucao) : c.evolucao}
                  </p>
                )}
              </div>

              {/* Sinais vitais inline */}
              {(c.pas != null || c.pad != null || c.fc != null) && (
                <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                  <Activity className="w-3 h-3 text-gray-300" />
                  {c.pas != null && <span className="text-xs text-gray-500">{c.pas}/{c.pad ?? '—'} <span className="text-gray-300">mmHg</span></span>}
                  {c.fc  != null && <span className="text-xs text-gray-500">{c.fc} <span className="text-gray-300">bpm</span></span>}
                </div>
              )}

              <span className="text-gray-300 text-xs flex-shrink-0">{isOpen ? '▲' : '▼'}</span>
            </button>

            {/* Conteúdo expandido */}
            {isOpen && (
              <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-4 bg-white">

                {/* Observação da consulta */}
                {c.obs_consulta && (
                  <p className="text-xs italic text-gray-400 border-l-2 border-gray-200 pl-3 py-0.5 mt-2">
                    {c.obs_consulta}
                  </p>
                )}

                {/* Sinais vitais */}
                {(c.pas != null || c.pad != null || c.fc != null) && (
                  <div className="flex gap-5 py-2">
                    <VitalDisplay label="PAS" value={c.pas} unit="mmHg" />
                    <VitalDisplay label="PAD" value={c.pad} unit="mmHg" />
                    <VitalDisplay label="FC"  value={c.fc}  unit="bpm"  />
                  </div>
                )}

                {c.exame_fisico && <HistField label="Exame físico" value={c.exame_fisico} />}
                {c.evolucao     && <HistField label="Evolução"     value={c.evolucao}     />}
                {c.impressao    && <HistField label="Impressão"    value={c.impressao} private />}
                {c.conduta      && <HistField label="Conduta"      value={c.conduta}      />}
                {!c.evolucao && !c.conduta && !c.exame_fisico && (
                  <p className="text-sm text-gray-400 italic py-2">Prontuário não preenchido.</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function VitalDisplay({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-base font-bold text-gray-800">{value ?? <span className="text-gray-300">—</span>}</p>
      <p className="text-[10px] text-gray-400">{unit}</p>
    </div>
  )
}

function HistField({ label, value, private: isPrivate }: { label: string; value: string; private?: boolean }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
        {label}
        {isPrivate && <span className="text-[9px] text-gray-300 normal-case">(privado)</span>}
      </p>
      <RichText value={value} className={isPrivate ? 'opacity-70 italic' : ''} />
    </div>
  )
}

function formatConsultaLabel(c: Consulta) {
  const d    = new Date(c.data_hora)
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const tipo = TIPO_LABEL[c.tipo] ?? c.tipo
  return `${data} ${hora} — ${tipo}`
}

interface Props {
  consultas:            Consulta[]
  labResults:           LabResult[]
  imagingResults:       ImagingResult[]
  patientId:            string
  patientName:          string
  patientPhone?:        string | null
  patientBirthday?:     string | null
  patientGender?:       'M' | 'F' | null
  patientRetorno?:      string | null
  initialPrescricoes?:  { ativas: Prescricao[]; inativas: Prescricao[] }
  onRefresh?:           () => void
}

const VALID_SUBTABS: SubTab[] = ['diagnosticos', 'evolucao', 'laboratorial', 'imagem', 'historico', 'sumario', 'prescricoes']

export default function ProntuarioTab({
  consultas, labResults, imagingResults,
  patientId, patientName,
  patientPhone, patientBirthday, patientGender,
  patientRetorno,
  initialPrescricoes,
  onRefresh,
}: Props) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const realizadas = consultas.filter(c => c.status !== 'cancelada')

  // Sub-tab persistida na URL como ?stab=...
  const rawStab = searchParams.get('stab') as SubTab | null
  const activeTab: SubTab = rawStab && VALID_SUBTABS.includes(rawStab) ? rawStab : 'diagnosticos'

  // Consulta selecionada persistida na URL como ?consulta=...
  const rawConsulta = searchParams.get('consulta')
  const selectedId = (rawConsulta && realizadas.find(c => c.id === rawConsulta))
    ? rawConsulta
    : (realizadas[0]?.id ?? '')

  const [confirmFinalizar, setConfirm]      = useState(false)
  const [finalizeError, setFinalizeError]   = useState('')
  const [showNovaConsulta, setShowNova]     = useState(false)
  const [isPending, startTransition]        = useTransition()
  const [hasDirty, setHasDirty]            = useState(false)
  const [showAssinatura, setShowAssinatura] = useState(false)
  const [assinaturaResult, setAssinaturaResult] = useState<{ pdfUrl: string; assinaturaUrl: string } | null>(null)

  const selectedConsulta = realizadas.find(c => c.id === selectedId) ?? null
  const isFinalized      = selectedConsulta?.prontuario_finalizado ?? false
  const finalizedAt      = selectedConsulta?.prontuario_finalizado_at

  // Seletor de consulta aparece nas abas clínicas (não no histórico)
  const isClinicTab = activeTab === 'diagnosticos' || activeTab === 'evolucao'
  const isHistorico = activeTab === 'historico'

  function handleFinalizar() {
    if (!selectedConsulta) return
    setFinalizeError('')
    startTransition(async () => {
      const res = await finalizarProntuario(selectedConsulta.id)
      if (!res.success) { setFinalizeError(res.error ?? 'Erro ao finalizar.'); return }
      setConfirm(false)
      onRefresh?.()   // re-busca detailData para refletir prontuario_finalizado=true
    })
  }

  const tabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'diagnosticos', label: 'Diagnósticos', icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: 'evolucao',     label: 'Evolução',      icon: <Stethoscope   className="w-3.5 h-3.5" /> },
    { id: 'laboratorial', label: 'Laboratorial',  icon: <FlaskConical  className="w-3.5 h-3.5" /> },
    { id: 'imagem',       label: 'Imagem',        icon: <ScanLine      className="w-3.5 h-3.5" /> },
    { id: 'prescricoes',  label: 'Prescrições',   icon: <Pill          className="w-3.5 h-3.5" /> },
    { id: 'historico',    label: 'Histórico',     icon: <History       className="w-3.5 h-3.5" /> },
    { id: 'sumario',      label: 'Sumário IA',    icon: <Bot           className="w-3.5 h-3.5" /> },
  ]

  if (realizadas.length === 0) {
    return (
      <>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="w-10 h-10 text-gray-200 mb-3" />
          <p className="text-sm text-gray-400 mb-4">Nenhuma consulta registrada para este paciente.</p>
          <button
            type="button"
            onClick={() => setShowNova(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-light transition-colors"
          >
            <CalendarPlus className="w-4 h-4" />
            Iniciar primeira consulta
          </button>
        </div>
        {showNovaConsulta && (
          <NovaConsultaModal
            patientId={patientId}
            patientName={patientName}
            onClose={() => setShowNova(false)}
          />
        )}
      </>
    )
  }

  return (
    <>
    {showNovaConsulta && (
      <NovaConsultaModal
        patientId={patientId}
        patientName={patientName}
        onClose={() => setShowNova(false)}
      />
    )}

    {/* ── Card container do prontuário ── */}
    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">

      {/* Header do card: seletor de consulta */}
      {!isHistorico && (
        <div className="flex items-center gap-3 px-5 py-3.5 bg-gray-50 border-b border-gray-200">
          <label className="text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
            Consulta
          </label>
          <select
            value={selectedId}
            onChange={e => {
              const id = e.target.value
              guardNavigation(() => {
                setConfirm(false)
                setFinalizeError('')
                const p = new URLSearchParams(searchParams.toString())
                p.set('consulta', id)
                router.push(`?${p.toString()}`, { scroll: false })
              })
            }}
            className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
          >
            {realizadas.map(c => (
              <option key={c.id} value={c.id}>
                {formatConsultaLabel(c)}
                {c.prontuario_finalizado ? ' 🔒' : ''}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setShowNova(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-primary/40 text-primary rounded-lg text-xs font-medium hover:bg-primary/5 transition-colors flex-shrink-0"
            title="Criar nova consulta avulsa"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Nova consulta
          </button>

          {isFinalized ? (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0">
              <Lock className="w-3 h-3" />
              Finalizado
            </span>
          ) : (
            <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Rascunho
            </span>
          )}
        </div>
      )}

      {/* Sub-tabs como segmento dentro do card */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => guardNavigation(() => {
                setConfirm(false)
                const p = new URLSearchParams(searchParams.toString())
                p.set('stab', tab.id)
                router.push(`?${p.toString()}`, { scroll: false })
              })}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all',
                activeTab === tab.id
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

      </div>

      {/* Banner de prontuário finalizado */}
      {!isHistorico && isFinalized && (
        <div className="flex items-center gap-2.5 mx-5 mt-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800">
          <Lock className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold">Prontuário finalizado</p>
            {finalizedAt && (
              <p className="text-xs text-emerald-700 mt-0.5">
                Registrado em{' '}
                {new Date(finalizedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}{' '}
                às{' '}
                {new Date(finalizedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Conteúdo das abas */}
      <div className="px-5 pt-5 pb-5">
        {activeTab === 'diagnosticos' && selectedConsulta && (
          <DiagnosticosPanel
            consulta={selectedConsulta}
            consultas={realizadas}
            isFinalized={isFinalized}
            onDirtyChange={setHasDirty}
            onRefresh={onRefresh}
          />
        )}
        {activeTab === 'evolucao' && selectedConsulta && (
          <EvolucaoPanel
            consulta={selectedConsulta}
            consultas={realizadas}
            isFinalized={isFinalized}
            patientId={patientId}
            retornoPrevisto={patientRetorno}
            onDirtyChange={setHasDirty}
            onRefresh={onRefresh}
          />
        )}
        {/* ── Últimas consultas (resumo abaixo dos painéis clínicos) ── */}
        {isClinicTab && !isHistorico && selectedConsulta && (() => {
          const idx = realizadas.findIndex(c => c.id === selectedConsulta.id)
          const anteriores = realizadas.slice(idx + 1, idx + 3)
          if (anteriores.length === 0) return null
          return (
            <div className="mt-6 border-t border-gray-100 pt-5 space-y-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                Consultas anteriores (referência)
              </p>
              {anteriores.map(c => {
                const d    = new Date(c.data_hora)
                const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
                const tipo = TIPO_LABEL[c.tipo] ?? c.tipo
                return (
                  <div key={c.id} className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2 text-gray-500 font-semibold">
                      <span>{data}</span>
                      {activeTab !== 'diagnosticos' && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-primary text-[10px]">{tipo}</span>
                      )}
                      {c.prontuario_finalizado && <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" />Finalizado</span>}
                    </div>
                    {activeTab !== 'evolucao' && (c.pas != null || c.pad != null || c.fc != null) && (
                      <div className="flex gap-4 text-gray-600">
                        {c.pas != null && <span>PA: <strong>{c.pas}/{c.pad ?? '—'}</strong> mmHg</span>}
                        {c.fc  != null && <span>FC: <strong>{c.fc}</strong> bpm</span>}
                      </div>
                    )}
                    {activeTab === 'evolucao' && c.evolucao && (
                      <div className="line-clamp-4 overflow-hidden">
                        <RichText value={c.evolucao} className="!text-gray-600" />
                      </div>
                    )}
                    {activeTab === 'evolucao' && c.conduta && (
                      <div className="border-t border-gray-100 pt-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Conduta</p>
                        <div className="line-clamp-3 overflow-hidden">
                          <RichText value={c.conduta} className="!text-gray-600" />
                        </div>
                      </div>
                    )}
                    {activeTab === 'evolucao' && c.impressao && (
                      <div className="border-t border-gray-100 pt-2">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Impressão</p>
                        <div className="line-clamp-2 overflow-hidden">
                          <RichText value={c.impressao} className="!text-gray-600 !italic" />
                        </div>
                      </div>
                    )}
                    {activeTab === 'diagnosticos' && c.diagnosticos && (() => {
                      try {
                        const diags = JSON.parse(c.diagnosticos) as { nome: string }[]
                        return diags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {diags.map((d, i) => {
                              const label = isHtml(d.nome) ? stripHtml(d.nome) : d.nome
                              return <span key={i} className="px-2 py-0.5 bg-white border border-gray-200 rounded-full text-gray-600">{label}</span>
                            })}
                          </div>
                        ) : null
                      } catch { return <RichText value={c.diagnosticos} className="!text-gray-600" /> }
                    })()}
                    {activeTab === 'evolucao' && !c.evolucao && !c.conduta && (
                      <p className="text-gray-400 italic">Sem anotações nesta consulta.</p>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })()}

        {activeTab === 'laboratorial' && (
          <LabResultsPanel labResults={labResults} patientId={patientId} />
        )}
        {activeTab === 'imagem' && (
          <ImagingPanel imagingResults={imagingResults} patientId={patientId} />
        )}
        {activeTab === 'prescricoes' && (
          <PrescricoesPanel
            patientId={patientId}
            initialPrescricoes={initialPrescricoes ?? { ativas: [], inativas: [] }}
          />
        )}

        {activeTab === 'historico' && (
          <HistoricoTab consultas={realizadas} />
        )}

        {activeTab === 'sumario' && (
          <SumarioPanel
            patientId={patientId}
            patientName={patientName}
            proximaConsulta={
              consultas.filter(c => c.status === 'agendada' && new Date(c.data_hora) > new Date())
                .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())[0]
              ?? null
            }
          />
        )}
      </div>

      {/* ── Seção de finalização (só nas abas clínicas, só se não finalizado) ── */}
      {isClinicTab && !isHistorico && !isFinalized && selectedConsulta && (
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
          {!confirmFinalizar ? (
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-gray-400">
                Salve o rascunho quantas vezes precisar. Finalize quando o prontuário estiver completo.
              </p>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAssinatura(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Finalizar e Assinar
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:border-gray-400 hover:text-gray-800 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Só finalizar
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-amber-900">Finalizar prontuário desta consulta?</p>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    Após finalizar, os campos de diagnósticos, evolução e conduta ficam bloqueados
                    para edição. Resultados laboratoriais e de imagem continuam editáveis.
                    <strong className="block mt-1">Esta ação não pode ser desfeita.</strong>
                  </p>
                </div>
              </div>

              {finalizeError && (
                <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {finalizeError}
                </p>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setConfirm(false); setFinalizeError('') }}
                  disabled={isPending}
                  className="px-4 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleFinalizar}
                  disabled={isPending}
                  className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  {isPending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Finalizando...</>
                    : <><CheckCircle className="w-3.5 h-3.5" /> Sim, finalizar</>
                  }
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Banner de prontuário assinado ── */}
      {isClinicTab && !isHistorico && isFinalized && selectedConsulta?.prontuario_assinado && (
        <div className="px-5 py-3 border-t border-gray-100 bg-emerald-50/50 rounded-b-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
              <span className="text-xs font-semibold">Prontuário assinado digitalmente (ICP-Brasil)</span>
            </div>
            {selectedConsulta?.prontuario_pdf_url && (
              <a
                href={selectedConsulta.prontuario_pdf_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-900 font-medium"
              >
                <Download className="w-3.5 h-3.5" /> Baixar PDF
              </a>
            )}
          </div>
        </div>
      )}

    </div>{/* fim card */}

    {/* ── Modais de assinatura ── */}
    {showAssinatura && selectedConsulta && (
      <AssinaturaModal
        consultaId={selectedConsulta.id}
        onClose={() => setShowAssinatura(false)}
        onSuccess={(pdfUrl, assinaturaUrl) => {
          setShowAssinatura(false)
          setAssinaturaResult({ pdfUrl, assinaturaUrl })
          router.refresh()
        }}
      />
    )}

    {assinaturaResult && (
      <AssinaturaSuccessModal
        pdfUrl={assinaturaResult.pdfUrl}
        assinaturaUrl={assinaturaResult.assinaturaUrl}
        onClose={() => setAssinaturaResult(null)}
      />
    )}
    </>
  )
}
