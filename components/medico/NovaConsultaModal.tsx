'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { createConsulta } from '@/app/actions/consultas'
import { getConsultationTypes } from '@/app/actions/consultation-types'
import type { ConsultaTipo, ConsultaLocal } from '@/lib/types'
import { X, CalendarPlus, Loader2 } from 'lucide-react'

interface Props {
  patientId:   string
  patientName: string
  onClose:     () => void
}

// Fallback estático enquanto o DB não carrega
const TIPOS_FALLBACK: { value: ConsultaTipo; label: string; duracao: number }[] = [
  { value: 'primeira_consulta',          label: 'Primeira Consulta',            duracao: 75 },
  { value: 'nova_consulta',              label: 'Nova Consulta',                duracao: 45 },
  { value: 'retorno',                    label: 'Retorno',                      duracao: 30 },
  { value: 'primeira_consulta_desconto', label: 'Primeira Consulta (Desconto)', duracao: 75 },
  { value: 'nova_consulta_desconto',     label: 'Nova Consulta (Desconto)',     duracao: 45 },
]

const LOCAIS: { value: ConsultaLocal; label: string }[] = [
  { value: 'consultorio',  label: 'Consultório'  },
  { value: 'telemedicina', label: 'Telemedicina' },
]

function defaultDateTime() {
  const now = new Date()
  // Arredonda para os 30 min mais próximos
  now.setSeconds(0, 0)
  now.setMinutes(Math.round(now.getMinutes() / 30) * 30)
  // Formata como datetime-local (YYYY-MM-DDTHH:MM)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`
}

export default function NovaConsultaModal({ patientId, patientName, onClose }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const submitting = useRef(false)
  const [error, setError] = useState('')
  const [tipos, setTipos] = useState(TIPOS_FALLBACK)

  // Carrega tipos do DB ao montar
  useEffect(() => {
    getConsultationTypes()
      .then(types => {
        if (types.length > 0) {
          setTipos(types.map(t => ({
            value: t.slug as ConsultaTipo,
            label: t.name,
            duracao: t.duration_min,
          })))
        }
      })
      .catch(() => {})
  }, [])

  const [form, setForm] = useState({
    tipo:        'retorno'     as ConsultaTipo,
    local:       'consultorio' as ConsultaLocal,
    data_hora:   defaultDateTime(),
    duracao_min: '30',
    observacoes: '',
  })

  const set = <K extends keyof typeof form>(k: K) =>
    (v: (typeof form)[K]) => setForm(f => ({ ...f, [k]: v }))

  function handleTipoChange(tipo: ConsultaTipo) {
    const duracao = tipos.find(t => t.value === tipo)?.duracao ?? 30
    setForm(f => ({ ...f, tipo, duracao_min: String(duracao) }))
  }

  function handleCreate() {
    if (submitting.current) return
    submitting.current = true
    setError('')
    startTransition(async () => {
      const res = await createConsulta({
        patient_id:  patientId,
        tipo:        form.tipo,
        local:       form.local,
        data_hora:   form.data_hora,
        duracao_min: parseInt(form.duracao_min) || 30,
        observacoes: form.observacoes || null,
        status:      'realizada',
      })
      submitting.current = false
      if (!res.success) { setError(res.error); return }
      onClose()
      const params = new URLSearchParams(searchParams.toString())
      if (res.data?.id) params.set('consulta', res.data.id)
      router.push(`${pathname}?${params}`)
    })
  }

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary bg-white'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <CalendarPlus className="w-4 h-4 text-primary" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900">Nova consulta</h2>
              <p className="text-xs text-gray-400">{patientName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Tipo</label>
              <select
                value={form.tipo}
                onChange={e => handleTipoChange(e.target.value as ConsultaTipo)}
                className={inputCls}
              >
                {tipos.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Local</label>
              <select
                value={form.local}
                onChange={e => set('local')(e.target.value as ConsultaLocal)}
                className={inputCls}
              >
                {LOCAIS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Data e hora</label>
              <input
                type="datetime-local"
                value={form.data_hora}
                onChange={e => set('data_hora')(e.target.value)}
                className={inputCls}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">Duração (min)</label>
              <input
                type="number"
                min={10}
                max={240}
                step={10}
                value={form.duracao_min}
                onChange={e => set('duracao_min')(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Observações <span className="font-normal text-gray-400">(opcional)</span>
            </label>
            <textarea
              value={form.observacoes}
              onChange={e => set('observacoes')(e.target.value)}
              rows={2}
              placeholder="Motivo da consulta, anotações..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending || !form.data_hora}
            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-60 transition-colors"
          >
            {isPending
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Criando...</>
              : <><CalendarPlus className="w-3.5 h-3.5" /> Criar consulta</>
            }
          </button>
        </div>

      </div>
    </div>
  )
}
