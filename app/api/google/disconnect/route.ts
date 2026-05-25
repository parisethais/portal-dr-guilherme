/**
 * POST /api/google/disconnect
 * Remove os tokens do Google Calendar do médico autenticado.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { createAdminClient }         from '@/lib/supabase/admin-client'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  await createAdminClient()
    .from('google_tokens')
    .delete()
    .eq('user_id', user.id)

  return NextResponse.json({ success: true })
}
