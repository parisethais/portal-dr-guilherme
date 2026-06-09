import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const SECRET = process.env.COPILOT_SECRET

export async function GET(req: NextRequest) {
  if (req.headers.get('x-copilot-secret') !== SECRET) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // ?periodo=hoje|semana|mes  (padrão: semana)
  const periodo = req.nextUrl.searchParams.get('periodo') ?? 'semana'

  const agora = new Date()
  const inicioBrasilia = new Date(agora.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }))
  inicioBrasilia.setHours(0, 0, 0, 0)

  const fim = new Date(inicioBrasilia)
  if (periodo === 'hoje') {
    fim.setDate(fim.getDate() + 1)
  } else if (periodo === 'mes') {
    fim.setMonth(fim.getMonth() + 1)
  } else {
    fim.setDate(fim.getDate() + 7)
  }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('consultas')
    .select('id, data_hora, tipo, local, status, patient:profiles!patient_id(full_name, phone)')
    .gte('data_hora', inicioBrasilia.toISOString())
    .lt('data_hora', fim.toISOString())
    .in('status', ['agendada', 'confirmada'])
    .order('data_hora', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    periodo,
    total: data.length,
    retornos: data.map((c) => {
      const dataHora = new Date(c.data_hora).toLocaleString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'America/Sao_Paulo',
      })
      const patient = c.patient as { full_name?: string; phone?: string } | null
      return {
        id:       c.id,
        data_hora: dataHora,
        paciente: patient?.full_name ?? '(sem nome)',
        telefone: patient?.phone,
        tipo:     c.tipo,
        local:    c.local,
        status:   c.status,
      }
    }),
  })
}
