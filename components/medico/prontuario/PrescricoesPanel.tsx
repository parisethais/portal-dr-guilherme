'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import type { Prescricao } from '@/lib/types'
import { createPrescricao, inativarPrescricao } from '@/app/actions/prescricoes'
import {
  Pill, Plus, X, ChevronDown, Loader2, AlertCircle, CalendarX,
} from 'lucide-react'

const DRUG_LIST = [
  // Anti-hipertensivos
  'Losartana', 'Valsartana', 'Olmesartana', 'Irbesartana', 'Telmisartana', 'Candesartana',
  'Enalapril', 'Lisinopril', 'Ramipril', 'Captopril', 'Perindopril', 'Benazepril',
  'Anlodipino', 'Nifedipino', 'Verapamil', 'Diltiazem',
  'Atenolol', 'Carvedilol', 'Metoprolol', 'Bisoprolol', 'Propranolol', 'Nebivolol',
  'Hidroclorotiazida', 'Clortalidona', 'Furosemida', 'Espironolactona', 'Eplerenona', 'Indapamida',
  'Alfametildopa', 'Clonidina', 'Doxazosina', 'Prazosina', 'Hidralazina', 'Minoxidil',
  'Sacubitril/Valsartana',
  // Diuréticos
  'Acetazolamida', 'Amilorida', 'Triamtereno', 'Tolvaptana',
  // Metabolismo ósseo / mineral
  'Carbonato de cálcio', 'Acetato de cálcio', 'Sevelâmer', 'Carbonato de lantânio',
  'Colecalciferol', 'Calcitriol', 'Paricalcitol', 'Alfacalcidol',
  'Cinacalcete',
  // Anemia
  'Eritropoetina', 'Darbepoetina alfa', 'Ferro sacarato IV', 'Sulfato ferroso', 'Ferro polimaltosado',
  // Uremia / diálise
  'Bicarbonato de sódio',
  // Hipopotassemia/Hiperpotassemia
  'Cloreto de potássio', 'Patirômer', 'Zirconium ciclossilicato de sódio',
  // Ácido úrico
  'Alopurinol', 'Febuxostato', 'Benzbromarona',
  // Diabetes
  'Metformina', 'Empagliflozina', 'Dapagliflozina', 'Canagliflozina',
  'Semaglutida', 'Liraglutida', 'Dulaglutida', 'Sitagliptina', 'Saxagliptina',
  'Glibenclamida', 'Glimepirida', 'Insulina NPH', 'Insulina Regular', 'Insulina Glargina', 'Insulina Degludeca',
  // Dislipidemia
  'Atorvastatina', 'Rosuvastatina', 'Sinvastatina', 'Pravastatina', 'Ezetimiba', 'Bezafibrato', 'Fenofibrato',
  // Imunossupressores (transplante)
  'Tacrolimus', 'Ciclosporina', 'Micofenolato mofetil', 'Azatioprina', 'Prednisona', 'Metilprednisolona',
  'Sirolimus', 'Everolimus', 'Belatacept',
  // Anticoagulantes
  'Warfarina', 'Rivaroxabana', 'Apixabana', 'Heparina', 'Enoxaparina',
  // Outros
  'Ácido fólico', 'Vitamina B12', 'Hidróxido de magnésio', 'Omeprazol', 'Pantoprazol',
  'Amoxicilina', 'Nitrofurantoína', 'Ciprofloxacino', 'Cotrimoxazol',
]

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    day:   '2-digit',
    month: '2-digit',
    year:  'numeric',
  })
}

interface Props {
  patientId:            string
  initialPrescricoes:   { ativas: Prescricao[]; inativas: Prescricao[] }
}

const emptyForm = {
  medicamento: '',
  dose:        '',
  posologia:   '',
  obs:         '',
  data_inicio: new Date().toISOString().slice(0, 10),
}

