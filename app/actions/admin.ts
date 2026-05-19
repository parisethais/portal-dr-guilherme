'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { revalidatePath } from 'next/cache'

export interface Clinic {
  id:            string
  name:          string
  slug:          string
  logo_url:      string | null
  primary_color: string
  active:        boolean
  owner_id:      string | null
  created_at:    string
  member_count?: number
}

export interface ClinicMember {
  id:         string
  clinic_id:  string
  user_id:    string
  role:       'owner' | 'medico' | 'secretaria'
  created_at: string
  profile?: {
    full_name: string | null
    role:      string | null
  }
}

export interface ClinicSetting {
  id:        string
  clinic_id: string
  key:       string
  value:     string | null
}

// ── Guard: só superadmin ──────────────────────────────────────────────────
// Usa o client normal (com cookie) APENAS para verificar identidade.
// Todas as queries de dados usam o adminClient (service role, bypassa RLS).

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'superadmin') throw new Error('Acesso negado')
  const adminClient = createAdminClient()
  return { supabase: adminClient, userId: user.id }
}

// ── Clinics ───────────────────────────────────────────────────────────────

export async function getClinics(): Promise<Clinic[]> {
  const { supabase } = await assertSuperAdmin()

  const { data: clinicsData, error } = await supabase
    .from('clinics')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) { console.error('[getClinics]', error); return [] }
  if (!clinicsData?.length) return []

  // Busca contagem de membros separadamente (evita problemas de RLS aninhado)
  const { data: membersData } = await supabase
    .from('clinic_members')
    .select('clinic_id')

  const countByClinic: Record<string, number> = {}
  for (const m of membersData ?? []) {
    countByClinic[m.clinic_id] = (countByClinic[m.clinic_id] ?? 0) + 1
  }

  return clinicsData.map((c: any) => ({
    ...c,
    member_count: countByClinic[c.id] ?? 0,
  }))
}

export async function createClinic(input: {
  name: string; slug: string; primary_color?: string
}) {
  const { supabase, userId } = await assertSuperAdmin()
  const { data, error } = await supabase
    .from('clinics')
    .insert({ ...input, owner_id: userId, primary_color: input.primary_color ?? '#7EB8D4' })
    .select()
    .single()
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true, clinic: data }
}

