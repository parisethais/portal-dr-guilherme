import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'

export default async function MedicoLayout({ children }: { children: React.ReactNode }) {
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

  if (!profile || profile.role !== 'medico') redirect('/')

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header profile={profile} />
      <main className="flex-1">{children}</main>
    </div>
  )
}
