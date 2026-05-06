'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, ConsultaTipo, ConsultaLocal, ConsultaStatus } from '@/lib/types'

export async function createConsulta(data: {
  patient_id:  string
  tipo:        ConsultaTipo
  local:       ConsultaLocal
  data_hora:   string
  duracao_min: number
  observacoes?: string | null
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  if (!data.patient_id || !data.tipo || !data.local || !data.data_hora) {
    return { success: false, error: 'Preencha todos os campos obrigatórios.' }
  }

  const { data: result, error } = await supabase
    .from('consultas')
    .insert({
      patient_id:  data.patient_id,
      tipo:        data.tipo,
      local:       data.local,
      data_hora:   data.data_hora,
      duracao_min: data.duracao_min ?? 30,
      observacoes: data.observacoes?.trim() || null,
      created_by:  user.id,
    })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

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

  const { error } = await supabase
    .from('consultas')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', consultaId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  revalidatePath('/paciente')
  return { success: true }
}

export async function updateConsulta(
  consultaId: string,
  data: {
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

  const { error } = await supabase
    .from('consultas')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', consultaId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  revalidatePath('/paciente')
  return { success: true }
}
