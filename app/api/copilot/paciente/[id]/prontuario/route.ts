import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SECRET = process.env.COPILOT_SECRET

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (req.headers.get('x-copilot-secret') !== SECRET) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { id } = await params
  const admin = createAdminClient()

  // Busca dados do paciente
  const { data: paciente, error: pErr } = await admin
    .from('profiles')
    .select('id, full_name, phone, email, data_nascimento, sexo, diagnostico, status_paciente, retorno_previsto')
    .eq('id', id)
    .eq('role', 'paciente')
    .single()

  if (pErr || !paciente) {
    return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 })
  }

  // Busca todas as consultas não canceladas com dados de prontuário
  const { data: consultas, error: cErr } = await admin
    .from('consultas')
    .select(`
      id, data_hora, tipo, local, duracao_min, status, observacoes,
      diagnosticos, evolucao, exame_fisico,
      pas, pad, fc,
      impressao, conduta,
      prontuario_finalizado, prontuario_finalizado_at,
      created_at
    `)
    .eq('patient_id', id)
    .neq('status', 'cancelada')
    .order('data_hora', { ascending: false })

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 })
  }

  const consultasFormatadas = (consultas ?? []).map(c => {
    // Parseia diagnósticos do JSON
    let diagnosticos: { nome: string; evolucao?: string }[] = []
    if (c.diagnosticos) {
      try { diagnosticos = JSON.parse(c.diagnosticos) } catch { diagnosticos = [] }
    }

    return {
      id:           c.id,
      data:         new Date(c.data_hora).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      hora:         new Date(c.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
      tipo:         c.tipo,
      local:        c.local,
      duracao_min:  c.duracao_min,
      status:       c.status,
      observacoes:  c.observacoes,
      prontuario_finalizado: c.prontuario_finalizado,
      sinais_vitais: (c.pas != null || c.pad != null || c.fc != null) ? {
        pas: c.pas,
        pad: c.pad,
        fc:  c.fc,
      } : null,
      diagnosticos,
      evolucao:    c.evolucao     ?? null,
      exame_fisico: c.exame_fisico ?? null,
      impressao:   c.impressao    ?? null,
      conduta:     c.conduta      ?? null,
    }
  })

  return NextResponse.json({
    paciente: {
      id:               paciente.id,
      nome:             paciente.full_name,
      telefone:         paciente.phone,
      email:            paciente.email,
      data_nascimento:  paciente.data_nascimento,
      sexo:             paciente.sexo,
      diagnostico_principal: paciente.diagnostico,
      status:           paciente.status_paciente,
      retorno_previsto: paciente.retorno_previsto,
    },
    total_consultas: consultasFormatadas.length,
    consultas: consultasFormatadas,
  })
}
