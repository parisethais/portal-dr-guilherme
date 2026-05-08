import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const SECRET = process.env.COPILOT_SECRET ?? 'copilot2026guilherme'

export async function POST(req: NextRequest) {
  // Valida o secret
  const secret = req.headers.get('x-copilot-secret')
  if (secret !== SECRET) {
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

    // Cria a consulta
    const { data: novaConsulta, error: insertError } = await admin
      .from('consultas')
      .insert({
        patient_id:   patient.id,
        tipo:         consulta.tipo         ?? 'retorno',
        local:        consulta.local        ?? 'consultorio',
        data_hora:    consulta.data_hora,
        duracao_min:  consulta.duracao_min  ?? 30,
        status:       'agendada',
        observacoes:  consulta.observacoes  ?? 'Agendado via WhatsApp pelo Dr. Guilherme',
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

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    revalidatePath('/medico')
    revalidatePath('/paciente')

    return NextResponse.json({ success: true, consulta_id, nova_data: consulta.data_hora })
  }

  return NextResponse.json({ error: `Evento "${evento}" não reconhecido.` }, { status: 400 })
}