export async function updateClinic(id: string, input: Partial<Pick<Clinic, 'name' | 'slug' | 'primary_color' | 'active'>>) {
  const { supabase } = await assertSuperAdmin()
  const { error } = await supabase
    .from('clinics')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// ── Members ───────────────────────────────────────────────────────────────

export async function getClinicMembers(clinicId: string): Promise<ClinicMember[]> {
  const { supabase } = await assertSuperAdmin()
  const { data, error } = await supabase
    .from('clinic_members')
    .select('*, profile:profiles(full_name, role)')
    .eq('clinic_id', clinicId)
    .order('created_at')
  if (error) { console.error(error); return [] }
  return data ?? []
}

export async function addClinicMember(clinicId: string, email: string, role: 'medico' | 'secretaria') {
  const { supabase } = await assertSuperAdmin()

  // Busca usuário pelo email
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (profileError) return { error: profileError.message }
  // profiles pode não ter email — tenta via auth admin
  if (!profile) {
    return { error: `Usuário com e-mail "${email}" não encontrado. Crie o usuário primeiro no Supabase Auth.` }
  }

  const { error } = await supabase
    .from('clinic_members')
    .insert({ clinic_id: clinicId, user_id: profile.id, role })

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function removeClinicMember(memberId: string) {
  const { supabase } = await assertSuperAdmin()
  const { error } = await supabase.from('clinic_members').delete().eq('id', memberId)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// ── Settings ──────────────────────────────────────────────────────────────

export async function getClinicSettings(clinicId: string): Promise<Record<string, string>> {
  const { supabase } = await assertSuperAdmin()
  const { data } = await supabase
    .from('clinic_settings')
    .select('key, value')
    .eq('clinic_id', clinicId)
  return Object.fromEntries((data ?? []).map((s: any) => [s.key, s.value ?? '']))
}

export async function upsertClinicSetting(clinicId: string, key: string, value: string) {
  const { supabase } = await assertSuperAdmin()
  const { error } = await supabase
    .from('clinic_settings')
    .upsert({ clinic_id: clinicId, key, value, updated_at: new Date().toISOString() },
             { onConflict: 'clinic_id,key' })
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// ── Convênios ─────────────────────────────────────────────────────────────

export interface ClinicConvenio {
  id:            string
  clinic_id:     string
  name:          string
  code:          string | null
  default_value: number
  active:        boolean
  sort_order:    number
  created_at:    string
}

export async function getClinicConvenios(clinicId: string): Promise<ClinicConvenio[]> {
  const { supabase } = await assertSuperAdmin()
  const { data, error } = await supabase
    .from('clinic_convenios')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('sort_order')
  if (error) { console.error(error); return [] }
  return data ?? []
}

export async function createConvenio(clinicId: string, input: {
  name: string; code?: string; default_value?: number
}) {
  const { supabase } = await assertSuperAdmin()
  const { data: existing } = await supabase
    .from('clinic_convenios').select('sort_order').eq('clinic_id', clinicId).order('sort_order', { ascending: false }).limit(1).single()
  const sort_order = (existing?.sort_order ?? -1) + 1
  const { data, error } = await supabase
    .from('clinic_convenios')
    .insert({ clinic_id: clinicId, ...input, sort_order })
    .select().single()
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true, convenio: data }
}

export async function updateConvenio(id: string, input: Partial<Pick<ClinicConvenio, 'name' | 'code' | 'default_value' | 'active' | 'sort_order'>>) {
  const { supabase } = await assertSuperAdmin()
  const { error } = await supabase
    .from('clinic_convenios')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteConvenio(id: string) {
  const { supabase } = await assertSuperAdmin()
  const { error } = await supabase.from('clinic_convenios').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// ── Horários ──────────────────────────────────────────────────────────────

export interface ClinicScheduleDay {
  id:          string
  clinic_id:   string
  day_of_week: number   // 0=Dom … 6=Sáb
  open_time:   string   // 'HH:MM'
  close_time:  string
  active:      boolean
}

export async function getClinicSchedule(clinicId: string): Promise<ClinicScheduleDay[]> {
  const { supabase } = await assertSuperAdmin()
  const { data, error } = await supabase
    .from('clinic_schedule')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('day_of_week')
  if (error) { console.error(error); return [] }
  return data ?? []
}

export async function upsertScheduleDay(clinicId: string, day: Omit<ClinicScheduleDay, 'id' | 'clinic_id'>) {
  const { supabase } = await assertSuperAdmin()
  const { error } = await supabase
    .from('clinic_schedule')
    .upsert({ clinic_id: clinicId, ...day, updated_at: new Date().toISOString() },
             { onConflict: 'clinic_id,day_of_week' })
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// ── Tipos de Consulta ─────────────────────────────────────────────────────

export interface ClinicConsultationType {
  id:            string
  clinic_id:     string
  name:          string
  duration_min:  number
  color:         string
  default_value: number
  active:        boolean
  sort_order:    number
  created_at:    string
}

export async function getClinicConsultationTypes(clinicId: string): Promise<ClinicConsultationType[]> {
  const { supabase } = await assertSuperAdmin()
  const { data, error } = await supabase
    .from('clinic_consultation_types')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('sort_order')
  if (error) { console.error(error); return [] }
  return data ?? []
}

export async function createConsultationType(clinicId: string, input: {
  name: string; duration_min: number; color: string; default_value: number
}) {
  const { supabase } = await assertSuperAdmin()
  const { data: existing } = await supabase
    .from('clinic_consultation_types').select('sort_order').eq('clinic_id', clinicId).order('sort_order', { ascending: false }).limit(1).single()
  const sort_order = (existing?.sort_order ?? -1) + 1
  const { data, error } = await supabase
    .from('clinic_consultation_types')
    .insert({ clinic_id: clinicId, ...input, sort_order })
    .select().single()
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true, tipo: data }
}

export async function updateConsultationType(id: string, input: Partial<Pick<ClinicConsultationType, 'name' | 'duration_min' | 'color' | 'default_value' | 'active' | 'sort_order'>>) {
  const { supabase } = await assertSuperAdmin()
  const { error } = await supabase
    .from('clinic_consultation_types')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteConsultationType(id: string) {
  const { supabase } = await assertSuperAdmin()
  const { error } = await supabase.from('clinic_consultation_types').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}
