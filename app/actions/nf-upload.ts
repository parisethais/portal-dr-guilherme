'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { requireStaff, assertRowInTenant, type StaffContext } from '@/lib/auth-guard'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

type NfSource = 'honorario' | 'financial'

const TABLE: Record<NfSource, string> = {
  honorario: 'honorarios',
  financial: 'financial_entries',
}

function bucketPath(source: NfSource, recordId: string, timestamp: number): string {
  const prefix = source === 'honorario' ? 'honorarios' : 'financial-nf'
  return `${prefix}/${recordId}/${timestamp}.pdf`
}

// Verifica que um path de storage pertence a um registro do tenant do caller.
// Formatos válidos: honorarios/<id>/... | financial-nf/<id>/... | <patientId>/... (invoices)
async function assertPathInTenant(filePath: string, ctx: StaffContext): Promise<boolean> {
  if (filePath.includes('..')) return false
  const [prefix, id] = filePath.split('/')
  if (!prefix || !id) return false

  if (prefix === 'honorarios')   return assertRowInTenant('honorarios', id, ctx)
  if (prefix === 'financial-nf') return assertRowInTenant('financial_entries', id, ctx)

  // Path legado de invoices: primeiro segmento é o patientId
  if (ctx.tenantId === null) return true
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('id', prefix)
    .eq('tenant_id', ctx.tenantId)
    .single()
  return !!data
}

export async function uploadNfFile(
  source: NfSource,
  recordId: string,
  formData: FormData,
): Promise<ActionResult<{ filePath: string }>> {
  const ctx = await requireStaff()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (!(await assertRowInTenant(TABLE[source], recordId, ctx))) {
    return { success: false, error: 'Não autorizado.' }
  }

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { success: false, error: 'Selecione um arquivo PDF.' }
  if (!file.type.includes('pdf')) return { success: false, error: 'Apenas PDFs são aceitos.' }
  if (file.size > 10 * 1024 * 1024) return { success: false, error: 'Máximo 10 MB.' }

  const supabase = await createClient()
  const filePath = bucketPath(source, recordId, Date.now())

  const { error: storageErr } = await supabase.storage
    .from('invoices')
    .upload(filePath, file)
  if (storageErr) return { success: false, error: storageErr.message }

  const admin = createAdminClient()
  const { error: dbErr } = await admin
    .from(TABLE[source])
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
  const ctx = await requireStaff()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (!(await assertRowInTenant(TABLE[source], recordId, ctx))) {
    return { success: false, error: 'Não autorizado.' }
  }
  if (!(await assertPathInTenant(filePath, ctx))) {
    return { success: false, error: 'Não autorizado.' }
  }

  const supabase = await createClient()
  await supabase.storage.from('invoices').remove([filePath])

  const admin = createAdminClient()
  const { error } = await admin
    .from(TABLE[source])
    .update({ nf_file_path: null, updated_at: new Date().toISOString() })
    .eq('id', recordId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/medico')
  return { success: true }
}

export async function getNfSignedUrl(filePath: string): Promise<ActionResult<{ url: string }>> {
  const ctx = await requireStaff()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (!(await assertPathInTenant(filePath, ctx))) {
    return { success: false, error: 'Não autorizado.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.storage
    .from('invoices')
    .createSignedUrl(filePath, 60 * 10)

  if (error || !data?.signedUrl) return { success: false, error: error?.message ?? 'Erro ao gerar link.' }
  return { success: true, data: { url: data.signedUrl } }
}
