/**
 * GET /api/google/callback
 * Recebe o código de autorização do Google, troca por tokens e salva no banco.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient }         from '@/lib/supabase/admin-client'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code   = searchParams.get('code')
  const userId = searchParams.get('state')
  const error  = searchParams.get('error')

  const base = new URL(req.url).origin

  if (error || !code || !userId) {
    return NextResponse.redirect(`${base}/medico/configuracoes?google=error`)
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri:  process.env.GOOGLE_REDIRECT_URI!,
      grant_type:    'authorization_code',
    }),
  })

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${base}/medico/configuracoes?google=error`)
  }

  const tokens = await tokenRes.json()

  await createAdminClient()
    .from('google_tokens')
    .upsert({
      user_id:       userId,
      access_token:  tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      token_expiry:  new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'user_id' })

  return NextResponse.redirect(`${base}/medico/configuracoes?google=success`)
}
