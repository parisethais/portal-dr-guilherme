'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

type NfSource = 'honorario' | 'financial'

function bucketPath(source: NfSource, recordId: string, timestamp: number): string {
  const prefix = source === 'honorario' ? 'honorarios' : 'financial-nf'
  return `${prefix}/${recordId}/${timestamp}.pdf`
}

export async function uploadNfFile(
  source: NfSource,
  recordId: string,
  formData: FormData,
): Promise<ActionResult<{ filePath: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { success: false, error: 'Selecione um arquivo PDF.' }
  if (!file.type.includes('pdf')) return { success: false, error: 'Apenas PDFs são aceitos.' }
  if (file.size > 10 * 1024 * 1024) return { success: false, error: 'Máximo 10 MB.' }

  const filePath = bucketPath(source, recordId, Date.now())

  const { error: storageErr } = await supabase.storage
    .from('invoices')
    .upload(filePath, file)
  if (storageErr) return { success: false, error: storageErr.message }

  const admin = createAdminClient()
  const table = source === 'honorario' ? 'honorarios' : 'financial_entries'
  const { error: dbErr } = await admin
    .from(table)
    .update({ nf_file_path: filePath, updated_at: new Date().toISOString() })
    .eq('id', recordId)

  if (dbErr) {
    await supabase.storage.from('invoices').remove([filePath])
    return { success: false, error: dbErr.message }
  }

  revalidatePath('/medico')
  return { success: true, data: { filePath } }
}

export async function deleteNfFile(
  source: NfSource,
  recordId: string,
  filePath: string,
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  await supabase.storage.from('invoices').remove([filePath])

  const admin = createAdminClient()
  const table = source === 'honorario' ? 'honorarios' : 'financial_entries'
  const { error } = await admin
    .from(table)
    .update({ nf_file_path: null, updated_at: new Date().toISOString() })
    .eq('id', recordId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/medico')
  return { success: true }
}

export async function getNfSignedUrl(filePath: string): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { data, error } = await supabase.storage
    .from('invoices')
    .createSignedUrl(filePath, 60 * 10)

  if (error || !data?.signedUrl) return { success: false, error: error?.message ?? 'Erro ao gerar link.' }
  return { success: true, data: { url: data.signedUrl } }
}
