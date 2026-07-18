import { createAdminClient } from '@/lib/supabase/admin-client'

/**
 * Resolve o médico responsável para novos registros de um tenant.
 *
 * - Se o caller é médico → ele mesmo.
 * - Senão (secretária/recepcionista/copilot) → o primeiro médico (owner/medico)
 *   da clínica do tenant. Em clínica multi-médico a UI passa o médico
 *   explicitamente; este é o fallback para clínica de médico único.
 */
export async function resolveDoctorForTenant(
  tenantId: string,
  callerId?: string,
): Promise<string | null> {
  const admin = createAdminClient()

  if (callerId) {
    const { data: caller } = await admin
      .from('profiles')
      .select('role')
      .eq('id', callerId)
      .single()
    if (caller?.role === 'medico') return callerId
  }

  const { data } = await admin
    .from('clinic_members')
    .select('user_id, role, clinics!clinic_id(tenant_id)')
    .in('role', ['owner', 'medico'])

  const match = (data ?? []).find(m => (m.clinics as any)?.tenant_id === tenantId)
  return match?.user_id ?? null
}
