'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import type { Consulta } from '@/lib/types'
import { salvarConsultaFields } from '@/app/actions/prontuario'
import { useUnsavedWarning } from '@/lib/hooks/useUnsavedWarning'
import { setProntuarioDirty } from '@/lib/prontuario-dirty'
import { Save, CheckCircle, Loader2, X, Plus, ClipboardCopy, Search, Lock } from 'lucide-react'

// ── Lista de diagnósticos de nefrologia ───────────────────────
const PRESET_DIAGNOSES = [
  'Hipertensão arterial sistêmica (HAS)',
  'Doença renal crônica estágio 1',
  'Doença renal crônica estágio 2',
  'Doença renal crônica estágio 3a',
  'Doença renal crônica estágio 3b',
  'Doença renal crônica estágio 4',
  'Doença renal crônica estágio 5',
  'Doença renal crônica estágio 5D (diálise)',
  'Diabetes mellitus tipo 1',
  'Diabetes mellitus tipo 2',
  'Nefropatia diabética',
  'Síndrome nefrótica',
  'Síndrome nefrítica',
  'Glomerulonefrite',
  'Nefrite lúpica',
  'Nefropatia por IgA (Berger)',
  'Poliangiíte microscópica',
  'Granulomatose com poliangiíte (Wegener)',
  'Síndrome de Goodpasture',
  'Rim policístico autossômico dominante (DRPAD)',
  'Litíase renal (nefrolitíase)',
  'Infecção do trato urinário (ITU)',
  'Pielonefrite',
  'Obstrução urinária',
  'Hidronefrose',
  'Insuficiência renal aguda (IRA)',
  'Necrose tubular aguda (NTA)',
  'Nefrite intersticial aguda',
  'Hiperaldosteronismo primário',
  'Hipertensão renovascular',
  'Estenose de artéria renal',
  'Transplante renal',
  'Rejeição de enxerto renal',
  'Proteinúria',
  'Hematúria',
  'Anemia da doença renal crônica',
  'Hiperpotassemia',
  'Hipopotassemia',
  'Hiperfosfatemia',
  'Hiperparatireoidismo secundário',
  'Acidose metabólica',
  'Edema',
  'Hiponatremia',
  'Hipernatremia',
  'Obesidade',
  'Dislipidemia',
  'Hiperuricemia / gota',
  'Lupus eritematoso sistêmico (LES)',
  'Vasculite ANCA-associada',
  'Amiloidose renal',
  'Mieloma múltiplo',
]

// ── Tipos exportados ──────────────────────────────────────────
export interface DiagnosisEntry {
  nome:    string
  evolucao: string
}

export function parseDiagnosticos(raw: string | null): DiagnosisEntry[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as DiagnosisEntry[]
  } catch { /* não é JSON */ }
  // Legado: texto livre → único item
  if (raw.trim()) return [{ nome: raw.trim(), evolucao: '' }]
  return []
}

// ── Props ─────────────────────────────────────────────────────
interface Props {
  consulta:       Consulta
  consultas:      Consulta[]
  isFinalized:    boolean
  onDirtyChange?: (dirty: boolean) => void
}

