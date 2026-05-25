/**
 * Cliente para a Google Calendar API v3.
 * Todas as chamadas são server-side — as credenciais nunca chegam ao browser.
 */

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_CAL_BASE  = 'https://www.googleapis.com/calendar/v3'

export interface GoogleCalendarInfo {
  id:              string
  name:            string
  color:           string
  primary:         boolean
}

export interface GoogleEvent {
  id:            string
  summary:       string
  description?:  string
  location?:     string
  start:         { dateTime?: string; date?: string }
  end:           { dateTime?: string; date?: string }
  calendarId:    string
  calendarName:  string
  calendarColor: string
  htmlLink?:     string
}

export async function refreshGoogleToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type:    'refresh_token',
    }),
  })
  if (!res.ok) throw new Error('google_refresh_failed')
  return res.json()
}

export async function getCalendars(accessToken: string): Promise<GoogleCalendarInfo[]> {
  const res = await fetch(`${GOOGLE_CAL_BASE}/users/me/calendarList`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error('google_calendars_failed')
  const data = await res.json()
  return (data.items ?? []).map((c: any) => ({
    id:      c.id,
    name:    c.summary,
    color:   c.backgroundColor ?? '#4285F4',
    primary: c.primary ?? false,
  }))
}

export async function getEvents(
  accessToken:  string,
  calendarId:   string,
  timeMin:      string,
  timeMax:      string,
): Promise<any[]> {
  const params = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy:      'startTime',
    maxResults:   '250',
  })
  const res = await fetch(
    `${GOOGLE_CAL_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params}`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
  if (!res.ok) return []
  const data = await res.json()
  return data.items ?? []
}