export default function PrescricoesPanel({ patientId, initialPrescricoes }: Props) {
  const [prescricoes, setPrescricoes] = useState(initialPrescricoes)
  const [showForm,    setShowForm]    = useState(false)
  const [form,        setForm]        = useState(emptyForm)
  const [isPending,   startTransition] = useTransition()
  const [error,       setError]       = useState('')
  const [inativaOpen, setInativaOpen] = useState(false)
  const [showDrugDropdown, setShowDrugDropdown] = useState(false)
  const medicamentoRef  = useRef<HTMLInputElement>(null)
  const drugDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (!drugDropdownRef.current?.contains(e.target as Node) &&
          !medicamentoRef.current?.contains(e.target as Node))
        setShowDrugDropdown(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const drugQ = form.medicamento.trim().toLowerCase()
  const drugSuggestions = drugQ.length >= 2
    ? DRUG_LIST.filter(d => d.toLowerCase().includes(drugQ)).slice(0, 8)
    : []

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleCancel() {
    setShowForm(false)
    setForm(emptyForm)
    setError('')
  }

  function handleSalvar() {
    if (!form.medicamento.trim()) { setError('Medicamento é obrigatório.'); return }
    setError('')
    startTransition(async () => {
      const res = await createPrescricao(patientId, {
        medicamento: form.medicamento.trim(),
        dose:        form.dose.trim()        || undefined,
        posologia:   form.posologia.trim()   || undefined,
        obs:         form.obs.trim()         || undefined,
        data_inicio: form.data_inicio        || undefined,
      })
      if (!res.success) { setError(res.error); return }
      if (res.data) {
        setPrescricoes(prev => ({
          ativas:   [res.data!, ...prev.ativas],
          inativas: prev.inativas,
        }))
      }
      setShowForm(false)
      setForm(emptyForm)
    })
  }

  function handleSuspender(id: string) {
    startTransition(async () => {
      const res = await inativarPrescricao(id)
      if (!res.success) { setError(res.error); return }
      setPrescricoes(prev => {
        const target = prev.ativas.find(p => p.id === id)
        if (!target) return prev
        const suspended: Prescricao = {
          ...target,
          ativo:    false,
          data_fim: new Date().toISOString().slice(0, 10),
        }
        return {
          ativas:   prev.ativas.filter(p => p.id !== id),
          inativas: [suspended, ...prev.inativas],
        }
      })
    })
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Pill className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold text-gray-800">Prescrições</h3>
        </div>
        {!showForm && (
          <button
            type="button"
            onClick={() => { setShowForm(true); setError('') }}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-primary/40 text-primary rounded-lg text-xs font-medium hover:bg-primary/5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova prescrição
          </button>
        )}
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-blue-700">Nova prescrição</p>
            <button
              type="button"
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* medicamento */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Medicamento <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <input
                ref={medicamentoRef}
                type="text"
                name="medicamento"
                value={form.medicamento}
                onChange={e => { handleChange(e); setShowDrugDropdown(true) }}
                onFocus={() => drugQ.length >= 2 && setShowDrugDropdown(true)}
                placeholder="Ex: Losartana"
                autoComplete="off"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {showDrugDropdown && drugSuggestions.length > 0 && (
                <div ref={drugDropdownRef} className="absolute z-20 top-full mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                  <ul className="max-h-48 overflow-y-auto py-1">
                    {drugSuggestions.map(drug => (
                      <li key={drug}>
                        <button
                          type="button"
                          onMouseDown={e => {
                            e.preventDefault()
                            setForm(prev => ({ ...prev, medicamento: drug }))
                            setShowDrugDropdown(false)
                          }}
                          className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-blue-50 hover:text-primary transition-colors"
                        >
                          {drug}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* dose + posologia */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Dose
              </label>
              <input
                type="text"
                name="dose"
                value={form.dose}
                onChange={handleChange}
                placeholder="Ex: 50mg"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Posologia
              </label>
              <input
                type="text"
                name="posologia"
                value={form.posologia}
                onChange={handleChange}
                placeholder="Ex: 1x ao dia"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* data inicio */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Data de início
            </label>
            <input
              type="date"
              name="data_inicio"
              value={form.data_inicio}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* obs */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Observações
            </label>
            <textarea
              name="obs"
              value={form.obs}
              onChange={handleChange}
              rows={2}
              placeholder="Observações (opcional)"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {/* erro */}
          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* botões */}
          <div className="flex gap-2 justify-end pt-1">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isPending}
              className="px-4 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSalvar}
              disabled={isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPending
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Salvando…</>
                : 'Salvar'
              }
            </button>
          </div>
        </div>
      )}

      {/* Erro global (suspender) */}
      {!showForm && error && (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Lista ativas */}
      {prescricoes.ativas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-gray-400 text-sm gap-2">
          <CalendarX className="w-7 h-7 text-gray-300" />
          Nenhuma prescrição ativa
        </div>
      ) : (
        <div className="space-y-2">
          {prescricoes.ativas.map(p => (
            <div
              key={p.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{p.medicamento}</p>
                {(p.dose || p.posologia) && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {[p.dose, p.posologia].filter(Boolean).join(' — ')}
                  </p>
                )}
                <p className="text-[11px] text-gray-400 mt-1">
                  Início: {fmtDate(p.data_inicio)}
                </p>
                {p.obs && (
                  <p className="text-[11px] text-gray-400 italic mt-0.5">{p.obs}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSuspender(p.id)}
                disabled={isPending}
                className="flex-shrink-0 px-2.5 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                Suspender
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Seção anteriores (accordion) */}
      {prescricoes.inativas.length > 0 && (
        <div className="border border-gray-100 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setInativaOpen(prev => !prev)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
          >
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Anteriores ({prescricoes.inativas.length})
            </span>
            <ChevronDown
              className={`w-4 h-4 text-gray-400 transition-transform ${inativaOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {inativaOpen && (
            <div className="divide-y divide-gray-100">
              {prescricoes.inativas.map(p => (
                <div
                  key={p.id}
                  className="px-4 py-3 opacity-60"
                >
                  <p className="text-sm font-medium text-gray-700">{p.medicamento}</p>
                  {(p.dose || p.posologia) && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      {[p.dose, p.posologia].filter(Boolean).join(' — ')}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1">
                    {fmtDate(p.data_inicio)}
                    {p.data_fim ? ` → ${fmtDate(p.data_fim)}` : ''}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
