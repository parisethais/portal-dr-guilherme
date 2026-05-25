/**
 * GET /api/google/calendars?timeMin=ISO&timeMax=ISO
 * Retorna todos os calendários e eventos do Google Calendar do médico autenticado.
 */

import { NextRequest, NextResponse }                        from 'next/server'
import { createClient }                                     from '@/lib/supabase/server'
import { createAdminClient }                                from '@/lib/supabase/admin-client'
import { refreshGoogleToken, getCalendars, getEvents }      from '@/lib/google-calendar'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const now     = new Date()
  const timeMin = searchParams.get('timeMin')
    ?? new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const timeMax = searchParams.get('timeMax')
    ?? new Date(now.getFullYear(), now.getMonth() + 3, 1).toISOString()

  const db = createAdminClient()

  // Resolve qual user_id tem o token do Google:
  // - médico/superadmin → próprio ID
  // - secretaria → médico da clínica dela
  const { data: selfProfile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  let tokenUserId = user.id
  if (selfProfile?.role === 'secretaria') {
    const { data: membership } = await db
      .from('clinic_members')
      .select('clinic_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()
    if (membership?.clinic_id) {
      const { data: doctor } = await db
        .from('clinic_members')
        .select('user_id')
        .eq('clinic_id', membership.clinic_id)
        .eq('role', 'medico')
        .limit(1)
        .single()
      if (doctor?.user_id) tokenUserId = doctor.user_id
    }
  }

  const { data: tokenRow } = await db
    .from('google_tokens')
    .select('access_token, refresh_token, token_expiry')
    .eq('user_id', tokenUserId)
    .single()

  if (!tokenRow?.refresh_token) {
    return NextResponse.json({ connected: false, calendars: [], events: [] })
  }

  // Refresca o token se expirado ou expirando em < 60 s
  let accessToken = tokenRow.access_token ?? ''
  const expiry    = tokenRow.token_expiry ? new Date(tokenRow.token_expiry) : null
  if (!expiry || expiry.getTime() < Date.now() + 60_000) {
    try {
      const refreshed = await refreshGoogleToken(tokenRow.refresh_token)
      accessToken     = refreshed.access_token
      await db.from('google_tokens').update({
        access_token: refreshed.access_token,
        token_expiry: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        updated_at:   new Date().toISOString(),
      }).eq('user_id', tokenUserId)
    } catch {
      return NextResponse.json({ connected: false, calendars: [], events: [], error: 'token_expired' })
    }
  }

  // Lista calendários
  let calendars
  try {
    calendars = await getCalendars(accessToken)
  } catch {
    return NextResponse.json({ connected: false, calendars: [], events: [], error: 'fetch_failed' })
  }

  // Busca eventos de todos os calendários em paralelo
  const eventGroups = await Promise.allSettled(
    calendars.map(async cal => {
      const items = await getEvents(accessToken, cal.id, timeMin, timeMax)
      return items.map((ev: any) => ({
        id:            `${cal.id}::${ev.id}`,
        summary:       ev.summary ?? '(sem título)',
        description:   ev.description ?? null,
        location:      ev.location ?? null,
        start:         ev.start,
        end:           ev.end,
        htmlLink:      ev.htmlLink ?? null,
        calendarId:    cal.id,
        calendarName:  cal.name,
        calendarColor: cal.color,
      }))
    }),
  )

  const events = eventGroups
    .flatMap(r => r.status === 'fulfilled' ? r.value : [])

  return NextResponse.json({ connected: true, calendars, events })
}
