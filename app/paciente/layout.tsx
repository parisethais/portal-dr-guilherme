import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'

export default async function PacienteLayout({ children }: { children: React.ReactNode }) {
  // Lê user info injetado pelo middleware (mesmo padrão do layout /medico)
  const headersList = await headers()
  const middlewareUserId   = headersList.get('x-user-id')
  const middlewareUserRole = headersList.get('x-user-role')

  let userId: string
  let currentRole: string

  if (middlewareUserId && middlewareUserRole) {
    userId      = middlewareUserId
    currentRole = middlewareUserRole
  } else {
    // Fallback: validar auth diretamente
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')
    const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    userId      = user.id
    currentRole = p?.role ?? ''
  }

  // Superadmin pode visualizar o portal do paciente (preview)
  // Paciente acessa normalmente. Qualquer outra role → /
  const allowed = currentRole === 'paciente' || currentRole === 'superadmin'
  if (!allowed) redirect('/')

  // Busca profile completo para o Header
  const db = currentRole === 'superadmin' ? createAdminClient() : await createClient()
  const { data: profile } = await db.from('profiles').select('*').eq('id', userId).single()

  if (!profile) redirect('/')

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: [
          'radial-gradient(ellipse 75% 55% at 96% 1%,  rgba(126,184,212,0.18) 0%, transparent 52%)',
          'radial-gradient(ellipse 55% 45% at 2%  97%, rgba(126,184,212,0.11) 0%, transparent 52%)',
          'radial-gradient(ellipse 40% 35% at 48% 52%, rgba(126,184,212,0.05) 0%, transparent 68%)',
          'linear-gradient(160deg, #E3E7EE 0%, #ECEEF3 45%, #EDE9E2 100%)',
        ].join(','),
      }}
    >
      <Header profile={profile} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
