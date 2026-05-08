'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

// ── Salvar campos de prontuário na consulta ───────────────────
export async function salvarConsultaFields(
  consultaId: string,
  fields: { diagnosticos?: string | null; evolucao?: string | null; conduta?: string | null },
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { error } = await supabase
    .from('consultas')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', consultaId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  return { success: true }
}

// ── Resultados laboratoriais ──────────────────────────────────

export async function upsertLabResults(
  rows: {
    patient_id:  string
    consulta_id?: string | null
    exam_name:   string
    value:       string
    unit?:       string | null
    collected_at: string  // YYYY-MM-DD
  }[],
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { error } = await supabase
    .from('lab_results')
    .upsert(rows, { onConflict: 'patient_id,exam_name,collected_at' })

  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  return { success: true }
}

export async function deleteLabResult(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { error } = await supabase.from('lab_results').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  return { success: true }
}

// ── Exames de imagem ──────────────────────────────────────────

export async function upsertImagingResult(data: {
  id?:            string
  patient_id:     string
  tipo:           string
  data_realizado: string  // YYYY-MM-DD
  laudo_resumido?: string | null
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { data: result, error } = await supabase
    .from('imaging_results')
    .upsert(data)
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  return { success: true, data: { id: result.id } }
}

export async function deleteImagingResult(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { error } = await supabase.from('imaging_results').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  return { success: true }
}
