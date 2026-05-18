'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface FinancialEntry {
  id:             string
  clinic_id:      string | null
  doctor_id:      string
  scope:          'clinic' | 'personal'
  type:           'receita' | 'despesa'
  category:       string
  amount:         number
  date:           string   // YYYY-MM-DD
  description:    string | null
  payment_method: string | null
  status:         'pago' | 'pendente' | 'cancelado'
  notes:          string | null
  created_at:     string
  updated_at:     string
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
  const { error } = await supabase.from('financial_entries').insert(input)
  if (error) return { error: error.message }
  revalidatePath('/medico')
  return { success: true }
}

// ── Update ────────────────────────────────────────────────────────────────

export async function updateFinancialEntry(id: string, input: Partial<EntryInput>) {
  const supabase = await createClient()
  const { error } = await supabase
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
  const { error } = await supabase.from('financial_entries').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/medico')
  return { success: true }
}
