'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  getPatientGoal, upsertPatientGoal,
  getPatientCheckins, createCheckin, deleteCheckin,
} from '@/app/actions/monitoring'
import type { PatientGoal, PatientCheckin, AdesaoStatus, CheckinChannel } from '@/app/actions/monitoring'
import { cn } from '@/lib/utils'
import {
  Target, Plus, Pencil, Check, X, Trash2, Loader2,
  MessageSquare, Phone, Wifi, User, Copy, CheckCheck,
  Activity, Scale, Heart, ClipboardList,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

const CHANNEL_LABELS: Record<CheckinChannel, { label: string; icon: React.ReactNode; color: string }> = {
  whatsapp:   { label: 'WhatsApp',   icon: <MessageSquare className="w-3 h-3" />, color: '#22c55e' },
  portal:     { label: 'Portal',     icon: <Wifi          className="w-3 h-3" />, color: '#2D2B6B' },
  telefone:   { label: 'Telefone',   icon: <Phone         className="w-3 h-3" />, color: '#B8943F' },
  presencial: { label: 'Presencial', icon: <User          className="w-3 h-3" />, color: '#7A9E7E' },
}

const ADESAO_LABELS: Record<AdesaoStatus, { label: string; color: string }> = {
  sim:           { label: 'Sim',      color: '#4E7A52' },
  parcial:       { label: 'Parcial',  color: '#B8943F' },
  nao:           { label: 'Não',      color: '#C17070' },
  nao_informado: { label: '—',        color: '#9CA3AF' },
}

// ── GoalsCard ─────────────────────────────────────────────────────────────

function GoalsCard({ patientId }: { patientId: string }) {
  const [goal,    setGoal]    = useState<PatientGoal | null>(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState({
    pa_alvo: '', peso_alvo_kg: '', frequencia: 'quinzenal' as PatientGoal['frequencia'],
    indicadores_extras: '', notas: '',
  })

  useEffect(() => {
    getPatientGoal(patientId).then(g => {
      setGoal(g)
      if (g) setForm({
        pa_alvo:             g.pa_alvo             ?? '',
        peso_alvo_kg:        g.peso_alvo_kg != null ? String(g.peso_alvo_kg) : '',
        frequencia:          g.frequencia,
        indicadores_extras:  g.indicadores_extras   ?? '',
        notas:               g.notas                ?? '',
      })
      setLoading(false)
    })
  }, [patientId])

  async function handleSave() {
    setSaving(true)
    const res = await upsertPatientGoal({
      patient_id:         patientId,
      pa_alvo:            form.pa_alvo.trim()             || undefined,
      peso_alvo_kg:       form.peso_alvo_kg ? parseFloat(form.peso_alvo_kg) : null,
      frequencia:         form.frequencia,
      indicadores_extras: form.indicadores_extras.trim()  || undefined,
      notas:              form.notas.trim()                || undefined,
    })
    setSaving(false)
    if (res.error) { alert(res.error); return }
    const updated = await getPatientGoal(patientId)
    setGoal(updated)
    setEditing(false)
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-gray-400 py-4">
      <Loader2 className="w-4 h-4 animate-spin" /> Carregando metas…
    </div>
  )

  return (
    <div className="rounded-xl border border-white/60 p-4"
      style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,255,255,0.80)', boxShadow: '0 2px 12px rgba(26,31,46,0.06)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(45,43,107,0.08)' }}>
            <Target className="w-4 h-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Metas do paciente</h3>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            {goal ? 'Editar' : 'Definir metas'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                <Heart className="w-3 h-3 text-rose-400" /> PA alvo
              </label>
              <input
                value={form.pa_alvo}
                onChange={e => setForm(f => ({ ...f, pa_alvo: e.target.value }))}
                placeholder="ex: < 130/80 mmHg"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
                <Scale className="w-3 h-3 text-blue-400" /> Peso alvo (kg)
              </label>
              <input
                type="number"
                step="0.1"
                value={form.peso_alvo_kg}
                onChange={e => setForm(f => ({ ...f, peso_alvo_kg: e.target.value }))}
                placeholder="ex: 72.5"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Frequência de check-in</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
              {(['semanal', 'quinzenal', 'mensal'] as const).map(f => (
                <button key={f} onClick={() => setForm(v => ({ ...v, frequencia: f }))}
                  className={cn('flex-1 py-2 font-medium transition-colors capitalize',
                    form.frequencia === f ? 'bg-primary text-white' : 'text-gray-500 hover:bg-gray-50')}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
              <Activity className="w-3 h-3 text-amber-400" /> Outros indicadores a monitorar
            </label>
            <input
              value={form.indicadores_extras}
              onChange={e => setForm(f => ({ ...f, indicadores_extras: e.target.value }))}
              placeholder="ex: edema, adesão à dieta hipossódica, sintomas urêmicos…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
            <textarea
              rows={2}
              value={form.notas}
              onChange={e => setForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Orientações específicas para o acompanhamento deste paciente…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Salvar
            </button>
          </div>
        </div>
      ) : goal ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {goal.pa_alvo && (
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(193,112,112,0.07)' }}>
              <p className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Heart className="w-3 h-3 text-rose-400" /> PA alvo</p>
              <p className="text-sm font-semibold text-gray-800">{goal.pa_alvo}</p>
            </div>
          )}
          {goal.peso_alvo_kg != null && (
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(45,43,107,0.06)' }}>
              <p className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Scale className="w-3 h-3 text-blue-400" /> Peso alvo</p>
              <p className="text-sm font-semibold text-gray-800">{goal.peso_alvo_kg} kg</p>
            </div>
          )}
          <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(122,158,126,0.08)' }}>
            <p className="text-xs text-gray-400 mb-1">Check-in</p>
            <p className="text-sm font-semibold text-gray-800 capitalize">{goal.frequencia}</p>
          </div>
          {goal.indicadores_extras && (
            <div className="col-span-2 sm:col-span-1 rounded-lg p-3" style={{ backgroundColor: 'rgba(184,148,63,0.07)' }}>
              <p className="text-xs text-gray-400 flex items-center gap-1 mb-1"><Activity className="w-3 h-3 text-amber-400" /> Outros</p>
              <p className="text-xs text-gray-700 leading-relaxed">{goal.indicadores_extras}</p>
            </div>
          )}
          {goal.notas && (
            <div className="col-span-2 sm:col-span-4 text-xs text-gray-500 italic border-t border-gray-100 pt-2 mt-1">
              {goal.notas}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-400 italic">Nenhuma meta definida ainda. Clique em "Definir metas" para começar.</p>
      )}
    </div>
  )
}

// ── CheckinForm ───────────────────────────────────────────────────────────

const EMPTY_CHECKIN = {
  checkin_date:     new Date().toISOString().slice(0, 10),
  channel:          'whatsapp' as CheckinChannel,
  peso_kg:          '',
  pa_sistolica:     '',
  pa_diastolica:    '',
  aderiu_dieta:     'nao_informado' as AdesaoStatus,
  aderiu_medicacao: 'nao_informado' as AdesaoStatus,
  sintomas:         '',
  notas:            '',
}

function CheckinForm({
  patientId, onSaved, onCancel,
}: { patientId: string; onSaved: (c: PatientCheckin) => void; onCancel: () => void }) {
  const [form,   setForm]   = useState({ ...EMPTY_CHECKIN })
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof typeof EMPTY_CHECKIN>(k: K, v: (typeof EMPTY_CHECKIN)[K]) =>
    setForm(f => ({ ...f, [k]: v }))

  async function handleSave() {
    setSaving(true)
    const res = await createCheckin({
      patient_id:       patientId,
      checkin_date:     form.checkin_date,
      channel:          form.channel,
      peso_kg:          form.peso_kg          ? parseFloat(form.peso_kg)      : null,
      pa_sistolica:     form.pa_sistolica     ? parseInt(form.pa_sistolica)   : null,
      pa_diastolica:    form.pa_diastolica    ? parseInt(form.pa_diastolica)  : null,
      aderiu_dieta:     form.aderiu_dieta,
      aderiu_medicacao: form.aderiu_medicacao,
      sintomas:         form.sintomas.trim()  || undefined,
      notas:            form.notas.trim()     || undefined,
    })
    setSaving(false)
    if (res.error) { alert(res.error); return }
    // Recarrega o check-in criado — retorna um fake otimista
    const fake: PatientCheckin = {
      id: `tmp-${Date.now()}`,
      patient_id: patientId,
      clinic_id: null,
      doctor_id: '',
      recorded_by: null,
      checkin_date: form.checkin_date,
      channel: form.channel,
      peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : null,
      pa_sistolica: form.pa_sistolica ? parseInt(form.pa_sistolica) : null,
      pa_diastolica: form.pa_diastolica ? parseInt(form.pa_diastolica) : null,
      aderiu_dieta: form.aderiu_dieta,
      aderiu_medicacao: form.aderiu_medicacao,
      sintomas: form.sintomas.trim() || null,
      notas: form.notas.trim() || null,
      created_at: new Date().toISOString(),
    }
    onSaved(fake)
  }

  return (
    <div className="rounded-xl border p-4 space-y-4"
      style={{ borderColor: 'rgba(45,43,107,0.12)', backgroundColor: 'rgba(245,240,232,0.5)' }}>
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          Novo check-in
        </h4>
        <button onClick={onCancel}><X className="w-4 h-4 text-gray-400 hover:text-gray-600" /></button>
      </div>

      {/* Data + Canal */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Data *</label>
          <input
            type="date"
            value={form.checkin_date}
            onChange={e => set('checkin_date', e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Canal</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
            {(Object.entries(CHANNEL_LABELS) as [CheckinChannel, typeof CHANNEL_LABELS[CheckinChannel]][]).map(([k, v]) => (
              <button key={k} onClick={() => set('channel', k)}
                className={cn('flex-1 py-2 font-medium transition-colors flex items-center justify-center gap-1',
                  form.channel === k ? 'text-white' : 'text-gray-500 hover:bg-gray-50')}
                style={form.channel === k ? { backgroundColor: v.color } : undefined}>
                {v.icon}
                <span className="hidden sm:inline">{v.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* PA + Peso */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
            <Heart className="w-3 h-3 text-rose-400" /> PA sistólica
          </label>
          <input
            type="number"
            value={form.pa_sistolica}
            onChange={e => set('pa_sistolica', e.target.value)}
            placeholder="120"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">PA diastólica</label>
          <input
            type="number"
            value={form.pa_diastolica}
            onChange={e => set('pa_diastolica', e.target.value)}
            placeholder="80"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1">
            <Scale className="w-3 h-3 text-blue-400" /> Peso (kg)
          </label>
          <input
            type="number"
            step="0.1"
            value={form.peso_kg}
            onChange={e => set('peso_kg', e.target.value)}
            placeholder="72.5"
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Adesão */}
      <div className="grid grid-cols-2 gap-3">
        {([
          ['aderiu_dieta',     'Adesão à dieta'],
          ['aderiu_medicacao', 'Adesão à medicação'],
        ] as const).map(([field, label]) => (
          <div key={field}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              {(['sim', 'parcial', 'nao', 'nao_informado'] as AdesaoStatus[]).map(v => {
                const a = ADESAO_LABELS[v]
                return (
                  <button key={v}
                    onClick={() => setForm(f => ({ ...f, [field]: v }))}
                    className={cn('flex-1 py-2 font-medium transition-colors',
                      form[field] === v ? 'text-white' : 'text-gray-400 hover:bg-gray-50')}
                    style={form[field] === v ? { backgroundColor: a.color } : undefined}>
                    {a.label}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Sintomas + Notas */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Sintomas / queixas</label>
        <input
          value={form.sintomas}
          onChange={e => set('sintomas', e.target.value)}
          placeholder="ex: inchaço nos tornozelos, falta de ar, cansaço…"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Notas internas</label>
        <textarea
          rows={2}
          value={form.notas}
          onChange={e => set('notas', e.target.value)}
          placeholder="Observações da equipe sobre este check-in…"
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !form.checkin_date}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
          Registrar
        </button>
      </div>
    </div>
  )
}

// ── Template de mensagem WhatsApp ─────────────────────────────────────────

function TemplateCard({ goal, patientName }: { goal: PatientGoal | null; patientName: string }) {
  const [copied, setCopied] = useState(false)
  const freq = goal?.frequencia ?? 'quinzenal'

  const indicators = [
    goal?.peso_alvo_kg   ? `• Peso atual (meta: ${goal.peso_alvo_kg} kg)` : '• Peso atual (kg)',
    goal?.pa_alvo        ? `• Pressão arterial (meta: ${goal.pa_alvo})`   : '• Pressão arterial (ex: 130/80)',
    goal?.indicadores_extras ? `• ${goal.indicadores_extras}` : null,
    '• Como está se sentindo? (sintomas, queixas)',
  ].filter(Boolean).join('\n')

  const template = `Olá, ${patientName}! 👋

É hora do seu check-in ${freq} de saúde com o consultório do Dr. Guilherme Santa Catharina.

Por favor, responda com as informações abaixo:

${indicators}

Adesão ao tratamento:
• Está seguindo a dieta? (sim / não / parcialmente)
• Está tomando os medicamentos corretamente? (sim / não / parcialmente)

Obrigado! Suas respostas ajudam a monitorar sua saúde de perto. 🩺`

  function handleCopy() {
    navigator.clipboard.writeText(template)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-xl border border-white/60 p-4"
      style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,255,255,0.80)', boxShadow: '0 2px 12px rgba(26,31,46,0.06)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: 'rgba(34,197,94,0.10)' }}>
            <MessageSquare className="w-4 h-4" style={{ color: '#16a34a' }} />
          </div>
          <h3 className="text-sm font-semibold text-gray-800">Template WhatsApp</h3>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
            style={{ backgroundColor: 'rgba(34,197,94,0.10)', color: '#16a34a' }}>
            {freq}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
          style={copied
            ? { backgroundColor: 'rgba(122,158,126,0.15)', color: '#4E7A52' }
            : { backgroundColor: 'rgba(45,43,107,0.07)', color: '#2D2B6B' }
          }
        >
          {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copiado!' : 'Copiar'}
        </button>
      </div>
      <pre className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100 font-sans">
        {template}
      </pre>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────

interface Props {
  patientId:   string
  patientName: string
}

export default function MonitoramentoTab({ patientId, patientName }: Props) {
  const [goal,       setGoal]       = useState<PatientGoal | null>(null)
  const [checkins,   setCheckins]   = useState<PatientCheckin[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [, startTransition] = useTransition()

  useEffect(() => {
    Promise.all([
      getPatientGoal(patientId),
      getPatientCheckins(patientId),
    ]).then(([g, cs]) => {
      setGoal(g)
      setCheckins(cs)
      setLoading(false)
    })
  }, [patientId])

  function handleCheckinSaved(c: PatientCheckin) {
    setCheckins(prev => [c, ...prev])
    setShowForm(false)
  }

  function handleDelete(id: string) {
    if (!confirm('Remover este check-in?')) return
    setCheckins(prev => prev.filter(c => c.id !== id))
    startTransition(async () => {
      const res = await deleteCheckin(id)
      if (res.error) {
        alert(res.error)
        getPatientCheckins(patientId).then(setCheckins)
      }
    })
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-gray-400 py-8 justify-center">
      <Loader2 className="w-5 h-5 animate-spin" />
      <span className="text-sm">Carregando monitoramento…</span>
    </div>
  )

  return (
    <div className="space-y-5">

      {/* Metas */}
      <GoalsCard patientId={patientId} />

      {/* Template WhatsApp */}
      <TemplateCard goal={goal} patientName={patientName} />

      {/* Histórico de check-ins */}
      <div className="rounded-xl border border-white/60 p-4"
        style={{ backdropFilter: 'blur(14px)', backgroundColor: 'rgba(255,255,255,0.80)', boxShadow: '0 2px 12px rgba(26,31,46,0.06)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: 'rgba(122,158,126,0.12)' }}>
              <ClipboardList className="w-4 h-4" style={{ color: '#7A9E7E' }} />
            </div>
            <h3 className="text-sm font-semibold text-gray-800">Histórico de check-ins</h3>
            {checkins.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ backgroundColor: 'rgba(122,158,126,0.12)', color: '#4E7A52' }}>
                {checkins.length}
              </span>
            )}
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-dark transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar check-in
            </button>
          )}
        </div>

        {showForm && (
          <div className="mb-4">
            <CheckinForm
              patientId={patientId}
              onSaved={handleCheckinSaved}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {checkins.length === 0 && !showForm ? (
          <div className="py-10 text-center">
            <ClipboardList className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum check-in registrado ainda.</p>
            <button onClick={() => setShowForm(true)} className="mt-2 text-sm text-primary hover:underline">
              Registrar o primeiro
            </button>
          </div>
        ) : checkins.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Data</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Canal</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">PA</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Peso</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Dieta</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Medicação</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Sintomas</th>
                  <th className="px-3 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {checkins.map(c => {
                  const ch = CHANNEL_LABELS[c.channel]
                  const dieta = ADESAO_LABELS[c.aderiu_dieta]
                  const med   = ADESAO_LABELS[c.aderiu_medicacao]
                  return (
                    <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap text-xs">{fmtDate(c.checkin_date)}</td>
                      <td className="px-3 py-2.5">
                        <span className="flex items-center gap-1 text-xs font-medium" style={{ color: ch.color }}>
                          {ch.icon} {ch.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-xs font-mono font-medium text-gray-700">
                        {c.pa_sistolica && c.pa_diastolica
                          ? `${c.pa_sistolica}/${c.pa_diastolica}`
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-gray-700">
                        {c.peso_kg != null ? `${c.peso_kg} kg` : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <span className="text-xs font-medium" style={{ color: dieta.color }}>{dieta.label}</span>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <span className="text-xs font-medium" style={{ color: med.color }}>{med.label}</span>
                      </td>
                      <td className="px-3 py-2.5 hidden lg:table-cell text-xs text-gray-500 max-w-xs truncate">
                        {c.sintomas || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
