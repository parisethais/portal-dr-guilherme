import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LgpdModal from '@/components/paciente/LgpdModal'
import PacienteDashboard from '@/components/paciente/PacienteDashboard'
import ProximaConsulta from '@/components/paciente/ProximaConsulta'

function getGreeting(): string {
  const brHour = (new Date().getUTCHours() - 3 + 24) % 24
  if (brHour >= 5 && brHour < 12) return 'Bom dia'
  if (brHour >= 12 && brHour < 18) return 'Boa tarde'
  return 'Boa noite'
}

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

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8 pb-7 border-b border-black/[0.06]">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-3.5" style={{ color: '#7A9E7E' }}>
            MedEn · Portal do Paciente
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight leading-snug" style={{ color: '#2D2B6B' }}>
            {getGreeting()}, {profile.full_name?.split(' ')[0] ?? 'Paciente'}.
          </h1>
          <p className="text-gray-400 mt-1.5 text-sm font-normal">
            Seus documentos, consultas e orientações em um só lugar.
          </p>
        </div>

        {/* Card próxima consulta */}
        <ProximaConsulta consulta={proximaConsulta} />

        <PacienteDashboard
          profile={profile}
          documents={documents ?? []}
          exames={exames ?? []}
          carePlan={carePlan ?? null}
          carePlanAttachments={carePlanAttachments ?? []}
          invoices={invoices ?? []}
        />
      </div>
    </>
  )
}
