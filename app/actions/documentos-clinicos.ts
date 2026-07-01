'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getCallerTenantId } from '@/lib/get-caller-tenant'

export interface PatientDocument {
  id:           string
  patient_id:   string
  medico_id:    string
  title:        string
  content:      string
  template_key: string | null
  created_at:   string
  updated_at:   string
}

export interface ClinicDocumentTemplate {
  id:        string
  clinic_id: string
  medico_id: string
  title:     string
  content:   string
  created_at: string
  updated_at: string
}

// ── Patient documents ────────────────────────────────────────

export async function listPatientDocuments(patientId: string): Promise<PatientDocument[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('patient_documents')
    .select('id, patient_id, medico_id, title, content, template_key, created_at, updated_at')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })

  return (data ?? []) as PatientDocument[]
}

export async function createPatientDocument(input: {
  patientId:   string
  title:       string
  content:     string
  templateKey?: string
}): Promise<{ data?: PatientDocument; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const clinicId = await getCallerTenantId(user.id)

  const { data, error } = await supabase
    .from('patient_documents')
    .insert({
      clinic_id:    clinicId,
      patient_id:   input.patientId,
      medico_id:    user.id,
      title:        input.title,
      content:      input.content,
      template_key: input.templateKey ?? null,
    })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as PatientDocument }
}

export async function updatePatientDocument(input: {
  id:      string
  title:   string
  content: string
}): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase
    .from('patient_documents')
    .update({ title: input.title, content: input.content, updated_at: new Date().toISOString() })
    .eq('id', input.id)

  if (error) return { error: error.message }
  return {}
}

export async function deletePatientDocument(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase.from('patient_documents').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}

// ── Clinic document templates ─────────────────────────────────

export async function listClinicDocumentTemplates(): Promise<ClinicDocumentTemplate[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const clinicId = await getCallerTenantId(user.id)

  const { data } = await supabase
    .from('clinic_document_templates')
    .select('id, clinic_id, medico_id, title, content, created_at, updated_at')
    .eq('clinic_id', clinicId)
    .order('created_at', { ascending: false })

  return (data ?? []) as ClinicDocumentTemplate[]
}

export async function createClinicDocumentTemplate(input: {
  title:   string
  content: string
}): Promise<{ data?: ClinicDocumentTemplate; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const clinicId = await getCallerTenantId(user.id)

  const { data, error } = await supabase
    .from('clinic_document_templates')
    .insert({ clinic_id: clinicId, medico_id: user.id, title: input.title, content: input.content })
    .select()
    .single()

  if (error) return { error: error.message }
  return { data: data as ClinicDocumentTemplate }
}

export async function deleteClinicDocumentTemplate(id: string): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { error } = await supabase.from('clinic_document_templates').delete().eq('id', id)
  if (error) return { error: error.message }
  return {}
}
