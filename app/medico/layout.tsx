import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'

export default async function MedicoLayout({ children }: { children: React.ReactNode }) {
  // Lê user info injetado pelo middleware (evita chamar getUser() de novo após refresh token)
  const headersList = await headers()
  const middlewareUserId = headersList.get('x-user-id')
  const middlewareUserRole = headersList.get('x-user-role')

  let userId: string
  let currentRole: string

  if (middlewareUserId && middlewareUserRole) {
    userId = middlewareUserId
    currentRole = middlewareUserRole
  } else {
    // Fallback: validar auth diretamente
    const supabase = await createClient()
    let user = (await supabase.auth.getUser()).data.user
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) redirect('/')
      user = session.user
    }
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    userId = user.id
    currentRole = profile?.role ?? ''
  }

  // Apenas staff pode acessar /medico (médico, secretaria, superadmin)
  const isStaff = ['medico', 'secretaria', 'superadmin'].includes(currentRole)
  if (!isStaff) redirect('/')

  const adminDb = createAdminClient()
  const db = currentRole === 'superadmin' ? adminDb : await createClient()

  // Busca profile + nome da clínica em paralelo
  const [{ data: profile }, clinicName] = await Promise.all([
    db.from('profiles').select('*').eq('id', userId).single(),
    (async () => {
      // Para superadmin: tenta resolver o tenant pelo URL original (header referer ou next-url)
      // Para médico/secretaria: busca diretamente via clinic_members
      if (currentRole === 'superadmin') {
        // Lê o tenant do header x-invoke-query injetado pelo Next.js ou da URL atual
        const rawUrl = headersList.get('x-invoke-url') ?? headersList.get('referer') ?? ''
        const tenantMatch = rawUrl.match(/[?&]tenant=([^&]+)/)
        const tenantId = tenantMatch?.[1]
        if (tenantId) {
          const { data: clinic } = await adminDb
            .from('clinics').select('name').eq('tenant_id', tenantId).single()
          return clinic?.name ?? null
        }
        return null
      }

      const { data: membership } = await adminDb
        .from('clinic_members')
        .select('clinic_id, clinics!clinic_id(id, name)')
        .eq('user_id', userId)
        .limit(1)
        .single()

      const clinicId = (membership?.clinics as any)?.id
      if (!clinicId) return (membership?.clinics as any)?.name ?? null

      // Prefere nome_exibicao do clinic_settings
      const { data: setting } = await adminDb
        .from('clinic_settings')
        .select('value')
        .eq('clinic_id', clinicId)
        .eq('key', 'nome_exibicao')
        .maybeSingle()

      return setting?.value || (membership?.clinics as any)?.name || null
    })(),
  ])

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: [
          'radial-gradient(ellipse 75% 55% at 96% 1%,  rgba(122,158,126,0.16) 0%, transparent 52%)',
          'radial-gradient(ellipse 55% 45% at 2%  97%, rgba(45,43,107,0.09)  0%, transparent 52%)',
          'radial-gradient(ellipse 40% 35% at 48% 52%, rgba(122,158,126,0.05) 0%, transparent 68%)',
          'linear-gradient(160deg, #F0EDE6 0%, #F5F0E8 50%, #EDEAE4 100%)',
        ].join(','),
      }}
    >
      <Header profile={profile} clinicName={clinicName} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
