'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

export async function uploadExame(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const file = formData.get('file') as File
  const rawTitle = formData.get('title') as string

  if (!file || file.size === 0) return { success: false, error: 'Selecione um arquivo.' }
  if (file.size > 10 * 1024 * 1024) return { success: false, error: 'O arquivo deve ter no máximo 10 MB.' }

  const title = rawTitle?.trim() || file.name.replace(/\.[^.]+$/, '')
  const ext = file.name.split('.').pop()
  const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: storageError } = await supabase.storage
    .from('exames')
    .upload(fileName, file)

  if (storageError) return { success: false, error: `Erro ao enviar arquivo: ${storageError.message}` }

  const {
    data: { publicUrl },
  } = supabase.storage.from('exames').getPublicUrl(fileName)

  const { error: dbError } = await supabase.from('patient_exams').insert({
    patient_id: user.id,
    title,
    file_url: publicUrl,
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
  })

  if (dbError) {
    await supabase.storage.from('exames').remove([fileName])
    return { success: false, error: `Erro ao salvar exame: ${dbError.message}` }
  }

  revalidatePath('/paciente')
  return { success: true }
}

export async function deleteExame(exameId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { data: exame, error: fetchError } = await supabase
    .from('patient_exams')
    .select('file_url')
    .eq('id', exameId)
    .eq('patient_id', user.id)
    .single()

  if (fetchError || !exame) return { success: false, error: 'Exame não encontrado.' }

  const { error } = await supabase
    .from('patient_exams')
    .delete()
    .eq('id', exameId)
    .eq('patient_id', user.id)

  if (error) return { success: false, error: error.message }

  // Extrai o path do storage a partir da URL pública
  const urlParts = exame.file_url.split('/exames/')
  if (urlParts[1]) {
    await supabase.storage.from('exames').remove([urlParts[1]])
  }

  revalidatePath('/paciente')
  return { success: true }
}
