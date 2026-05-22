'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Types ─────────────────────────────────────────────────────────────────

export type MrpaPeriod = 'manha1' | 'manha2' | 'noite1' | 'noite2'

export interface MrpaReading {
  id:         string
  session_id: string
  patient_id: string
  day_number: number
  period:     MrpaPeriod
  sistolica:  number | null
  diastolica: number | null
  fc:         number | null
  created_at: string
}

export interface MrpaSession {
  id:         string
  patient_id: string
  clinic_id:  string | null
  doctor_id:  string
  start_date: string
  days:       number
  notes:      string | null
  status:     'em_andamento' | 'concluida'
  created_at: string
  readings:   MrpaReading[]
}

// ── Fetch sessões de um paciente ──────────────────────────────────────────

export async function getMrpaSessions(patientId: string): Promise<MrpaSession[]> {
  const supabase = await createClient()
  const { data: sessions } = await supabase
    .from('patient_mrpa_sessions')
    .select('*')
    .eq('patient_id', patientId)
    .order('start_date', { ascending: false })

  if (!sessions?.length) return []

  const sessionIds = sessions.map(s => s.id)
  const { data: readings } = await supabase
    .from('patient_mrpa_readings')
    .select('*')
    .in('session_id', sessionIds)
    .order('day_number')

  return sessions.map(s => ({
    ...s,
    readings: (readings ?? []).filter(r => r.session_id === s.id) as MrpaReading[],
  })) as MrpaSession[]
}

// ── Criar sessão ──────────────────────────────────────────────────────────

export async function createMrpaSession(input: {
  patient_id: string
  start_date: string
  days:       number
  notes?:     string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: member } = await supabase
    .from('clinic_members').select('clinic_id').eq('user_id', user.id).maybeSingle()

  const { data, error } = await supabase
    .from('patient_mrpa_sessions')
    .insert({
      patient_id: input.patient_id,
      start_date: input.start_date,
      days:       input.days,
      notes:      input.notes ?? null,
      doctor_id:  user.id,
      clinic_id:  member?.clinic_id ?? null,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  revalidatePath('/medico')
  return { success: true, session: data }
}

// ── Salvar leitura (upsert) ───────────────────────────────────────────────

export async function upsertMrpaReading(input: {
  session_id: string
  patient_id: string
  day_number: number
  period:     MrpaPeriod
  sistolica:  number | null
  diastolica: number | null
  fc?:        number | null
}) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('patient_mrpa_readings')
    .upsert({
      ...input,
      fc: input.fc ?? null,
    }, { onConflict: 'session_id,day_number,period' })

  if (error) return { error: error.message }
  return { success: true }
}

// ── Concluir sessão ───────────────────────────────────────────────────────

export async function concludeMrpaSession(sessionId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('patient_mrpa_sessions')
    .update({ status: 'concluida' })
    .eq('id', sessionId)
  if (error) return { error: error.message }
  revalidatePath('/medico')
  return { success: true }
}

// ── Excluir sessão ────────────────────────────────────────────────────────

export async function deleteMrpaSession(sessionId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('patient_mrpa_sessions')
    .delete()
    .eq('id', sessionId)
  if (error) return { error: error.message }
  revalidatePath('/medico')
  return { success: true }
}
