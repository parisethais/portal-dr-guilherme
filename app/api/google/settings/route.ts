/**
 * GET  /api/google/settings  → retorna preferred_calendar_id salvo
 * PATCH /api/google/settings  → salva preferred_calendar_id
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { createAdminClient }         from '@/lib/supabase/admin-client'

export async function GET(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { data } = await createAdminClient()
    .from('google_tokens')
    .select('preferred_calendar_id')
    .eq('user_id', user.id)
    .single()

  return NextResponse.json({ preferred_calendar_id: data?.preferred_calendar_id ?? null })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { preferred_calendar_id } = await req.json() as { preferred_calendar_id: string }
  if (!preferred_calendar_id) {
    return NextResponse.json({ error: 'preferred_calendar_id é obrigatório.' }, { status: 400 })
  }

  await createAdminClient()
    .from('google_tokens')
    .update({ preferred_calendar_id, updated_at: new Date().toISOString() })
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
