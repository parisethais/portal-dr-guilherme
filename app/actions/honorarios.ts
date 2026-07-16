'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { revalidatePath } from 'next/cache'
import { getCallerTenantId } from '@/lib/get-caller-tenant'
import type { ActionResult } from '@/lib/types'

export interface Honorario {
  id:             string
  tenant_id:      string
  created_by:     string | null
  data:           string   // YYYY-MM-DD
  descricao:      string
  fonte_pagadora: string
  valor:          number
  valor_pago:     number | null  // valor líquido após impostos
  nf_file_path:   string | null
  nota_emitida:   boolean
  pago:           boolean
  obs:            string | null
  created_at:     string
  updated_at:     string
}

async function getTenantId(): Promise<string | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return getCallerTenantId(user.id)
}

export async function getHonorarios(): Promise<ActionResult<Honorario[]>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const tenantId = await getCallerTenantId(user.id)
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('honorarios')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('data', { ascending: false })

    if (error) return { success: false, error: error.message }
    return { success: true, data: (data ?? []) as Honorario[] }
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Erro ao buscar honorários.' }
  }
}

export async function createHonorario(
  input: Pick<Honorario, 'data' | 'descricao' | 'fonte_pagadora' | 'valor' | 'valor_pago' | 'obs'>
): Promise<ActionResult<Honorario>> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'Não autenticado.' }

    const tenantId = await getCallerTenantId(user.id)
    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('honorarios')
      .insert({ ...input, tenant_id: tenantId, created_by: user.id, nota_emitida: false, pago: false })
      .select('*')
      .single()

    if (error) return { success: false, error: error.message }
    revalidatePath('/medico')
    return { success: true, data: data as Honorario }
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Erro ao criar honorário.' }
  }
}

export async function updateHonorario(
  id: string,
  patch: Partial<Pick<Honorario, 'data' | 'descricao' | 'fonte_pagadora' | 'valor' | 'valor_pago' | 'nota_emitida' | 'pago' | 'obs'>>
): Promise<ActionResult> {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient
      .from('honorarios')
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) return { success: false, error: error.message }
    revalidatePath('/medico')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Erro ao atualizar honorário.' }
  }
}

export async function deleteHonorario(id: string): Promise<ActionResult> {
  try {
    const adminClient = createAdminClient()
    const { error } = await adminClient.from('honorarios').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    revalidatePath('/medico')
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err?.message ?? 'Erro ao excluir honorário.' }
  }
}
