import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'

export default async function PacienteLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'paciente') redirect('/')

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
