'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCallerTenantId } from '@/lib/get-caller-tenant'


export interface VisitaHospitalar {
  id:            string
  internacao_id: string
  tenant_id:     string
  data_visita:   string
  visitador:     string
  dialise:       string
  created_at:    string
}

export interface Internacao {
  id:                     string
  tenant_id:              string
  patient_id:             string
  hospital:               string
  hospital_outro:         string | null
  data_internacao:        string
  motivo_internacao:      string | null
  data_alta:              string | null
  diagnostico_internacao: string | null
  valor_visita:           number | null
  finalizada:             boolean
  created_by:             string | null
  created_at:             string
  updated_at:             string
  visitas:                VisitaHospitalar[]
  patient_name?:          string | null
}


async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const tenantId = await getCallerTenantId(user.id)
  return { user, tenantId, admin: createAdminClient() }
}

export async function getInternacoes(patientId?: string): Promise<Internacao[]> {
  try {
    const { tenantId, admin } = await getCtx()

    let query = admin
      .from('internacoes')
      .select('*, visitas_hospitalares(*), profiles(full_name)')
      .eq('tenant_id', tenantId)
      .order('data_internacao', { ascending: false })

    if (patientId) query = query.eq('patient_id', patientId)

    const { data, error } = await query
    if (error) throw error

    return (data ?? []).map((row: any) => ({
      ...row,
      visitas: (row.visitas_hospitalares ?? []).sort((a: any, b: any) =>
        a.data_visita.localeCompare(b.data_visita)
      ),
      patient_name: row.profiles?.full_name ?? null,
    }))
  } catch {
    return []
  }
}

export async function createInternacao(input: {
  patient_id:        string
  hospital:          string
  hospital_outro?:   string
  data_internacao:   string
  motivo_internacao?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { user, tenantId, admin } = await getCtx()
    const { data, error } = await admin
      .from('internacoes')
      .insert({
        tenant_id:         tenantId,
        patient_id:        input.patient_id,
        hospital:          input.hospital,
        hospital_outro:    input.hospital_outro ?? null,
        data_internacao:   input.data_internacao,
        motivo_internacao: input.motivo_internacao ?? null,
        created_by:        user.id,
      })
      .select('id')
      .single()
    if (error) throw error
    return { success: true, id: data.id }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function addVisita(input: {
  internacao_id: string
  data_visita:   string
  visitador:     string
  dialise:       string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { tenantId, admin } = await getCtx()
    const { error } = await admin
      .from('visitas_hospitalares')
      .insert({
        internacao_id: input.internacao_id,
        tenant_id:     tenantId,
        data_visita:   input.data_visita,
        visitador:     input.visitador,
        dialise:       input.dialise,
      })
    if (error) throw error
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteVisita(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { admin } = await getCtx()
    const { error } = await admin.from('visitas_hospitalares').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function finalizarInternacao(id: string, input: {
  data_alta:              string
  diagnostico_internacao?: string
  valor_visita?:           number
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { admin } = await getCtx()
    const { error } = await admin
      .from('internacoes')
      .update({
        finalizada:             true,
        data_alta:              input.data_alta,
        diagnostico_internacao: input.diagnostico_internacao ?? null,
        valor_visita:           input.valor_visita ?? null,
        updated_at:             new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deleteInternacao(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { admin } = await getCtx()
    const { error } = await admin.from('internacoes').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
