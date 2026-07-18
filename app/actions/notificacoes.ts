'use server'

import { createAdminClient } from '@/lib/supabase/admin-client'
import { revalidatePath } from 'next/cache'
import { requireStaff } from '@/lib/auth-guard'

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
  // Deriva o tenant da sessão; ignora o argumento (exceto superadmin, que pode
  // consultar um tenant específico via painel).
  const ctx = await requireStaff()
  if (!ctx) return []
  const scopeTenant = ctx.tenantId ?? tenantId
  if (!scopeTenant) return []

  const admin = createAdminClient()
  const { data } = await admin
    .from('notificacoes')
    .select('*, patient:profiles!patient_id(full_name)')
    .eq('tenant_id', scopeTenant)
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
  const ctx = await requireStaff()
  if (!ctx) return

  const admin = createAdminClient()
  let q = admin
    .from('notificacoes')
    .update({ lida: true, lida_at: new Date().toISOString() })
    .eq('id', notificacaoId)
  if (ctx.tenantId) q = q.eq('tenant_id', ctx.tenantId)
  await q
  revalidatePath('/medico')
}

export async function marcarTodasLidas(tenantId: string): Promise<void> {
  const ctx = await requireStaff()
  if (!ctx) return
  const scopeTenant = ctx.tenantId ?? tenantId
  if (!scopeTenant) return

  const admin = createAdminClient()
  await admin
    .from('notificacoes')
    .update({ lida: true, lida_at: new Date().toISOString() })
    .eq('tenant_id', scopeTenant)
    .eq('lida', false)
  revalidatePath('/medico')
}
