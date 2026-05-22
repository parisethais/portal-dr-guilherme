import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { redirect } from 'next/navigation'
import LgpdModal from '@/components/paciente/LgpdModal'
import PacienteDashboard from '@/components/paciente/PacienteDashboard'
import ProximaConsulta from '@/components/paciente/ProximaConsulta'
import ClinicCard from '@/components/paciente/ClinicCard'

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

  // ── Dados da clínica para o cartão de identidade ──────────────────────
  const adminDb = createAdminClient()
  const { data: clinic } = await adminDb.from('clinics').select('id, name').eq('active', true).limit(1).single()

  let clinicSettings: Record<string, string> = {}
  let doctorName: string | null = null

  if (clinic?.id) {
    // Busca settings e user_id do médico em paralelo
    const [{ data: settings }, { data: medicoMember }] = await Promise.all([
      adminDb.from('clinic_settings').select('key, value').eq('clinic_id', clinic.id),
      adminDb
        .from('clinic_members')
        .select('user_id')
        .eq('clinic_id', clinic.id)
        .eq('role', 'medico')
        .limit(1)
        .single(),
    ])
    clinicSettings = Object.fromEntries((settings ?? []).map((s: { key: string; value: string | null }) => [s.key, s.value ?? '']))

    // Busca nome do médico separadamente (evita problema de FK implícita no PostgREST)
    if (medicoMember?.user_id) {
      const { data: medicoProfile } = await adminDb
        .from('profiles')
        .select('full_name')
        .eq('id', medicoMember.user_id)
        .single()
      const rawName = medicoProfile?.full_name as string | null
      if (rawName) {
        doctorName = rawName.startsWith('Dr') ? rawName : `Dr. ${rawName}`
      }
    }
  }

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

        {/* Cartão de identidade do consultório */}
        <ClinicCard
          clinicName={clinicSettings['nome_exibicao'] || clinic?.name || 'Consultório'}
          doctorName={doctorName}
          especialidade={clinicSettings['especialidade'] ?? null}
          crm={clinicSettings['crm_medico'] ?? null}
          endereco={clinicSettings['endereco'] ?? null}
          telefone={clinicSettings['telefone'] ?? null}
          email={clinicSettings['email_contato'] ?? clinicSettings['email'] ?? null}
        />

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
