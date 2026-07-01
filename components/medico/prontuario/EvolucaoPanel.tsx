'use client'

import { useState, useTransition, useEffect } from 'react'
import type { Consulta } from '@/lib/types'
import { salvarConsultaFields } from '@/app/actions/prontuario'
import { useUnsavedWarning } from '@/lib/hooks/useUnsavedWarning'
import { setProntuarioDirty } from '@/lib/prontuario-dirty'
import { Save, CheckCircle, Loader2, Lock, Activity, MessageSquare, Video, CalendarClock, ClipboardCopy } from 'lucide-react'
import { updateRetornoPrevisto } from '@/app/actions/profile'

const TELECONSULTA_TEXT = 'Teleconsulta a pedido do paciente. Exame físico não realizado.'

const RETORNO_OPCOES = [
  { label: 'Não definido', value: '' },
  { label: '30 dias',      value: '30d' },
  { label: '45 dias',      value: '45d' },
  { label: '3 meses',      value: '3m' },
  { label: '6 meses',      value: '6m' },
  { label: 'Outro...',     value: 'outro' },
]

function calcRetornoDate(opcao: string, outroValor?: number, outroUnidade?: 'dias' | 'meses'): string | null {
  if (!opcao) return null
  const d = new Date()
  if (opcao === '30d') d.setDate(d.getDate() + 30)
  else if (opcao === '45d') d.setDate(d.getDate() + 45)
  else if (opcao === '3m')  d.setMonth(d.getMonth() + 3)
  else if (opcao === '6m')  d.setMonth(d.getMonth() + 6)
  else if (opcao === 'outro' && outroValor && outroValor > 0) {
    if (outroUnidade === 'meses') d.setMonth(d.getMonth() + outroValor)
    else d.setDate(d.getDate() + outroValor)
  } else return null
  return d.toISOString().slice(0, 10)
}

function isTeleconsultaText(v: string) {
  return v.trim() === TELECONSULTA_TEXT
}

