'use client'

import { useEffect, useState, useTransition } from 'react'
import { useSearchParams } from 'next/navigation'
import { CalendarDays, CheckCircle2, XCircle, Loader2, Unlink } from 'lucide-react'

export default function GoogleCalendarSettings() {
  const searchParams  = useSearchParams()
  const [connected,   setConnected]   = useState<boolean | null>(null)
  const [isPending,   startTransition] = useTransition()

  useEffect(() => {
    fetch('/api/google/calendars')
      .then(r => r.json())
      .then(d => setConnected(d.connected ?? false))
      .catch(() => setConnected(false))
  }, [])

  // Feedback após OAuth redirect
  const googleParam = searchParams.get('google')

  async function handleDisconnect() {
    startTransition(async () => {
      await fetch('/api/google/disconnect', { method: 'POST' })
      setConnected(false)
    })
  }

  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
          <CalendarDays className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Google Agenda</h2>
          <p className="text-xs text-gray-400">Visualize todos os seus calendários diretamente na aba Agenda do CRM.</p>
        </div>
      </div>

      {googleParam === 'success' && (
        <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-xl px-4 py-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Google Agenda conectado com sucesso!
        </div>
      )}
      {googleParam === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 rounded-xl px-4 py-2.5">
          <XCircle className="w-4 h-4 shrink-0" />
          Não foi possível conectar. Tente novamente.
        </div>
      )}

      <div className="flex items-center gap-3">
        {connected === null ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            Verificando conexão…
          </div>
        ) : connected ? (
          <>
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
          </>
        ) : (
          <a
            href="/api/google/auth"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            <CalendarDays className="w-4 h-4" />
            Conectar Google Agenda
          </a>
        )}
      </div>
    </section>
  )
}
