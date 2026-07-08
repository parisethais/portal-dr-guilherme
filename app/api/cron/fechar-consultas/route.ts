import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

export const maxDuration = 60

const CRON_SECRET     = process.env.CRON_SECRET
const INTERNAL_SECRET = process.env.INTERNAL_SECRET ?? 'meden-internal-2026'

function isAuthorized(req: NextRequest): boolean {
  const bearer = (req.headers.get('authorization') ?? '').replace('Bearer ', '')
  if (CRON_SECRET && bearer === CRON_SECRET) return true
  if (bearer === INTERNAL_SECRET) return true
  if (!CRON_SECRET && process.env.NODE_ENV !== 'production') return true
  return false
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // Meia-noite de hoje em Brasília (UTC-3)
  const now = new Date()
  const todayBRT = new Date(now.getTime() - 3 * 60 * 60 * 1000)
  const todayStr = todayBRT.toISOString().slice(0, 10) // YYYY-MM-DD

  const admin = createAdminClient()

  // Fecha todas as consultas que ficaram "em_atendimento" de dias anteriores
  const { data, error } = await admin
    .from('consultas')
    .update({ status: 'realizada' })
    .eq('status', 'em_atendimento')
    .lt('data_hora', `${todayStr}T00:00:00`)
    .select('id')

  if (error) {
    console.error('[cron/fechar-consultas] erro:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const count = data?.length ?? 0
  console.log(`[cron/fechar-consultas] ${count} consulta(s) encerrada(s)`)
  return NextResponse.json({ ok: true, encerradas: count })
}
