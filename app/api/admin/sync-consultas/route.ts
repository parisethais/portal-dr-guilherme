import { NextRequest, NextResponse } from 'next/server'
import { syncConsultaCreate } from '@/lib/sync-google-calendar'
import { createAdminClient } from '@/lib/supabase/admin-client'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { ids, tenant_id } = await req.json() as { ids: string[]; tenant_id: string }
  const db = createAdminClient()
  const results: Record<string, string> = {}

  for (const id of ids) {
    const { data: c } = await db
      .from('consultas')
      .select('id,patient_id,tipo,local,data_hora,duracao_min,status,observacoes,google_calendar_event_id')
      .eq('id', id)
      .single()

    if (!c) { results[id] = 'not found'; continue }
    if (c.google_calendar_event_id) { results[id] = 'already synced'; continue }

    await syncConsultaCreate(tenant_id, c)

    const { data: updated } = await db
      .from('consultas')
      .select('google_calendar_event_id')
      .eq('id', id)
      .single()

    results[id] = updated?.google_calendar_event_id ?? 'sync failed'
  }

  return NextResponse.json({ results })
}
