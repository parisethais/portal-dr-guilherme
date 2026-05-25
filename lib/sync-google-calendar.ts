/**
 * Sincroniza consultas do CRM com o Google Calendar do médico da clínica.
 * Todas as funções são fire-and-forget: erros do Google não afetam o CRM.
 */

import { createAdminClient }                                               from '@/lib/supabase/admin-client'
import { refreshGoogleToken, createGoogleEvent, updateGoogleEvent, deleteGoogleEvent } from '@/lib/google-calendar'
import type { ConsultaTipo, ConsultaLocal, ConsultaStatus }                from '@/lib/types'

const TIPO_LABEL: Record<ConsultaTipo, string> = {
  primeira_consulta:          'Primeira Consulta',
  nova_consulta:              'Nova Consulta',
  retorno:                    'Retorno',
  primeira_consulta_desconto: 'Primeira Consulta (Desconto)',
  nova_consulta_desconto:     'Nova Consulta (Desconto)',
}

const TZ = 'America/Sao_Paulo'

interface ConsultaSync {
  id:          string
  patient_id:  string
  tipo:        ConsultaTipo
  local:       ConsultaLocal
  data_hora:   string
  duracao_min: number
  status:      ConsultaStatus
  observacoes?: string | null
  google_calendar_event_id?: string | null
}

async function getTokenForTenant(tenantId: string) {
  const db = createAdminClient()

  const { data: clinic } = await db
    .from('clinics')
    .select('id')
    .eq('tenant_id', tenantId)
    .single()

  if (!clinic) return null

  const { data: member } = await db
    .from('clinic_members')
    .select('user_id')
    .eq('clinic_id', clinic.id)
    .in('role', ['medico', 'owner'])
    .limit(1)
    .single()

  if (!member) return null

  const { data: tokenRow } = await db
    .from('google_tokens')
    .select('access_token, refresh_token, token_expiry, preferred_calendar_id')
    .eq('user_id', member.user_id)
    .single()

  if (!tokenRow?.refresh_token) return null

  // Refresca token se necessário
  const expiry = tokenRow.token_expiry ? new Date(tokenRow.token_expiry) : null
  if (!expiry || expiry.getTime() < Date.now() + 60_000) {
    try {
      const refreshed = await refreshGoogleToken(tokenRow.refresh_token)
      await db.from('google_tokens').update({
        access_token: refreshed.access_token,
        token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        updated_at:   new Date().toISOString(),
      }).eq('user_id', member.user_id)
      return {
        accessToken:  refreshed.access_token,
        calendarId:   tokenRow.preferred_calendar_id ?? 'primary',
        doctorUserId: member.user_id,
      }
    } catch {
      return null
    }
  }

  return {
    accessToken:  tokenRow.access_token!,
    calendarId:   tokenRow.preferred_calendar_id ?? 'primary',
    doctorUserId: member.user_id,
  }
}

function buildEventBody(consulta: ConsultaSync, patientName: string) {
  const start = new Date(consulta.data_hora)
  const end   = new Date(start.getTime() + consulta.duracao_min * 60_000)

  const tipo  = TIPO_LABEL[consulta.tipo] ?? consulta.tipo
  const local = consulta.local === 'telemedicina' ? '📹 Telemedicina' : '🏥 Consultório'

  const lines = [local]
  if (consulta.observacoes) lines.push(`Obs: ${consulta.observacoes}`)
  if (consulta.status !== 'agendada') lines.push(`Status: ${consulta.status}`)

  return {
    summary:     `${tipo} · ${patientName}`,
    description: lines.join('\n'),
    start:       { dateTime: start.toISOString(), timeZone: TZ },
    end:         { dateTime: end.toISOString(),   timeZone: TZ },
    extendedProperties: { private: { crmConsultaId: consulta.id } },
    status: consulta.status === 'cancelada' ? 'cancelled' as const : 'confirmed' as const,
  }
}

export async function syncConsultaCreate(
  tenantId:    string,
  consulta:    ConsultaSync,
): Promise<void> {
  try {
    const token = await getTokenForTenant(tenantId)
    if (!token) return

    const db = createAdminClient()
    const { data: patient } = await db
      .from('profiles')
      .select('full_name')
      .eq('id', consulta.patient_id)
      .single()

    const body    = buildEventBody(consulta, patient?.full_name ?? 'Paciente')
    const created = await createGoogleEvent(token.accessToken, token.calendarId, body)

    if (created?.id) {
      await db.from('consultas').update({
        google_calendar_event_id: created.id,
        updated_at: new Date().toISOString(),
      }).eq('id', consulta.id)
    }
  } catch {
    // fire-and-forget: não propaga erro
  }
}

export async function syncConsultaUpdate(
  tenantId: string,
  consulta:  ConsultaSync,
): Promise<void> {
  try {
    const token = await getTokenForTenant(tenantId)
    if (!token) return

    const db = createAdminClient()

    // Garante que temos o google_calendar_event_id mais atualizado
    let eventId = consulta.google_calendar_event_id
    if (!eventId) {
      const { data: row } = await db
        .from('consultas')
        .select('google_calendar_event_id')
        .eq('id', consulta.id)
        .single()
      eventId = row?.google_calendar_event_id ?? null
    }

    if (!eventId) {
      // Evento ainda não foi criado no Google — cria agora
      return syncConsultaCreate(tenantId, consulta)
    }

    const { data: patient } = await db
      .from('profiles')
      .select('full_name')
      .eq('id', consulta.patient_id)
      .single()

    const body = buildEventBody(consulta, patient?.full_name ?? 'Paciente')
    await updateGoogleEvent(token.accessToken, token.calendarId, eventId, body)
  } catch {
    // fire-and-forget
  }
}

export async function syncConsultaCancel(
  tenantId:   string,
  consultaId: string,
): Promise<void> {
  try {
    const token = await getTokenForTenant(tenantId)
    if (!token) return

    const { data: row } = await createAdminClient()
      .from('consultas')
      .select('google_calendar_event_id, patient_id, tipo, local, data_hora, duracao_min, status, observacoes')
      .eq('id', consultaId)
      .single()

    if (!row?.google_calendar_event_id) return

    // Marca como cancelado (não deleta — mantém no histórico do Google Agenda)
    await updateGoogleEvent(token.accessToken, token.calendarId, row.google_calendar_event_id, {
      status: 'cancelled',
    })
  } catch {
    // fire-and-forget
  }
}
