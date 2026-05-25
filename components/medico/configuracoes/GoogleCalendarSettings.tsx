'use client'

import { useEffect, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { CalendarDays, CheckCircle2, XCircle, Loader2, Unlink, Save } from 'lucide-react'
import type { GoogleCalendarInfo } from '@/lib/google-calendar'

export default function GoogleCalendarSettings() {
  const searchParams   = useSearchParams()
  const [connected,    setConnected]    = useState<boolean | null>(null)
  const [calendars,    setCalendars]    = useState<GoogleCalendarInfo[]>([])
  const [selectedCal,  setSelectedCal]  = useState<string>('')
  const [savedCal,     setSavedCal]     = useState<string>('')
  const [saving,       setSaving]       = useState(false)
  const [saveOk,       setSaveOk]       = useState(false)
  const [isPending,    startTransition] = useTransition()

  useEffect(() => {
    fetch('/api/google/calendars')
      .then(r => r.json())
      .then(d => {
        setConnected(d.connected ?? false)
        setCalendars(d.calendars ?? [])
      })
      .catch(() => setConnected(false))

    // Busca calendário preferido salvo
    fetch('/api/google/settings')
      .then(r => r.json())
      .then(d => {
        if (d.preferred_calendar_id) {
          setSelectedCal(d.preferred_calendar_id)
          setSavedCal(d.preferred_calendar_id)
        }
      })
      .catch(() => {})
  }, [])

  const googleParam = searchParams.get('google')

  async function handleSaveCalendar() {
    if (!selectedCal) return
    setSaving(true)
    try {
      await fetch('/api/google/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferred_calendar_id: selectedCal }),
      })
      setSavedCal(selectedCal)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  async function handleDisconnect() {
    startTransition(async () => {
      await fetch('/api/google/disconnect', { method: 'POST' })
      setConnected(false)
      setCalendars([])
      setSelectedCal('')
      setSavedCal('')
    })
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Google Agenda</h2>
          <p className="text-xs text-gray-400">
            Consultas agendadas no CRM aparecem automaticamente no Google Agenda.
          </p>
        </div>
      </div>

      {googleParam === 'success' && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Google Agenda conectado! Selecione o calendário do consultório abaixo.
        </div>
      )}
      {googleParam === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-xl px-4 py-2.5">
          <XCircle className="w-4 h-4 shrink-0" />
          Não foi possível conectar. Tente novamente.
        </div>
      )}

      {connected === null ? (
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Verificando conexão…
        </div>
      ) : connected ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Conectado
            </div>
            <button
              onClick={handleDisconnect}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <Unlink className="w-3.5 h-3.5" />
              Desconectar
            </button>
          </div>

          {/* Seletor do calendário de consultas */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600">
              Calendário para consultas do consultório
            </label>
            <p className="text-xs text-gray-400">
              Novas consultas e alterações serão sincronizadas neste calendário.
            </p>
            <div className="flex items-center gap-2">
              <select
                value={selectedCal}
                onChange={e => setSelectedCal(e.target.value)}
                className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 bg-white"
              >
                <option value="">— Selecione um calendário —</option>
                {calendars.map(cal => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}{cal.primary ? ' (principal)' : ''}
                  </option>
                ))}
              </select>
              <button
                onClick={handleSaveCalendar}
                disabled={!selectedCal || selectedCal === savedCal || saving}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-colors"
              >
                {saving
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : saveOk
                    ? <CheckCircle2 className="w-4 h-4" />
                    : <Save className="w-4 h-4" />
                }
                {saveOk ? 'Salvo!' : 'Salvar'}
              </button>
            </div>
            {savedCal && calendars.find(c => c.id === savedCal) && (
              <p className="text-xs text-emerald-600">
                ✓ Usando: <strong>{calendars.find(c => c.id === savedCal)?.name}</strong>
              </p>
            )}
          </div>
        </div>
      ) : (
        <a
          href="/api/google/auth"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
        >
          <CalendarDays className="w-4 h-4" />
          Conectar Google Agenda
        </a>
      )}
    </section>
  )
}
