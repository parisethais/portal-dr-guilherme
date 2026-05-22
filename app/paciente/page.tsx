import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
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

// UUID fixo do paciente de teste (seed-paciente-teste.sql)
const TEST_PATIENT_ID = 'aaaaaaaa-0000-0000-0000-000000000001'

export default async function PacientePage() {
  const headersList = await headers()
  const middlewareRole = headersList.get('x-user-role')
  const middlewareId   = headersList.get('x-user-id')

  // Superadmin visualiza o portal como a paciente de teste (preview)
  const isSuperadmin = middlewareRole === 'superadmin'
  const db = isSuperadmin ? createAdminClient() : await createClient()

  // ID efetivo para buscar dados: superadmin → paciente teste; outros → próprio ID
  let patientId: string

  if (isSuperadmin) {
    patientId = TEST_PATIENT_ID
  } else {
    // Paciente normal: usa getUser() para garantir sessão válida
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect('/')
    patientId = middlewareId ?? user.id
  }

  const { data: profile } = await db
    .from('profiles')
    .select('*')
    .eq('id', patientId)
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
    db.from('documents').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
    db.from('messages').select('*').eq('recipient_id', patientId).order('created_at', { ascending: false }),
    db.from('patient_exams').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
    db.from('care_plans').select('*').eq('patient_id', patientId).single(),
    db.from('care_plan_attachments').select('*').eq('patient_id', patientId).order('created_at', { ascending: false }),
    db.from('invoices').select('*').eq('patient_id', patientId).order('issue_date', { ascending: false }),
    db.from('consultas')
      .select('*')
      .eq('patient_id', patientId)
      .in('status', ['agendada', 'confirmada'])
      .gt('data_hora', new Date().toISOString())
      .order('data_hora', { ascending: true })
      .limit(1),
  ])

  const proximaConsulta = proximaConsultaArr?.[0] ?? null
  const firstName = profile.full_name?.replace(/^\[TESTE\]\s*/i, '').split(' ')[0] ?? 'Paciente'

  return (
    <>
      {!isSuperadmin && !profile.lgpd_accepted && <LgpdModal />}

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero */}
        <div className="mb-8 pb-7 border-b border-black/[0.06]">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-3.5" style={{ color: '#7A9E7E' }}>
            MedEn · Portal do Paciente
          </p>
          <h1 className="font-display text-3xl font-extrabold tracking-tight leading-snug" style={{ color: '#2D2B6B' }}>
            {getGreeting()}, {firstName}.
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
