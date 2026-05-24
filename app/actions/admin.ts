'use server'

// IMPORTANTE: este arquivo só pode exportar funções async (server actions).
// Constantes e interfaces estão em @/lib/admin-constants para não quebrar o bundle.

import { createAdminClient } from '@/lib/supabase/admin-client'
import { revalidatePath } from 'next/cache'
import type { MemberPermissions } from '@/lib/admin-constants'

export type { MemberPermissions }

export interface Clinic {
  id:            string
  name:          string
  slug:          string
  logo_url:      string | null
  primary_color: string
  active:        boolean
  owner_id:      string | null
  created_at:    string
  tenant_id:     string
  member_count?: number
}

export interface ClinicMember {
  id:          string
  clinic_id:   string
  user_id:     string
  role:        'owner' | 'medico' | 'secretaria'
  created_at:  string
  permissions: MemberPermissions | null
  notes:       string | null
  profile?: {
    full_name: string | null
    email:     string | null
    role:      string | null
  }
}

export interface ClinicSetting {
  id:        string
  clinic_id: string
  key:       string
  value:     string | null
}

// ── Admin client helper ───────────────────────────────────────────────────
// A página /admin é protegida pelo middleware (redireciona se não for superadmin).
// Os server actions usam o service role diretamente, igual ao app/admin/page.tsx,
// sem precisar de verificação de auth por request.

function db() {
  return createAdminClient()
}

// ── Clinics ───────────────────────────────────────────────────────────────

export async function createClinic(input: {
  name: string; slug: string; primary_color?: string
}) {
  const supabase = db()
  const { data, error } = await supabase
    .from('clinics')
    .insert({ ...input, primary_color: input.primary_color ?? '#2D2B6B' })
    .select()
    .single()
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true, clinic: data }
}

export async function updateClinic(id: string, input: Partial<Pick<Clinic, 'name' | 'slug' | 'primary_color' | 'active'>>) {
  const supabase = db()
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
  const supabase = db()
  const { data, error } = await supabase
    .from('clinic_members')
    .select('id, clinic_id, user_id, role, created_at, permissions, notes')
    .eq('clinic_id', clinicId)
    .order('created_at')

  if (error) { console.error('[getClinicMembers]', error.message); return [] }
  if (!data?.length) return []

  const userIds = data.map((m: any) => m.user_id as string)

  // Busca profiles (pode ter email nulo)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .in('id', userIds)

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id as string, p]))

  // Para membros sem email no profiles, busca de auth.users via admin API
  const missingEmailIds = userIds.filter(uid => !profileMap.get(uid)?.email)
  const authEmailMap = new Map<string, string>()
  for (const uid of missingEmailIds) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(uid)
      if (authUser?.user?.email) authEmailMap.set(uid, authUser.user.email)
    } catch {
      // ignora falha de auth.admin em produção
    }
  }

  return data.map((m: any) => {
    const p = profileMap.get(m.user_id)
    const email = p?.email ?? authEmailMap.get(m.user_id) ?? null
    return {
      ...m,
      permissions: (m.permissions as MemberPermissions | null) ?? null,
      notes:       (m.notes as string | null) ?? null,
      profile: {
        full_name: p?.full_name ?? null,
        email,
        role: p?.role ?? null,
      },
    }
  })
}

// Gera uma senha temporária e a aplica via admin API
export async function generateMemberPassword(userId: string): Promise<{ password?: string; error?: string }> {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const password = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    + '!'
  const { error } = await db().auth.admin.updateUserById(userId, { password })
  if (error) return { error: error.message }
  return { password }
}

