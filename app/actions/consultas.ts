'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { revalidatePath } from 'next/cache'
import { notificarCopilot } from '@/lib/copilot'
import type { ActionResult, ConsultaTipo, ConsultaLocal, ConsultaStatus } from '@/lib/types'
import { getCallerTenantId } from '@/lib/get-caller-tenant'
import { syncConsultaCreate, syncConsultaUpdate, syncConsultaCancel, syncConsultaDelete } from '@/lib/sync-google-calendar'

async function buscarPerfil(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('full_name, phone, email')
    .eq('id', userId)
    .single()
  return data
}

export async function createConsulta(data: {
  patient_id:   string
  tipo:         ConsultaTipo
  local:        ConsultaLocal
  data_hora:    string
  duracao_min:  number
  observacoes?: string | null
  status?:      ConsultaStatus
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  if (!data.patient_id || !data.tipo || !data.local || !data.data_hora) {
    return { success: false, error: 'Preencha todos os campos obrigatórios.' }
  }

  // Usa adminClient para bypass de RLS — autenticação já foi validada acima
  const db = createAdminClient()
  const tenantId = await getCallerTenantId(user.id)

  const { data: result, error } = await db
    .from('consultas')
    .insert({
      patient_id:  data.patient_id,
      tipo:        data.tipo,
      local:       data.local,
      data_hora:   data.data_hora,
      duracao_min: data.duracao_min ?? 30,
      observacoes: data.observacoes?.trim() || null,
      status:      data.status ?? 'agendada',
      created_by:  user.id,
      tenant_id:   tenantId,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  // Sync Google Calendar (fire-and-forget) — tenantId já foi resolvido acima
  syncConsultaCreate(tenantId, {
    id:          result.id,
    patient_id:  data.patient_id,
    tipo:        data.tipo,
    local:       data.local,
    data_hora:   data.data_hora,
    duracao_min: data.duracao_min ?? 30,
    status:      data.status ?? 'agendada',
    observacoes: data.observacoes ?? null,
  })

  buscarPerfil(supabase, data.patient_id).then(paciente => {
    if (paciente) {
      notificarCopilot({
        evento: 'consulta_agendada',
        paciente: { nome: paciente.full_name ?? '', telefone: paciente.phone, email: (paciente as { email?: string }).email },
        consulta: { data: data.data_hora, tipo: data.tipo },
      })
    }
  })

  revalidatePath('/medico')
  revalidatePath('/paciente')
  return { success: true, data: { id: result.id } }
}

export async function updateConsultaStatus(
  consultaId: string,
  status: ConsultaStatus
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  // Usa adminClient para bypass de RLS — secretaria não tem policy de UPDATE
  const db = createAdminClient()
  const tenantId = await getCallerTenantId(user.id)

  const { data: consulta, error } = await db
    .from('consultas')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', consultaId)
    .eq('tenant_id', tenantId)
    .select('id, patient_id, tipo, local, data_hora, duracao_min, status, observacoes, google_calendar_event_id')
    .single()

  if (error) return { success: false, error: error.message }

  // Sync Google Calendar (fire-and-forget)
  if (consulta) {
    if (status === 'cancelada') {
      syncConsultaCancel(tenantId, consultaId)
    } else {
      syncConsultaUpdate(tenantId, { ...consulta, status })
    }
  }

  revalidatePath('/medico')
  revalidatePath('/paciente')
  return { success: true }
}

export async function updateConsulta(
  consultaId: string,
  data: {
    patient_id?:  string
    tipo?:        ConsultaTipo
    local?:       ConsultaLocal
    data_hora?:   string
    duracao_min?: number
    observacoes?: string | null
    status?:      ConsultaStatus
  }
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  // Usa adminClient para bypass de RLS — secretaria não tem policy de UPDATE
  const db = createAdminClient()
  const tenantId = await getCallerTenantId(user.id)

  // Se reatribuindo paciente, o novo paciente precisa ser do mesmo tenant
  if (data.patient_id) {
    const { data: p } = await db
      .from('profiles')
      .select('id')
      .eq('id', data.patient_id)
      .eq('tenant_id', tenantId)
      .single()
    if (!p) return { success: false, error: 'Não autorizado.' }
  }

  // Se mudou a data_hora, notifica como remarcação
  if (data.data_hora) {
    const { data: consulta } = await db
      .from('consultas')
      .select('data_hora, patient_id')
      .eq('id', consultaId)
      .eq('tenant_id', tenantId)
      .single()

    if (consulta) {
      buscarPerfil(supabase, consulta.patient_id).then(paciente => {
        if (paciente) {
          notificarCopilot({
            evento: 'consulta_remarcada',
            paciente: { nome: paciente.full_name ?? '', telefone: paciente.phone },
            consulta: { data_anterior: consulta.data_hora, data_nova: data.data_hora! },
          })
        }
      })
    }
  }

  const { data: updated, error } = await db
    .from('consultas')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', consultaId)
    .eq('tenant_id', tenantId)
    .select('id, patient_id, tipo, local, data_hora, duracao_min, status, observacoes, google_calendar_event_id')
    .single()

  if (error) return { success: false, error: error.message }

  // Sync Google Calendar (fire-and-forget)
  if (updated) {
    syncConsultaUpdate(tenantId, updated)
  }

  revalidatePath('/medico')
  revalidatePath('/paciente')
  return { success: true }
}

export async function deleteConsulta(consultaId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const db = createAdminClient()
  const tenantId = await getCallerTenantId(user.id)

  // Busca o google_calendar_event_id antes de deletar (depois da exclusão não tem mais como)
  const { data: row } = await db
    .from('consultas')
    .select('google_calendar_event_id')
    .eq('id', consultaId)
    .eq('tenant_id', tenantId)
    .single()

  const { error } = await db.from('consultas').delete().eq('id', consultaId).eq('tenant_id', tenantId)
  if (error) return { success: false, error: error.message }

  // Remove do Google Calendar (fire-and-forget)
  if (row?.google_calendar_event_id) {
    syncConsultaDelete(tenantId, row.google_calendar_event_id)
  }

  revalidatePath('/medico')
  revalidatePath('/paciente')
  return { success: true }
}

export async function gerarLinksLembrete(
  consultaId: string,
  baseUrl?: string
): Promise<ActionResult<{ confirmar: string; cancelar: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { gerarLinksLembrete: gerar } = await import('@/lib/consulta-token')
  return { success: true, data: gerar(consultaId, baseUrl) }
}
