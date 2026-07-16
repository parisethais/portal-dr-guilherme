'use server'

import { createAdminClient } from '@/lib/supabase/admin-client'
import { createClient }      from '@/lib/supabase/server'
import { getCallerTenantId } from '@/lib/get-caller-tenant'

export interface CrmPendencia {
  patientId: string
  nome:      string
  campos:    string[]
}

export interface NfPendencia {
  id:        string
  descricao: string
  paciente:  string
}

export interface Pendencia {
  tipo:  'retorno' | 'crm' | 'nf' | 'confirmacao'
  texto: string
}

export interface KpiData {
  mes:             string
  secretariaNome:  string | null
  secretariaId:    string | null

  // 1. Retenção (40%)
  retornoTotal:    number
  retornoAgendado: number
  retornoNomes:    { nome: string; retorno: string; status: 'ok' | 'pendente' }[]

  // 2. Novos pacientes (20%)
  novosConsulta: number

  // 3. Qualidade do CRM (20%)
  crmTotal:      number
  crmScore:      number   // 0–100, média de completude
  crmPendencias: CrmPendencia[]

  // 4. NF em dia (10%)
  nfElegiveis:  number
  nfEmDia:      number
  nfPendencias: NfPendencia[]

  // 5. Taxa de confirmação (10%)
  consultasAgendadas:   number
  consultasConfirmadas: number

  // Caixa de pendências consolidada
  pendencias: Pendencia[]
}

const CRM_CAMPOS: { key: keyof ReturnType<typeof buildCrmFields>; label: string }[] = [
  { key: 'cpf',           label: 'CPF' },
  { key: 'phone',         label: 'Telefone' },
  { key: 'email',         label: 'E-mail' },
  { key: 'cidade',        label: 'Cidade' },
  { key: 'origem',        label: 'Como conheceu o consultório' },
  { key: 'encaminhador',  label: 'Médico encaminhador' },
  { key: 'retorno',       label: 'Retorno previsto' },
]

function buildCrmFields(p: {
  cpf: string | null
  phone: string | null
  email: string | null
  cidade_estado: string | null
  como_conheceu: string | null
  retorno_previsto: string | null
}) {
  const comoConheceu = (p.como_conheceu ?? '').trim()
  const isMedico     = comoConheceu.toLowerCase().startsWith('indicação médica')

  return {
    cpf:          !!(p.cpf?.trim()),
    phone:        !!(p.phone?.trim()),
    email:        !!(p.email?.trim()),
    cidade:       !!(p.cidade_estado?.trim()),
    origem:       !!(comoConheceu),
    // só penaliza encaminhador se a origem já é "indicação médica" mas o nome veio vazio
    encaminhador: isMedico ? comoConheceu !== 'Indicação médica' : true,
    retorno:      !!(p.retorno_previsto),
  }
}

