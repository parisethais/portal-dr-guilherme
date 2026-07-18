import { Suspense } from 'react'
import { headers } from 'next/headers'

// Aumenta o timeout da rota para suportar análise OCR de PDFs via Anthropic
export const maxDuration = 60
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { calendarFeedKey } from '@/lib/calendar-key'
import { resolvePermissions, type MemberPermissions } from '@/lib/admin-constants'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import MedicoDashboard from '@/components/medico/MedicoDashboard'
import WeekSummaryBadge from '@/components/medico/WeekSummaryBadge'
import AvisosPanel from '@/components/medico/AvisosPanel'
import type { ConsultaSummaryItem } from '@/components/medico/WeekSummaryBadge'
import { getNotificacoes } from '@/app/actions/notificacoes'

// ── Helpers de saudação ───────────────────────────────────────────────────────

function getGreeting(): string {
  // Usa fuso de Brasília (UTC-3) no servidor
  const brHour = (new Date().getUTCHours() - 3 + 24) % 24
  if (brHour >= 5 && brHour < 12) return 'Bom dia'
  if (brHour >= 12 && brHour < 18) return 'Boa tarde'
  return 'Boa noite'
}

function getDateLabel(): string {
  return new Date().toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  })
}

function getDisplayName(fullName: string | null, sexo: string | null, role: string): string {
  const parts = fullName?.split(' ').filter(p => !/^dr[a]?\.?$/i.test(p)) ?? []
  const first  = parts[0] ?? 'você'
  if (role === 'medico') {
    return `${sexo === 'F' || sexo === 'feminino' ? 'Dra.' : 'Dr.'} ${first}`
  }
  return first
}

function stripTitle(name: string | null): string | null {
  if (!name) return null
  return name.replace(/^Dr[a]?\.\s*/i, '').trim()
}

function formatCrm(crm: string | null): string | null {
  if (!crm) return null
  const m = crm.trim().match(/^([A-Z]{2})[- ]?(\d+)$/i)
  return m ? `CRM-${m[1].toUpperCase()} ${m[2]}` : crm
}

