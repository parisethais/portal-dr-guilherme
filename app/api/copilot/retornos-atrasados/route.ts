import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SECRET = process.env.COPILOT_SECRET

export async function GET(req: NextRequest) {
  if (req.headers.get('x-copilot-secret') !== SECRET) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Data de corte: hoje - 2 dias (fuso Brasília)
  const agora = new Date()
  const hoje = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  hoje.setHours(0, 0, 0, 0)
  const corte = new Date(hoje)
  corte.setDate(corte.getDate() - 2)

  // Pacientes ativos com retorno_previsto até a data de corte
  const { data: pacientes, error } = await admin
    .from('profiles')
    .select('id, full_name, phone, retorno_previsto')
    .eq('role', 'paciente')
    .eq('status_paciente', 'ativo')
    .not('retorno_previsto', 'is', null)
    .lte('retorno_previsto', corte.toISOString().slice(0, 10))
    .order('retorno_previsto', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!pacientes?.length) return NextResponse.json({ total: 0, pacientes: [] })

  // Filtra os que JÁ têm consulta futura agendada
  const ids = pacientes.map(p => p.id)
  const { data: agendados } = await admin
    .from('consultas')
    .select('patient_id')
    .in('patient_id', ids)
    .in('status', ['agendada', 'confirmada'])
    .gte('data_hora', hoje.toISOString())

  const idsAgendados = new Set((agendados ?? []).map(c => c.patient_id))

  const semAgendamento = pacientes.filter(p => !idsAgendados.has(p.id))

  return NextResponse.json({
    total:     semAgendamento.length,
    pacientes: semAgendamento.map(p => {
      const [ano, mes, dia] = (p.retorno_previsto as string).split('-')
      return {
        paciente:          p.full_name ?? '(sem nome)',
        telefone:          p.phone,
        retorno_previsto:  `${dia}/${mes}/${ano}`,
        retorno_iso:       p.retorno_previsto,
      }
    }),
  })
}
