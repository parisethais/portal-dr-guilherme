import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LgpdModal from '@/components/paciente/LgpdModal'
import PacienteDashboard from '@/components/paciente/PacienteDashboard'

export default async function PacientePage() {
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

  if (!profile) redirect('/')

  const [{ data: documents }, { data: messages }] = await Promise.all([
    supabase
      .from('documents')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('messages')
      .select('*')
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const unreadCount = (messages ?? []).filter((m) => !m.read).length

  return (
    <>
      {!profile.lgpd_accepted && <LgpdModal />}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Boas vindas */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Olá, {profile.full_name?.split(' ')[0] ?? 'Paciente'} 👋
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Aqui você pode ver seus documentos, mensagens e solicitar contato com o consultório.
          </p>
        </div>

        <PacienteDashboard
          documents={documents ?? []}
          messages={messages ?? []}
          unreadCount={unreadCount}
        />
      </div>
    </>
  )
}
