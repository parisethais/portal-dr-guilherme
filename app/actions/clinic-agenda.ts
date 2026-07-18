'use server'

/**
 * Agenda da clínica — visão consolidada por sala e por médico.
 *
 * A agenda da clínica é composta por:
 *   1. Consultas nativas do tenant (todos os médicos da clínica)
 *   2. Consultas COMPARTILHADAS de médicos de fora (agenda_shares) — ex.: Gui,
 *      cuja agenda vive no tenant dele. Do compartilhamento só saem consultas
 *      PRESENCIAIS (local = consultorio) e apenas campos mínimos: horário,
 *      duração, nome do paciente e sala. Nada clínico, nada de contato.
 */

import { createAdminClient } from '@/lib/supabase/admin-client'
import { getMemberContext } from '@/lib/auth-guard'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

export interface ClinicRoom {
  id:     string
  name:   string
  active: boolean
}

export interface ClinicDoctor {
  id:     string
  name:   string
  shared: boolean   // médico de fora que compartilha a agenda com esta clínica
}

export interface AgendaSlot {
  id:           string
  doctor_id:    string | null
  doctor_name:  string
  patient_name: string
  data_hora:    string
  duracao_min:  number
  status:       string
  room_id:      string | null
  local:        string
  shared:       boolean   // veio de compartilhamento → somente leitura (exceto sala)
}

export interface ClinicAgendaDia {
  rooms:   ClinicRoom[]
  doctors: ClinicDoctor[]
  slots:   AgendaSlot[]
}

// ── Helpers ──────────────────────────────────────────────────────────────

async function getClinicCtx() {
  const ctx = await getMemberContext()
  if (!ctx || !ctx.clinicId || !ctx.tenantId) return null
  return ctx
}

function diaRangeBRT(dateStr: string): { inicio: string; fim: string } {
  const ref = new Date(`${dateStr}T00:00:00-03:00`)
  return {
    inicio: ref.toISOString(),
    fim:    new Date(ref.getTime() + 24 * 60 * 60 * 1000).toISOString(),
  }
}

// ── Agenda do dia ────────────────────────────────────────────────────────

export async function getClinicAgendaDia(dateStr: string): Promise<ClinicAgendaDia | null> {
  const ctx = await getClinicCtx()
  if (!ctx || !ctx.permissions.agenda) return null

  const admin = createAdminClient()
  const { inicio, fim } = diaRangeBRT(dateStr)

  const [{ data: rooms }, { data: members }, { data: shares }] = await Promise.all([
    admin.from('clinic_rooms')
      .select('id, name, active')
      .eq('clinic_id', ctx.clinicId!)
      .eq('active', true)
      .order('name'),
    admin.from('clinic_members')
      .select('user_id, role, profiles!user_id(full_name)')
      .eq('clinic_id', ctx.clinicId!)
      .in('role', ['owner', 'medico']),
    admin.from('agenda_shares')
      .select('doctor_id, owner_tenant_id, profiles!doctor_id(full_name)')
      .eq('grantee_clinic_id', ctx.clinicId!)
      .eq('active', true),
  ])

  const nativeDoctors: ClinicDoctor[] = (members ?? []).map(m => ({
    id:     m.user_id,
    name:   (m.profiles as any)?.full_name ?? 'Médico',
    shared: false,
  }))
  const sharedDoctors: ClinicDoctor[] = (shares ?? []).map(s => ({
    id:     s.doctor_id,
    name:   (s.profiles as any)?.full_name ?? 'Médico',
    shared: true,
  }))
  const doctorName = new Map([...nativeDoctors, ...sharedDoctors].map(d => [d.id, d.name]))

  // 1. Consultas nativas do tenant (todos os médicos da clínica)
  const { data: nativas } = await admin
    .from('consultas')
    .select('id, doctor_id, patient_id, data_hora, duracao_min, status, room_id, local, profiles!patient_id(full_name)')
    .eq('tenant_id', ctx.tenantId!)
    .gte('data_hora', inicio)
    .lt('data_hora', fim)
    .neq('status', 'cancelada')
    .order('data_hora')

  const slots: AgendaSlot[] = (nativas ?? []).map(c => ({
    id:           c.id,
    doctor_id:    c.doctor_id,
    doctor_name:  doctorName.get(c.doctor_id ?? '') ?? 'Médico',
    patient_name: (c.profiles as any)?.full_name ?? '—',
    data_hora:    c.data_hora,
    duracao_min:  c.duracao_min ?? 30,
    status:       c.status,
    room_id:      c.room_id,
    local:        c.local,
    shared:       false,
  }))

  // 2. Consultas compartilhadas — SOMENTE presenciais, campos mínimos
  for (const share of shares ?? []) {
    const { data: compartilhadas } = await admin
      .from('consultas')
      .select('id, doctor_id, data_hora, duracao_min, status, room_id, local, profiles!patient_id(full_name)')
      .eq('tenant_id', share.owner_tenant_id)
      .eq('doctor_id', share.doctor_id)
      .eq('local', 'consultorio')
      .gte('data_hora', inicio)
      .lt('data_hora', fim)
      .neq('status', 'cancelada')
      .order('data_hora')

    for (const c of compartilhadas ?? []) {
      slots.push({
        id:           c.id,
        doctor_id:    c.doctor_id,
        doctor_name:  doctorName.get(share.doctor_id) ?? 'Médico',
        patient_name: (c.profiles as any)?.full_name ?? '—',
        data_hora:    c.data_hora,
        duracao_min:  c.duracao_min ?? 30,
        status:       c.status,
        room_id:      c.room_id,
        local:        c.local,
        shared:       true,
      })
    }
  }

  slots.sort((a, b) => a.data_hora.localeCompare(b.data_hora))

  return { rooms: rooms ?? [], doctors: [...nativeDoctors, ...sharedDoctors], slots }
}

