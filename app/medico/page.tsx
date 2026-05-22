import { Suspense } from 'react'
import { headers } from 'next/headers'

// Aumenta o timeout da rota para suportar análise OCR de PDFs via Anthropic
export const maxDuration = 60
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import MedicoDashboard from '@/components/medico/MedicoDashboard'

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
  const first = fullName?.split(' ')[0] ?? 'você'
  if (role === 'medico' || role === 'superadmin') {
    return `${sexo === 'feminino' ? 'Dra.' : 'Dr.'} ${first}`
  }
  return first
}

export default async function MedicoPage() {
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

  // Superadmin usa adminClient para ver todos os dados (bypassa RLS)
  // Médico/secretaria usa client normal (RLS filtra pela clínica deles)
  const supabase = await createClient()
  const db = currentRole === 'superadmin' ? createAdminClient() : supabase

  // Carrega só o essencial para a lista e agenda.
  // Dados pesados (consultas completas, lab, imagem, faturas) são
  // buscados por paciente via getPatientDetailData() quando o usuário abre um paciente.
  const [
    { data: patients },
    { data: documents },
    { data: financialEntries },
    { data: consultas },
    { data: currentProfile },
  ] = await Promise.all([
    db.from('profiles')
      .select('id, full_name, email, phone, cpf, sexo, data_nascimento, status_paciente, perfil_completo, como_conheceu, obs_secretaria, retorno_previsto, lgpd_accepted, diagnostico, created_at, role')
      .eq('role', 'paciente')
      .order('full_name', { ascending: true }),
    db.from('documents')
      .select('id, patient_id, title, file_type, file_size, file_url, created_at, patient:profiles!patient_id(id, full_name)')
      .order('created_at', { ascending: false }),
    db.from('financial_entries')
      .select('*')
      .order('date', { ascending: false }),
    // Consultas leves: só campos para lista, panorama e agenda (sem textos longos nem diagnosticos JSON)
    db.from('consultas')
      .select('id, patient_id, tipo, local, data_hora, duracao_min, status, prontuario_finalizado, prontuario_finalizado_at, pas, pad, fc, created_at, updated_at')
      .order('data_hora', { ascending: true }),
    // Perfil do usuário logado (para saudação personalizada)
    db.from('profiles').select('full_name, sexo').eq('id', userId).single(),
  ])

  // Subtítulo contextual de consultas (fuso Brasília)
  const nowBR   = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  const todayBR = nowBR.toLocaleDateString('pt-BR')

  const allConsultas = (consultas ?? []).filter(c => c.status !== 'cancelado')

  const consultasHoje = allConsultas.filter(c =>
    new Date(c.data_hora).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) === todayBR
  )

  let subtitleMsg: string
  const n = consultasHoje.length
  if (n > 0) {
    subtitleMsg = `Você tem ${n} consulta${n > 1 ? 's' : ''} agendada${n > 1 ? 's' : ''} para hoje.`
  } else {
    // Próxima consulta futura
    const proxima = allConsultas
      .map(c => ({ ...c, dt: new Date(c.data_hora) }))
      .filter(c => c.dt > nowBR)
      .sort((a, b) => a.dt.getTime() - b.dt.getTime())[0]

    if (proxima) {
      const label = proxima.dt.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        weekday: 'long',
        day:     'numeric',
        month:   'long',
      })
      const hora = proxima.dt.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour:   '2-digit',
        minute: '2-digit',
      })
      subtitleMsg = `Próxima consulta: ${label} às ${hora}.`
    } else {
      subtitleMsg = 'Nenhuma consulta agendada.'
    }
  }

  const displayName = getDisplayName(currentProfile?.full_name ?? null, currentProfile?.sexo ?? null, currentRole)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Hero — saudação personalizada */}
      <div className="mb-8 pb-7 border-b border-black/[0.06]">

        {/* Linha superior: label + data */}
        <div className="flex items-center justify-between mb-3.5">
          <p className="text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: '#7A9E7E' }}>
            MedEn · Clinical Intelligence
          </p>
          <span className="text-[11px] text-gray-300 capitalize tracking-wide hidden sm:block">
            {getDateLabel()}
          </span>
        </div>

        {/* Linha principal: saudação + botão configurações */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold tracking-tight leading-snug" style={{ color: '#2D2B6B' }}>
              {getGreeting()},{' '}
              <span style={{ color: '#2D2B6B' }}>{displayName}.</span>
            </h1>
            <p className="text-gray-400 mt-1.5 text-sm font-normal">
              {subtitleMsg}
            </p>
          </div>

          {currentRole === 'medico' && (
            <Link
              href="/medico/configuracoes"
              className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-100 shrink-0 mt-0.5"
            >
              <Settings className="w-4 h-4" />
              Configurações
            </Link>
          )}
        </div>
      </div>

      <Suspense fallback={<div className="h-96 flex items-center justify-center text-gray-400 text-sm">Carregando...</div>}>
        <MedicoDashboard
          currentRole={currentRole}
          doctorId={userId}
          patients={(patients ?? []) as any}
          documents={(documents ?? []) as any}
          consultas={(consultas ?? []) as any}
          financialEntries={(financialEntries ?? []) as any}
        />
      </Suspense>
    </div>
  )
}
