/**
 * Motor de execução das automações.
 * Cada função recebe a automação configurada e o cliente DB,
 * encontra os pacientes elegíveis, gera as mensagens e registra em automation_logs.
 *
 * Envio via Copilot:
 *   Quando COPILOT_OUTBOUND_URL estiver configurada, cada mensagem gerada é
 *   disparada para o endpoint POST /enviar-mensagem do copilot com:
 *     { telefone: string, mensagem: string }
 *   Header: x-copilot-secret (se COPILOT_SECRET estiver configurado).
 *   O envio é fire-and-forget — falhas são logadas mas não bloqueiam a automação.
 *
 * TODO multi-tenant: quando houver patient_clinic_id, filtrar pacientes por clínica.
 * Por enquanto todos os pacientes (role='paciente') pertencem à clínica única.
 */

import { createAdminClient } from '@/lib/supabase/admin-client'
import type { ClinicAutomation, AutomationParams } from '@/lib/automation-catalog'

type Db = ReturnType<typeof createAdminClient>

// ── Copilot outbound ──────────────────────────────────────────────────────────

const COPILOT_OUTBOUND_URL = process.env.COPILOT_OUTBOUND_URL  // ex: https://copilot.example.com/enviar-mensagem
const COPILOT_SECRET       = process.env.COPILOT_SECRET

/**
 * Envia mensagem via copilot (fire-and-forget).
 * Só executa se COPILOT_OUTBOUND_URL estiver configurada.
 */
