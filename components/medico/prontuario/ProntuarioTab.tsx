'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { Consulta, LabResult, ImagingResult } from '@/lib/types'
import DiagnosticosPanel from './DiagnosticosPanel'
import EvolucaoPanel from './EvolucaoPanel'
import LabResultsPanel from './LabResultsPanel'
import LabAlertsPanel from './LabAlertsPanel'
import ImagingPanel from './ImagingPanel'
import { finalizarProntuario } from '@/app/actions/prontuario'
import {
  ClipboardList, Stethoscope, FlaskConical, ScanLine, Pill,
  Lock, AlertTriangle, Loader2, CheckCircle, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type SubTab = 'diagnosticos' | 'evolucao' | 'laboratorial' | 'imagem'

function formatConsultaLabel(c: Consulta) {
  const d    = new Date(c.data_hora)
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const tipo = c.tipo === 'primeira_consulta' ? 'Primeira consulta'
    : c.tipo === 'retorno'    ? 'Retorno'
    : c.tipo === 'urgencia'   ? 'Urgência'
    : 'Telemedicina'
  return `${data} ${hora} — ${tipo}`
}

interface Props {
  consultas:      Consulta[]
  labResults:     LabResult[]
  imagingResults: ImagingResult[]
  patientId:      string
}

export default function ProntuarioTab({ consultas, labResults, imagingResults, patientId }: Props) {
  const router = useRouter()
  const realizadas = consultas.filter(c => c.status !== 'cancelada')

  const [activeTab, setActiveTab]         = useState<SubTab>('diagnosticos')
  const [selectedId, setSelectedId]       = useState<string>(realizadas[0]?.id ?? '')
  const [confirmFinalizar, setConfirm]    = useState(false)
  const [finalizeError, setFinalizeError] = useState('')
  const [isPending, startTransition]      = useTransition()

  const selectedConsulta = realizadas.find(c => c.id === selectedId) ?? null
  const isFinalized      = selectedConsulta?.prontuario_finalizado ?? false
  const finalizedAt      = selectedConsulta?.prontuario_finalizado_at

  // Só mostra seletor de consulta e status de finalização nas abas clínicas
  const isClinicTab = activeTab === 'diagnosticos' || activeTab === 'evolucao'

  function handleFinalizar() {
    if (!selectedConsulta) return
    setFinalizeError('')
    startTransition(async () => {
      const res = await finalizarProntuario(selectedConsulta.id)
      if (!res.success) { setFinalizeError(res.error ?? 'Erro ao finalizar.'); return }
      setConfirm(false)
      router.refresh()
    })
  }

  const tabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'diagnosticos', label: 'Diagnósticos',  icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: 'evolucao',     label: 'Evolução',       icon: <Stethoscope   className="w-3.5 h-3.5" /> },
    { id: 'laboratorial', label: 'Laboratorial',   icon: <FlaskConical  className="w-3.5 h-3.5" /> },
    { id: 'imagem',       label: 'Imagem',         icon: <ScanLine      className="w-3.5 h-3.5" /> },
  ]

  if (realizadas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-10 h-10 text-gray-200 mb-3" />
        <p className="text-sm text-gray-400">Nenhuma consulta registrada para este paciente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-0">

      {/* ── Seletor de consulta + status de finalização ── */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
          Consulta
        </label>
        <select
          value={selectedId}
          onChange={e => { setSelectedId(e.target.value); setConfirm(false); setFinalizeError('') }}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
        >
          {realizadas.map(c => (
            <option key={c.id} value={c.id}>
              {formatConsultaLabel(c)}
              {c.prontuario_finalizado ? ' 🔒' : ''}
            </option>
          ))}
        </select>

        {/* Pílula de status */}
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

      {/* ── Banner de prontuário finalizado ── */}
      {isFinalized && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-emerald-800">
          <Lock className="w-4 h-4 flex-shrink-0 text-emerald-600" />
          <div>
            <p className="text-sm font-semibold">Prontuário finalizado</p>
            {finalizedAt && (
              <p className="text-xs text-emerald-700 mt-0.5">
                Registrado em{' '}
                {new Date(finalizedAt).toLocaleDateString('pt-BR', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })}{' '}
                às{' '}
                {new Date(finalizedAt).toLocaleTimeString('pt-BR', {
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Sub-tabs + Memed ── */}
      <div className="flex items-center justify-between border-b border-gray-100 mb-5">
        <div className="flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setActiveTab(tab.id); setConfirm(false) }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px',
                activeTab === tab.id
                  ? 'text-primary border-primary'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-200'
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled
          className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 text-gray-400 rounded-lg text-xs font-medium cursor-not-allowed opacity-60"
          title="Em breve"
        >
          <Pill className="w-3.5 h-3.5" />
          Prescrição Memed
          <span className="ml-1 text-[10px] bg-gray-100 px-1.5 py-0.5 rounded-full">em breve</span>
        </button>
      </div>

      {/* ── Conteúdo das abas ── */}
      <div>
        {activeTab === 'diagnosticos' && selectedConsulta && (
          <DiagnosticosPanel
            consulta={selectedConsulta}
            consultas={realizadas}
            isFinalized={isFinalized}
          />
        )}
        {activeTab === 'evolucao' && selectedConsulta && (
          <EvolucaoPanel
            consulta={selectedConsulta}
            isFinalized={isFinalized}
          />
        )}
        {activeTab === 'laboratorial' && (
          <>
            <LabAlertsPanel labResults={labResults} />
            <LabResultsPanel labResults={labResults} patientId={patientId} />
          </>
        )}
        {activeTab === 'imagem' && (
          <ImagingPanel imagingResults={imagingResults} patientId={patientId} />
        )}
      </div>

      {/* ── Seção de finalização (só nas abas clínicas, só se não finalizado) ── */}
      {isClinicTab && !isFinalized && selectedConsulta && (
        <div className="mt-6 pt-5 border-t border-gray-100">
          {!confirmFinalizar ? (
            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                Salve o rascunho quantas vezes precisar. Finalize quando o prontuário estiver completo.
              </p>
              <button
                type="button"
                onClick={() => setConfirm(true)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:border-gray-400 hover:text-gray-800 transition-colors"
              >
                <Lock className="w-3.5 h-3.5" />
                Finalizar prontuário
              </button>
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

    </div>
  )
}