export default async function MedicoPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>
}) {
  const params = await searchParams

  // Lê headers injetados pelo middleware (evita chamar getUser() de novo,
  // o que causaria falha quando o refresh token já foi consumido pelo middleware)
  const headersList = await headers()
  const middlewareUserId = headersList.get('x-user-id')
  const middlewareUserRole = headersList.get('x-user-role')

  let userId: string
  let currentRole: string

  if (middlewareUserId && middlewareUserRole) {
    // Middleware já validou o usuário — confiar nos headers
    userId = middlewareUserId
    currentRole = middlewareUserRole
  } else {
    // Fallback: validar auth diretamente (caso o middleware não tenha setado headers)
    const supabase = await createClient()
    let user = (await supabase.auth.getUser()).data.user
    if (!user) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) redirect('/')
      user = session.user
    }
    const { data: roleProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    userId = user.id
    currentRole = roleProfile?.role ?? 'medico'
  }

  // Superadmin/secretaria usam adminClient para ver todos os dados (bypassa RLS)
  // O adminClient ainda filtra por tenant_id — não há acesso cruzado de clínicas
  // Médico usa client normal (RLS garante isolamento adicional pela session)
  const supabase = await createClient()
  const adminDb  = createAdminClient()
  const isStaffNaoMedico = ['secretaria', 'recepcionista', 'administrativo'].includes(currentRole)
  const db       = (currentRole === 'superadmin' || isStaffNaoMedico) ? adminDb : supabase

  // Resolve tenant_id
  //   - Médico/secretaria   → clínica do próprio clinic_members
  //   - Superadmin ?tenant= → tenant explícito (botão CRM no admin panel)
  //   - Superadmin por host → resolve pelo domínio da clínica (clinic_settings key=dominio)
  //   - Superadmin sem pista → null = vê tudo (acesso irrestrito no painel /admin)
  let tenantId: string | null = null
  let clinicName: string | null = null
  let memberRole: string = currentRole
  let memberPermissions: MemberPermissions = resolvePermissions(currentRole, null)
  let isMultiMedico = false
  let showSalasTab  = false
  if (currentRole !== 'superadmin') {
    const { data: membership } = await adminDb
      .from('clinic_members')
      .select('clinic_id, role, permissions, clinics!clinic_id(tenant_id, name)')
      .eq('user_id', userId)
      .limit(1)
      .single()
    tenantId  = (membership?.clinics as any)?.tenant_id ?? 'dr_guilherme'
    clinicName = (membership?.clinics as any)?.name ?? null
    memberRole = membership?.role ?? currentRole
    memberPermissions = resolvePermissions(memberRole, membership?.permissions as Partial<MemberPermissions> | null)

    if (membership?.clinic_id) {
      const [{ count }, { count: roomCount }, { count: shareCount }] = await Promise.all([
        adminDb.from('clinic_members')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', membership.clinic_id)
          .in('role', ['owner', 'medico']),
        adminDb.from('clinic_rooms')
          .select('id', { count: 'exact', head: true })
          .eq('clinic_id', membership.clinic_id)
          .eq('active', true),
        adminDb.from('agenda_shares')
          .select('id', { count: 'exact', head: true })
          .eq('grantee_clinic_id', membership.clinic_id)
          .eq('active', true),
      ])
      isMultiMedico = (count ?? 0) > 1
      showSalasTab  = isMultiMedico || (roomCount ?? 0) > 0 || (shareCount ?? 0) > 0
    }
  } else if (params.tenant) {
    // Superadmin abrindo CRM de uma clínica específica via ?tenant=xxx
    tenantId = params.tenant
  } else {
    // Superadmin acessando diretamente: tenta resolver pelo Host header
    const host = headersList.get('host') ?? ''
    const isCustomDomain = host
      && !host.includes('localhost')
      && !host.includes('127.0.0.1')
      && !host.includes('.vercel.app')

    if (isCustomDomain) {
      // Busca clínica cujo setting "dominio" bate com o host atual
      const { data: domainSetting } = await adminDb
        .from('clinic_settings')
        .select('clinic_id')
        .eq('key', 'dominio')
        .eq('value', host)
        .maybeSingle()

      if (domainSetting?.clinic_id) {
        const { data: clinic } = await adminDb
          .from('clinics')
          .select('tenant_id')
          .eq('id', domainSetting.clinic_id)
          .single()
        tenantId = clinic?.tenant_id ?? null
      }
    }
  }

  // Escopo por médico: em clínica com 2+ médicos, cada médico vê só os próprios
  // pacientes/consultas/finanças. Clínica de médico único (Gui) fica como sempre foi.
  const scopeByDoctor = currentRole === 'medico' && isMultiMedico

  // Carrega só o essencial para a lista e agenda.
  // Dados pesados (consultas completas, lab, imagem, faturas) são
  // buscados por paciente via getPatientDetailData() quando o usuário abre um paciente.
  const [
    { data: patients },
    { data: documents },
    { data: financialEntries },
    { data: consultas },
    { data: currentProfile },
    notificacoes,
    { data: medicoProfile },
  ] = await Promise.all([
    (() => {
      let q = db.from('profiles')
        .select('id, full_name, email, phone, cpf, sexo, data_nascimento, status_paciente, perfil_completo, como_conheceu, obs_secretaria, retorno_previsto, lgpd_accepted, diagnostico, created_at, role, cep, endereco, cidade_estado, nome_mae, profissao, cns')
        .eq('role', 'paciente')
        .order('full_name', { ascending: true })
      if (tenantId) q = q.eq('tenant_id', tenantId)
      if (scopeByDoctor) q = q.eq('doctor_id', userId)
      return q
    })(),
    (() => {
      let q = db.from('documents')
        .select('id, patient_id, title, file_type, file_size, file_url, created_at, patient:profiles!patient_id(id, full_name)')
        .order('created_at', { ascending: false })
      if (tenantId) q = q.eq('tenant_id', tenantId)
      // Staff não-médico só vê documentos que ele mesmo enviou
      if (isStaffNaoMedico) q = q.eq('uploaded_by', userId)
      return q
    })(),
    (() => {
      // Sem permissão de financeiro → não carrega nada
      if (!memberPermissions.financeiro) return Promise.resolve({ data: [] as any[] })
      let q = db.from('financial_entries')
        .select('*')
        .order('date', { ascending: false })
      if (tenantId) q = q.eq('tenant_id', tenantId)
      if (scopeByDoctor) q = q.eq('doctor_id', userId)
      return q
    })(),
    // Consultas leves: só campos para lista, panorama e agenda (sem textos longos nem diagnosticos JSON)
    (() => {
      let q = db.from('consultas')
        .select('id, patient_id, tipo, local, data_hora, duracao_min, status, prontuario_finalizado, prontuario_finalizado_at, pas, pad, fc, created_at, updated_at')
        .order('data_hora', { ascending: true })
      if (tenantId) q = q.eq('tenant_id', tenantId)
      if (scopeByDoctor) q = q.eq('doctor_id', userId)
      return q
    })(),
    // Perfil do usuário logado (para saudação personalizada e dados do médico)
    db.from('profiles').select('full_name, sexo, crm, especialidade').eq('id', userId).single(),
    // Notificações para a secretaria
    tenantId ? getNotificacoes(tenantId) : Promise.resolve([]),
    // Perfil do médico da clínica (usado pela secretaria na nota fiscal)
    isStaffNaoMedico && tenantId
      ? adminDb.from('profiles').select('full_name, crm, especialidade').eq('role', 'medico').eq('tenant_id', tenantId).limit(1).single()
      : Promise.resolve({ data: null }),
  ])

  // Subtítulo contextual de consultas (fuso Brasília)
  const nowBR   = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const todayBR = nowBR.toLocaleDateString('pt-BR')

  const allConsultas = (consultas ?? []).filter(c => c.status !== 'cancelado')
  const patientMap   = new Map((patients ?? []).map(p => [p.id, p.full_name ?? '—']))

  // Início e fim da semana atual em BRT (seg–dom)
  const startOfWeekBR = new Date(nowBR)
  const dow = nowBR.getDay() // 0=dom
  startOfWeekBR.setDate(nowBR.getDate() - ((dow + 6) % 7)) // recua para segunda
  startOfWeekBR.setHours(0, 0, 0, 0)
  const endOfWeekBR = new Date(startOfWeekBR)
  endOfWeekBR.setDate(startOfWeekBR.getDate() + 7)

  function toSummary(c: typeof allConsultas[number]): ConsultaSummaryItem {
    return { id: c.id, patientName: patientMap.get(c.patient_id) ?? '—', dataHora: c.data_hora }
  }

  const consultasHoje: ConsultaSummaryItem[] = allConsultas
    .filter(c => new Date(c.data_hora).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) === todayBR)
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
    .map(toSummary)

  const consultasSemana: ConsultaSummaryItem[] = allConsultas
    .filter(c => {
      const dt = new Date(c.data_hora)
      return dt >= startOfWeekBR && dt < endOfWeekBR
    })
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())
    .map(toSummary)

  const displayName = getDisplayName(currentProfile?.full_name ?? null, currentProfile?.sexo ?? null, currentRole)

  // Dados do médico para o card de identidade da clínica
  const rawDoctorName    = (isStaffNaoMedico ? medicoProfile?.full_name    : currentProfile?.full_name)    ?? null
  const rawDoctorCrm     = (isStaffNaoMedico ? medicoProfile?.crm          : currentProfile?.crm)          ?? null
  const rawDoctorSpecialty = (isStaffNaoMedico ? medicoProfile?.especialidade : currentProfile?.especialidade) ?? null

  const cardName      = stripTitle(rawDoctorName)
  const cardCrm       = formatCrm(rawDoctorCrm)
  const cardSpecialty = rawDoctorSpecialty

  // Contadores para o card (versão leve — PanoramaTab faz a versão completa)
  const cutoffDate = new Date(nowBR)
  cutoffDate.setMonth(cutoffDate.getMonth() - 24)
  const cutoffISO = cutoffDate.toISOString()
  const mesAtual  = `${nowBR.getFullYear()}-${String(nowBR.getMonth() + 1).padStart(2, '0')}`

  const lastConsultaByPatient = new Map<string, string>()
  for (const c of consultas ?? []) {
    if (c.status === 'realizada') {
      const cur = lastConsultaByPatient.get(c.patient_id)
      if (!cur || c.data_hora > cur) lastConsultaByPatient.set(c.patient_id, c.data_hora)
    }
  }
  const ativosCount       = (patients ?? []).filter(p =>
    p.status_paciente !== 'obito' && (lastConsultaByPatient.get(p.id) ?? '') >= cutoffISO
  ).length
  const consultasMesCount = (consultas ?? []).filter(c =>
    c.status === 'realizada' && c.data_hora.startsWith(mesAtual)
  ).length

  // Quais pacientes têm exames registrados (imaging ou biopsia)
  const patientIds = (patients ?? []).map(p => p.id)
  let patientsWithExames: string[] = []
  if (patientIds.length > 0) {
    const [{ data: imgData }, { data: biopsiaData }] = await Promise.all([
      adminDb.from('imaging_results').select('patient_id').in('patient_id', patientIds),
      adminDb.from('biopsia_results').select('patient_id').in('patient_id', patientIds),
    ])
    const withExamesSet = new Set<string>()
    for (const r of imgData ?? []) withExamesSet.add(r.patient_id)
    for (const r of biopsiaData ?? []) withExamesSet.add(r.patient_id)
    patientsWithExames = Array.from(withExamesSet)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero — saudação personalizada */}
      <div className="mb-8 pb-7 border-b border-black/[0.06]">

        {/* Linha superior: label + data */}
        <div className="flex items-center justify-between mb-3.5">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: '#7A9E7E' }}>
            MedEn · Clinical Intelligence
          </p>
          <span className="text-[11px] text-gray-400 capitalize tracking-wide hidden sm:block">
            {getDateLabel()}
          </span>
        </div>

        {/* Linha principal: saudação + botão configurações */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight leading-snug" style={{ color: '#2D2B6B' }}>
              {getGreeting()},{' '}
              <span style={{ color: '#2D2B6B' }}>{displayName}.</span>
            </h1>
            <WeekSummaryBadge hoje={consultasHoje} semana={consultasSemana} />
          </div>

          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            {currentRole === 'secretaria' && tenantId && (
              <AvisosPanel notificacoes={notificacoes} tenantId={tenantId} />
            )}
            {(currentRole === 'medico' || currentRole === 'superadmin') && (
              <Link
                href="/medico/configuracoes"
                className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100"
              >
                <Settings className="w-4 h-4" />
                Configurações
              </Link>
            )}
          </div>
        </div>

        {/* Card identidade da clínica */}
        <div
          className="flex items-center gap-4 mt-5 px-5 py-4 rounded-2xl"
          style={{ backgroundColor: '#062149' }}
        >
          <div className="flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logogui.svg" alt="Logo da clínica" className="w-8 h-8" style={{ filter: 'invert(1)' }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-semibold text-sm leading-snug truncate">
              {clinicName ?? (cardName ? `Consultório Dr. ${cardName}` : 'Clínica')}
            </p>
            <p className="text-white/50 text-xs mt-0.5 truncate">
              {cardSpecialty ?? 'Medicina'}{cardCrm ? ` · ${cardCrm}` : ''}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
            <div className="text-right">
              <p className="text-white text-xl font-bold leading-none">{ativosCount}</p>
              <p className="text-white/45 text-[11px] mt-1 uppercase tracking-wide">pacientes ativos</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-right">
              <p className="text-white text-xl font-bold leading-none">{consultasMesCount}</p>
              <p className="text-white/45 text-[11px] mt-1 uppercase tracking-wide">consultas este mês</p>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="h-96 flex items-center justify-center text-gray-400 text-sm">Carregando...</div>}>
        <MedicoDashboard
          currentRole={currentRole}
          memberRole={memberRole}
          permissions={memberPermissions}
          isMultiMedico={isMultiMedico}
          showSalasTab={showSalasTab}
          doctorId={userId}
          doctorName={rawDoctorName}
          doctorCrm={rawDoctorCrm}
          calendarUrl={tenantId ? `https://${headersList.get('host')}/api/calendar?tid=${tenantId}&key=${calendarFeedKey(tenantId)}` : null}
          patients={(patients ?? []) as any}
          documents={(documents ?? []) as any}
          consultas={(consultas ?? []) as any}
          financialEntries={(financialEntries ?? []) as any}
          patientsWithExames={patientsWithExames}
        />
      </Suspense>
    </div>
  )
}