export async function updateMemberRole(memberId: string, role: 'medico' | 'secretaria') {
  const { error } = await db().from('clinic_members').update({ role }).eq('id', memberId)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function updateMemberPermissions(
  memberId: string,
  permissions: MemberPermissions,
  notes?: string,
) {
  const patch: any = { permissions }
  if (notes !== undefined) patch.notes = notes
  const { error } = await db().from('clinic_members').update(patch).eq('id', memberId)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function addClinicMember(clinicId: string, email: string, role: 'medico' | 'secretaria') {
  const supabase = db()
  const { data: profile, error: profileError } = await supabase
    .from('profiles').select('id').eq('email', email).maybeSingle()

  if (profileError) return { error: profileError.message }
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
  const { error } = await db().from('clinic_members').delete().eq('id', memberId)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// ── Settings ──────────────────────────────────────────────────────────────

export async function getClinicSettings(clinicId: string): Promise<Record<string, string>> {
  const { data } = await db().from('clinic_settings').select('key, value').eq('clinic_id', clinicId)
  return Object.fromEntries((data ?? []).map((s: any) => [s.key, s.value ?? '']))
}

export async function upsertClinicSetting(clinicId: string, key: string, value: string) {
  const { error } = await db()
    .from('clinic_settings')
    .upsert({ clinic_id: clinicId, key, value, updated_at: new Date().toISOString() },
             { onConflict: 'clinic_id,key' })
  if (error) return { error: error.message }

  // nome_exibicao também atualiza clinics.name para manter consistência
  if (key === 'nome_exibicao' && value.trim()) {
    await db().from('clinics').update({ name: value.trim() }).eq('id', clinicId)
  }

  revalidatePath('/admin')
  revalidatePath('/paciente')
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
  const { data, error } = await db().from('clinic_convenios').select('*').eq('clinic_id', clinicId).order('sort_order')
  if (error) { console.error('[getClinicConvenios]', error.message); return [] }
  return data ?? []
}

export async function createConvenio(clinicId: string, input: { name: string; code?: string; default_value?: number }) {
  const supabase = db()
  const { data: existing } = await supabase.from('clinic_convenios').select('sort_order').eq('clinic_id', clinicId).order('sort_order', { ascending: false }).limit(1).single()
  const sort_order = (existing?.sort_order ?? -1) + 1
  const { data, error } = await supabase.from('clinic_convenios').insert({ clinic_id: clinicId, ...input, sort_order }).select().single()
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true, convenio: data }
}

export async function updateConvenio(id: string, input: Partial<Pick<ClinicConvenio, 'name' | 'code' | 'default_value' | 'active' | 'sort_order'>>) {
  const { error } = await db().from('clinic_convenios').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteConvenio(id: string) {
  const { error } = await db().from('clinic_convenios').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// ── Horários ──────────────────────────────────────────────────────────────

export interface ClinicScheduleDay {
  id:          string
  clinic_id:   string
  day_of_week: number
  open_time:   string
  close_time:  string
  active:      boolean
}

export async function getClinicSchedule(clinicId: string): Promise<ClinicScheduleDay[]> {
  const { data, error } = await db().from('clinic_schedule').select('*').eq('clinic_id', clinicId).order('day_of_week')
  if (error) { console.error('[getClinicSchedule]', error.message); return [] }
  return data ?? []
}

export async function upsertScheduleDay(clinicId: string, day: Omit<ClinicScheduleDay, 'id' | 'clinic_id'>) {
  const { error } = await db().from('clinic_schedule').upsert({ clinic_id: clinicId, ...day, updated_at: new Date().toISOString() }, { onConflict: 'clinic_id,day_of_week' })
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
  const { data, error } = await db().from('clinic_consultation_types').select('*').eq('clinic_id', clinicId).order('sort_order')
  if (error) { console.error('[getClinicConsultationTypes]', error.message); return [] }
  return data ?? []
}

export async function createConsultationType(clinicId: string, input: { name: string; duration_min: number; color: string; default_value: number }) {
  const supabase = db()
  const { data: existing } = await supabase.from('clinic_consultation_types').select('sort_order').eq('clinic_id', clinicId).order('sort_order', { ascending: false }).limit(1).single()
  const sort_order = (existing?.sort_order ?? -1) + 1
  const { data, error } = await supabase.from('clinic_consultation_types').insert({ clinic_id: clinicId, ...input, sort_order }).select().single()
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true, tipo: data }
}

export async function updateConsultationType(id: string, input: Partial<Pick<ClinicConsultationType, 'name' | 'duration_min' | 'color' | 'default_value' | 'active' | 'sort_order'>>) {
  const { error } = await db().from('clinic_consultation_types').update({ ...input, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

export async function deleteConsultationType(id: string) {
  const { error } = await db().from('clinic_consultation_types').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}
