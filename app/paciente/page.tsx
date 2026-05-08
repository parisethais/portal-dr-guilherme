import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LgpdModal from '@/components/paciente/LgpdModal'
import PacienteDashboard from '@/components/paciente/PacienteDashboard'
import ProximaConsulta from '@/components/paciente/ProximaConsulta'

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

  const [
    { data: documents },
    { data: messages },
    { data: exames },
    { data: carePlan },
    { data: carePlanAttachments },
    { data: invoices },
    { data: proximaConsultaArr },
  ] = await Promise.all([
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
    supabase
      .from('patient_exams')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('care_plans')
      .select('*')
      .eq('patient_id', user.id)
      .single(),
    supabase
      .from('care_plan_attachments')
      .select('*')
      .eq('patient_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('invoices')
      .select('*')
      .eq('patient_id', user.id)
      .order('issue_date', { ascending: false }),
    supabase
      .from('consultas')
      .select('*')
      .eq('patient_id', user.id)
      .in('status', ['agendada', 'confirmada'])
      .gt('data_hora', new Date().toISOString())
      .order('data_hora', { ascending: true })
      .limit(1),
  ])

  const unreadCount    = (messages ?? []).filter((m) => !m.read).length
  const proximaConsulta = proximaConsultaArr?.[0] ?? null

  return (
    <>
      {!profile.lgpd_accepted && <LgpdModal />}

      <div className="max-w-5xl mx-auto px-5 pt-8 pb-12 sm:px-4 sm:py-8">
        {/* Boas vindas */}
        <div className="mb-7 sm:mb-8">
          <h1 className="text-[2.35rem] leading-[1.05] tracking-[-0.04em] font-semibold text-slate-950 sm:text-2xl sm:leading-normal sm:tracking-normal sm:font-bold">
            Olá, {profile.full_name?.split(' ')[0] ?? 'Paciente'}
          </h1>
          <p className="text-slate-500 mt-3 text-[1.08rem] leading-relaxed tracking-[-0.015em] max-w-[21rem] sm:text-sm sm:leading-normal sm:tracking-normal sm:mt-1 sm:max-w-none sm:text-gray-500">
            Acesse documentos, exames, mensagens e solicitações em um só lugar.
          </p>
        </div>

        {/* Card próxima consulta */}
        <ProximaConsulta consulta={proximaConsulta} />

        <PacienteDashboard
          documents={documents ?? []}
          messages={messages ?? []}
          exames={exames ?? []}
          carePlan={carePlan ?? null}
          carePlanAttachments={carePlanAttachments ?? []}
          invoices={invoices ?? []}
          unreadCount={unreadCount}
        />
      </div>
    </>
  )
}
