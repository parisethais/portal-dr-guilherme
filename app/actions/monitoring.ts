'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Types ─────────────────────────────────────────────────────────────────

export interface PatientGoal {
  id:                  string
  patient_id:          string
  clinic_id:           string | null
  doctor_id:           string
  pa_alvo:             string | null
  peso_alvo_kg:        number | null
  frequencia:          'semanal' | 'quinzenal' | 'mensal'
  indicadores_extras:  string | null
  notas:               string | null
  created_at:          string
  updated_at:          string
}

export type AdesaoStatus = 'sim' | 'nao' | 'parcial' | 'nao_informado'
export type CheckinChannel = 'whatsapp' | 'portal' | 'telefone' | 'presencial'

export interface PatientCheckin {
  id:               string
  patient_id:       string
  clinic_id:        string | null
  doctor_id:        string
  recorded_by:      string | null
  checkin_date:     string
  channel:          CheckinChannel
  peso_kg:          number | null
  pa_sistolica:     number | null
  pa_diastolica:    number | null
  aderiu_dieta:     AdesaoStatus
  aderiu_medicacao: AdesaoStatus
  sintomas:         string | null
  notas:            string | null
  created_at:       string
}

// ── Goals ─────────────────────────────────────────────────────────────────

export async function getPatientGoal(patientId: string): Promise<PatientGoal | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('patient_goals')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle()
  return data as PatientGoal | null
}

export async function upsertPatientGoal(input: {
  patient_id:         string
  pa_alvo?:           string
  peso_alvo_kg?:      number | null
  frequencia?:        'semanal' | 'quinzenal' | 'mensal'
  indicadores_extras?: string
  notas?:             string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  // Busca clinic_id do médico
  const { data: member } = await supabase
    .from('clinic_members')
    .select('clinic_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const { error } = await supabase
    .from('patient_goals')
    .upsert({
      ...input,
      doctor_id:  user.id,
      clinic_id:  member?.clinic_id ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'patient_id' })

  if (error) return { error: error.message }
  revalidatePath('/medico')
  return { success: true }
}

// ── Check-ins ─────────────────────────────────────────────────────────────

export async function getPatientCheckins(patientId: string): Promise<PatientCheckin[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('patient_checkins')
    .select('*')
    .eq('patient_id', patientId)
    .order('checkin_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as PatientCheckin[]
}

export async function createCheckin(input: {
  patient_id:       string
  checkin_date:     string
  channel:          CheckinChannel
  peso_kg?:         number | null
  pa_sistolica?:    number | null
  pa_diastolica?:   number | null
  aderiu_dieta?:    AdesaoStatus
  aderiu_medicacao?: AdesaoStatus
  sintomas?:        string
  notas?:           string
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: member } = await supabase
    .from('clinic_members')
    .select('clinic_id')
    .eq('user_id', user.id)
    .maybeSingle()

  const { error } = await supabase.from('patient_checkins').insert({
    ...input,
    doctor_id:   user.id,
    clinic_id:   member?.clinic_id ?? null,
    recorded_by: user.id,
    aderiu_dieta:     input.aderiu_dieta     ?? 'nao_informado',
    aderiu_medicacao: input.aderiu_medicacao ?? 'nao_informado',
  })

  if (error) return { error: error.message }
  revalidatePath('/medico')
  return { success: true }
}

export async function deleteCheckin(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('patient_checkins').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/medico')
  return { success: true }
}