export default function DiagnosticosPanel({ consulta, consultas, isFinalized, onDirtyChange }: Props) {
  const [obsConsulta, setObsConsulta]   = useState(consulta.obs_consulta ?? '')
  const [entries, setEntries]           = useState<DiagnosisEntry[]>(() => parseDiagnosticos(consulta.diagnosticos))
  const [isDirty, setIsDirty]           = useState(false)
  const [saved, setSaved]               = useState(false)
  const [error, setError]               = useState('')
  const [isPending, startTransition]    = useTransition()

  useUnsavedWarning(isDirty && !isFinalized)

  useEffect(() => {
    setProntuarioDirty(isDirty && !isFinalized)
    onDirtyChange?.(isDirty && !isFinalized)
  }, [isDirty, isFinalized]) // eslint-disable-line react-hooks/exhaustive-deps

  // Autocomplete
  const [searchText, setSearchText]     = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef                        = useRef<HTMLInputElement>(null)
  const dropdownRef                     = useRef<HTMLDivElement>(null)

  // Refs para as textareas de evolução — necessário para auto-height no mount
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([])

  // Auto-expande todas as textareas quando os entries carregam ou mudam
  useEffect(() => {
    textareaRefs.current.forEach(el => {
      if (!el) return
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    })
  }, [entries])

  // Sincroniza quando a consulta selecionada muda
  useEffect(() => {
    setObsConsulta(consulta.obs_consulta ?? '')
    setEntries(parseDiagnosticos(consulta.diagnosticos))
    setIsDirty(false)
    setSaved(false)
    setError('')
    setSearchText('')
    setShowDropdown(false)
    // Limpa refs antigas ao trocar de consulta
    textareaRefs.current = []
  }, [consulta.id])

  // Carry-forward: consulta anterior com diagnósticos
  const carrySource = (() => {
    if (isFinalized) return null
    const current = parseDiagnosticos(consulta.diagnosticos)
    if (current.length > 0) return null
    const idx = consultas.findIndex(c => c.id === consulta.id)
    return consultas.slice(idx + 1).find(c =>
      parseDiagnosticos(c.diagnosticos ?? null).length > 0
    ) ?? null
  })()

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        !dropdownRef.current?.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) setShowDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const q          = searchText.trim()
  const qLow       = q.toLowerCase()
  const addedNames = new Set(entries.map(e => e.nome.toLowerCase()))
  const suggestions = q
    ? PRESET_DIAGNOSES.filter(d => d.toLowerCase().includes(qLow) && !addedNames.has(d.toLowerCase()))
    : []
  const showAddFree = q.length > 0
    && !addedNames.has(qLow)
    && !PRESET_DIAGNOSES.some(d => d.toLowerCase() === qLow)

  function markDirty() { setIsDirty(true); setSaved(false) }

  function addDiagnosis(nome: string) {
    setEntries(prev => [...prev, { nome, evolucao: '' }])
    setSearchText('')
    setShowDropdown(false)
    markDirty()
    inputRef.current?.focus()
  }

  function removeDiagnosis(idx: number) {
    setEntries(prev => prev.filter((_, i) => i !== idx))
    markDirty()
  }

  function updateEvolucao(idx: number, val: string) {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, evolucao: val } : e))
    markDirty()
  }

  function handleCarryForward() {
    if (!carrySource) return
    setEntries(parseDiagnosticos(carrySource.diagnosticos ?? null))
    markDirty()
  }

  function handleSave() {
    setError('')
    startTransition(async () => {
      const res = await salvarConsultaFields(consulta.id, {
        obs_consulta: obsConsulta.trim() || null,
        diagnosticos: entries.length > 0 ? JSON.stringify(entries) : null,
      })
      if (!res.success) { setError(res.error); return }
      setIsDirty(false)
      onDirtyChange?.(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  // ── Modo read-only (finalizado) ───────────────────────────
  if (isFinalized) {
    return (
      <div className="space-y-3">
        {/* Observação da consulta */}
        {consulta.obs_consulta && (
          <p className="text-xs italic text-gray-400 border-l-2 border-gray-200 pl-3 py-0.5">
            {consulta.obs_consulta}
          </p>
        )}
        {entries.length === 0 ? (
          <div className="text-center py-10 bg-gray-50 rounded-xl border border-gray-100 text-gray-400 text-sm">
            Nenhum diagnóstico registrado nesta consulta.
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, idx) => (
              <div key={idx} className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 space-y-1">
                <p className="text-sm font-semibold text-gray-900">
                  {/<[a-z][\s\S]*?>/i.test(entry.nome)
                    ? entry.nome.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                    : entry.nome}
                </p>
                {entry.evolucao && (
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {/<[a-z][\s\S]*?>/i.test(entry.evolucao)
                      ? entry.evolucao.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
                      : entry.evolucao}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1">
          <Lock className="w-3 h-3" />
          {entries.length} diagnóstico{entries.length !== 1 ? 's' : ''} · prontuário finalizado
        </div>
      </div>
    )
  }

  // ── Modo edição ───────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Observação da consulta */}
      <div className="relative">
        <textarea
          value={obsConsulta}
          onChange={e => { setObsConsulta(e.target.value); markDirty() }}
          placeholder="Observação desta consulta... (ex: Nova Odessa, indicada por Dra Ana — Nutri PUCC)"
          rows={1}
          className="w-full px-3 py-2 text-xs italic text-gray-500 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-gray-50 placeholder:text-gray-300 placeholder:not-italic resize-none overflow-hidden leading-relaxed"
          style={{ minHeight: '2rem' }}
          onInput={e => {
            const t = e.currentTarget
            t.style.height = 'auto'
            t.style.height = t.scrollHeight + 'px'
          }}
        />
      </div>

      {/* Carry-forward */}
      {carrySource && (
        <button
          type="button"
          onClick={handleCarryForward}
          className="flex items-center gap-2 w-full px-3 py-2 border border-dashed border-primary/30 bg-blue-50/50 hover:bg-blue-50 text-primary rounded-lg text-xs font-medium transition-colors"
        >
          <ClipboardCopy className="w-3.5 h-3.5 flex-shrink-0" />
          Copiar diagnósticos de {new Date(carrySource.data_hora).toLocaleDateString('pt-BR')}
          <span className="ml-auto text-gray-400 font-normal">carry-forward</span>
        </button>
      )}

      {/* Campo de busca / autocomplete */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl bg-white focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-shadow">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchText}
            onChange={e => { setSearchText(e.target.value); setShowDropdown(true) }}
            onFocus={() => q && setShowDropdown(true)}
            placeholder="Buscar diagnóstico ou digitar livremente..."
            className="flex-1 text-sm text-gray-900 focus:outline-none bg-transparent placeholder:text-gray-400"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => { setSearchText(''); setShowDropdown(false) }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {showDropdown && (suggestions.length > 0 || showAddFree) && (
          <div
            ref={dropdownRef}
            className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
          >
            <ul className="max-h-56 overflow-y-auto py-1">
              {suggestions.map(s => (
                <li key={s}>
                  <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); addDiagnosis(s) }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-blue-50 hover:text-primary transition-colors"
                  >
                    {s}
                  </button>
                </li>
              ))}
              {showAddFree && (
                <li>
                  <button
                    type="button"
                    onMouseDown={e => { e.preventDefault(); addDiagnosis(q) }}
                    className="w-full text-left px-4 py-2 text-sm text-primary font-medium hover:bg-blue-50 transition-colors flex items-center gap-2 border-t border-gray-100"
                  >
                    <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                    Adicionar &ldquo;{q}&rdquo;
                  </button>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Lista de diagnósticos como tags editáveis */}
      {entries.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
          Nenhum diagnóstico adicionado. Use o campo acima para buscar.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div
              key={idx}
              className="border border-primary/20 bg-blue-50/30 rounded-xl p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-sm font-semibold text-gray-900 leading-snug">{entry.nome}</span>
                <button
                  type="button"
                  onClick={() => removeDiagnosis(idx)}
                  className="p-0.5 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                  title="Remover diagnóstico"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <textarea
                ref={el => { textareaRefs.current[idx] = el }}
                value={entry.evolucao}
                onChange={e => {
                  updateEvolucao(idx, e.target.value)
                  // auto-height ao digitar
                  e.target.style.height = 'auto'
                  e.target.style.height = e.target.scrollHeight + 'px'
                }}
                placeholder="Nota de evolução... (ex: Creatinina 1.8, estável)"
                rows={1}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-700 placeholder:text-gray-400 resize-none overflow-hidden leading-relaxed"
                style={{ minHeight: '2rem' }}
              />
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">
          {entries.length > 0
            ? `${entries.length} diagnóstico${entries.length !== 1 ? 's' : ''} ativo${entries.length !== 1 ? 's' : ''}`
            : ''}
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors"
        >
          {isPending ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando...</>
          ) : saved ? (
            <><CheckCircle className="w-3.5 h-3.5" /> Salvo!</>
          ) : (
            <><Save className="w-3.5 h-3.5" /> Salvar rascunho</>
          )}
        </button>
      </div>

    </div>
  )
}
