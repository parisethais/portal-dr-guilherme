'use server'

import { createAdminClient } from '@/lib/supabase/admin-client'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Notificacao {
  id: string
  tipo: string
  patient_id: string
  consulta_id: string | null
  mensagem: string
  lida: boolean
  lida_at: string | null
  created_at: string
  patient?: { full_name: string | null }
}

export async function getNotificacoes(tenantId: string): Promise<Notificacao[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('notificacoes')
    .select('*, patient:profiles!patient_id(full_name)')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)
  return (data ?? []) as Notificacao[]
}

export async function criarNotificacaoRetorno(opts: {
  tenantId: string
  patientId: string
  patientName: string
  consultaId: string
  retornoData: string
}): Promise<void> {
  const admin = createAdminClient()
  const dataFormatada = new Date(opts.retornoData + 'T12:00:00').toLocaleDateString('pt-BR')
  await admin.from('notificacoes').insert({
    tenant_id:   opts.tenantId,
    tipo:        'retorno_solicitado',
    patient_id:  opts.patientId,
    consulta_id: opts.consultaId,
    mensagem:    `Dr. Guilherme finalizou o prontuário de ${opts.patientName} e solicitou retorno para ${dataFormatada}.`,
  })
}

export async function marcarLida(notificacaoId: string): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('notificacoes')
    .update({ lida: true, lida_at: new Date().toISOString() })
    .eq('id', notificacaoId)
  revalidatePath('/medico')
}

export async function marcarTodasLidas(tenantId: string): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('notificacoes')
    .update({ lida: true, lida_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
    .eq('lida', false)
  revalidatePath('/medico')
}
