/**
 * GET /api/google/calendars?timeMin=ISO&timeMax=ISO
 * Retorna calendários e eventos do Google Calendar.
 *
 * - Médico/superadmin → o próprio calendário conectado
 * - Secretária/recepcionista → calendários de TODOS os médicos da clínica
 *   que conectaram o Google (eventos etiquetados com o nome do médico)
 */

import { NextRequest, NextResponse }                        from 'next/server'
import { createClient }                                     from '@/lib/supabase/server'
import { createAdminClient }                                from '@/lib/supabase/admin-client'
import { refreshGoogleToken, getCalendars, getEvents }      from '@/lib/google-calendar'

interface TokenTarget {
  userId: string
  label:  string | null   // nome do médico (só quando agregando vários)
}

async function fetchGoogleFor(
  db: ReturnType<typeof createAdminClient>,
  target: TokenTarget,
  timeMin: string,
  timeMax: string,
) {
  const { data: tokenRow } = await db
    .from('google_tokens')
    .select('access_token, refresh_token, token_expiry')
    .eq('user_id', target.userId)
    .single()

  if (!tokenRow?.refresh_token) return null

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
      }).eq('user_id', target.userId)
    } catch {
      return null
    }
  }

  let calendars
  try {
    calendars = await getCalendars(accessToken)
  } catch {
    return null
  }

  const prefix = target.label ? `${target.label} · ` : ''

  const eventGroups = await Promise.allSettled(
    calendars.map(async cal => {
      const items = await getEvents(accessToken, cal.id, timeMin, timeMax)
      return items.map((ev: any) => ({
        id:            `${target.userId}::${cal.id}::${ev.id}`,
        summary:       ev.summary ?? '(sem título)',
        description:   ev.description ?? null,
        location:      ev.location ?? null,
        start:         ev.start,
        end:           ev.end,
        htmlLink:      ev.htmlLink ?? null,
        calendarId:    cal.id,
        calendarName:  `${prefix}${cal.name}`,
        calendarColor: cal.color,
      }))
    }),
  )

  return {
    calendars: calendars.map(c => ({ ...c, name: `${prefix}${c.name}` })),
    events:    eventGroups.flatMap(r => r.status === 'fulfilled' ? r.value : []),
  }
}

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

  const { data: selfProfile } = await db
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  // Monta a lista de calendários a buscar
  let targets: TokenTarget[] = [{ userId: user.id, label: null }]

  if (selfProfile?.role === 'secretaria' || selfProfile?.role === 'recepcionista') {
    const { data: membership } = await db
      .from('clinic_members')
      .select('clinic_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    if (membership?.clinic_id) {
      const { data: doctors } = await db
        .from('clinic_members')
        .select('user_id, profiles!user_id(full_name)')
        .eq('clinic_id', membership.clinic_id)
        .in('role', ['medico', 'owner'])

      if (doctors?.length) {
        const multi = doctors.length > 1
        targets = doctors.map(d => ({
          userId: d.user_id,
          label:  multi ? ((d.profiles as any)?.full_name ?? 'Médico') : null,
        }))
      }
    }
  }

  const results = await Promise.allSettled(
    targets.map(t => fetchGoogleFor(db, t, timeMin, timeMax))
  )

  const ok = results
    .flatMap(r => r.status === 'fulfilled' && r.value ? [r.value] : [])

  if (ok.length === 0) {
    return NextResponse.json({ connected: false, calendars: [], events: [] })
  }

  return NextResponse.json({
    connected: true,
    calendars: ok.flatMap(r => r.calendars),
    events:    ok.flatMap(r => r.events),
  })
}
