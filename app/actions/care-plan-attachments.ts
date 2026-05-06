'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

export async function uploadCarePlanAttachment(
  patientId: string,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const file = formData.get('file') as File
  const rawTitle = formData.get('title') as string

  if (!file || file.size === 0) return { success: false, error: 'Selecione um arquivo.' }
  if (file.size > 100 * 1024 * 1024) return { success: false, error: 'O arquivo deve ter no máximo 100 MB.' }

  const title = rawTitle?.trim() || file.name.replace(/\.[^.]+$/, '')
  const ext = file.name.split('.').pop()
  const fileName = `${patientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: storageError } = await supabase.storage
    .from('care-attachments')
    .upload(fileName, file)

  if (storageError) return { success: false, error: `Erro ao enviar arquivo: ${storageError.message}` }

  const {
    data: { publicUrl },
  } = supabase.storage.from('care-attachments').getPublicUrl(fileName)

  const { error: dbError } = await supabase.from('care_plan_attachments').insert({
    patient_id: patientId,
    title,
    file_url: publicUrl,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    uploaded_by: user.id,
  })

  if (dbError) {
    await supabase.storage.from('care-attachments').remove([fileName])
    return { success: false, error: `Erro ao salvar anexo: ${dbError.message}` }
  }

  revalidatePath('/medico')
  revalidatePath('/paciente')
  return { success: true }
}

export async function deleteCarePlanAttachment(attachmentId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { data: attachment, error: fetchError } = await supabase
    .from('care_plan_attachments')
    .select('file_url')
    .eq('id', attachmentId)
    .single()

  if (fetchError || !attachment) return { success: false, error: 'Anexo não encontrado.' }

  const { error } = await supabase
    .from('care_plan_attachments')
    .delete()
    .eq('id', attachmentId)

  if (error) return { success: false, error: error.message }

  const urlParts = attachment.file_url.split('/care-attachments/')
  if (urlParts[1]) {
    await supabase.storage.from('care-attachments').remove([urlParts[1]])
  }

  revalidatePath('/medico')
  revalidatePath('/paciente')
  return { success: true }
}
