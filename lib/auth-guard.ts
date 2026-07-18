import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { getCallerTenantId } from '@/lib/get-caller-tenant'
import { resolvePermissions, type MemberPermissions } from '@/lib/admin-constants'

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

const STAFF_ROLES = ['medico', 'secretaria', 'recepcionista', 'administrativo', 'superadmin'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]

export interface StaffContext {
  userId:   string
  role:     StaffRole
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

  const role = profile?.role as StaffRole | undefined
  if (!role || !STAFF_ROLES.includes(role)) return null

  if (role === 'superadmin') return { userId: user.id, role, tenantId: null }

  const tenantId = await getCallerTenantId(user.id)
  return { userId: user.id, role, tenantId }
}

// ── Contexto completo de membro (papel na clínica + permissões efetivas) ──

export interface MemberContext extends StaffContext {
  clinicId:      string | null
  memberRole:    string            // papel em clinic_members (owner|medico|secretaria|recepcionista|administrativo)
  permissions:   MemberPermissions
  /** A clínica tem mais de um médico? (liga o escopo por médico) */
  isMultiMedico: boolean
}

export async function getMemberContext(): Promise<MemberContext | null> {
  const ctx = await requireStaff()
  if (!ctx) return null

  const admin = createAdminClient()

  // Superadmin: acesso total, sem clínica
  if (ctx.role === 'superadmin') {
    return {
      ...ctx,
      clinicId: null,
      memberRole: 'owner',
      permissions: resolvePermissions('owner', null),
      isMultiMedico: false,
    }
  }

  const { data: membership } = await admin
    .from('clinic_members')
    .select('clinic_id, role, permissions')
    .eq('user_id', ctx.userId)
    .limit(1)
    .single()

  const clinicId   = membership?.clinic_id ?? null
  const memberRole = membership?.role ?? ctx.role
  const permissions = resolvePermissions(memberRole, membership?.permissions as Partial<MemberPermissions> | null)

  let isMultiMedico = false
  if (clinicId) {
    const { count } = await admin
      .from('clinic_members')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)
      .in('role', ['owner', 'medico'])
    isMultiMedico = (count ?? 0) > 1
  }

  return { ...ctx, clinicId, memberRole, permissions, isMultiMedico }
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
