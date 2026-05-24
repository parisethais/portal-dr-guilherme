'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'
import { getCallerTenantId } from '@/lib/get-caller-tenant'

export async function uploadDocument(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const file = formData.get('file') as File
  const patientId = formData.get('patient_id') as string
  const title = formData.get('title') as string
  const description = formData.get('description') as string

  if (!file || !patientId || !title) {
    return { success: false, error: 'Preencha todos os campos obrigatórios.' }
  }

  if (file.size > 10 * 1024 * 1024) {
    return { success: false, error: 'O arquivo deve ter no máximo 10 MB.' }
  }

  const ext = file.name.split('.').pop()
  const fileName = `${patientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: storageError } = await supabase.storage
    .from('documents')
    .upload(fileName, file)

  if (storageError) {
    return { success: false, error: `Erro ao enviar arquivo: ${storageError.message}` }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from('documents').getPublicUrl(fileName)

  const tenantId = await getCallerTenantId(user.id)

  const { error: dbError } = await supabase.from('documents').insert({
    patient_id:  patientId,
    uploaded_by: user.id,
    title,
    description: description || null,
    file_url:    publicUrl,
    file_name:   file.name,
    file_type:   file.type,
    tenant_id:   tenantId,
  })

  if (dbError) {
    return { success: false, error: `Erro ao salvar documento: ${dbError.message}` }
  }

  revalidatePath('/medico')
  return { success: true }
}

export async function deleteDocument(documentId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { error } = await supabase.from('documents').delete().eq('id', documentId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  revalidatePath('/paciente')
  return { success: true }
}
