'use client'

import { useState, useTransition, useEffect } from 'react'
import type { Consulta } from '@/lib/types'
import { salvarConsultaFields } from '@/app/actions/prontuario'
import { useUnsavedWarning } from '@/lib/hooks/useUnsavedWarning'
import { setProntuarioDirty } from '@/lib/prontuario-dirty'
import { Save, CheckCircle, Loader2, Lock, Activity, MessageSquare } from 'lucide-react'

interface Props {
  consulta:       Consulta
  consultas:      Consulta[]
  isFinalized:    boolean
  onDirtyChange?: (dirty: boolean) => void
}

function fmt(v: number | null | undefined) {
  return v != null ? String(v) : ''
}

function VitalInput({
  label, unit, value, onChange, disabled,
}: {
  label: string; unit: string; value: string
  onChange: (v: string) => void; disabled: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary bg-white">
        <input
          type="number"
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          placeholder="—"
          className="w-16 px-2.5 py-2 text-sm font-semibold text-gray-900 bg-transparent focus:outline-none disabled:text-gray-400 disabled:bg-gray-50"
        />
        <span className="pr-2.5 text-xs text-gray-400 flex-shrink-0">{unit}</span>
      </div>
    </div>
  )
}

// Tabela comparativa de sinais vitais das últimas consultas
function VitaisHistorico({ consultas, currentId }: { consultas: Consulta[]; currentId: string }) {
  const comVitais = consultas
    .filter(c => c.id !== currentId && (c.pas != null || c.pad != null || c.fc != null))
    .sort((a, b) => b.data_hora.localeCompare(a.data_hora))
    .slice(0, 5)

  if (comVitais.length === 0) return null

  return (
    <div className="mt-3 rounded-xl border border-gray-100 overflow-hidden">
      <div className="bg-gray-50 px-3 py-1.5 border-b border-gray-100">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Histórico de sinais vitais</p>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left px-3 py-1.5 text-gray-400 font-semibold">Data</th>
            <th className="text-center px-3 py-1.5 text-gray-400 font-semibold">PAS</th>
            <th className="text-center px-3 py-1.5 text-gray-400 font-semibold">PAD</th>
            <th className="text-center px-3 py-1.5 text-gray-400 font-semibold">FC</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {comVitais.map(c => {
            const d = new Date(c.data_hora)
            const data = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
            return (
              <tr key={c.id} className="hover:bg-gray-50/60">
                <td className="px-3 py-1.5 text-gray-500">{data}</td>
                <td className="px-3 py-1.5 text-center font-medium text-gray-700">
                  {c.pas != null ? `${c.pas}` : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-1.5 text-center font-medium text-gray-700">
                  {c.pad != null ? `${c.pad}` : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-1.5 text-center font-medium text-gray-700">
                  {c.fc != null ? `${c.fc}` : <span className="text-gray-300">—</span>}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function sanitizeForEdit(value: string | null | undefined): string {
  if (!value) return ''
  // Se vier HTML do iClinic, converte para texto puro para edição
  return isHtml(value) ? stripHtml(value) : value
}

export default function EvolucaoPanel({ consulta, consultas, isFinalized, onDirtyChange }: Props) {
  const [evolucao,    setEvolucao]    = useState(sanitizeForEdit(consulta.evolucao))
  const [exameFisico, setExameFisico] = useState(sanitizeForEdit(consulta.exame_fisico))
  const [pas,         setPas]         = useState(fmt(consulta.pas))
  const [pad,         setPad]         = useState(fmt(consulta.pad))
  const [fc,          setFc]          = useState(fmt(consulta.fc))
  const [impressao,   setImpressao]   = useState(sanitizeForEdit(consulta.impressao))
  const [conduta,     setConduta]     = useState(sanitizeForEdit(consulta.conduta))
  const [saved,       setSaved]       = useState(false)
  const [error,       setError]       = useState('')
  const [isPending,   startTransition] = useTransition()

  // ── Detecção de alterações não salvas ─────────────────────────
  const isDirty = !isFinalized && (
    evolucao    !== (consulta.evolucao      ?? '') ||
    exameFisico !== (consulta.exame_fisico  ?? '') ||
    pas         !== fmt(consulta.pas)              ||
    pad         !== fmt(consulta.pad)              ||
    fc          !== fmt(consulta.fc)               ||
    impressao   !== (consulta.impressao     ?? '') ||
    conduta     !== (consulta.conduta       ?? '')
  )

  useUnsavedWarning(isDirty)

  useEffect(() => {
    setProntuarioDirty(isDirty)
    onDirtyChange?.(isDirty)
  }, [isDirty]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setEvolucao(sanitizeForEdit(consulta.evolucao))
    setExameFisico(sanitizeForEdit(consulta.exame_fisico))
    setPas(fmt(consulta.pas))
    setPad(fmt(consulta.pad))
    setFc(fmt(consulta.fc))
    setImpressao(sanitizeForEdit(consulta.impressao))
    setConduta(sanitizeForEdit(consulta.conduta))
    setSaved(false)
    setError('')
  }, [consulta.id])

  function handleSave() {
    setError('')
    startTransition(async () => {
      const res = await salvarConsultaFields(consulta.id, {
        evolucao,
        exame_fisico: exameFisico || null,
        pas:  pas  ? parseInt(pas)  : null,
        pad:  pad  ? parseInt(pad)  : null,
        fc:   fc   ? parseInt(fc)   : null,
        impressao: impressao || null,
        conduta,
      })
      if (!res.success) { setError(res.error); return }
      setSaved(true)
      onDirtyChange?.(false)
      setTimeout(() => setSaved(false), 3000)
    })
  }

  const changed = () => setSaved(false)

  // ── Modo leitura (finalizado) ─────────────────────────────
  if (isFinalized) {
    return (
      <div className="space-y-5">

        <ReadField label="Evolução" value={evolucao} />

        {/* Exame físico */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Exame físico
          </p>
          {(consulta.pas != null || consulta.pad != null || consulta.fc != null) && (
            <div className="flex gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
              <Vital label="PAS" value={consulta.pas} unit="mmHg" />
              <Vital label="PAD" value={consulta.pad} unit="mmHg" />
              <Vital label="FC"  value={consulta.fc}  unit="bpm"  />
            </div>
          )}
          <ReadField label="" value={exameFisico} />
          <VitaisHistorico consultas={consultas} currentId={consulta.id} />
        </div>

        <ReadField
          label="Impressão"
          value={impressao}
          labelExtra={<span className="text-[10px] text-gray-400 normal-case">(nota privada)</span>}
        />
        <ReadField label="Conduta" value={conduta} />

        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Lock className="w-3 h-3" />
          Prontuário finalizado · campos somente leitura
        </div>
      </div>
    )
  }

  // ── Modo edição ───────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* Evolução */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Evolução
        </label>
        <textarea
          value={evolucao}
          onChange={e => { setEvolucao(e.target.value); changed() }}
          rows={5}
          placeholder="Queixas do paciente, história atual..."
          className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Exame físico */}
      <div className="space-y-2 border border-gray-100 rounded-xl p-4 bg-gray-50/50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5" /> Exame físico
        </p>

        {/* Sinais vitais */}
        <div className="flex items-end gap-3">
          <VitalInput label="PAS" unit="mmHg" value={pas} onChange={v => { setPas(v); changed() }} disabled={false} />
          <VitalInput label="PAD" unit="mmHg" value={pad} onChange={v => { setPad(v); changed() }} disabled={false} />
          <VitalInput label="FC"  unit="bpm"  value={fc}  onChange={v => { setFc(v);  changed() }} disabled={false} />
        </div>

        {/* Alterações físicas */}
        <textarea
          value={exameFisico}
          onChange={e => { setExameFisico(e.target.value); changed() }}
          rows={3}
          placeholder="Alterações físicas ao exame..."
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-white"
        />

        {/* Histórico comparativo */}
        <VitaisHistorico consultas={consultas} currentId={consulta.id} />
      </div>

      {/* Impressão (privada) */}
      <div className="space-y-1.5">
        <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
          <MessageSquare className="w-3.5 h-3.5" />
          Impressão
          <span className="text-[10px] text-gray-400 normal-case font-normal">— nota privada do médico</span>
        </label>
        <textarea
          value={impressao}
          onChange={e => { setImpressao(e.target.value); changed() }}
          rows={3}
          placeholder="Suas impressões clínicas, hipóteses, observações pessoais..."
          className="w-full px-3 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-900 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary bg-amber-50/30 italic placeholder:not-italic"
        />
      </div>

      {/* Conduta */}
      <div className="space-y-1.5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
          Conduta
        </label>
        <textarea
          value={conduta}
          onChange={e => { setConduta(e.target.value); changed() }}
          rows={5}
          placeholder={`1. Manter losartana 50mg 1x/dia\n2. Solicitar creatinina, ureia e potássio\n3. Retorno em 3 meses`}
          className="w-full px-3 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex justify-end">
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

// ── Helpers de leitura ────────────────────────────────────────
function isHtml(text: string) { return /<[a-z][\s\S]*?>/i.test(text) }
function stripHtml(text: string) { return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() }

function preprocessIclinicHtml(html: string): string {
  return html
    .replace(/\*\*\s*(.*?)\s*\*\*/g, (_, t) => t ? `<strong>${t}</strong>` : '')
    .replace(/(?<!\*)\*(?!\*)([^*\n]+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
}

function ReadField({ label, value, labelExtra }: { label: string; value: string; labelExtra?: React.ReactNode }) {
  if (!label && !value) return null
  const hasHtml = value && isHtml(value)
  return (
    <div className="space-y-1.5">
      {label && (
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
          {label} {labelExtra}
        </p>
      )}
      {value ? (
        hasHtml ? (
          <div
            className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 leading-relaxed prose prose-sm max-w-none [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_li]:my-0.5 [&_p]:my-0.5 [&_strong]:font-semibold [&_em]:text-gray-500"
            dangerouslySetInnerHTML={{ __html: preprocessIclinicHtml(value) }}
          />
        ) : (
          <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
            {value}
          </div>
        )
      ) : (
        <div className="px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl text-sm text-gray-400 italic">
          Não preenchido.
        </div>
      )}
    </div>
  )
}

function Vital({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-lg font-bold text-gray-800 leading-tight">
        {value != null ? value : <span className="text-gray-300 text-sm">—</span>}
      </p>
      <p className="text-[10px] text-gray-400">{unit}</p>
    </div>
  )
}
