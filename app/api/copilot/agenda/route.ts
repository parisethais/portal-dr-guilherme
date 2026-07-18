import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isCopilotAuthorized, COPILOT_TENANT } from '@/lib/copilot-auth'

export async function GET(req: NextRequest) {
  if (!isCopilotAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // ?data=YYYY-MM-DD  (padrão: hoje no horário de Brasília)
  const params = req.nextUrl.searchParams
  const dataParam = params.get('data')

  const ref = dataParam ? new Date(`${dataParam}T00:00:00-03:00`) : (() => {
    const now = new Date()
    now.setUTCHours(now.getUTCHours() - 3)
    return new Date(`${now.toISOString().slice(0, 10)}T00:00:00-03:00`)
  })()

  const inicio = ref.toISOString()
  const fim    = new Date(ref.getTime() + 24 * 60 * 60 * 1000).toISOString()

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('consultas')
    .select('id, data_hora, duracao_min, tipo, local, status, observacoes, patient:profiles!patient_id(full_name, phone)')
    .eq('tenant_id', COPILOT_TENANT)
    .gte('data_hora', inicio)
    .lt('data_hora', fim)
    .neq('status', 'cancelada')
    .order('data_hora', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const dataStr = dataParam ?? ref.toISOString().slice(0, 10)

  return NextResponse.json({
    data:  dataStr,
    total: data.length,
    consultas: data.map((c) => {
      const hora = new Date(c.data_hora).toLocaleTimeString('pt-BR', {
        hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
      })
      const patient = c.patient as { full_name?: string; phone?: string } | null
      return {
        id:       c.id,
        hora,
        paciente: patient?.full_name ?? '(sem nome)',
        telefone: patient?.phone,
        tipo:     c.tipo,
        local:    c.local,
        status:   c.status,
        observacoes: c.observacoes,
      }
    }),
  })
}