interface Props {
  consulta:          Consulta
  consultas:         Consulta[]
  isFinalized:       boolean
  patientId:         string
  retornoPrevisto?:  string | null
  onDirtyChange?:    (dirty: boolean) => void
  onRefresh?:        () => void
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

export default function EvolucaoPanel({ consulta, consultas, isFinalized, patientId, retornoPrevisto, onDirtyChange, onRefresh }: Props) {
  const [evolucao,    setEvolucao]    = useState(sanitizeForEdit(consulta.evolucao))
  const [exameFisico, setExameFisico] = useState(sanitizeForEdit(consulta.exame_fisico))
  const [pas,         setPas]         = useState(fmt(consulta.pas))
  const [pad,         setPad]         = useState(fmt(consulta.pad))
  const [fc,          setFc]          = useState(fmt(consulta.fc))
  const [impressao,   setImpressao]   = useState(sanitizeForEdit(consulta.impressao))
  const [conduta,     setConduta]     = useState(sanitizeForEdit(consulta.conduta))
  const [teleconsulta, setTeleconsulta] = useState(() => isTeleconsultaText(sanitizeForEdit(consulta.exame_fisico)))
  const [retornoOpcao, setRetornoOpcao]   = useState('')
  const [outroValor, setOutroValor]       = useState('')
  const [outroUnidade, setOutroUnidade]   = useState<'dias' | 'meses'>('dias')
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
    const ef = sanitizeForEdit(consulta.exame_fisico)
    setTeleconsulta(isTeleconsultaText(ef))
    setSaved(false)
    setError('')
    setRetornoOpcao('')
    setOutroValor('')
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
      onRefresh?.()
      setTimeout(() => setSaved(false), 3000)
      if (retornoOpcao) {
        const novaData = calcRetornoDate(retornoOpcao, Number(outroValor) || undefined, outroUnidade)
        updateRetornoPrevisto(patientId, novaData, {
          consultaId: consulta.id,
          notificar: true,
        }).catch(console.error)
      }
    })
  }

  const changed = () => setSaved(false)

  function toggleTeleconsulta() {
    if (teleconsulta) {
      setTeleconsulta(false)
      setExameFisico('')
      setPas(''); setPad(''); setFc('')
    } else {
      setTeleconsulta(true)
      setExameFisico(TELECONSULTA_TEXT)
      setPas(''); setPad(''); setFc('')
    }
    changed()
  }

  const carryImpressao = (() => {
    if (isFinalized) return null
    const currentImpressao = sanitizeForEdit(consulta.impressao)
    if (currentImpressao.trim()) return null
    const idx = consultas.findIndex(c => c.id === consulta.id)
    return consultas.slice(idx + 1).find(c => c.impressao?.trim()) ?? null
  })()

  // ── Modo leitura (finalizado) ─────────────────────────────
  if (isFinalized) {
    return (
      <div className="space-y-5">

        <ReadField label="Evolução" value={evolucao} />

        {/* Exame físico */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Exame físico
            {teleconsulta && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full text-[10px] font-semibold normal-case tracking-normal">
                <Video className="w-2.5 h-2.5" /> Teleconsulta
              </span>
            )}
          </p>
          {teleconsulta ? (
            <p className="text-xs text-violet-600 italic">{exameFisico}</p>
          ) : (
            <>
              {(consulta.pas != null || consulta.pad != null || consulta.fc != null) && (
                <div className="flex gap-6 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl">
                  <Vital label="PAS" value={consulta.pas} unit="mmHg" />
                  <Vital label="PAD" value={consulta.pad} unit="mmHg" />
                  <Vital label="FC"  value={consulta.fc}  unit="bpm"  />
                </div>
              )}
              <ReadField label="" value={exameFisico} />
            </>
          )}
          <VitaisHistorico consultas={consultas} currentId={consulta.id} />
        </div>

        <ReadField
          label="Impressão"
          value={impressao}
          labelExtra={<span className="text-[10px] text-gray-400 normal-case">(nota privada)</span>}
        />
        <ReadField label="Conduta" value={conduta} />

        {retornoPrevisto && (
          <div className="flex items-center gap-1.5 text-xs text-primary bg-blue-50 border border-primary/20 rounded-lg px-2.5 py-1.5">
            <CalendarClock className="w-3 h-3" />
            Retorno previsto: {new Date(retornoPrevisto + 'T12:00:00').toLocaleDateString('pt-BR')}
          </div>
        )}

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
      <div className={`space-y-2 border rounded-xl p-4 transition-colors ${teleconsulta ? 'border-violet-200 bg-violet-50/40' : 'border-gray-100 bg-gray-50/50'}`}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5" /> Exame físico
          </p>
          <button
            type="button"
            onClick={toggleTeleconsulta}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
              teleconsulta
                ? 'bg-violet-600 text-white border-violet-600'
                : 'bg-white text-violet-600 border-violet-300 hover:bg-violet-50'
            }`}
          >
            <Video className="w-3 h-3" />
            Teleconsulta
          </button>
        </div>

        {teleconsulta ? (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-violet-100 border border-violet-200 rounded-xl text-xs text-violet-700 font-medium">
            <Video className="w-3.5 h-3.5 flex-shrink-0" />
            Teleconsulta a pedido do paciente — exame físico não realizado
          </div>
        ) : (
          <>
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
          </>
        )}

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
        {carryImpressao && (
          <button
            type="button"
            onClick={() => { setImpressao(sanitizeForEdit(carryImpressao.impressao)); changed() }}
            className="flex items-center gap-2 w-full px-3 py-1.5 border border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 text-amber-700 rounded-lg text-xs font-medium transition-colors"
          >
            <ClipboardCopy className="w-3.5 h-3.5 flex-shrink-0" />
            Copiar impressão de {new Date(carryImpressao.data_hora).toLocaleDateString('pt-BR')}
            <span className="ml-auto text-gray-400 font-normal">carry-forward</span>
          </button>
        )}
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

      {/* ── Retorno previsto ── */}
      <div className="space-y-2 px-3 py-2.5 bg-blue-50/60 border border-primary/15 rounded-xl">
        <div className="flex items-center gap-3">
          <CalendarClock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span className="text-xs font-medium text-gray-600 whitespace-nowrap">Retorno em:</span>
          <select
            value={retornoOpcao}
            onChange={e => { setRetornoOpcao(e.target.value); setOutroValor('') }}
            className="flex-1 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {RETORNO_OPCOES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          {retornoPrevisto && !retornoOpcao && (
            <span className="text-[11px] text-gray-400 whitespace-nowrap">
              Atual: {new Date(retornoPrevisto + 'T12:00:00').toLocaleDateString('pt-BR')}
            </span>
          )}
        </div>

        {retornoOpcao === 'outro' && (
          <div className="flex items-center gap-2 pl-6">
            <input
              type="number"
              min={1}
              value={outroValor}
              onChange={e => setOutroValor(e.target.value)}
              placeholder="Ex: 60"
              className="w-20 text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button type="button" onClick={() => setOutroUnidade('dias')} className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${outroUnidade === 'dias' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'}`}>dias</button>
            <button type="button" onClick={() => setOutroUnidade('meses')} className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${outroUnidade === 'meses' ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200'}`}>meses</button>
          </div>
        )}
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
