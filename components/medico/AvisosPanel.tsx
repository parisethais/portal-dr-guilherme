'use client'

import { useState, useTransition } from 'react'
import { Bell, CalendarClock, CheckCheck, X } from 'lucide-react'
import { marcarLida, marcarTodasLidas } from '@/app/actions/notificacoes'
import type { Notificacao } from '@/app/actions/notificacoes'

interface Props {
  notificacoes: Notificacao[]
  tenantId: string
}

export default function AvisosPanel({ notificacoes, tenantId }: Props) {
  const [items, setItems] = useState(notificacoes)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const naoLidas = items.filter(n => !n.lida)

  function handleMarcarLida(id: string) {
    setItems(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    startTransition(() => marcarLida(id))
  }

  function handleMarcarTodas() {
    setItems(prev => prev.map(n => ({ ...n, lida: true })))
    startTransition(() => marcarTodasLidas(tenantId))
  }

  if (items.length === 0) return null

  return (
    <div className="relative">
      {/* Botão sino */}
      <button
        onClick={() => setOpen(o => !o)}
        className="relative flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/60 transition-colors text-sm font-medium text-gray-700"
      >
        <Bell className="w-4 h-4" />
        <span className="hidden sm:inline">Avisos</span>
        {naoLidas.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {naoLidas.length > 9 ? '9+' : naoLidas.length}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Overlay para fechar */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />

          <div className="absolute right-0 top-full mt-2 w-96 max-h-[480px] bg-white rounded-xl shadow-xl border border-gray-100 z-40 flex flex-col overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" />
                <span className="font-semibold text-gray-900 text-sm">Avisos</span>
                {naoLidas.length > 0 && (
                  <span className="text-xs bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full">
                    {naoLidas.length} {naoLidas.length === 1 ? 'novo' : 'novos'}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {naoLidas.length > 0 && (
                  <button
                    onClick={handleMarcarTodas}
                    disabled={isPending}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" />
                    Marcar todas como lidas
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1">
              {items.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8">Nenhum aviso.</p>
              ) : (
                items.map(n => (
                  <div
                    key={n.id}
                    className={`flex gap-3 px-4 py-3 border-b border-gray-50 transition-colors ${
                      n.lida ? 'bg-white' : 'bg-blue-50/50'
                    }`}
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      n.lida ? 'bg-gray-100' : 'bg-primary/10'
                    }`}>
                      <CalendarClock className={`w-4 h-4 ${n.lida ? 'text-gray-400' : 'text-primary'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm leading-snug ${n.lida ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                        {n.mensagem}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(n.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    </div>

                    {!n.lida && (
                      <button
                        onClick={() => handleMarcarLida(n.id)}
                        className="text-gray-300 hover:text-primary flex-shrink-0 mt-1"
                        title="Marcar como lido"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
