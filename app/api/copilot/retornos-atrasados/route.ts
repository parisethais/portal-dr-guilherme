import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isCopilotAuthorized, COPILOT_TENANT } from '@/lib/copilot-auth'

const GI_WHATS  = 'https://wa.me/5511934544550'

export async function GET(req: NextRequest) {
  if (!isCopilotAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const admin = createAdminClient()

  // Janela: entre hoje-90 dias e hoje-2 dias (fuso Brasília)
  const agora = new Date()
  const hoje = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  hoje.setHours(0, 0, 0, 0)
  const corte = new Date(hoje)
  corte.setDate(corte.getDate() - 2)
  const limite = new Date(hoje)
  limite.setDate(limite.getDate() - 90)

  // Pacientes ativos com retorno_previsto nos últimos 90 dias (sem os 2 dias de graça)
  const { data: pacientes, error } = await admin
    .from('profiles')
    .select('id, full_name, phone, retorno_previsto')
    .eq('role', 'paciente')
    .eq('tenant_id', COPILOT_TENANT)
    .eq('status_paciente', 'ativo')
    .not('retorno_previsto', 'is', null)
    .gte('retorno_previsto', limite.toISOString().slice(0, 10))
    .lte('retorno_previsto', corte.toISOString().slice(0, 10))
    .order('retorno_previsto', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!pacientes?.length) return NextResponse.json({ total: 0, pacientes: [] })

  // Filtra os que JÁ têm consulta futura agendada
  const ids = pacientes.map(p => p.id)
  const { data: agendados } = await admin
    .from('consultas')
    .select('patient_id')
    .eq('tenant_id', COPILOT_TENANT)
    .in('patient_id', ids)
    .in('status', ['agendada', 'confirmada'])
    .gte('data_hora', hoje.toISOString())

  const idsAgendados = new Set((agendados ?? []).map(c => c.patient_id))

  const semAgendamento = pacientes.filter(p => !idsAgendados.has(p.id))

  return NextResponse.json({
    total:     semAgendamento.length,
    pacientes: semAgendamento.map(p => {
      const [ano, mes, dia] = (p.retorno_previsto as string).split('-')
      const dataFormatada   = `${dia}/${mes}`
      const primeiroNome    = (p.full_name ?? 'paciente').split(' ')[0]
      const mensagem = [
        `Olá, ${primeiroNome}! 😊`,
        '',
        `Como vai? Estou entrando em contato para lembrar que já passou o prazo recomendado para o seu retorno com o Dr. Guilherme. Estava previsto em ${dataFormatada}/${ano}.`,
        '',
        'Manter o acompanhamento em dia é importante para garantir que o tratamento siga conforme o planejado e que tudo continue bem com a sua saúde.',
        '',
        'Para agendar, é só clicar aqui e falar com nossa secretaria 👇',
        GI_WHATS,
      ].join('\n')

      return {
        paciente:         p.full_name ?? '(sem nome)',
        telefone:         p.phone,
        retorno_previsto: `${dia}/${mes}/${ano}`,
        retorno_iso:      p.retorno_previsto,
        mensagem,
      }
    }),
  })
}
