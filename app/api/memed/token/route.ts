/**
 * GET /api/memed/token
 *
 * Retorna o JWT do médico logado para inicializar o widget Memed Sinapse Prescrição.
 * Usa autenticação de parceiro: MEMED_PARTNER_KEY + CPF do médico → token JWT.
 *
 * O token é cacheado no perfil do médico por 8 horas para evitar chamadas repetidas.
 *
 * Env vars necessárias (Vercel → Settings → Environment Variables):
 *   MEMED_PARTNER_KEY — chave parceira fornecida pela Memed
 *
 * Referência da API Memed:
 *   https://docs.memed.com.br/sinapse-prescricao/autenticacao-parceiro
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

const MEMED_PARTNER_KEY = process.env.MEMED_PARTNER_KEY
const MEMED_AUTH_URL    = 'https://api.memed.com.br/v1/doctors/auth'
const TOKEN_TTL_HOURS   = 8

export async function GET() {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  if (!MEMED_PARTNER_KEY) {
    return NextResponse.json(
      { error: 'MEMED_PARTNER_KEY não configurada. Adicione a variável de ambiente no Vercel.' },
      { status: 503 },
    )
  }

  const db = createAdminClient()

  // ── Busca perfil do médico ─────────────────────────────────────────────────
  const { data: profile } = await db
    .from('profiles')
    .select('id, cpf, crm, especialidade, memed_token, memed_token_at')
    .eq('id', user.id)
    .single()

  if (!profile) return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

  if (!profile.cpf) {
    return NextResponse.json(
      { error: 'CPF não cadastrado no perfil. Preencha em Configurações antes de usar a Memed.' },
      { status: 422 },
    )
  }

  // ── Verifica cache (token ainda válido?) ──────────────────────────────────
  if (profile.memed_token && profile.memed_token_at) {
    const age = (Date.now() - new Date(profile.memed_token_at).getTime()) / 3_600_000
    if (age < TOKEN_TTL_HOURS) {
      return NextResponse.json({ token: profile.memed_token })
    }
  }

  // ── Chama API Memed para obter novo token ─────────────────────────────────
  let memedToken: string
  try {
    const res = await fetch(MEMED_AUTH_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/vnd.api+json',
        'Authorization': `Basic ${Buffer.from(`${profile.cpf}:${MEMED_PARTNER_KEY}`).toString('base64')}`,
      },
      body: JSON.stringify({
        data: {
          type: 'doctors',
          attributes: {
            login:  profile.cpf.replace(/\D/g, ''), // apenas dígitos
            senha:  MEMED_PARTNER_KEY,
          },
        },
      }),
    })

    if (!res.ok) {
      const body = await res.text()
      console.error('[memed/token] Memed API error:', res.status, body)
      return NextResponse.json(
        { error: `Memed retornou status ${res.status}. Verifique a MEMED_PARTNER_KEY.` },
        { status: 502 },
      )
    }

    const json = await res.json()
    // A Memed retorna: { data: { attributes: { token: "..." } } }
    memedToken = json?.data?.attributes?.token ?? json?.token
    if (!memedToken) throw new Error('Token não encontrado na resposta da Memed')
  } catch (err) {
    console.error('[memed/token]', err)
    return NextResponse.json({ error: 'Erro ao autenticar com a Memed.' }, { status: 502 })
  }

  // ── Salva token no cache do perfil ────────────────────────────────────────
  await db.from('profiles').update({
    memed_token:    memedToken,
    memed_token_at: new Date().toISOString(),
  }).eq('id', user.id)

  return NextResponse.json({ token: memedToken })
}
