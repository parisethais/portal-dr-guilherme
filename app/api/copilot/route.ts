import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { isCopilotAuthorized, COPILOT_TENANT } from '@/lib/copilot-auth'

export async function POST(req: NextRequest) {
  // Valida o secret
  if (!isCopilotAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  const { evento } = body as { evento?: string }

  // ──────────────────────────────────────────
  // EVENTO: consulta_agendada
  // ──────────────────────────────────────────
  if (evento === 'consulta_agendada') {
    const { paciente, consulta } = body as {
      paciente: { nome?: string; telefone?: string }
      consulta: {
        data_hora: string
        tipo?: string
        local?: string
        duracao_min?: number
        observacoes?: string
      }
    }

    if (!paciente?.nome && !paciente?.telefone) {
      return NextResponse.json({ error: 'Informe nome ou telefone do paciente.' }, { status: 400 })
    }
    if (!consulta?.data_hora) {
      return NextResponse.json({ error: 'data_hora é obrigatório.' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Busca o paciente pelo nome (case-insensitive) ou telefone
    let query = admin
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'paciente')
      .eq('tenant_id', COPILOT_TENANT)

    if (paciente.nome) {
      query = query.ilike('full_name', `%${paciente.nome}%`)
    } else if (paciente.telefone) {
      query = query.eq('phone', paciente.telefone)
    }

    const { data: matches, error: searchError } = await query.limit(1)

    if (searchError) {
      return NextResponse.json({ error: searchError.message }, { status: 500 })
    }
    if (!matches || matches.length === 0) {
      return NextResponse.json(
        { error: `Paciente "${paciente.nome ?? paciente.telefone}" não encontrado no portal.` },
        { status: 404 }
      )
    }

    const patient = matches[0]

    // Médico responsável: o médico da clínica do tenant do copilot
    const { resolveDoctorForTenant } = await import('@/lib/resolve-doctor')
    const doctorId = await resolveDoctorForTenant(COPILOT_TENANT)

    // Cria a consulta
    const { data: novaConsulta, error: insertError } = await admin
      .from('consultas')
      .insert({
        patient_id:   patient.id,
        doctor_id:    doctorId,
        tipo:         consulta.tipo         ?? 'retorno',
        local:        consulta.local        ?? 'consultorio',
        data_hora:    consulta.data_hora,
        duracao_min:  consulta.duracao_min  ?? 30,
        status:       'agendada',
        observacoes:  consulta.observacoes  ?? 'Agendado via WhatsApp pelo Dr. Guilherme',
        tenant_id:    COPILOT_TENANT,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    revalidatePath('/medico')
    revalidatePath('/paciente')

    return NextResponse.json({
      success: true,
      consulta_id: novaConsulta.id,
      paciente:    patient.full_name,
      data_hora:   consulta.data_hora,
    })
  }

  // ──────────────────────────────────────────
  // EVENTO: consulta_cancelada
  // ──────────────────────────────────────────
  if (evento === 'consulta_cancelada') {
    const { consulta_id } = body as { consulta_id?: string }

    if (!consulta_id) {
      return NextResponse.json({ error: 'consulta_id é obrigatório.' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { error } = await admin
      .from('consultas')
      .update({ status: 'cancelada' })
      .eq('id', consulta_id)
      .eq('tenant_id', COPILOT_TENANT)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/medico')
    revalidatePath('/paciente')

    return NextResponse.json({ success: true, consulta_id })
  }

  // ──────────────────────────────────────────
  // EVENTO: consulta_remarcada
  // ──────────────────────────────────────────
  if (evento === 'consulta_remarcada') {
    const { consulta_id, consulta } = body as {
      consulta_id: string
      consulta: { data_hora: string; observacoes?: string }
    }

    if (!consulta_id || !consulta?.data_hora) {
      return NextResponse.json({ error: 'consulta_id e data_hora são obrigatórios.' }, { status: 400 })
    }

    const admin = createAdminClient()

    const { error } = await admin
      .from('consultas')
      .update({
        data_hora:   consulta.data_hora,
        status:      'agendada',
        observacoes: consulta.observacoes ?? 'Remarcado via WhatsApp pelo Dr. Guilherme',
      })
      .eq('id', consulta_id)
      .eq('tenant_id', COPILOT_TENANT)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/medico')
    revalidatePath('/paciente')

    return NextResponse.json({ success: true, consulta_id, nova_data: consulta.data_hora })
  }

  // ──────────────────────────────────────────
  // EVENTO: visita_buscar
  // Busca pacientes com internação ativa pelo nome (para desambiguação)
  // ──────────────────────────────────────────
  if (evento === 'visita_buscar') {
    const { patient_name } = body as { patient_name?: string }
    if (!patient_name?.trim()) {
      return NextResponse.json({ error: 'patient_name é obrigatório.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: internacoes, error } = await admin
      .from('internacoes')
      .select('id, hospital, hospital_outro, patient_id, profiles(full_name)')
      .eq('finalizada', false)
      .eq('tenant_id', COPILOT_TENANT)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const term = patient_name.trim().toLowerCase()
    const matches = (internacoes ?? []).filter((i: any) =>
      (i.profiles?.full_name ?? '').toLowerCase().includes(term)
    )

    if (matches.length === 0) {
      return NextResponse.json({ status: 'not_found', message: `Nenhum paciente internado encontrado com "${patient_name}".` })
    }

    const candidates = matches.map((i: any) => ({
      patient_id:    i.patient_id,
      patient_name:  i.profiles?.full_name ?? '—',
      internacao_id: i.id,
      hospital:      i.hospital_outro && i.hospital === 'outro' ? i.hospital_outro : hospitalLabelFromValue(i.hospital),
    }))

    if (candidates.length === 1) {
      return NextResponse.json({ status: 'found', candidate: candidates[0] })
    }

    return NextResponse.json({ status: 'ambiguous', candidates })
  }

  // ──────────────────────────────────────────
  // EVENTO: visita_registrar
  // Registra uma visita (após desambiguação confirmada)
  // ──────────────────────────────────────────
  if (evento === 'visita_registrar') {
    const { internacao_id, visitador, data_visita, dialise } = body as {
      internacao_id?: string
      visitador?:     string
      data_visita?:   string
      dialise?:       string
    }

    if (!internacao_id || !visitador) {
      return NextResponse.json({ error: 'internacao_id e visitador são obrigatórios.' }, { status: 400 })
    }

    const VISITADORES_VALIDOS = ['Guilherme', 'Letícia', 'Fernando', 'Geison']
    if (!VISITADORES_VALIDOS.includes(visitador)) {
      return NextResponse.json({
        error: `Visitador inválido. Use: ${VISITADORES_VALIDOS.join(', ')}.`
      }, { status: 400 })
    }

    const DIALISE_VALIDOS = ['nao', 'hdi', 'sled', 'crrt']
    const dialiseVal = dialise && DIALISE_VALIDOS.includes(dialise) ? dialise : 'nao'

    // Resolve data_visita: aceita 'hoje' ou YYYY-MM-DD
    const dataVisita = (data_visita === 'hoje' || !data_visita)
      ? new Date().toLocaleDateString('sv-SE') // 'sv-SE' → YYYY-MM-DD
      : data_visita

    const admin = createAdminClient()

    // Busca a internação para obter tenant_id e confirmar que está ativa
    const { data: internacao, error: fetchError } = await admin
      .from('internacoes')
      .select('id, tenant_id, finalizada, patient_id, profiles(full_name)')
      .eq('id', internacao_id)
      .eq('tenant_id', COPILOT_TENANT)
      .single()

    if (fetchError || !internacao) {
      return NextResponse.json({ error: 'Internação não encontrada.' }, { status: 404 })
    }
    if (internacao.finalizada) {
      return NextResponse.json({ error: 'Esta internação já foi finalizada.' }, { status: 400 })
    }

    const { error: insertError } = await admin
      .from('visitas_hospitalares')
      .insert({
        internacao_id,
        tenant_id:   internacao.tenant_id,
        data_visita: dataVisita,
        visitador,
        dialise:     dialiseVal,
      })

    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    const patientName = (internacao as any).profiles?.full_name ?? 'paciente'
    const dataFmt = new Date(dataVisita + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

    return NextResponse.json({
      success: true,
      message: `Visita de ${visitador} registrada para ${patientName} em ${dataFmt}.`,
      internacao_id,
      visitador,
      data_visita: dataVisita,
    })
  }

  return NextResponse.json({ error: `Evento "${evento}" não reconhecido.` }, { status: 400 })
}

// ── GET /api/copilot — Resumo de visitas por visitador ────────────
export async function GET(req: NextRequest) {
  if (!isCopilotAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: internacoes, error } = await admin
    .from('internacoes')
    .select('id, hospital, hospital_outro, finalizada, valor_visita, patient_id, profiles(full_name), visitas_hospitalares(id, visitador, data_visita, dialise)')
    .eq('tenant_id', COPILOT_TENANT)
    .order('data_internacao', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Agrupa por visitador
  const porVisitador: Record<string, {
    total_visitas: number
    pacientes: Set<string>
    total_financeiro: number
  }> = {}

  for (const i of (internacoes ?? []) as any[]) {
    const patientName: string = i.profiles?.full_name ?? '—'
    for (const v of (i.visitas_hospitalares ?? [])) {
      if (!porVisitador[v.visitador]) {
        porVisitador[v.visitador] = { total_visitas: 0, pacientes: new Set(), total_financeiro: 0 }
      }
      porVisitador[v.visitador].total_visitas++
      porVisitador[v.visitador].pacientes.add(patientName)
      if (i.finalizada && i.valor_visita) {
        porVisitador[v.visitador].total_financeiro += i.valor_visita
      }
    }
  }

  const resumo = Object.entries(porVisitador)
    .sort((a, b) => b[1].total_visitas - a[1].total_visitas)
    .map(([visitador, dados]) => ({
      visitador,
      total_visitas:    dados.total_visitas,
      pacientes:        [...dados.pacientes],
      total_financeiro: dados.total_financeiro,
    }))

  // Internações ativas com detalhe de visitas por internação
  const internacoes_ativas = ((internacoes ?? []) as any[])
    .filter(i => !i.finalizada)
    .map(i => ({
      patient_name: i.profiles?.full_name ?? '—',
      hospital: i.hospital_outro && i.hospital === 'outro' ? i.hospital_outro : hospitalLabelFromValue(i.hospital),
      visitas: (i.visitas_hospitalares ?? []).map((v: any) => ({
        visitador:   v.visitador,
        data_visita: v.data_visita,
        dialise:     v.dialise,
      })),
    }))

  return NextResponse.json({ resumo, internacoes_ativas })
}

function hospitalLabelFromValue(value: string) {
  const map: Record<string, string> = {
    sirio_libanes:  'Sírio Libanês',
    vila_nova_star: 'Vila Nova Star',
    einstein:       'Einstein',
  }
  return map[value] ?? value
}
