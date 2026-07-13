'use server'

import { createClient }        from '@/lib/supabase/server'
import { createAdminClient }   from '@/lib/supabase/admin'
import { getCallerTenantId }   from '@/lib/get-caller-tenant'

export type TipoExame  = 'laboratorial' | 'imagem' | 'outro'
export type Urgencia   = 'rotina' | 'urgente'

export interface PedidoExame {
  id:                string
  patient_id:        string
  tenant_id:         string
  created_by:        string | null
  tipo:              TipoExame
  exames:            string
  urgencia:          Urgencia
  indicacao_clinica: string | null
  cid:               string | null
  data_pedido:       string
  pdf_url:           string | null
  assinatura_url:    string | null
  assinado:          boolean
  assinado_at:       string | null
  created_at:        string
}

async function getCtx() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  const tenantId = await getCallerTenantId(user.id)
  return { user, tenantId, admin: createAdminClient() }
}

export async function getPedidosExame(patientId: string): Promise<PedidoExame[]> {
  try {
    const { tenantId, admin } = await getCtx()
    const { data } = await admin
      .from('pedidos_exame')
      .select('*')
      .eq('patient_id', patientId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    return (data ?? []) as PedidoExame[]
  } catch { return [] }
}

export async function createPedidoExame(input: {
  patient_id:        string
  tipo:              TipoExame
  exames:            string
  urgencia:          Urgencia
  indicacao_clinica?: string
  cid?:              string
  data_pedido:       string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const { user, tenantId, admin } = await getCtx()
    const { data, error } = await admin
      .from('pedidos_exame')
      .insert({
        patient_id:        input.patient_id,
        tenant_id:         tenantId,
        created_by:        user.id,
        tipo:              input.tipo,
        exames:            input.exames,
        urgencia:          input.urgencia,
        indicacao_clinica: input.indicacao_clinica ?? null,
        cid:               input.cid ?? null,
        data_pedido:       input.data_pedido,
      })
      .select('id')
      .single()
    if (error) throw error
    return { success: true, id: data.id }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function deletePedidoExame(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { admin } = await getCtx()
    const { error } = await admin.from('pedidos_exame').delete().eq('id', id)
    if (error) throw error
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function marcarPedidoAssinado(id: string, pdfUrl: string, assinaturaUrl: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { admin } = await getCtx()
    const { error } = await admin
      .from('pedidos_exame')
      .update({
        assinado:       true,
        assinado_at:    new Date().toISOString(),
        pdf_url:        pdfUrl,
        assinatura_url: assinaturaUrl,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

export async function enviarDocumentoViaCopilot(input: {
  patient_phone: string | null
  patient_email: string | null
  patient_name:  string
  document_url:  string
  document_type: 'pedido_exame' | 'prescricao'
}): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = process.env.COPILOT_WEBHOOK_URL
  const secret     = process.env.COPILOT_SECRET

  if (!webhookUrl) {
    return { success: false, error: 'Envio via Copilot ainda não configurado. Fale com a Mari.' }
  }

  try {
    const res = await fetch(webhookUrl, {
      method:  'POST',
      headers: {
        'Content-Type':    'application/json',
        'x-copilot-secret': secret ?? '',
      },
      body: JSON.stringify({
        evento:         'enviar_documento',
        patient_phone:  input.patient_phone,
        patient_email:  input.patient_email,
        patient_name:   input.patient_name,
        document_url:   input.document_url,
        document_type:  input.document_type,
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      throw new Error(`Copilot respondeu ${res.status}: ${body}`)
    }
    return { success: true }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}