export async function getKpiSecretaria(mes: string): Promise<KpiData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const tenantId = await getCallerTenantId(user.id)
  const admin    = createAdminClient()

  const mesStart = mes + '-01'
  // Último dia do mês calculado corretamente
  const [y, m]   = mes.split('-').map(Number)
  const mesEnd   = new Date(y, m, 0).toISOString().slice(0, 10)

  // Secretária do tenant
  const { data: secMember } = await admin
    .from('clinic_members')
    .select('user_id, profiles!user_id(full_name)')
    .eq('tenant_id', tenantId)
    .eq('role', 'secretaria')
    .maybeSingle()

  const secretariaId   = secMember?.user_id ?? null
  const secretariaNome = (secMember?.profiles as any)?.full_name ?? null

  // ── Consultas do mês ──────────────────────────────────────────────────
  const { data: consultas } = await admin
    .from('consultas')
    .select('id, status, tipo, data_hora, patient_id')
    .eq('tenant_id', tenantId)
    .gte('data_hora', mesStart + 'T00:00:00')
    .lte('data_hora', mesEnd + 'T23:59:59')

  const cs = consultas ?? []
  const CONFIRMADO_OU_ALEM = new Set(['confirmada', 'em_atendimento', 'realizada'])

  const consultasAgendadas   = cs.filter(c => c.status !== 'cancelada').length
  const consultasConfirmadas = cs.filter(c => CONFIRMADO_OU_ALEM.has(c.status)).length
  const novosConsulta        = cs.filter(c =>
    (c.tipo === 'primeira_consulta' || c.tipo === 'primeira_consulta_desconto') &&
    c.status !== 'cancelada'
  ).length

  // ── Retenção: retornos previstos no mês ──────────────────────────────
  const { data: pacRetorno } = await admin
    .from('profiles')
    .select('id, full_name, retorno_previsto')
    .eq('tenant_id', tenantId)
    .gte('retorno_previsto', mesStart)
    .lte('retorno_previsto', mesEnd)

  const retornoPacientes = pacRetorno ?? []
  const retornoNomes: KpiData['retornoNomes'] = []
  let retornoAgendado = 0

  for (const p of retornoPacientes) {
    const temConsulta = cs.some(c =>
      c.patient_id === p.id && c.status !== 'cancelada'
    )
    retornoNomes.push({
      nome:    p.full_name ?? '—',
      retorno: p.retorno_previsto!,
      status:  temConsulta ? 'ok' : 'pendente',
    })
    if (temConsulta) retornoAgendado++
  }

  // ── Qualidade do CRM ──────────────────────────────────────────────────
  const patientIdsMes = [...new Set(
    cs.filter(c => c.status !== 'cancelada').map(c => c.patient_id).filter(Boolean)
  )]

  let crmScore = 100
  const crmPendencias: CrmPendencia[] = []

  if (patientIdsMes.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, full_name, cpf, phone, email, cidade_estado, como_conheceu, retorno_previsto')
      .in('id', patientIdsMes)

    const profs = profiles ?? []
    const scores: number[] = []

    for (const p of profs) {
      const fields = buildCrmFields(p as any)
      const total  = Object.keys(fields).length
      const filled = Object.values(fields).filter(Boolean).length
      scores.push((filled / total) * 100)

      const faltando = CRM_CAMPOS
        .filter(c => !fields[c.key])
        .map(c => c.label)

      if (faltando.length > 0) {
        crmPendencias.push({ patientId: p.id, nome: p.full_name ?? '—', campos: faltando })
      }
    }

    crmScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 100
  }

  // ── NF em dia ─────────────────────────────────────────────────────────
  const { data: entries } = await admin
    .from('financial_entries')
    .select('id, description, nota_fiscal_status, patient_id')
    .eq('tenant_id', tenantId)
    .eq('type', 'receita')
    .eq('scope', 'clinic')
    .gte('date', mesStart)
    .lte('date', mesEnd)

  const receitas    = (entries ?? []).filter(e => e.nota_fiscal_status !== 'nao_se_aplica')
  const nfElegiveis = receitas.length
  const nfEmDia     = receitas.filter(e => e.nota_fiscal_status === 'solicitada' || e.nota_fiscal_status === 'emitida').length

  const nfPendencias: NfPendencia[] = receitas
    .filter(e => e.nota_fiscal_status === 'a_solicitar')
    .map(e => ({
      id:       e.id,
      descricao: e.description ?? 'Receita sem descrição',
      paciente: '',
    }))

  // Enriquecer nomes dos pacientes nas pendências de NF
  if (nfPendencias.length > 0) {
    const pids = [...new Set(receitas.filter(e => e.nota_fiscal_status === 'a_solicitar').map(e => e.patient_id).filter(Boolean))]
    if (pids.length > 0) {
      const { data: pnames } = await admin
        .from('profiles')
        .select('id, full_name')
        .in('id', pids)
      const nameMap = Object.fromEntries((pnames ?? []).map(p => [p.id, p.full_name ?? '—']))
      const entryMap = Object.fromEntries(receitas.filter(e => e.nota_fiscal_status === 'a_solicitar').map(e => [e.id, e.patient_id]))
      nfPendencias.forEach(p => { p.paciente = nameMap[entryMap[p.id]] ?? '' })
    }
  }

  // ── Caixa de pendências consolidada ──────────────────────────────────
  const pendencias: Pendencia[] = []

  const retornoPendentes = retornoNomes.filter(r => r.status === 'pendente').length
  if (retornoPendentes > 0)
    pendencias.push({ tipo: 'retorno', texto: `${retornoPendentes} paciente${retornoPendentes > 1 ? 's' : ''} com retorno previsto não agendado` })

  if (nfPendencias.length > 0)
    pendencias.push({ tipo: 'nf', texto: `${nfPendencias.length} nota${nfPendencias.length > 1 ? 's' : ''} fiscal${nfPendencias.length > 1 ? 'is' : ''} pendente${nfPendencias.length > 1 ? 's' : ''} de solicitação` })

  const totalCrmCampos = crmPendencias.reduce((acc, p) => acc + p.campos.length, 0)
  if (totalCrmCampos > 0)
    pendencias.push({ tipo: 'crm', texto: `${totalCrmCampos} campo${totalCrmCampos > 1 ? 's' : ''} de cadastro incompleto${totalCrmCampos > 1 ? 's' : ''} em ${crmPendencias.length} paciente${crmPendencias.length > 1 ? 's' : ''}` })

  const pctConf = consultasAgendadas > 0 ? (consultasConfirmadas / consultasAgendadas) * 100 : 100
  if (pctConf < 90 && consultasAgendadas > 0)
    pendencias.push({ tipo: 'confirmacao', texto: `${consultasAgendadas - consultasConfirmadas} consulta${consultasAgendadas - consultasConfirmadas > 1 ? 's' : ''} sem confirmação prévia` })

  return {
    mes,
    secretariaNome,
    secretariaId,
    retornoTotal:    retornoPacientes.length,
    retornoAgendado,
    retornoNomes,
    novosConsulta,
    crmTotal:        patientIdsMes.length,
    crmScore,
    crmPendencias,
    nfElegiveis,
    nfEmDia,
    nfPendencias,
    consultasAgendadas,
    consultasConfirmadas,
    pendencias,
  }
}
