/**
 * GET /api/memed/token
 *
 * Retorna o JWT do médico logado para inicializar o widget Memed Sinapse Prescrição.
 *
 * Fluxo:
 *   1. Valida que o perfil tem CPF, CRM e data_nascimento preenchidos
 *   2. Tenta obter token pelo CPF via GET /sinapse-prescricao/usuarios/{CPF}
 *   3. Se 404 (médico não cadastrado na Memed), faz cadastro via POST e devolve o token
 *   4. Cacheia o token no perfil por TOKEN_TTL_HOURS
 *
 * Env vars necessárias (Vercel → Settings → Environment Variables):
 *   MEMED_API_URL         — ex: https://integrations.api.memed.com.br/v1 (staging)
 *                               ou https://api.memed.com.br/v1 (produção)
 *   MEMED_API_KEY         — chave pública do parceiro (api-key)
 *   MEMED_SECRET_KEY      — chave secreta do parceiro (secret-key)
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

const MEMED_API_URL    = process.env.MEMED_API_URL    ?? 'https://integrations.api.memed.com.br/v1'
const MEMED_API_KEY    = process.env.MEMED_API_KEY
const MEMED_SECRET_KEY = process.env.MEMED_SECRET_KEY
const TOKEN_TTL_HOURS  = 0 // sem cache — Memed exige token fresco a cada sessão

const MEMED_HEADERS = {
  'Accept':        'application/vnd.api+json',
  'Content-Type':  'application/json',
  'Cache-Control': 'no-cache',
}

function memedUrl(path: string): string {
  return `${MEMED_API_URL}${path}?api-key=${MEMED_API_KEY}&secret-key=${MEMED_SECRET_KEY}`
}

// Converte CRM "SP-123456" ou "SP 123456" → { board_state: "SP", board_number: "123456" }
function parseCrm(crm: string): { board_state: string; board_number: string } | null {
  const match = crm.trim().match(/^([A-Z]{2})[- ]?(\d+)$/i)
  if (!match) return null
  return { board_state: match[1].toUpperCase(), board_number: match[2] }
}

// GET prescritor pelo CPF → devolve token ou null
async function fetchTokenByCpf(cpf: string): Promise<string | null> {
  const cpfDigits = cpf.replace(/\D/g, '')
  const res = await fetch(memedUrl(`/sinapse-prescricao/usuarios/${cpfDigits}`), { headers: MEMED_HEADERS })
  if (!res.ok) return null
  const json = await res.json()
  return (json?.data?.attributes?.token as string | undefined) ?? null
}

// POST cadastra prescritor na Memed → devolve token ou null
async function registerPrescritor(profile: {
  id:              string
  full_name:       string
  cpf:             string
  crm:             string
  data_nascimento: string   // YYYY-MM-DD
}): Promise<string | null> {
  const crm = parseCrm(profile.crm)
  if (!crm) {
    console.error('[memed/token] CRM em formato inválido:', profile.crm, '— esperado: "SP-123456"')
    return null
  }

  // Memed exige dd/mm/YYYY
  const [yyyy, mm, dd] = profile.data_nascimento.split('-')
  const dataNascMemed  = `${dd}/${mm}/${yyyy}`

  const nameParts = profile.full_name.trim().split(/\s+/)
  const nome      = nameParts[0]
  const sobrenome = nameParts.slice(1).join(' ') || nome

  const res = await fetch(memedUrl('/sinapse-prescricao/usuarios'), {
    method:  'POST',
    headers: MEMED_HEADERS,
    body: JSON.stringify({
      data: {
        type: 'usuarios',
        attributes: {
          external_id:     profile.id,
          nome,
          sobrenome,
          cpf:             profile.cpf.replace(/\D/g, ''),
          board_code:      'CRM',
          board_number:    crm.board_number,
          board_state:     crm.board_state,
          data_nascimento: dataNascMemed,
        },
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('[memed/token] Erro ao cadastrar prescritor:', res.status, body)
    return null
  }

  const json = await res.json()
  return (json?.data?.attributes?.token as string | undefined) ?? null
}

export async function GET() {
  // ── Auth ─────────────────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  if (!MEMED_API_KEY || !MEMED_SECRET_KEY) {
    return NextResponse.json(
      { error: 'MEMED_API_KEY / MEMED_SECRET_KEY não configuradas. Adicione as variáveis no Vercel.' },
      { status: 503 },
    )
  }

  const db = createAdminClient()

  // ── Perfil do médico ──────────────────────────────────────────────────────
  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, cpf, crm, data_nascimento, memed_token, memed_token_at')
    .eq('id', user.id)
    .single()

  if (!profile)
    return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })

  if (!profile.cpf)
    return NextResponse.json(
      { error: 'CPF não cadastrado no perfil. Preencha em Configurações.' },
      { status: 422 },
    )

  if (!profile.crm)
    return NextResponse.json(
      { error: 'CRM não cadastrado no perfil. Preencha em Configurações.' },
      { status: 422 },
    )

  if (!profile.data_nascimento)
    return NextResponse.json(
      { error: 'Data de nascimento não cadastrada no perfil. Preencha em Configurações.' },
      { status: 422 },
    )

  // ── Cache válido? ─────────────────────────────────────────────────────────
  if (profile.memed_token && profile.memed_token_at) {
    const ageHours = (Date.now() - new Date(profile.memed_token_at).getTime()) / 3_600_000
    if (ageHours < TOKEN_TTL_HOURS) {
      return NextResponse.json({ token: profile.memed_token })
    }
  }

  // ── Tenta buscar token do prescritor já cadastrado na Memed ───────────────
  let memedToken = await fetchTokenByCpf(profile.cpf)

  // ── Se não encontrado, cadastra e recebe o token ──────────────────────────
  if (!memedToken) {
    memedToken = await registerPrescritor({
      id:              profile.id,
      full_name:       profile.full_name ?? '',
      cpf:             profile.cpf,
      crm:             profile.crm,
      data_nascimento: profile.data_nascimento,
    })
  }

  if (!memedToken) {
    return NextResponse.json(
      { error: 'Não foi possível autenticar com a Memed. Verifique CPF, CRM e data de nascimento.' },
      { status: 502 },
    )
  }

  // ── Salva token no cache ──────────────────────────────────────────────────
  await db.from('profiles').update({
    memed_token:    memedToken,
    memed_token_at: new Date().toISOString(),
  }).eq('id', user.id)

  return NextResponse.json({ token: memedToken })
}
