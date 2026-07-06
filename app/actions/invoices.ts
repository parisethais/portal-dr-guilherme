'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'
import { getCallerTenantId } from '@/lib/get-caller-tenant'

export async function uploadInvoice(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const file = formData.get('file') as File
  const patientId = formData.get('patient_id') as string
  const amount = parseFloat(formData.get('amount') as string)
  const issueDate = formData.get('issue_date') as string
  const tipo = (formData.get('tipo') as string) || 'consulta'
  const numeroNota = (formData.get('numero_nota') as string) || null

  // Campos condicionais por tipo
  const consultaDate       = tipo === 'consulta'   ? ((formData.get('consulta_date') as string) || null)       : null
  const internacaoInicio   = tipo === 'internacao' ? ((formData.get('internacao_inicio') as string) || null)   : null
  const internacaoFim      = tipo === 'internacao' ? ((formData.get('internacao_fim') as string) || null)      : null
  const internacaoDiasRaw  = tipo === 'internacao' ? (formData.get('internacao_dias') as string)               : null
  const internacaoDias     = internacaoDiasRaw ? parseInt(internacaoDiasRaw, 10) : null
  const internacaoLocal    = tipo === 'internacao' ? ((formData.get('internacao_local') as string) || null)    : null

  if (!file || file.size === 0) return { success: false, error: 'Selecione um arquivo PDF.' }
  if (!file.type.includes('pdf')) return { success: false, error: 'Apenas arquivos PDF são aceitos.' }
  if (file.size > 10 * 1024 * 1024) return { success: false, error: 'O arquivo deve ter no máximo 10 MB.' }
  if (!patientId) return { success: false, error: 'Selecione um paciente.' }
  if (isNaN(amount) || amount <= 0) return { success: false, error: 'Informe um valor válido.' }
  if (!issueDate) return { success: false, error: 'Informe a data de emissão.' }

  const ext = 'pdf'
  const filePath = `${patientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error: storageError } = await supabase.storage
    .from('invoices')
    .upload(filePath, file)

  if (storageError) return { success: false, error: `Erro ao enviar arquivo: ${storageError.message}` }

  const tenantId = await getCallerTenantId(user.id)

  const { error: dbError } = await supabase.from('invoices').insert({
    patient_id:        patientId,
    file_path:         filePath,
    amount,
    issue_date:        issueDate,
    tipo,
    numero_nota:       numeroNota,
    consulta_date:     consultaDate,
    internacao_inicio: internacaoInicio,
    internacao_fim:    internacaoFim,
    internacao_dias:   internacaoDias,
    internacao_local:  internacaoLocal,
    tenant_id:         tenantId,
  })

  if (dbError) {
    await supabase.storage.from('invoices').remove([filePath])
    return { success: false, error: `Erro ao salvar nota fiscal: ${dbError.message}` }
  }

  revalidatePath('/medico')
  revalidatePath('/paciente')
  return { success: true }
}

export async function deleteInvoice(invoiceId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('file_path')
    .eq('id', invoiceId)
    .single()

  if (fetchError || !invoice) return { success: false, error: 'Nota fiscal não encontrada.' }

  const { error } = await supabase.from('invoices').delete().eq('id', invoiceId)
  if (error) return { success: false, error: error.message }

  await supabase.storage.from('invoices').remove([invoice.file_path])

  revalidatePath('/medico')
  revalidatePath('/paciente')
  return { success: true }
}

// Chamada pelo paciente ao baixar: registra timestamp e retorna URL assinada
export async function downloadInvoice(
  invoiceId: string
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('file_path, patient_id')
    .eq('id', invoiceId)
    .single()

  if (fetchError || !invoice) return { success: false, error: 'Nota fiscal não encontrada.' }

  // Gera URL assinada válida por 5 minutos
  const { data: signed, error: signError } = await supabase.storage
    .from('invoices')
    .createSignedUrl(invoice.file_path, 300)

  if (signError || !signed) {
    return { success: false, error: 'Erro ao gerar link de download.' }
  }

  // Registra o timestamp de download
  await supabase
    .from('invoices')
    .update({ downloaded_at: new Date().toISOString() })
    .eq('id', invoiceId)

  revalidatePath('/paciente')
  revalidatePath('/medico')
  return { success: true, data: { url: signed.signedUrl } }
}

// Chamada pelo médico ao visualizar/baixar (sem atualizar downloaded_at)
export async function getMedicoInvoiceUrl(
  invoiceId: string
): Promise<ActionResult<{ url: string }>> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { data: invoice, error: fetchError } = await supabase
    .from('invoices')
    .select('file_path')
    .eq('id', invoiceId)
    .single()

  if (fetchError || !invoice) return { success: false, error: 'Nota fiscal não encontrada.' }

  const { data: signed, error: signError } = await supabase.storage
    .from('invoices')
    .createSignedUrl(invoice.file_path, 300)

  if (signError || !signed) return { success: false, error: 'Erro ao gerar link.' }

  return { success: true, data: { url: signed.signedUrl } }
}
