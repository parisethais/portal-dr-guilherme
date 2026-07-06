'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'
import { notifyCopilotEvent } from '@/lib/automation-runner'
import { computeLabAlerts } from '@/lib/lab-alerts'
import { getCallerTenantId } from '@/lib/get-caller-tenant'

// ── Salvar campos de prontuário na consulta ───────────────────
export async function salvarConsultaFields(
  consultaId: string,
  fields: {
    obs_consulta?: string | null
    diagnosticos?: string | null
    evolucao?:     string | null
    exame_fisico?: string | null
    pas?:          number | null
    pad?:          number | null
    fc?:           number | null
    impressao?:    string | null
    conduta?:      string | null
  },
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  // Guard: prontuário já finalizado não pode ser editado
  const { data: consulta } = await supabase
    .from('consultas')
    .select('prontuario_finalizado, patient_id')
    .eq('id', consultaId)
    .single()
  if (consulta?.prontuario_finalizado) {
    return { success: false, error: 'Este prontuário já foi finalizado e não pode ser editado.' }
  }

  // Usa adminClient para bypass de RLS — secretaria não tem policy de UPDATE em consultas
  const db = createAdminClient()
  const { error } = await db
    .from('consultas')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', consultaId)

  if (error) return { success: false, error: error.message }

  // ── Sincroniza profiles.diagnostico com o prontuário ─────────
  // Sempre que diagnósticos são salvos, atualiza o campo de perfil
  // com os nomes da consulta mais recente que tenha diagnósticos.
  if (fields.diagnosticos !== undefined && consulta?.patient_id) {
    const { data: latest } = await db
      .from('consultas')
      .select('diagnosticos')
      .eq('patient_id', consulta.patient_id)
      .not('diagnosticos', 'is', null)
      .order('data_hora', { ascending: false })
      .limit(5)

    let syncedDiag: string | null = null
    if (latest) {
      for (const row of latest) {
        if (!row.diagnosticos) continue
        try {
          const parsed = JSON.parse(row.diagnosticos)
          if (Array.isArray(parsed) && parsed.length > 0) {
            syncedDiag = parsed
              .map((e: { nome?: string }) => e.nome)
              .filter(Boolean)
              .join(', ')
            break
          }
        } catch {
          // legacy plain text — use as-is
          if (row.diagnosticos.trim()) { syncedDiag = row.diagnosticos.trim(); break }
        }
      }
    }

    await db
      .from('profiles')
      .update({ diagnostico: syncedDiag })
      .eq('id', consulta.patient_id)
  }

  revalidatePath('/medico')
  return { success: true }
}

