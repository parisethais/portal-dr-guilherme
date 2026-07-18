import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { getCallerTenantId } from '@/lib/get-caller-tenant'

/**
 * Guard central de autorização multi-tenant.
 *
 * Padrão de uso em server actions / rotas que operam com createAdminClient():
 *
 *   const ctx = await requireStaff()
 *   if (!ctx) return { success: false, error: 'Não autorizado.' }
 *   if (!(await assertPatientInTenant(patientId, ctx))) return { success: false, error: 'Não autorizado.' }
 *
 * superadmin tem tenantId null = acesso global (painel admin).
 */

export interface StaffContext {
  userId:   string
  role:     'medico' | 'secretaria' | 'superadmin'
  tenantId: string | null   // null apenas para superadmin (acesso global)
}

/** Sessão válida + role de staff. Retorna null se não autorizado. */
export async function requireStaff(): Promise<StaffContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role
  if (role !== 'medico' && role !== 'secretaria' && role !== 'superadmin') return null

  if (role === 'superadmin') return { userId: user.id, role, tenantId: null }

  const tenantId = await getCallerTenantId(user.id)
  return { userId: user.id, role, tenantId }
}

/** Sessão válida de qualquer usuário (staff ou paciente). */
export async function requireUser(): Promise<{ userId: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return { userId: user.id }
}

/** O paciente pertence ao tenant do caller? (superadmin sempre passa) */
export async function assertPatientInTenant(patientId: string, ctx: StaffContext): Promise<boolean> {
  if (ctx.tenantId === null) return true
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id')
    .eq('id', patientId)
    .eq('tenant_id', ctx.tenantId)
    .single()
  return !!data
}

/** O registro (por id) pertence ao tenant do caller? (superadmin sempre passa) */
export async function assertRowInTenant(table: string, id: string, ctx: StaffContext): Promise<boolean> {
  if (ctx.tenantId === null) return true
  const admin = createAdminClient()
  const { data } = await admin
    .from(table)
    .select('id')
    .eq('id', id)
    .eq('tenant_id', ctx.tenantId)
    .single()
  return !!data
}
