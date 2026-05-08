'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import type { Consulta } from '@/lib/types'
import { salvarConsultaFields } from '@/app/actions/prontuario'
import { Save, CheckCircle, Loader2, FileText, X, Plus, ClipboardCopy, Search } from 'lucide-react'

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

// ── Tipos ─────────────────────────────────────────────────────
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
  // Legado: texto livre — converte num único item para não perder dados
  if (raw.trim()) return [{ nome: raw.trim(), evolucao: '' }]
  return []
}

function formatConsultaLabel(c: Consulta) {
  const d    = new Date(c.data_hora)
  const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const tipo = c.tipo === 'primeira_consulta' ? 'Primeira consulta'
    : c.tipo === 'retorno'    ? 'Retorno'
    : c.tipo === 'urgencia'   ? 'Urgência'
    : 'Telemedicina'
  return `${data} — ${tipo}`
}

interface Props {
  consultas: Consulta[]
}

export default function DiagnosticosPanel({ consultas }: Props) {
  const realizadas = consultas.filter(c => c.status !== 'cancelada')

  const [selectedId, setSelectedId]     = useState<string>(realizadas[0]?.id ?? '')
  const [entries, setEntries]           = useState<DiagnosisEntry[]>([])
  const [saved, setSaved]               = useState(false)
  const [error, setError]               = useState('')
  const [isPending, startTransition]    = useTransition()

  // Autocomplete
  const [searchText, setSearchText]     = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef                        = useRef<HTMLInputElement>(null)
  const dropdownRef                     = useRef<HTMLDivElement>(null)

  const selected = realizadas.find(c => c.id === selectedId) ?? null

  // Atualiza entries quando muda a consulta selecionada
  useEffect(() => {
    setEntries(parseDiagnosticos(selected?.diagnosticos ?? null))
    setSaved(false)
    setError('')
    setSearchText('')
    setShowDropdown(false)
  }, [selectedId])

  // Carry-forward: consulta anterior que tenha ao menos 1 diagnóstico
  const carrySource = (() => {
    if (!selected) return null
    const current = parseDiagnosticos(selected.diagnosticos ?? null)
    if (current.length > 0) return null // já tem dados
    const idx = realizadas.findIndex(c => c.id === selected.id)
    return realizadas.slice(idx + 1).find(c =>
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

  // Sugestões filtradas
  const q          = searchText.trim()
  const qLow       = q.toLowerCase()
  const addedNames = new Set(entries.map(e => e.nome.toLowerCase()))
  const suggestions = q
    ? PRESET_DIAGNOSES.filter(d =>
        d.toLowerCase().includes(qLow) && !addedNames.has(d.toLowerCase())
      )
    : []
  const showAddFree = q.length > 0
    && !addedNames.has(qLow)
    && !PRESET_DIAGNOSES.some(d => d.toLowerCase() === qLow)

  function addDiagnosis(nome: string) {
    setEntries(prev => [...prev, { nome, evolucao: '' }])
    setSearchText('')
    setShowDropdown(false)
    setSaved(false)
    inputRef.current?.focus()
  }

  function removeDiagnosis(idx: number) {
    setEntries(prev => prev.filter((_, i) => i !== idx))
    setSaved(false)
  }

  function updateEvolucao(idx: number, val: string) {
    setEntries(prev => prev.map((e, i) => i === idx ? { ...e, evolucao: val } : e))
    setSaved(false)
  }

  function handleCarryForward() {
    if (!carrySource) return
    // Copia diagnósticos com notas de evolução da consulta anterior (Gui edita)
    setEntries(parseDiagnosticos(carrySource.diagnosticos ?? null))
    setSaved(false)
  }

  function handleSave() {
    if (!selected) return
    setError('')
    startTransition(async () => {
      const res = await salvarConsultaFields(selected.id, {
        diagnosticos: entries.length > 0 ? JSON.stringify(entries) : null,
      })
      if (!res.success) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  if (realizadas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="w-10 h-10 text-gray-200 mb-3" />
        <p className="text-sm text-gray-400">Nenhuma consulta registrada para este paciente.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">

      {/* Seletor de consulta */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
          Consulta
        </label>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary bg-white"
        >
          {realizadas.map(c => (
            <option key={c.id} value={c.id}>
              {formatConsultaLabel(c)}
              {parseDiagnosticos(c.diagnosticos ?? null).length === 0 ? ' (sem diagnóstico)' : ''}
            </option>
          ))}
        </select>
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

      {/* ── Campo de busca / autocomplete ── */}
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

        {/* Dropdown de sugestões */}
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

      {/* ── Lista de diagnósticos como tags ── */}
      {entries.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-gray-400 text-sm">
          Nenhum diagnóstico adicionado. Use o campo acima para buscar.
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, idx) => (
            <div
              key={idx}
              className="border border-primary/20 bg-blue-50/30 rounded-xl p-3 space-y-2 group"
            >
              {/* Nome + remover */}
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

              {/* Nota de evolução */}
              <input
                value={entry.evolucao}
                onChange={e => updateEvolucao(idx, e.target.value)}
                placeholder="Nota de evolução... (ex: Creatinina 1.8, estável)"
                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary bg-white text-gray-700 placeholder:text-gray-400"
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
            ? `${entries.length} diagnóstico${entries.length > 1 ? 's' : ''} ativo${entries.length > 1 ? 's' : ''}`
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
            <><Save className="w-3.5 h-3.5" /> Salvar diagnósticos</>
          )}
        </button>
      </div>

    </div>
  )
}