// ── Finalizar prontuário (irreversível) ───────────────────────
export async function finalizarProntuario(consultaId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const adminDb = createAdminClient()
  const { error } = await adminDb
    .from('consultas')
    .update({
      prontuario_finalizado:    true,
      prontuario_finalizado_at: new Date().toISOString(),
      updated_at:               new Date().toISOString(),
    })
    .eq('id', consultaId)

  if (error) return { success: false, error: error.message }

  // Notifica copilot (fire-and-forget)
  const db = createAdminClient()
  const { data: consulta } = await db
    .from('consultas')
    .select('id, tipo, data_hora, patient_id, profiles!patient_id(full_name, phone, retorno_previsto)')
    .eq('id', consultaId)
    .single()

  if (consulta) {
    const p = consulta.profiles as { full_name?: string; phone?: string; retorno_previsto?: string } | null
    notifyCopilotEvent('prontuario_finalizado', {
      paciente: {
        id:      consulta.patient_id,
        nome:    p?.full_name ?? null,
        telefone: p?.phone    ?? null,
      },
      consulta: {
        id:               consulta.id,
        data:             new Date(consulta.data_hora).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        tipo:             consulta.tipo,
        retorno_previsto: p?.retorno_previsto ?? null,
      },
    })
  }

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

  const tenantId = await getCallerTenantId(user.id)
  const rowsWithTenant = rows.map(r => ({ ...r, tenant_id: tenantId }))

  const { error } = await supabase
    .from('lab_results')
    .upsert(rowsWithTenant, { onConflict: 'patient_id,exam_name,collected_at' })

  if (error) return { success: false, error: error.message }

  // Verifica alertas críticos nos resultados recém-salvos (fire-and-forget)
  if (rows.length > 0) {
    const patientId = rows[0].patient_id
    const db = createAdminClient()

    const [{ data: allResults }, { data: patient }] = await Promise.all([
      db.from('lab_results')
        .select('id, patient_id, exam_name, value, unit, collected_at, consulta_id, created_at')
        .eq('patient_id', patientId)
        .order('collected_at', { ascending: false })
        .limit(200),
      db.from('profiles')
        .select('full_name, phone')
        .eq('id', patientId)
        .single(),
    ])

    const alertas = computeLabAlerts(allResults ?? [])
    const criticos = alertas.filter(a => a.severity === 'critical')

    for (const alerta of criticos) {
      // Só notifica se o valor crítico está nos rows recém-salvos
      const isFresh = rows.some(r => r.exam_name === alerta.exam_name)
      if (!isFresh) continue

      notifyCopilotEvent('lab_critico', {
        paciente: {
          id:       patientId,
          nome:     patient?.full_name ?? null,
          telefone: patient?.phone     ?? null,
        },
        alerta: {
          exame:      alerta.exam_name,
          valor:      `${alerta.latestValue}${alerta.latestUnit ? ' ' + alerta.latestUnit : ''}`,
          referencia: alerta.message,
          severidade: alerta.severity,
          mensagem:   alerta.message,
          data_coleta: alerta.latestDate,
        },
      })
    }
  }

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
  id?:             string
  patient_id:      string
  tipo:            string
  data_realizado:  string  // YYYY-MM-DD
  laudo_resumido?: string | null
  file_url?:       string | null
  file_name?:      string | null
  extra_files?:    { url: string; name: string }[] | null
}): Promise<ActionResult<{ id: string }>> {
  // Auth check via cookie client
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  // Usa adminClient para bypassar RLS (policy só cobre role='medico', mas secretaria/superadmin
  // também precisam inserir — autenticação já foi verificada acima)
  const db = createAdminClient()
  const tenantId = await getCallerTenantId(user.id)
  const { data: result, error } = await db
    .from('imaging_results')
    .upsert({ ...data, tenant_id: tenantId })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  // Notifica copilot sobre novo resultado de imagem (fire-and-forget)
  const { data: patient } = await db
    .from('profiles')
    .select('full_name, phone')
    .eq('id', data.patient_id)
    .single()

  notifyCopilotEvent('exame_resultado_disponivel', {
    paciente: {
      id:       data.patient_id,
      nome:     patient?.full_name ?? null,
      telefone: patient?.phone     ?? null,
    },
    exame: {
      tipo:        data.tipo,
      descricao:   data.laudo_resumido ?? null,
      data_coleta: data.data_realizado,
    },
  })

  revalidatePath('/medico')
  return { success: true, data: { id: result.id } }
}

export async function deleteImagingResult(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const db = createAdminClient()
  const { error } = await db.from('imaging_results').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  return { success: true }
}

export async function upsertBiopsiaResult(data: {
  id?:             string
  patient_id:      string
  tipo:            string
  data_realizado:  string
  laudo_resumido?: string | null
  file_url?:       string | null
  file_name?:      string | null
  extra_files?:    { url: string; name: string }[] | null
}): Promise<ActionResult<{ id: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const db = createAdminClient()
  const tenantId = await getCallerTenantId(user.id)
  const { data: result, error } = await db
    .from('biopsia_results')
    .upsert({ ...data, tenant_id: tenantId })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  return { success: true, data: { id: result.id } }
}

export async function deleteBiopsiaResult(id: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const db = createAdminClient()
  const { error } = await db.from('biopsia_results').delete().eq('id', id)
  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  return { success: true }
}
