'use server'

import { createAdminClient } from '@/lib/supabase/admin-client'
import { requireStaff } from '@/lib/auth-guard'
import { runAutomation } from '@/lib/automation-runner'
import { revalidatePath } from 'next/cache'

// Tipos e catálogo: importar de '@/lib/automation-catalog' (sem 'use server').
// Este arquivo só exporta funções async (server actions).
import type {
  AutomationType,
  AutomationParams,
  ClinicAutomation,
  AutomationLog,
} from '@/lib/automation-catalog'

// Painel admin: somente superadmin
async function requireSuperadmin(): Promise<boolean> {
  const ctx = await requireStaff()
  return ctx?.role === 'superadmin'
}

// ── Fetch automações de uma clínica ───────────────────────────────────────

export async function getClinicAutomations(clinicId: string): Promise<ClinicAutomation[]> {
  if (!(await requireSuperadmin())) return []
  const db = createAdminClient()
  const { data, error } = await db
    .from('clinic_automations')
    .select('*')
    .eq('clinic_id', clinicId)
    .order('created_at')

  if (error) { console.error('[getClinicAutomations]', error); return [] }
  return (data ?? []) as ClinicAutomation[]
}

// ── Upsert (criar ou atualizar) automação ────────────────────────────────

export async function upsertClinicAutomation(
  clinicId: string,
  type: AutomationType,
  active: boolean,
  params: AutomationParams,
): Promise<{ success?: boolean; error?: string }> {
  if (!(await requireSuperadmin())) return { error: 'Não autorizado.' }
  const db = createAdminClient()
  const { error } = await db
    .from('clinic_automations')
    .upsert(
      { clinic_id: clinicId, type, active, params, updated_at: new Date().toISOString() },
      { onConflict: 'clinic_id,type' },
    )

  if (error) return { error: error.message }
  revalidatePath('/admin')
  return { success: true }
}

// ── Logs ─────────────────────────────────────────────────────────────────

export async function getAutomationLogs(
  clinicId: string,
  automationId?: string,
  limit = 20,
): Promise<AutomationLog[]> {
  if (!(await requireSuperadmin())) return []
  const db = createAdminClient()
  let query = db
    .from('automation_logs')
    .select('*, profiles(full_name)')
    .eq('clinic_id', clinicId)
    .order('triggered_at', { ascending: false })
    .limit(limit)

  if (automationId) query = query.eq('automation_id', automationId)

  const { data, error } = await query
  if (error) { console.error('[getAutomationLogs]', error); return [] }

  return (data ?? []).map((l: Record<string, unknown>) => ({
    ...(l as Omit<AutomationLog, 'patient_name'>),
    patient_name: (l.profiles as { full_name?: string } | null)?.full_name ?? null,
  }))
}

// ── Execução manual ("Testar agora" no admin) ────────────────────────────

export async function runAutomacoesManual(clinicId?: string): Promise<{
  success?: boolean
  error?: string
  executado_em?: string
  resultados?: Awaited<ReturnType<typeof runAutomation>>[]
}> {
  if (!(await requireSuperadmin())) return { error: 'Não autorizado.' }

  const db = createAdminClient()
  let query = db.from('clinic_automations').select('*').eq('active', true)
  if (clinicId) query = query.eq('clinic_id', clinicId)

  const { data: automations, error } = await query
  if (error) return { error: error.message }
  if (!automations?.length) {
    return { success: true, executado_em: new Date().toISOString(), resultados: [] }
  }

  const resultados = await Promise.all(
    (automations as ClinicAutomation[]).map(a => runAutomation(a))
  )
  return { success: true, executado_em: new Date().toISOString(), resultados }
}
