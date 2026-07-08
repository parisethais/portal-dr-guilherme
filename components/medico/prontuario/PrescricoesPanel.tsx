'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import type { Prescricao } from '@/lib/types'
import { createPrescricao, inativarPrescricao, getMedicamentosHistory } from '@/app/actions/prescricoes'
import {
  Pill, Plus, X, ChevronDown, Loader2, AlertCircle, CalendarX,
} from 'lucide-react'

const VIA_OPTIONS = ['VO', 'SC', 'IV', 'IM', 'Inalatória', 'Sublingual', 'Tópica', 'Retal']

const DRUG_LIST = [
  'Losartana', 'Valsartana', 'Olmesartana', 'Irbesartana', 'Telmisartana', 'Candesartana',
  'Enalapril', 'Lisinopril', 'Ramipril', 'Captopril', 'Perindopril', 'Benazepril',
  'Anlodipino', 'Nifedipino', 'Verapamil', 'Diltiazem',
  'Atenolol', 'Carvedilol', 'Metoprolol', 'Bisoprolol', 'Propranolol', 'Nebivolol',
  'Hidroclorotiazida', 'Clortalidona', 'Furosemida', 'Espironolactona', 'Eplerenona', 'Indapamida',
  'Alfametildopa', 'Clonidina', 'Doxazosina', 'Prazosina', 'Hidralazina', 'Minoxidil',
  'Sacubitril/Valsartana',
  'Acetazolamida', 'Amilorida', 'Triamtereno', 'Tolvaptana',
  'Carbonato de cálcio', 'Acetato de cálcio', 'Sevelâmer', 'Carbonato de lantânio',
  'Colecalciferol', 'Calcitriol', 'Paricalcitol', 'Alfacalcidol',
  'Cinacalcete',
  'Eritropoetina', 'Darbepoetina alfa', 'Ferro sacarato IV', 'Sulfato ferroso', 'Ferro polimaltosado',
  'Bicarbonato de sódio',
  'Cloreto de potássio', 'Patirômer', 'Zirconium ciclossilicato de sódio',
  'Alopurinol', 'Febuxostato', 'Benzbromarona',
  'Metformina', 'Empagliflozina', 'Dapagliflozina', 'Canagliflozina',
  'Semaglutida', 'Liraglutida', 'Dulaglutida', 'Sitagliptina', 'Saxagliptina',
  'Glibenclamida', 'Glimepirida', 'Insulina NPH', 'Insulina Regular', 'Insulina Glargina', 'Insulina Degludeca',
  'Atorvastatina', 'Rosuvastatina', 'Sinvastatina', 'Pravastatina', 'Ezetimiba', 'Bezafibrato', 'Fenofibrato',
  'Tacrolimus', 'Ciclosporina', 'Micofenolato mofetil', 'Azatioprina', 'Prednisona', 'Metilprednisolona',
  'Sirolimus', 'Everolimus', 'Belatacept',
  'Warfarina', 'Rivaroxabana', 'Apixabana', 'Heparina', 'Enoxaparina',
  'Ácido fólico', 'Vitamina B12', 'Hidróxido de magnésio', 'Omeprazol', 'Pantoprazol',
  'Amoxicilina', 'Nitrofurantoína', 'Ciprofloxacino', 'Cotrimoxazol',
]

