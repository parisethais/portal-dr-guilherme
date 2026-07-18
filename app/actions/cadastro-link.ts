'use server'

import { createAdminClient } from '@/lib/supabase/admin-client'
import type { ActionResult } from '@/lib/types'
import { requireStaff, assertPatientInTenant } from '@/lib/auth-guard'

export interface CadastroPatient {
  id:             string
  full_name:      string | null
  email:          string | null
  cpf:            string | null
  phone:          string | null
  data_nascimento: string | null
  sexo:           'M' | 'F' | null
  cep:            string | null
  endereco:       string | null
  cidade_estado:  string | null
  nome_mae:       string | null
  profissao:      string | null
  cns:            string | null
  como_conheceu:  string | null
  lgpd_accepted:  boolean
  perfil_completo: boolean
  tenant_id:      string
}

export async function getOrCreateCadastroToken(
  patientId: string,
): Promise<ActionResult<{ token: string }>> {
  const ctx = await requireStaff()
  if (!ctx) return { success: false, error: 'Não autorizado.' }
  if (!(await assertPatientInTenant(patientId, ctx))) return { success: false, error: 'Não autorizado.' }

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('cadastro_token')
    .eq('id', patientId)
    .single()

  if (profile?.cadastro_token) return { success: true, data: { token: profile.cadastro_token } }

  // Gera novo token
  const { data: updated, error } = await admin
    .from('profiles')
    .update({ cadastro_token: crypto.randomUUID() })
    .eq('id', patientId)
    .select('cadastro_token')
    .single()

  if (error || !updated?.cadastro_token) return { success: false, error: error?.message ?? 'Erro ao gerar token' }
  return { success: true, data: { token: updated.cadastro_token } }
}

export async function getPatientByCadastroToken(token: string): Promise<CadastroPatient | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, full_name, email, cpf, phone, data_nascimento, sexo, cep, endereco, cidade_estado, nome_mae, profissao, cns, como_conheceu, lgpd_accepted, perfil_completo, tenant_id')
    .eq('cadastro_token', token)
    .eq('role', 'paciente')
    .single()
  return data ?? null
}

export async function updateCadastroByToken(
  token: string,
  fields: Partial<Omit<CadastroPatient, 'id' | 'tenant_id' | 'lgpd_accepted'>>,
): Promise<ActionResult> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ ...fields, perfil_completo: true })
    .eq('cadastro_token', token)
    .eq('role', 'paciente')
  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function acceptLgpdByCadastroToken(token: string): Promise<ActionResult> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({
      lgpd_accepted:    true,
      lgpd_accepted_at: new Date().toISOString(),
      lgpd_version:     '2025-06-01',
    })
    .eq('cadastro_token', token)
    .eq('role', 'paciente')
  if (error) return { success: false, error: error.message }
  return { success: true }
}
