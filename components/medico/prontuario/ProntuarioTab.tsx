'use client'

import { useState } from 'react'
import type { Consulta, LabResult, ImagingResult } from '@/lib/types'
import DiagnosticosPanel from './DiagnosticosPanel'
import EvolucaoPanel from './EvolucaoPanel'
import LabResultsPanel from './LabResultsPanel'
import ImagingPanel from './ImagingPanel'
import { ClipboardList, Stethoscope, FlaskConical, ScanLine, Pill } from 'lucide-react'
import { cn } from '@/lib/utils'

type SubTab = 'diagnosticos' | 'evolucao' | 'laboratorial' | 'imagem'

interface Props {
  consultas:      Consulta[]
  labResults:     LabResult[]
  imagingResults: ImagingResult[]
  patientId:      string
}

export default function ProntuarioTab({ consultas, labResults, imagingResults, patientId }: Props) {
  const [activeTab, setActiveTab] = useState<SubTab>('diagnosticos')

  const tabs: { id: SubTab; label: string; icon: React.ReactNode }[] = [
    { id: 'diagnosticos', label: 'Diagnósticos',    icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { id: 'evolucao',     label: 'Evolução',         icon: <Stethoscope   className="w-3.5 h-3.5" /> },
    { id: 'laboratorial', label: 'Laboratorial',     icon: <FlaskConical  className="w-3.5 h-3.5" /> },
    { id: 'imagem',       label: 'Imagem',           icon: <ScanLine      className="w-3.5 h-3.5" /> },
  ]

  return (
    <div className="space-y-5">
      {/* Sub-tabs + Memed */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-0">
        <div className="flex gap-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
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

        {/* Em breve — Memed */}
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

      {/* Content */}
      <div>
        {activeTab === 'diagnosticos' && (
          <DiagnosticosPanel consultas={consultas} />
        )}
        {activeTab === 'evolucao' && (
          <EvolucaoPanel consultas={consultas} />
        )}
        {activeTab === 'laboratorial' && (
          <LabResultsPanel labResults={labResults} patientId={patientId} />
        )}
        {activeTab === 'imagem' && (
          <ImagingPanel imagingResults={imagingResults} patientId={patientId} />
        )}
      </div>
    </div>
  )
}
