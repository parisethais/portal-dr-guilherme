'use client'

import { useState, useEffect, useCallback, useTransition } from 'react'
import {
  getClinicAgendaDia, assignConsultaRoom, createClinicRoom, deactivateClinicRoom,
  type ClinicAgendaDia, type AgendaSlot,
} from '@/app/actions/clinic-agenda'
import { ChevronLeft, ChevronRight, Loader2, DoorOpen, Plus, X, Users, LayoutGrid, Share2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Cores estáveis por médico (paleta suave)
const DOCTOR_COLORS = ['#7c3aed', '#059669', '#d97706', '#2563eb', '#dc2626', '#0891b2', '#be185d', '#4d7c0f']

function hora(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
}

function hojeBRT(): string {
  const now = new Date()
  now.setUTCHours(now.getUTCHours() - 3)
  return now.toISOString().slice(0, 10)
}

function shiftDia(dateStr: string, delta: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function fmtDiaLabel(dateStr: string): string {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })
}

interface Props {
  canManageRooms: boolean
}

export default function SalasTab({ canManageRooms }: Props) {
  const [dia, setDia]         = useState<string>(hojeBRT)
  const [data, setData]       = useState<ClinicAgendaDia | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView]       = useState<'salas' | 'medicos'>('salas')
  const [novaSala, setNovaSala]   = useState('')
  const [addingSala, setAddingSala] = useState(false)
  const [isPending, startTransition] = useTransition()

  const load = useCallback(async (d: string) => {
    setLoading(true)
    const res = await getClinicAgendaDia(d)
    setData(res)
    setLoading(false)
  }, [])

  useEffect(() => { load(dia) }, [dia, load])

  const doctorColor = new Map(
    (data?.doctors ?? []).map((d, i) => [d.id, DOCTOR_COLORS[i % DOCTOR_COLORS.length]])
  )

  function handleAssignRoom(slot: AgendaSlot, roomId: string | null) {
    // Otimista
    setData(prev => prev ? {
      ...prev,
      slots: prev.slots.map(s => s.id === slot.id ? { ...s, room_id: roomId } : s),
    } : prev)
    startTransition(async () => {
      const res = await assignConsultaRoom(slot.id, roomId)
      if (!res.success) load(dia)
    })
  }

  function handleAddSala() {
    if (!novaSala.trim()) return
    startTransition(async () => {
      const res = await createClinicRoom(novaSala)
      if (res.success) { setNovaSala(''); setAddingSala(false); load(dia) }
    })
  }

  function handleRemoveSala(roomId: string) {
    if (!confirm('Desativar esta sala? As consultas já atribuídas não são alteradas.')) return
    startTransition(async () => {
      await deactivateClinicRoom(roomId)
      load(dia)
    })
  }

  function SlotCard({ slot }: { slot: AgendaSlot }) {
    const color = doctorColor.get(slot.doctor_id ?? '') ?? '#6b7280'
    return (
      <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 space-y-1 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-gray-800">{hora(slot.data_hora)}</span>
          <span className="text-[10px] text-gray-400">{slot.duracao_min} min</span>
        </div>
        <p className="text-xs font-semibold text-gray-800 truncate">{slot.patient_name}</p>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <span className="text-[11px] text-gray-500 truncate">{slot.doctor_name}</span>
          {slot.shared && (
            <span title="Agenda compartilhada" className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-purple-50 text-purple-600 font-semibold">
              <Share2 className="w-2.5 h-2.5" /> ext
            </span>
          )}
        </div>
        {(data?.rooms.length ?? 0) > 0 && (
          <select
            value={slot.room_id ?? ''}
            onChange={e => handleAssignRoom(slot, e.target.value || null)}
            disabled={isPending}
            className="w-full text-[11px] border border-gray-200 rounded-md px-1.5 py-1 text-gray-600 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">Sem sala</option>
            {data!.rooms.map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        )}
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="flex items-center gap-2 py-10 justify-center text-gray-400 text-sm">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando agenda da clínica…
      </div>
    )
  }

  const rooms = data?.rooms ?? []
  const slots = data?.slots ?? []
  const semSala = slots.filter(s => !s.room_id || !rooms.some(r => r.id === s.room_id))

  return (
    <div className="space-y-4">
      {/* Navegação de dia + toggle de visão */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setDia(d => shiftDia(d, -1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-[210px]">
            <p className="text-sm font-semibold text-gray-800 capitalize">{fmtDiaLabel(dia)}</p>
            {dia !== hojeBRT() && (
              <button onClick={() => setDia(hojeBRT())} className="text-[11px] text-primary hover:underline">voltar para hoje</button>
            )}
          </div>
          <button onClick={() => setDia(d => shiftDia(d, 1))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <ChevronRight className="w-4 h-4" />
          </button>
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-300" />}
        </div>

        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setView('salas')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
              view === 'salas' ? 'bg-white text-primary shadow-sm' : 'text-gray-500')}
          >
            <DoorOpen className="w-3.5 h-3.5" /> Por sala
          </button>
          <button
            onClick={() => setView('medicos')}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
              view === 'medicos' ? 'bg-white text-primary shadow-sm' : 'text-gray-500')}
          >
            <Users className="w-3.5 h-3.5" /> Por médico
          </button>
        </div>
      </div>

      {/* Gestão de salas */}
      {canManageRooms && (
        <div className="flex items-center gap-2 flex-wrap">
          {rooms.map(r => (
            <span key={r.id} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full bg-gray-100 text-gray-600 font-medium">
              <DoorOpen className="w-3 h-3" /> {r.name}
              <button onClick={() => handleRemoveSala(r.id)} className="text-gray-400 hover:text-red-400 ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {addingSala ? (
            <span className="flex items-center gap-1">
              <input
                autoFocus
                value={novaSala}
                onChange={e => setNovaSala(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddSala(); if (e.key === 'Escape') setAddingSala(false) }}
                placeholder="Nome da sala"
                className="text-xs border border-gray-300 rounded-md px-2 py-1 w-32 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={handleAddSala} disabled={isPending} className="text-xs text-primary font-semibold px-1">OK</button>
            </span>
          ) : (
            <button onClick={() => setAddingSala(true)}
              className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border border-dashed border-gray-300 text-gray-400 hover:text-primary hover:border-primary transition-colors">
              <Plus className="w-3 h-3" /> Sala
            </button>
          )}
        </div>
      )}

      {view === 'salas' && slots.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm bg-gray-50 rounded-xl border border-gray-200">
          Nenhuma consulta neste dia.
        </div>
      ) : view === 'salas' ? (
        /* ── Grade por sala ── */
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(rooms.length + (semSala.length ? 1 : 0), 1)}, minmax(180px, 1fr))` }}>
          {rooms.map(room => {
            const daSala = slots.filter(s => s.room_id === room.id)
            return (
              <div key={room.id} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-2">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide flex items-center gap-1.5">
                  <DoorOpen className="w-3.5 h-3.5" /> {room.name}
                  <span className="text-gray-400 font-medium normal-case">({daSala.length})</span>
                </p>
                {daSala.length === 0
                  ? <p className="text-[11px] text-gray-300 py-4 text-center">Livre</p>
                  : daSala.map(s => <SlotCard key={s.id} slot={s} />)}
              </div>
            )
          })}
          {semSala.length > 0 && (
            <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50/40 p-3 space-y-2">
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wide flex items-center gap-1.5">
                <LayoutGrid className="w-3.5 h-3.5" /> Sem sala
                <span className="font-medium normal-case">({semSala.length})</span>
              </p>
              {semSala.map(s => <SlotCard key={s.id} slot={s} />)}
            </div>
          )}
        </div>
      ) : (
        /* ── Grade por médico (todos, mesmo sem consulta no dia) ── */
        <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(200px, 1fr))` }}>
          {(data?.doctors ?? []).map(doc => {
            const doDoc = slots.filter(s => s.doctor_id === doc.id)
            return (
              <div key={doc.id} className="rounded-xl border border-gray-200 bg-gray-50/60 p-3 space-y-2">
                <p className="text-xs font-bold text-gray-600 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: doctorColor.get(doc.id) }} />
                  {doc.name}
                  {doc.shared && (
                    <span title="Agenda compartilhada (médico externo)" className="flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded bg-purple-50 text-purple-600 font-semibold">
                      <Share2 className="w-2.5 h-2.5" /> ext
                    </span>
                  )}
                  <span className="text-gray-400 font-medium">({doDoc.length})</span>
                </p>
                {doDoc.length === 0
                  ? <p className="text-[11px] text-gray-300 py-4 text-center">Sem consultas neste dia</p>
                  : doDoc.map(s => <SlotCard key={s.id} slot={s} />)}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
