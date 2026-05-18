'use server'

import { createClient } from '@/lib/supabase/server'
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

async function assertSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'superadmin') throw new Error('Acesso negado')
  return { supabase, userId: user.id }
}

// ── Clinics ───────────────────────────────────────────────────────────────

export async function getClinics(): Promise<Clinic[]> {
  const { supabase } = await assertSuperAdmin()
  const { data, error } = await supabase
    .from('clinics')
    .select('*, clinic_members(count)')
    .order('created_at', { ascending: false })
  if (error) { console.error(error); return [] }
  return (data ?? []).map((c: any) => ({
    ...c,
    member_count: c.clinic_members?.[0]?.count ?? 0,
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