// ── Salas (CRUD — dono/médico da clínica) ────────────────────────────────

export async function getClinicRooms(): Promise<ClinicRoom[]> {
  const ctx = await getClinicCtx()
  if (!ctx) return []
  const admin = createAdminClient()
  const { data } = await admin
    .from('clinic_rooms')
    .select('id, name, active')
    .eq('clinic_id', ctx.clinicId!)
    .order('name')
  return (data ?? []) as ClinicRoom[]
}

export async function createClinicRoom(name: string): Promise<ActionResult<ClinicRoom>> {
  const ctx = await getClinicCtx()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (!['owner', 'medico', 'secretaria'].includes(ctx.memberRole)) {
    return { success: false, error: 'Não autorizado.' }
  }
  if (!name.trim()) return { success: false, error: 'Informe o nome da sala.' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('clinic_rooms')
    .insert({ clinic_id: ctx.clinicId, name: name.trim() })
    .select('id, name, active')
    .single()

  if (error) return { success: false, error: error.message }
  revalidatePath('/medico')
  return { success: true, data: data as ClinicRoom }
}

export async function deactivateClinicRoom(roomId: string): Promise<ActionResult> {
  const ctx = await getClinicCtx()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (!['owner', 'medico', 'secretaria'].includes(ctx.memberRole)) {
    return { success: false, error: 'Não autorizado.' }
  }

  const admin = createAdminClient()
  const { error } = await admin
    .from('clinic_rooms')
    .update({ active: false })
    .eq('id', roomId)
    .eq('clinic_id', ctx.clinicId!)

  if (error) return { success: false, error: error.message }
  revalidatePath('/medico')
  return { success: true }
}

// ── Atribuir sala a uma consulta ─────────────────────────────────────────
// Permitido para membro com permissão de salas. A consulta precisa ser:
//   (a) do próprio tenant, OU
//   (b) de um médico que compartilha a agenda com esta clínica (só o room_id
//       é alterável — nenhum outro campo da consulta alheia é tocado).
export async function assignConsultaRoom(
  consultaId: string,
  roomId: string | null,
): Promise<ActionResult> {
  const ctx = await getClinicCtx()
  if (!ctx || !ctx.permissions.salas) return { success: false, error: 'Não autorizado.' }

  const admin = createAdminClient()

  // Sala precisa ser desta clínica (quando não está limpando)
  if (roomId) {
    const { data: room } = await admin
      .from('clinic_rooms')
      .select('id')
      .eq('id', roomId)
      .eq('clinic_id', ctx.clinicId!)
      .single()
    if (!room) return { success: false, error: 'Sala inválida.' }
  }

  // (a) consulta do próprio tenant?
  const { data: propria } = await admin
    .from('consultas')
    .select('id')
    .eq('id', consultaId)
    .eq('tenant_id', ctx.tenantId!)
    .maybeSingle()

  let autorizada = !!propria

  // (b) consulta de médico que compartilha com esta clínica?
  if (!autorizada) {
    const { data: shares } = await admin
      .from('agenda_shares')
      .select('doctor_id, owner_tenant_id')
      .eq('grantee_clinic_id', ctx.clinicId!)
      .eq('active', true)

    for (const s of shares ?? []) {
      const { data: alheia } = await admin
        .from('consultas')
        .select('id')
        .eq('id', consultaId)
        .eq('tenant_id', s.owner_tenant_id)
        .eq('doctor_id', s.doctor_id)
        .eq('local', 'consultorio')
        .maybeSingle()
      if (alheia) { autorizada = true; break }
    }
  }

  if (!autorizada) return { success: false, error: 'Não autorizado.' }

  const { error } = await admin
    .from('consultas')
    .update({ room_id: roomId, updated_at: new Date().toISOString() })
    .eq('id', consultaId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/medico')
  return { success: true }
}

// ── Médicos da clínica (para o seletor de agendamento) ───────────────────

export async function getClinicDoctors(): Promise<ClinicDoctor[]> {
  const ctx = await getClinicCtx()
  if (!ctx) return []
  const admin = createAdminClient()
  const { data: members } = await admin
    .from('clinic_members')
    .select('user_id, profiles!user_id(full_name)')
    .eq('clinic_id', ctx.clinicId!)
    .in('role', ['owner', 'medico'])
  return (members ?? []).map(m => ({
    id:     m.user_id,
    name:   (m.profiles as any)?.full_name ?? 'Médico',
    shared: false,
  }))
}
