'use client'

import { ScanLine, FileText, Download } from 'lucide-react'

interface ImagingResult {
  id:             string
  tipo:           string
  data_realizado: string
  laudo_resumido: string | null
  file_url:       string | null
  file_name:      string | null
}

interface Props {
  imagingResults: ImagingResult[]
}

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export default function ImagensPatientTab({ imagingResults }: Props) {
  const sorted = [...imagingResults].sort((a, b) =>
    b.data_realizado.localeCompare(a.data_realizado)
  )

  if (sorted.length === 0) {
    return (
      <div className="py-12 text-center">
        <ScanLine className="w-8 h-8 text-gray-200 mx-auto mb-3" />
        <p className="text-sm text-gray-400">Nenhum exame de imagem disponível ainda.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {sorted.map(e => (
        <div key={e.id} className="rounded-xl border border-gray-100 p-4">
          <div className="flex items-start gap-3">
            {/* Ícone */}
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
              <ScanLine className="w-4 h-4 text-blue-500" />
            </div>

            {/* Conteúdo */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{e.tipo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{fmtDate(e.data_realizado)}</p>
                </div>

                {/* Download */}
                {e.file_url && (
                  <a
                    href={e.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-primary hover:text-primary-dark font-medium shrink-0 px-2.5 py-1.5 rounded-lg bg-primary/8 hover:bg-primary/15 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {e.file_name ? 'Baixar' : 'Ver arquivo'}
                  </a>
                )}
              </div>

              {/* Laudo resumido */}
              {e.laudo_resumido && (
                <div className="mt-2.5 flex items-start gap-2 bg-gray-50 rounded-lg px-3 py-2">
                  <FileText className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-gray-600 leading-relaxed">{e.laudo_resumido}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
