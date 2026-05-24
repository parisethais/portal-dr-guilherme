'use server'

/**
 * Server actions para persistência de prescrições Memed.
 *
 * Chamadas pelo componente MemedPrescricao.tsx nos eventos:
 *   - prescricaoImpressa  → saveMedPrescricao
 *   - prescricaoExcluida  → deleteMedPrescricao
 */

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { getCallerTenantId } from '@/lib/get-caller-tenant'

// ── saveMedPrescricao ─────────────────────────────────────────────────────────

export async function saveMedPrescricao(payload: {
  consultaId:        string | null
  patientId:         string
  memedPrescricaoId: string
  prescricaoUuid:    string
  dataPrescricao:    string
  reimpressao:       boolean
  alterada:          boolean
  medicamentosJson:  string
  documentsJson:     string
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado.')

  const tenantId = await getCallerTenantId(user.id)
  const admin    = createAdminClient()

  const { error } = await admin
    .from('memed_prescricoes')
    .upsert(
      {
        tenant_id:          tenantId,
        medico_id:          user.id,
        patient_id:         payload.patientId,
        consulta_id:        payload.consultaId,
        memed_prescricao_id: payload.memedPrescricaoId,
        prescricao_uuid:    payload.prescricaoUuid,
        data_prescricao:    payload.dataPrescricao,
        reimpressao:        payload.reimpressao,
        alterada:           payload.alterada,
        medicamentos_json:  payload.medicamentosJson,
        documents_json:     payload.documentsJson,
        excluida:           false,
      },
      { onConflict: 'memed_prescricao_id' },
    )

  if (error) throw new Error(`[memed] Erro ao salvar prescrição: ${error.message}`)
}

// ── deleteMedPrescricao ───────────────────────────────────────────────────────

export async function deleteMedPrescricao(payload: {
  memedPrescricaoId: string
  patientId:         string
}): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autorizado.')

  const admin = createAdminClient()

  // Marca como excluída (soft delete) em vez de remover o registro
  const { error } = await admin
    .from('memed_prescricoes')
    .update({ excluida: true, excluida_at: new Date().toISOString() })
    .eq('memed_prescricao_id', payload.memedPrescricaoId)
    .eq('patient_id', payload.patientId)

  if (error) throw new Error(`[memed] Erro ao registrar exclusão: ${error.message}`)
}