function fmtDate(d: string | null) {
  if (!d) return ''
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

const emptyRow = { medicamento: '', dose: '', via: '', posologia: '' }

interface Props {
  patientId:          string
  initialPrescricoes: { ativas: Prescricao[]; inativas: Prescricao[] }
}

export default function PrescricoesPanel({ patientId, initialPrescricoes }: Props) {
  const [prescricoes, setPrescricoes] = useState(initialPrescricoes)
  const [adding,      setAdding]      = useState(false)
  const [newRow,      setNewRow]      = useState(emptyRow)
  const [showDrop,    setShowDrop]    = useState(false)
  const [tenantMeds,  setTenantMeds]  = useState<string[]>([])
  const [inativaOpen, setInativaOpen] = useState(false)
  const [isPending,   startTransition] = useTransition()
  const [error,       setError]       = useState('')
  const medRef  = useRef<HTMLInputElement>(null)
  const dropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getMedicamentosHistory().then(setTenantMeds)
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!dropRef.current?.contains(e.target as Node) &&
          !medRef.current?.contains(e.target as Node))
        setShowDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const allDrugs = Array.from(new Set([...tenantMeds, ...DRUG_LIST]))
  const q = newRow.medicamento.trim().toLowerCase()
  const suggestions = q.length >= 2
    ? allDrugs.filter(d => d.toLowerCase().includes(q)).slice(0, 8)
    : []

  function handleCancel() {
    setAdding(false)
    setNewRow(emptyRow)
    setError('')
  }

  function handleSalvar() {
    if (!newRow.medicamento.trim()) { setError('Medicamento é obrigatório.'); return }
    setError('')
    startTransition(async () => {
      const res = await createPrescricao(patientId, {
        medicamento: newRow.medicamento.trim(),
        dose:        newRow.dose.trim()      || undefined,
        via:         newRow.via              || undefined,
        posologia:   newRow.posologia.trim() || undefined,
      })
      if (!res.success) { setError(res.error); return }
      if (res.data) {
        setPrescricoes(prev => ({ ...prev, ativas: [res.data!, ...prev.ativas] }))
      }
      setAdding(false)
      setNewRow(emptyRow)
    })
  }

  function handleSuspender(id: string) {
    startTransition(async () => {
      const res = await inativarPrescricao(id)
      if (!res.success) { setError(res.error); return }
      setPrescricoes(prev => {
        const target = prev.ativas.find(p => p.id === id)
        if (!target) return prev
        return {
          ativas:   prev.ativas.filter(p => p.id !== id),
          inativas: [{ ...target, ativo: false, data_fim: new Date().toISOString().slice(0, 10) }, ...prev.inativas],
        }
      })
    })
  }

  const hasAtivas = prescricoes.ativas.length > 0

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-800">Medicamentos</h3>
          {hasAtivas && (
            <span className="text-[11px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">
              {prescricoes.ativas.length} {prescricoes.ativas.length === 1 ? 'ativo' : 'ativos'}
            </span>
          )}
        </div>
        {!adding && (
          <button
            type="button"
            onClick={() => { setAdding(true); setError('') }}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-primary/40 text-primary rounded-lg text-xs font-medium hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar
          </button>
        )}
      </div>

      {/* Erro global (fora do formulário) */}
      {error && !adding && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Estado vazio */}
      {!hasAtivas && !adding ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-sm gap-2">
          <CalendarX className="w-7 h-7 text-gray-300" />
          Nenhum medicamento ativo
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 overflow-hidden">
          {/* Cabeçalho da tabela */}
          <div
            className="grid items-center px-3 py-2 bg-gray-50 border-b border-gray-100"
            style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1.8fr auto' }}
          >
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Medicamento</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Dose</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Via</span>
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Posologia</span>
            <span />
          </div>

          {/* Linhas ativas */}
          <div className="divide-y divide-gray-50">
            {prescricoes.ativas.map(p => (
              <div
                key={p.id}
                className="grid items-center px-3 py-2.5 gap-2 hover:bg-gray-50/50 transition-colors"
                style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1.8fr auto' }}
              >
                <span className="text-sm font-medium text-gray-900 truncate">{p.medicamento}</span>
                <span className="text-sm text-gray-600">{p.dose || <span className="text-gray-300">—</span>}</span>
                <span className="text-sm text-gray-600">{p.via || <span className="text-gray-300">—</span>}</span>
                <span className="text-sm text-gray-600">{p.posologia || <span className="text-gray-300">—</span>}</span>
                <button
                  type="button"
                  onClick={() => handleSuspender(p.id)}
                  disabled={isPending}
                  className="text-[11px] font-medium text-gray-400 hover:text-red-600 border border-gray-200 hover:border-red-200 hover:bg-red-50 rounded-md px-2 py-1 transition-colors disabled:opacity-40 whitespace-nowrap"
                >
                  Suspender
                </button>
              </div>
            ))}

            {/* Linha de adição */}
            {adding && (
              <div
                className="grid items-start px-3 py-2.5 gap-2 bg-blue-50/40 border-t border-blue-100"
                style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1.8fr auto' }}
              >
                {/* Medicamento + autocomplete */}
                <div className="relative">
                  <input
                    ref={medRef}
                    type="text"
                    value={newRow.medicamento}
                    onChange={e => {
                      setNewRow(prev => ({ ...prev, medicamento: e.target.value }))
                      setShowDrop(true)
                    }}
                    onFocus={() => q.length >= 2 && setShowDrop(true)}
                    placeholder="Ex: Losartana"
                    autoComplete="off"
                    autoFocus
                    className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {showDrop && suggestions.length > 0 && (
                    <div
                      ref={dropRef}
                      className="absolute z-30 top-full mt-1 w-full min-w-[200px] bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                    >
                      <ul className="max-h-48 overflow-y-auto py-1">
                        {suggestions.map(drug => (
                          <li key={drug}>
                            <button
                              type="button"
                              onMouseDown={e => {
                                e.preventDefault()
                                setNewRow(prev => ({ ...prev, medicamento: drug }))
                                setShowDrop(false)
                              }}
                              className="w-full text-left px-3 py-1.5 text-sm text-gray-800 hover:bg-blue-50 hover:text-primary transition-colors"
                            >
                              {drug}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Dose */}
                <input
                  type="text"
                  value={newRow.dose}
                  onChange={e => setNewRow(prev => ({ ...prev, dose: e.target.value }))}
                  placeholder="50mg"
                  className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                />

                {/* Via */}
                <select
                  value={newRow.via}
                  onChange={e => setNewRow(prev => ({ ...prev, via: e.target.value }))}
                  className="w-full px-2 py-1.5 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 text-gray-700"
                >
                  <option value="">Via</option>
                  {VIA_OPTIONS.map(v => <option key={v} value={v}>{v}</option>)}
                </select>

                {/* Posologia */}
                <input
                  type="text"
                  value={newRow.posologia}
                  onChange={e => setNewRow(prev => ({ ...prev, posologia: e.target.value }))}
                  placeholder="1x ao dia"
                  onKeyDown={e => { if (e.key === 'Enter') handleSalvar() }}
                  className="w-full px-2.5 py-1.5 border border-blue-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/40"
                />

                {/* Ações */}
                <div className="flex items-center gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isPending}
                    className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSalvar}
                    disabled={isPending}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors whitespace-nowrap"
                  >
                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Salvar'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Erro dentro do formulário */}
          {error && adding && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border-t border-red-100 px-3 py-2 text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {/* Anteriores (accordion) */}
      {prescricoes.inativas.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setInativaOpen(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Anteriores ({prescricoes.inativas.length})
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${inativaOpen ? 'rotate-180' : ''}`} />
          </button>

          {inativaOpen && (
            <>
              <div
                className="grid items-center px-3 py-1.5 bg-gray-50/60 border-t border-gray-100"
                style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1.8fr 1.2fr' }}
              >
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Medicamento</span>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Dose</span>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Via</span>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Posologia</span>
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Período</span>
              </div>
              <div className="divide-y divide-gray-50">
                {prescricoes.inativas.map(p => (
                  <div
                    key={p.id}
                    className="grid items-center px-3 py-2 gap-2 opacity-60"
                    style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1.8fr 1.2fr' }}
                  >
                    <span className="text-sm text-gray-700 truncate">{p.medicamento}</span>
                    <span className="text-xs text-gray-500">{p.dose || '—'}</span>
                    <span className="text-xs text-gray-500">{p.via || '—'}</span>
                    <span className="text-xs text-gray-500">{p.posologia || '—'}</span>
                    <span className="text-[11px] text-gray-400 leading-tight">
                      {fmtDate(p.data_inicio)}
                      {p.data_fim && <><br />→ {fmtDate(p.data_fim)}</>}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
