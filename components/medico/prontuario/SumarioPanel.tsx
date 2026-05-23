'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bot, Loader2, RefreshCw, Sparkles, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────

interface SumarioSection {
  titulo: string
  emoji: string
  conteudo: string
}

interface SumarioResponse {
  gerado_em: string
  proxima_consulta: string | null
  sections: SumarioSection[]
}

interface Props {
  patientId: string
  patientName: string
  proximaConsulta?: {
    data_hora: string
    tipo: string
  } | null
}

// ── Helpers ────────────────────────────────────────────────────

function formatGeradoEm(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoString
  }
}

function storageKey(patientId: string) {
  return `sumario-${patientId}`
}

function loadFromSession(patientId: string): SumarioResponse | null {
  try {
    const raw = sessionStorage.getItem(storageKey(patientId))
    if (!raw) return null
    return JSON.parse(raw) as SumarioResponse
  } catch {
    return null
  }
}

function saveToSession(patientId: string, data: SumarioResponse) {
  try {
    sessionStorage.setItem(storageKey(patientId), JSON.stringify(data))
  } catch {
    // sessionStorage can be unavailable in some environments — fail silently
  }
}

// ── Skeleton ───────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="animate-pulse flex gap-4 rounded-xl border border-blue-100 bg-white p-4">
      <div className="h-10 w-10 rounded-lg bg-blue-100 shrink-0" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-4 w-1/3 rounded bg-blue-100" />
        <div className="h-3 w-full rounded bg-blue-50" />
        <div className="h-3 w-5/6 rounded bg-blue-50" />
      </div>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

export default function SumarioPanel({ patientId, patientName, proximaConsulta }: Props) {
  const [sumario, setSumario] = useState<SumarioResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load cached result from sessionStorage on mount
  useEffect(() => {
    const cached = loadFromSession(patientId)
    if (cached) setSumario(cached)
  }, [patientId])

  const gerarSumario = useCallback(
    async (force = false) => {
      if (!force) {
        const cached = loadFromSession(patientId)
        if (cached) {
          setSumario(cached)
          return
        }
      }

      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/sumario/${patientId}`, { method: 'GET' })

        if (!res.ok) {
          const text = await res.text().catch(() => '')
          throw new Error(text || `Erro ${res.status}: não foi possível gerar o sumário.`)
        }

        const data: SumarioResponse = await res.json()
        saveToSession(patientId, data)
        setSumario(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido ao gerar sumário.')
      } finally {
        setLoading(false)
      }
    },
    [patientId],
  )

  // ── Render ────────────────────────────────────────────────────

  return (
    <section
      className={cn(
        'rounded-2xl border border-blue-100 bg-blue-50/40 p-5 space-y-4',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-[#2D2B6B]" />
          <h3 className="font-semibold text-[#2D2B6B] text-base leading-none">
            Sumário Pré-Consulta
          </h3>
          <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-[#2D2B6B] px-2 py-0.5 text-[10px] font-bold text-white tracking-wide">
            <Sparkles className="h-3 w-3" />
            IA
          </span>
        </div>

        <div className="flex items-center gap-2">
          {sumario && !loading && (
            <button
              onClick={() => gerarSumario(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-[#2D2B6B] hover:bg-blue-50 transition-colors"
              title="Forçar nova geração"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Regenerar
            </button>
          )}

          {!sumario && !loading && (
            <button
              onClick={() => gerarSumario(false)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#2D2B6B] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#3d3a8f] transition-colors shadow-sm"
            >
              <Bot className="h-3.5 w-3.5" />
              Gerar Sumário
            </button>
          )}
        </div>
      </div>

      {/* Patient name subtitle */}
      <p className="text-xs text-blue-400 -mt-2">
        Paciente: <span className="font-medium text-blue-600">{patientName}</span>
      </p>

      {/* Loading state */}
      {loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-blue-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Gerando sumário com IA… isso pode levar alguns segundos.</span>
          </div>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-red-700">Não foi possível gerar o sumário</p>
            <p className="text-xs text-red-500">{error}</p>
            <button
              onClick={() => gerarSumario(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Tentar novamente
            </button>
          </div>
        </div>
      )}

      {/* Sumário content */}
      {sumario && !loading && (
        <div className="space-y-3">
          {/* Próxima consulta highlight */}
          {sumario.proxima_consulta && (
            <div className="rounded-xl border border-[#7A9E7E]/40 bg-[#7A9E7E]/10 px-4 py-3 flex items-center gap-3">
              <span className="text-xl">📅</span>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#7A9E7E]">
                  Próxima consulta
                </p>
                <p className="text-sm font-medium text-gray-700">{sumario.proxima_consulta}</p>
              </div>
            </div>
          )}

          {/* Sections */}
          {sumario.sections.map((section, idx) => (
            <div
              key={idx}
              className="flex gap-4 rounded-xl border border-blue-100 bg-white p-4 shadow-sm"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-2xl shrink-0">
                {section.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#2D2B6B] mb-1">{section.titulo}</p>
                <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                  {section.conteudo}
                </p>
              </div>
            </div>
          ))}

          {/* Footer — generated at */}
          <p className="text-[11px] text-blue-300 text-right pt-1">
            Gerado em {formatGeradoEm(sumario.gerado_em)}
          </p>
        </div>
      )}

      {/* Empty state — not yet generated */}
      {!sumario && !loading && !error && (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#2D2B6B]/10">
            <Sparkles className="h-6 w-6 text-[#2D2B6B]" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Sumário ainda não gerado</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Clique em "Gerar Sumário" para criar um resumo inteligente do histórico do paciente.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