async function sendViaCopilot(telefone: string | null | undefined, mensagem: string): Promise<void> {
  if (!COPILOT_OUTBOUND_URL || !telefone) return

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (COPILOT_SECRET) headers['x-copilot-secret'] = COPILOT_SECRET

    const res = await fetch(COPILOT_OUTBOUND_URL, {
      method:  'POST',
      headers,
      body:    JSON.stringify({ telefone, mensagem }),
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.warn(`[copilot/outbound] ${res.status} — ${body}`)
    }
  } catch (err) {
    console.warn('[copilot/outbound] falha ao enviar:', (err as Error).message)
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────

function replaceTags(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`))
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' às ' +
    d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  )
}

const TIPO_LABEL: Record<string, string> = {
  primeira_consulta:          'Primeira Consulta',
  nova_consulta:              'Nova Consulta',
  retorno:                    'Retorno',
  primeira_consulta_desconto: 'Primeira Consulta (desc.)',
  nova_consulta_desconto:     'Nova Consulta (desc.)',
}

async function logExec(
  db: Db,
  automationId: string,
  clinicId: string,
  patientId: string | null,
  status: 'enviado' | 'erro' | 'ignorado',
  channel: string | null,
  result: Record<string, unknown>,
) {
  const { error } = await db.from('automation_logs').insert({
    automation_id: automationId,
    clinic_id:     clinicId,
    patient_id:    patientId,
    status,
    channel,
    result,
  })
  if (error) console.error('[automation_logs insert]', error.message)
}

/** Verifica se já foi enviada esta automação para este paciente no período de cooldown */
async function alreadySent(
  db: Db,
  automationId: string,
  patientId: string,
  afterIso: string,
): Promise<boolean> {
  const { data } = await db
    .from('automation_logs')
    .select('id')
    .eq('automation_id', automationId)
    .eq('patient_id', patientId)
    .eq('status', 'enviado')
    .gte('triggered_at', afterIso)
    .limit(1)
  return (data?.length ?? 0) > 0
}

// ── 1. Lembrete pré-consulta ──────────────────────────────────────────────

export async function runPreConsultaLembrete(automation: ClinicAutomation): Promise<number> {
  const db = createAdminClient()
  const params   = automation.params as AutomationParams
  const horas    = params.horas_antes ?? 24
  const template = params.mensagem ?? 'Olá {nome}! Lembrando da sua consulta em {data_consulta} às {hora_consulta}.'
  const canal    = params.canal ?? 'whatsapp'

  const agora  = new Date()
  const inicio = new Date(agora.getTime() + (horas - 0.5) * 3600_000).toISOString()
  const fim    = new Date(agora.getTime() + (horas + 0.5) * 3600_000).toISOString()

  // Consultas agendadas na janela ±30 min do horário alvo
  const { data: consultas } = await db
    .from('consultas')
    .select('id, patient_id, data_hora, tipo, local')
    .in('status', ['agendada', 'confirmada'])
    .gte('data_hora', inicio)
    .lte('data_hora', fim)

  if (!consultas?.length) return 0

  // Busca perfis dos pacientes
  const ids = [...new Set(consultas.map(c => c.patient_id as string))]
  const { data: profiles } = await db
    .from('profiles')
    .select('id, full_name, phone')
    .in('id', ids)

  const profileMap = new Map((profiles ?? []).map(p => [p.id as string, p]))

  let count = 0
  for (const c of consultas) {
    const already = await alreadySent(db, automation.id, c.patient_id, inicio)
    if (already) continue

    const profile = profileMap.get(c.patient_id)
    const nome    = profile?.full_name?.split(' ')[0] ?? 'Paciente'
    const mensagem = replaceTags(template, {
      nome,
      data_consulta: fmtDate(c.data_hora),
      hora_consulta: new Date(c.data_hora).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
      tipo_consulta: TIPO_LABEL[c.tipo] ?? c.tipo,
      local:         c.local ?? '',
    })

    await logExec(db, automation.id, automation.clinic_id, c.patient_id, 'enviado', canal, {
      mensagem,
      nome,
      telefone: profile?.phone ?? null,
      consulta_id: c.id,
      consulta_data: c.data_hora,
    })
    await sendViaCopilot(profile?.phone, mensagem)
    count++
  }
  return count
}

// ── 2. Mensagem pós-consulta ──────────────────────────────────────────────

export async function runPosConsulta(automation: ClinicAutomation): Promise<number> {
  const db = createAdminClient()
  const params   = automation.params as AutomationParams
  const template = params.mensagem ?? 'Olá {nome}! Foi um prazer te atender. Qualquer dúvida, pode me chamar!'
  const canal    = params.canal ?? 'whatsapp'

  // Consultas marcadas como realizadas nas últimas 2 horas
  const desde = new Date(Date.now() - 2 * 3600_000).toISOString()

  const { data: consultas } = await db
    .from('consultas')
    .select('id, patient_id, data_hora, updated_at')
    .eq('status', 'realizada')
    .gte('updated_at', desde)

  if (!consultas?.length) return 0

  const ids = [...new Set(consultas.map(c => c.patient_id as string))]
  const { data: profiles } = await db
    .from('profiles').select('id, full_name, phone').in('id', ids)
  const profileMap = new Map((profiles ?? []).map(p => [p.id as string, p]))

  let count = 0
  for (const c of consultas) {
    const already = await alreadySent(db, automation.id, c.patient_id, desde)
    if (already) continue

    const profile  = profileMap.get(c.patient_id)
    const nome     = profile?.full_name?.split(' ')[0] ?? 'Paciente'
    const mensagem = replaceTags(template, {
      nome,
      data_consulta: fmtDate(c.data_hora),
    })

    await logExec(db, automation.id, automation.clinic_id, c.patient_id, 'enviado', canal, {
      mensagem, nome, telefone: profile?.phone ?? null, consulta_id: c.id,
    })
    await sendViaCopilot(profile?.phone, mensagem)
    count++
  }
  return count
}

// ── 3. Régua de inativos ──────────────────────────────────────────────────

export async function runInativoSemConsulta(automation: ClinicAutomation): Promise<number> {
  const db = createAdminClient()
  const params   = automation.params as AutomationParams
  const dias     = params.dias ?? 180
  const template = params.mensagem ?? 'Olá {nome}! Notamos que faz um tempo desde sua última consulta. Quando quiser agendar, estamos à disposição!'
  const canal    = params.canal ?? 'whatsapp'

  const limiteData  = new Date(Date.now() - dias * 86_400_000).toISOString()
  const cooldownIso = new Date(Date.now() - 30 * 86_400_000).toISOString() // não reenviar em 30 dias

  // Pacientes com última consulta realizada antes do limite (ou sem nenhuma)
  const { data: patients } = await db
    .from('profiles')
    .select('id, full_name, phone')
    .eq('role', 'paciente')

  if (!patients?.length) return 0

  let count = 0
  for (const patient of patients) {
    // Última consulta realizada
    const { data: ultimas } = await db
      .from('consultas')
      .select('data_hora')
      .eq('patient_id', patient.id)
      .eq('status', 'realizada')
      .order('data_hora', { ascending: false })
      .limit(1)

    const ultimaData = ultimas?.[0]?.data_hora ?? null

    // Ignora se teve consulta recente
    if (ultimaData && new Date(ultimaData) > new Date(limiteData)) continue

    // Ignora se já enviamos no cooldown
    const already = await alreadySent(db, automation.id, patient.id, cooldownIso)
    if (already) continue

    const nome     = patient.full_name?.split(' ')[0] ?? 'Paciente'
    const mensagem = replaceTags(template, {
      nome,
      ultima_consulta: ultimaData ? fmtDate(ultimaData) : 'há muito tempo',
      dias_inativo:    ultimaData
        ? Math.floor((Date.now() - new Date(ultimaData).getTime()) / 86_400_000)
        : dias,
    })

    await logExec(db, automation.id, automation.clinic_id, patient.id, 'enviado', canal, {
      mensagem, nome, telefone: patient.phone ?? null, ultima_consulta: ultimaData,
    })
    await sendViaCopilot(patient.phone, mensagem)
    count++
  }
  return count
}

// ── 4. Lembrete de retorno previsto ───────────────────────────────────────

export async function runRetornoPrevisto(automation: ClinicAutomation): Promise<number> {
  const db = createAdminClient()
  const params   = automation.params as AutomationParams
  const dias     = params.dias ?? 7
  const template = params.mensagem ?? 'Olá {nome}! Sua consulta de retorno está se aproximando ({data_retorno}). Lembre de agendar!'
  const canal    = params.canal ?? 'whatsapp'

  const alvo     = new Date(Date.now() + dias * 86_400_000)
  const aMin     = new Date(alvo); aMin.setHours(0, 0, 0, 0)
  const aMax     = new Date(alvo); aMax.setHours(23, 59, 59, 999)

  const { data: patients } = await db
    .from('profiles')
    .select('id, full_name, phone, retorno_previsto')
    .eq('role', 'paciente')
    .gte('retorno_previsto', aMin.toISOString().slice(0, 10))
    .lte('retorno_previsto', aMax.toISOString().slice(0, 10))

  if (!patients?.length) return 0

  const cooldownIso = new Date(Date.now() - 3 * 86_400_000).toISOString()
  let count = 0

  for (const patient of patients) {
    const already = await alreadySent(db, automation.id, patient.id, cooldownIso)
    if (already) continue

    const nome     = patient.full_name?.split(' ')[0] ?? 'Paciente'
    const mensagem = replaceTags(template, {
      nome,
      data_retorno:     fmtDate(patient.retorno_previsto!),
      dias_para_retorno: dias,
    })

    await logExec(db, automation.id, automation.clinic_id, patient.id, 'enviado', canal, {
      mensagem, nome, telefone: patient.phone ?? null, retorno_previsto: patient.retorno_previsto,
    })
    await sendViaCopilot(patient.phone, mensagem)
    count++
  }
  return count
}

// ── 5. Mensagem de aniversário ────────────────────────────────────────────

export async function runAniversario(automation: ClinicAutomation): Promise<number> {
  const db = createAdminClient()
  const params   = automation.params as AutomationParams
  const template = params.mensagem ?? 'Olá {nome}! 🎉 Toda a equipe deseja a você um feliz aniversário!'
  const canal    = params.canal ?? 'whatsapp'

  // Hoje em Brasília
  const hoje = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', month: '2-digit', day: '2-digit' })
  const [diaStr, mesStr] = hoje.split('/')
  const dia = parseInt(diaStr), mes = parseInt(mesStr)

  // Busca todos os pacientes e filtra por aniversário hoje
  // (Supabase não tem extract date parts fácil sem RPC, filtrar em JS)
  const { data: patients } = await db
    .from('profiles')
    .select('id, full_name, phone, data_nascimento')
    .eq('role', 'paciente')
    .not('data_nascimento', 'is', null)

  if (!patients?.length) return 0

  const anoAtual    = new Date().getFullYear()
  const cooldownIso = `${anoAtual}-01-01T00:00:00Z` // uma vez por ano

  let count = 0
  for (const patient of patients) {
    if (!patient.data_nascimento) continue
    const nasc = new Date(patient.data_nascimento)
    if (nasc.getUTCMonth() + 1 !== mes || nasc.getUTCDate() !== dia) continue

    const already = await alreadySent(db, automation.id, patient.id, cooldownIso)
    if (already) continue

    const nome     = patient.full_name?.split(' ')[0] ?? 'Paciente'
    const mensagem = replaceTags(template, { nome })

    await logExec(db, automation.id, automation.clinic_id, patient.id, 'enviado', canal, {
      mensagem, nome, telefone: patient.phone ?? null,
    })
    await sendViaCopilot(patient.phone, mensagem)
    count++
  }
  return count
}

// ── Dispatcher principal ──────────────────────────────────────────────────

export async function runAutomation(automation: ClinicAutomation): Promise<{ type: string; count: number; error?: string }> {
  try {
    let count = 0
    switch (automation.type) {
      case 'pre_consulta_lembrete':   count = await runPreConsultaLembrete(automation);  break
      case 'pos_consulta':            count = await runPosConsulta(automation);          break
      case 'inativo_sem_consulta':    count = await runInativoSemConsulta(automation);   break
      case 'retorno_previsto':        count = await runRetornoPrevisto(automation);      break
      case 'aniversario':             count = await runAniversario(automation);          break
      case 'lab_critico':             // triggered on lab save, not cron
      case 'sumario_pre_consulta':    // triggered on demand
        return { type: automation.type, count: 0 }
    }
    return { type: automation.type, count }
  } catch (err) {
    console.error(`[runAutomation] ${automation.type}:`, err)
    return { type: automation.type, count: 0, error: (err as Error).message }
  }
}
