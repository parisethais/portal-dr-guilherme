import { createClient }              from '@/lib/supabase/server'
import { createAdminClient }         from '@/lib/supabase/admin-client'
import { headers }                   from 'next/headers'
import { redirect }                  from 'next/navigation'
import { Suspense }                  from 'react'
import Link                          from 'next/link'
import { Settings, ArrowLeft }       from 'lucide-react'
import { getGlobalExamCatalog }      from '@/app/actions/exam-catalog'
import DoctorProfileSettings         from '@/components/medico/configuracoes/DoctorProfileSettings'
import GoogleCalendarSettings        from '@/components/medico/configuracoes/GoogleCalendarSettings'
import AssinaturaDigitalSettings     from '@/components/medico/configuracoes/AssinaturaDigitalSettings'
import ExamCatalogSettings           from '@/components/medico/configuracoes/ExamCatalogSettings'
import DocumentTemplatesSettings     from '@/components/medico/configuracoes/DocumentTemplatesSettings'

export default async function ConfiguracoesPage() {
  const supabase      = await createClient()
  const headersList   = await headers()
  const middlewareRole = headersList.get('x-user-role')
  const middlewareId   = headersList.get('x-user-id')

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const userId      = middlewareId  ?? user.id
  const currentRole = middlewareRole ?? 'medico'

  const isStaff = ['medico', 'secretaria', 'superadmin'].includes(currentRole)
  if (!isStaff) redirect('/medico')

  // Para superadmin vendo configurações de uma clínica via domínio customizado,
  // busca o perfil do médico da clínica (não o próprio perfil do superadmin)
  let profileUserId = userId
  if (currentRole === 'superadmin') {
    const host        = headersList.get('host') ?? ''
    const adminDb     = createAdminClient()
    const { data: domainSetting } = await adminDb
      .from('clinic_settings')
      .select('clinic_id')
      .eq('key', 'dominio')
      .eq('value', host)
      .maybeSingle()

    if (domainSetting?.clinic_id) {
      const { data: member } = await adminDb
        .from('clinic_members')
        .select('user_id')
        .eq('clinic_id', domainSetting.clinic_id)
        .eq('role', 'medico')
        .limit(1)
        .single()
      if (member?.user_id) profileUserId = member.user_id
    }
  }

  const db = createAdminClient()
  const [{ data: profile }, exams] = await Promise.all([
    db.from('profiles')
      .select('role, crm, especialidade, cpf, data_nascimento')
      .eq('id', profileUserId)
      .single(),
    getGlobalExamCatalog(),
  ])

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 pb-7 border-b border-black/[0.06]">
        <Link
          href="/medico"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Voltar ao painel
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(45,43,107,0.08)' }}>
            <Settings className="w-5 h-5" style={{ color: '#2D2B6B' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Configurações</h1>
            <p className="text-gray-400 mt-0.5 text-sm">Personalize o sistema de acordo com sua prática clínica.</p>
          </div>
        </div>
      </div>

      <div className="space-y-10">

        {/* ── Perfil ──────────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Perfil</h2>
          <DoctorProfileSettings
            initialCrm={profile?.crm ?? null}
            initialEspecialidade={profile?.especialidade ?? null}
            initialCpf={profile?.cpf ?? null}
            initialDataNascimento={profile?.data_nascimento ?? null}
          />
        </div>

        {/* ── Integrações ─────────────────────────── */}
        <div className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Integrações</h2>
          <Suspense fallback={null}>
            <GoogleCalendarSettings />
          </Suspense>
          <AssinaturaDigitalSettings
            cpf={profile?.cpf ?? null}
            crm={profile?.crm ?? null}
          />
        </div>

        {/* ── Catálogo de Exames ───────────────────── */}
        <div className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Catálogo de Exames</h2>
          <ExamCatalogSettings initialExams={exams} />
        </div>

        {/* ── Modelos de Documentos ────────────────── */}
        <div className="space-y-3">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Documentos</h2>
          <DocumentTemplatesSettings />
        </div>

      </div>
    </div>
  )
}
