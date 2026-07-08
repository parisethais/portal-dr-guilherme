'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'
import type { Prescricao } from '@/lib/types'
import { getCallerTenantId } from '@/lib/get-caller-tenant'

export async function getPrescricoesByPatient(
  patientId: string
): Promise<ActionResult<{ ativas: Prescricao[]; inativas: Prescricao[] }>> {
  try {
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('prescricoes')
      .select('*')
      .eq('patient_id', patientId)
      .order('data_inicio', { ascending: false })

    if (error) return { success: false, error: error.message }

    const all = (data ?? []) as Prescricao[]
    return {
      success: true,
      data: {
        ativas:   all.filter(p => p.ativo),
        inativas: all.filter(p => !p.ativo),
      },
    }
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Erro ao buscar prescrições.' }
  }
}

export async function createPrescricao(
  patientId: string,
  data: {
    medicamento: string
    dose?:       string
    via?:        string
    posologia?:  string
    obs?:        string
    data_inicio?: string
  }
): Promise<ActionResult<Prescricao>> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Não autenticado.' }

    const tenantId = await getCallerTenantId(user.id)
    const adminClient = createAdminClient()

    const { data: created, error } = await adminClient
      .from('prescricoes')
      .insert({
        patient_id:  patientId,
        tenant_id:   tenantId,
        created_by:  user.id,
        medicamento: data.medicamento,
        dose:        data.dose        ?? null,
        via:         data.via         ?? null,
        posologia:   data.posologia   ?? null,
        obs:         data.obs         ?? null,
        data_inicio: data.data_inicio ?? new Date().toISOString().slice(0, 10),
        ativo:       true,
      })
      .select('*')
      .single()

    if (error) return { success: false, error: error.message }

    revalidatePath('/medico')
    return { success: true, data: created as Prescricao }
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Erro ao criar prescrição.' }
  }
}

export async function getMedicamentosHistory(): Promise<string[]> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const tenantId = await getCallerTenantId(user.id)
    const adminClient = createAdminClient()

    const { data } = await adminClient
      .from('prescricoes')
      .select('medicamento')
      .eq('tenant_id', tenantId)
      .not('medicamento', 'is', null)

    if (!data) return []

    const seen = new Set<string>()
    for (const row of data) {
      const m = row.medicamento?.trim()
      if (m && m.length >= 2) seen.add(m)
    }

    return Array.from(seen).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  } catch {
    return []
  }
}

export async function inativarPrescricao(id: string): Promise<ActionResult> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return { success: false, error: 'Não autenticado.' }

    const adminClient = createAdminClient()
    const now = new Date().toISOString()

    const { error } = await adminClient
      .from('prescricoes')
      .update({
        ativo:      false,
        data_fim:   now.slice(0, 10),
        updated_at: now,
      })
      .eq('id', id)

    if (error) return { success: false, error: error.message }

    revalidatePath('/medico')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Erro ao inativar prescrição.' }
  }
}
