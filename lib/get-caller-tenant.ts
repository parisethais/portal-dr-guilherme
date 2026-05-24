import { createAdminClient } from '@/lib/supabase/admin-client'

/**
 * Resolve o tenant_id do usuário autenticado.
 *
 * Estratégia:
 * 1. Se o usuário é médico/secretaria → busca via clinic_members → clinics.tenant_id
 * 2. Se não tiver membership (paciente ou sem clínica) → usa profiles.tenant_id diretamente
 *
 * Fallback final: 'dr_guilherme'
 *
 * @param userId - ID do usuário logado (de supabase.auth.getUser())
 */
export async function getCallerTenantId(userId: string): Promise<string> {
  const admin = createAdminClient()

  // Tenta via clinic_members primeiro (médico/secretaria)
  const { data: membership } = await admin
    .from('clinic_members')
    .select('clinic_id, clinics!clinic_id(tenant_id)')
    .eq('user_id', userId)
    .limit(1)
    .single()

  const clinicTenant = (membership?.clinics as any)?.tenant_id as string | undefined
  if (clinicTenant) return clinicTenant

  // Fallback: tenant_id do próprio profile (paciente ou usuário sem clínica)
  const { data: profile } = await admin
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  return (profile?.tenant_id as string | undefined) ?? 'dr_guilherme'
}
