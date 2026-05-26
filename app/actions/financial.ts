'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { revalidatePath } from 'next/cache'
import { getCallerTenantId } from '@/lib/get-caller-tenant'

export type NotaFiscalStatus = 'nao_se_aplica' | 'a_solicitar' | 'solicitada' | 'emitida'

export interface FinancialEntry {
  id:                  string
  clinic_id:           string | null
  doctor_id:           string
  patient_id:          string | null
  scope:               'clinic' | 'personal'
  type:                'receita' | 'despesa'
  category:            string
  amount:              number
  date:                string   // YYYY-MM-DD
  description:         string | null
  payment_method:      string | null
  status:              'pago' | 'pendente' | 'cancelado'
  nota_fiscal_status:  NotaFiscalStatus
  notes:               string | null
  created_at:          string
  updated_at:          string
}

export type EntryInput = Omit<FinancialEntry, 'id' | 'created_at' | 'updated_at'>

// ── Fetch ─────────────────────────────────────────────────────────────────

export async function getFinancialEntries(filters?: {
  from?: string   // YYYY-MM-DD
  to?:   string
  scope?: 'clinic' | 'personal' | 'all'
  type?:  'receita' | 'despesa' | 'all'
}): Promise<FinancialEntry[]> {
  const supabase = await createClient()

  let q = supabase
    .from('financial_entries')
    .select('*')
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.from) q = q.gte('date', filters.from)
  if (filters?.to)   q = q.lte('date', filters.to)
  if (filters?.scope && filters.scope !== 'all') q = q.eq('scope', filters.scope)
  if (filters?.type  && filters.type  !== 'all') q = q.eq('type',  filters.type)

  const { data, error } = await q
  if (error) { console.error('[getFinancialEntries]', error.message); return [] }
  return data as FinancialEntry[]
}

// ── Create ────────────────────────────────────────────────────────────────

export async function createFinancialEntry(input: EntryInput) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const tenantId = await getCallerTenantId(user.id)
  const db = createAdminClient()
  const { error } = await db.from('financial_entries').insert({ ...input, tenant_id: tenantId })
  if (error) return { error: error.message }
  revalidatePath('/medico')
  return { success: true }
}

// ── Update ────────────────────────────────────────────────────────────────

export async function updateFinancialEntry(id: string, input: Partial<EntryInput>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const db = createAdminClient()
  const { error } = await db
    .from('financial_entries')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/medico')
  return { success: true }
}

// ── Delete ────────────────────────────────────────────────────────────────

export async function deleteFinancialEntry(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const db = createAdminClient()
  const { error } = await db.from('financial_entries').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/medico')
  return { success: true }
}

// ── Notificar paciente sobre nota fiscal ──────────────────────────────────

export async function notifyPatientNota({
  patientId,
  entryDate,
  description,
  amount,
}: {
  patientId:   string
  entryDate:   string
  description: string | null
  amount:      number
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const dateFormatted = new Date(entryDate + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
  const amountFormatted = amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const content = [
    `Olá! Sua nota fiscal referente ao atendimento de ${dateFormatted}`,
    description ? `(${description})` : null,
    `no valor de ${amountFormatted} foi solicitada ao contador e será enviada em breve por e-mail.`,
    `\nQualquer dúvida, estamos à disposição.`,
  ].filter(Boolean).join(' ')

  const tenantId = await getCallerTenantId(user.id)
  const { error } = await supabase.from('messages').insert({
    sender_id:    user.id,
    recipient_id: patientId,
    content,
    tenant_id:    tenantId,
  })

  if (error) return { error: error.message }
  revalidatePath('/medico')
  revalidatePath('/paciente')
  return { success: true }
}

// ── Configurações da clínica ──────────────────────────────────────────────

export async function upsertClinicSetting(key: string, value: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autorizado.' }

  const { data: member } = await supabase
    .from('clinic_members').select('clinic_id').eq('user_id', user.id).maybeSingle()
  if (!member?.clinic_id) return { error: 'Clínica não encontrada.' }

  const { error } = await supabase
    .from('clinic_settings')
    .upsert({ clinic_id: member.clinic_id, key, value }, { onConflict: 'clinic_id,key' })

  if (error) return { error: error.message }
  revalidatePath('/medico')
  return { success: true }
}
