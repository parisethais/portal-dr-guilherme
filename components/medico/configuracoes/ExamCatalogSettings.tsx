'use client'

import { useState, useTransition, useRef } from 'react'
import type { ExamDef } from '@/lib/lab-catalog'
import { toggleExamActive, deleteExam, createExam, updateExam } from '@/app/actions/exam-catalog'
import { cn } from '@/lib/utils'
import {
  Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  FlaskConical, AlertTriangle, X, Check, Loader2,
} from 'lucide-react'

type ExamWithId = ExamDef & { id: string; active: boolean }

interface Props {
  initialExams: ExamWithId[]
}

// ── Formulário de exame (create / edit) ────────────────────────────────────

const GROUPS = [
  'Função Renal', 'Hematologia', 'Metabolismo Ósseo', 'Glicemia',
  'Tireóide', 'Ferro', 'Proteínas Séricas', 'Lipídios', 'Fígado',
  'Vitaminas', 'Gasometria Venosa', 'Autoimune', 'Sorologias', 'Urina',
]

const EMPTY_FORM = {
  name: '', group: GROUPS[0], unit: '',
  qualitative: false, normalAnswer: '', noRef: false, higherBetter: false,
  refMin: '', refMax: '', warnLow: '', warnHigh: '', critLow: '', critHigh: '',
}

type FormState = typeof EMPTY_FORM

function toNum(v: string) { const n = parseFloat(v); return isNaN(n) ? undefined : n }

function ExamForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial?: FormState
  onSave: (data: FormState) => void
  onCancel: () => void
  saving: boolean
}) {
  const [form, setForm] = useState<FormState>(initial ?? EMPTY_FORM)
  const set = (k: keyof FormState, v: string | boolean) =>
    setForm(f => ({ ...f, [k]: v }))

  const valid = form.name.trim() && form.group && form.unit.trim()

  return (
    <div className="space-y-4">
      {/* Nome + Grupo */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Nome do exame *</label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            placeholder="ex: Creatinina"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Grupo *</label>
          <select
            value={form.group}
            onChange={e => set('group', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
          >
            {GROUPS.map(g => <option key={g}>{g}</option>)}
            <option value="__new__">+ Novo grupo...</option>
          </select>
        </div>
      </div>

      {/* Unidade + flags */}
      <div className="grid grid-cols-3 gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Unidade *</label>
          <input
            value={form.unit}
            onChange={e => set('unit', e.target.value)}
            placeholder="ex: mg/dL"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={form.qualitative} onChange={e => set('qualitative', e.target.checked)} className="rounded" />
          Qualitativo (pos/neg)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={form.higherBetter} onChange={e => set('higherBetter', e.target.checked)} className="rounded" />
          Maior = melhor
        </label>
      </div>

      {/* Resposta normal (qualitativo) */}
      {form.qualitative && (
        <div className="max-w-xs">
          <label className="block text-xs font-medium text-gray-600 mb-1">Resposta normal</label>
          <input
            value={form.normalAnswer}
            onChange={e => set('normalAnswer', e.target.value)}
            placeholder="ex: neg ou n.react"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
          />
        </div>
      )}

      {/* Faixas numéricas */}
      {!form.qualitative && (
        <div>
          <label className="flex items-center gap-2 text-sm text-gray-600 mb-3 cursor-pointer">
            <input type="checkbox" checked={form.noRef} onChange={e => set('noRef', e.target.checked)} className="rounded" />
            Sem faixa de referência (exame descritivo)
          </label>

          {!form.noRef && (
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-3 py-2 text-gray-500 font-medium w-32">Faixa</th>
                    <th className="text-center px-3 py-2 text-gray-500 font-medium">Mínimo</th>
                    <th className="text-center px-3 py-2 text-gray-500 font-medium">Máximo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[
                    { label: '🟢 Normal',  low: 'refMin',  high: 'refMax'  },
                    { label: '🟡 Atenção', low: 'warnLow', high: 'warnHigh' },
                    { label: '🔴 Crítico', low: 'critLow', high: 'critHigh' },
                  ].map(row => (
                    <tr key={row.label}>
                      <td className="px-3 py-2 font-medium text-gray-600">{row.label}</td>
                      {[row.low, row.high].map(field => (
                        <td key={field} className="px-3 py-1.5 text-center">
                          <input
                            type="number"
                            step="any"
                            value={form[field as keyof FormState] as string}
                            onChange={e => set(field as keyof FormState, e.target.value)}
                            placeholder="—"
                            className="w-24 text-center text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-200"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Botões */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={() => valid && onSave(form)}
          disabled={!valid || saving}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
            valid && !saving
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          )}
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Salvar
        </button>
      </div>
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────

export default function ExamCatalogSettings({ initialExams }: Props) {
  const [exams, setExams] = useState<ExamWithId[]>(initialExams)
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set([GROUPS[0]]))
  const [editingId, setEditingId] = useState<string | null>(null)
  const [addingGroup, setAddingGroup] = useState<string | null>(null)
  const [customGroups, setCustomGroups] = useState<string[]>([])
  const [newGroupInput, setNewGroupInput] = useState('')
  const [showNewGroupInput, setShowNewGroupInput] = useState(false)
  const [pending, startTransition] = useTransition()
  const [savingId, setSavingId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const toastRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const groups = [...new Set(exams.map(e => e.group).concat(GROUPS).concat(customGroups))].filter(
    g => g !== '__new__'
  )

  function showToast(msg: string) {
    setToast(msg)
    if (toastRef.current) clearTimeout(toastRef.current)
    toastRef.current = setTimeout(() => setToast(null), 3000)
  }

  function toggleGroup(g: string) {
    setOpenGroups(prev => {
      const next = new Set(prev)
      next.has(g) ? next.delete(g) : next.add(g)
      return next
    })
  }

  function handleToggleActive(exam: ExamWithId) {
    const next = !exam.active
    setExams(prev => prev.map(e => e.id === exam.id ? { ...e, active: next } : e))
    startTransition(async () => {
      const res = await toggleExamActive(exam.id, next)
      if (res.error) {
        setExams(prev => prev.map(e => e.id === exam.id ? { ...e, active: exam.active } : e))
        showToast('Erro ao atualizar.')
      }
    })
  }

  function handleDelete(exam: ExamWithId) {
    if (!confirm(`Remover "${exam.name}" do catálogo?`)) return
    setExams(prev => prev.filter(e => e.id !== exam.id))
    startTransition(async () => {
      const res = await deleteExam(exam.id)
      if (res.error) {
        setExams(prev => [...prev, exam])
        showToast('Erro ao remover.')
      } else {
        showToast(`"${exam.name}" removido.`)
      }
    })
  }

  function formToExamDef(form: FormState): ExamDef {
    return {
      name:         form.name.trim(),
      group:        form.group === '__new__' ? 'Outros' : form.group,
      unit:         form.unit.trim(),
      qualitative:  form.qualitative || undefined,
      normalAnswer: form.normalAnswer.trim() || undefined,
      noRef:        form.noRef || undefined,
      higherBetter: form.higherBetter || undefined,
      refMin:       toNum(form.refMin as string),
      refMax:       toNum(form.refMax as string),
      warnLow:      toNum(form.warnLow as string),
      warnHigh:     toNum(form.warnHigh as string),
      critLow:      toNum(form.critLow as string),
      critHigh:     toNum(form.critHigh as string),
    }
  }

  function examToForm(exam: ExamWithId): FormState {
    return {
      name:         exam.name,
      group:        exam.group,
      unit:         exam.unit,
      qualitative:  exam.qualitative ?? false,
      normalAnswer: exam.normalAnswer ?? '',
      noRef:        exam.noRef ?? false,
      higherBetter: exam.higherBetter ?? false,
      refMin:       exam.refMin?.toString() ?? '',
      refMax:       exam.refMax?.toString() ?? '',
      warnLow:      exam.warnLow?.toString() ?? '',
      warnHigh:     exam.warnHigh?.toString() ?? '',
      critLow:      exam.critLow?.toString() ?? '',
      critHigh:     exam.critHigh?.toString() ?? '',
    }
  }

  async function handleSaveEdit(form: FormState, exam: ExamWithId) {
    setSavingId(exam.id)
    const def = formToExamDef(form)
    const res = await updateExam(exam.id, def as ExamDef & { name: string; group: string; unit: string })
    setSavingId(null)
    if (res.error) { showToast('Erro ao salvar.'); return }
    setExams(prev => prev.map(e => e.id === exam.id ? { ...e, ...def } : e))
    setEditingId(null)
    showToast('Exame atualizado!')
  }

  async function handleCreate(form: FormState, group: string) {
    setSavingId('new')
    const def = formToExamDef({ ...form, group })
    const res = await createExam(def as ExamDef & { name: string; group: string; unit: string }, null, exams.filter(e => e.group === group).length)
    setSavingId(null)
    if (res.error) { showToast('Erro ao criar.'); return }
    // Refresh local state — server revalidated, but we reload the page data via router on next navigation
    setAddingGroup(null)
    showToast(`"${def.name}" adicionado!`)
    // Optimistic add with fake id (page will get real id on next load)
    setExams(prev => [...prev, { ...def, id: `tmp-${Date.now()}`, active: true }])
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-green-400" />
          {toast}
        </div>
      )}

      {/* Header da seção */}
      <div
        className="rounded-2xl overflow-hidden border border-white/60 p-6"
        style={{
          backdropFilter: 'blur(14px)',
          backgroundColor: 'rgba(255,255,255,0.72)',
          boxShadow: '0 2px 24px rgba(26,31,46,0.08)',
        }}
      >
        <div className="flex items-start justify-between mb-1">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5" style={{ color: '#7EB8D4' }} />
            <h2 className="text-base font-semibold text-gray-900">Catálogo de Exames Laboratoriais</h2>
          </div>
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {exams.filter(e => e.active).length} ativos · {exams.length} total
          </span>
        </div>
        <p className="text-sm text-gray-500 ml-7">
          Ative, desative, edite faixas de referência ou adicione novos exames ao seu protocolo.
        </p>

        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            Alterações nas faixas de referência afetam a classificação de valores <strong>novos</strong>.
            Resultados já lançados não são recalculados retroativamente.
          </p>
        </div>
      </div>

      {/* Grupos */}
      {groups.map(group => {
        const groupExams = exams.filter(e => e.group === group)
        if (groupExams.length === 0 && addingGroup !== group) return null
        const isOpen = openGroups.has(group)
        const activeCount = groupExams.filter(e => e.active).length

        return (
          <div
            key={group}
            className="rounded-2xl overflow-hidden border border-white/60"
            style={{
              backdropFilter: 'blur(14px)',
              backgroundColor: 'rgba(255,255,255,0.72)',
              boxShadow: '0 2px 24px rgba(26,31,46,0.06)',
            }}
          >
            {/* Cabeçalho do grupo */}
            <button
              onClick={() => toggleGroup(group)}
              className="w-full flex items-center justify-between px-6 py-4 hover:bg-black/[0.018] transition-colors"
            >
              <div className="flex items-center gap-3">
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                <span className="font-medium text-gray-800">{group}</span>
                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                  {activeCount}/{groupExams.length}
                </span>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setAddingGroup(group); setOpenGroups(prev => new Set([...prev, group])) }}
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </button>

            {/* Lista de exames */}
            {isOpen && (
              <div className="border-t border-black/[0.04]">
                {groupExams.map(exam => (
                  <div key={exam.id}>
                    {/* Linha do exame */}
                    {editingId !== exam.id && (
                      <div
                        className={cn(
                          'flex items-center gap-3 px-6 py-3 border-b border-black/[0.03] transition-colors',
                          !exam.active && 'opacity-50'
                        )}
                      >
                        {/* Toggle ativo */}
                        <button
                          onClick={() => handleToggleActive(exam)}
                          className={cn(
                            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
                            exam.active ? 'bg-blue-500' : 'bg-gray-200'
                          )}
                        >
                          <span className={cn(
                            'inline-block h-4 w-4 rounded-full bg-white shadow transform ring-0 transition duration-200',
                            exam.active ? 'translate-x-4' : 'translate-x-0'
                          )} />
                        </button>

                        {/* Nome e info */}
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium text-gray-800">{exam.name}</span>
                          <span className="ml-2 text-xs text-gray-400">{exam.unit}</span>
                          {exam.qualitative && (
                            <span className="ml-2 text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">qualitativo</span>
                          )}
                        </div>

                        {/* Faixas resumidas */}
                        {!exam.qualitative && !exam.noRef && (
                          <div className="hidden lg:flex items-center gap-3 text-xs text-gray-400">
                            {exam.refMin != null && <span>Normal ≥ {exam.refMin}</span>}
                            {exam.refMax != null && <span>Normal ≤ {exam.refMax}</span>}
                            {exam.critHigh != null && <span className="text-red-400">Crítico ≥ {exam.critHigh}</span>}
                            {exam.critLow != null && <span className="text-red-400">Crítico ≤ {exam.critLow}</span>}
                          </div>
                        )}

                        {/* Ações */}
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={() => setEditingId(exam.id)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(exam)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Formulário de edição inline */}
                    {editingId === exam.id && (
                      <div className="px-6 py-4 bg-blue-50/40 border-b border-blue-100">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-gray-700">Editando: {exam.name}</span>
                          <button onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                          </button>
                        </div>
                        <ExamForm
                          initial={examToForm(exam)}
                          onSave={form => handleSaveEdit(form, exam)}
                          onCancel={() => setEditingId(null)}
                          saving={savingId === exam.id}
                        />
                      </div>
                    )}
                  </div>
                ))}

                {/* Formulário de criação */}
                {addingGroup === group && (
                  <div className="px-6 py-4 bg-green-50/40 border-t border-green-100">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Novo exame em {group}</span>
                      <button onClick={() => setAddingGroup(null)}>
                        <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                      </button>
                    </div>
                    <ExamForm
                      initial={{ ...EMPTY_FORM, group }}
                      onSave={form => handleCreate(form, group)}
                      onCancel={() => setAddingGroup(null)}
                      saving={savingId === 'new'}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* Adicionar novo grupo */}
      {showNewGroupInput ? (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-blue-200 bg-blue-50/40">
          <input
            autoFocus
            value={newGroupInput}
            onChange={e => setNewGroupInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                const name = newGroupInput.trim()
                if (!name) return
                setCustomGroups(prev => [...prev, name])
                setAddingGroup(name)
                setOpenGroups(prev => new Set([...prev, name]))
                setNewGroupInput('')
                setShowNewGroupInput(false)
              }
              if (e.key === 'Escape') {
                setNewGroupInput('')
                setShowNewGroupInput(false)
              }
            }}
            placeholder="Nome do novo grupo..."
            className="flex-1 text-sm bg-transparent border-none outline-none text-gray-700 placeholder-gray-400"
          />
          <button
            onClick={() => {
              const name = newGroupInput.trim()
              if (!name) return
              setCustomGroups(prev => [...prev, name])
              setAddingGroup(name)
              setOpenGroups(prev => new Set([...prev, name]))
              setNewGroupInput('')
              setShowNewGroupInput(false)
            }}
            disabled={!newGroupInput.trim()}
            className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            Criar
          </button>
          <button
            onClick={() => { setNewGroupInput(''); setShowNewGroupInput(false) }}
            className="p-1.5 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowNewGroupInput(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-gray-200 text-sm text-gray-400 hover:border-blue-300 hover:text-blue-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar novo grupo de exames
        </button>
      )}
    </div>
  )
}
