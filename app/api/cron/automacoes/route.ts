import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { runAutomation } from '@/lib/automation-runner'
import type { ClinicAutomation } from '@/lib/automation-catalog'

export const maxDuration = 300 // 5 min para processar todas as automações

// Protegido por CRON_SECRET (Vercel injeta automaticamente em prod).
// Execução manual pelo admin usa a server action runAutomacoesManual (não esta rota).
const CRON_SECRET     = process.env.CRON_SECRET
const INTERNAL_SECRET = process.env.INTERNAL_SECRET

function isAuthorized(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? ''
  const bearer = auth.replace('Bearer ', '')

  // Vercel cron injeta Authorization: Bearer <CRON_SECRET>
  if (CRON_SECRET && bearer === CRON_SECRET) return true

  // Integrações internas apenas se o secret estiver configurado no env
  if (INTERNAL_SECRET && bearer === INTERNAL_SECRET) return true

  // Em desenvolvimento local sem secret configurado, permite tudo
  if (!CRON_SECRET && process.env.NODE_ENV !== 'production') return true

  return false
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const db = createAdminClient()

  // Busca todas as automações ativas de todas as clínicas
  const { data: automations, error } = await db
    .from('clinic_automations')
    .select('*')
    .eq('active', true)

  if (error) {
    console.error('[cron/automacoes] fetch error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!automations?.length) {
    return NextResponse.json({ ok: true, message: 'Nenhuma automação ativa.', results: [] })
  }

  const results = await Promise.all(
    (automations as ClinicAutomation[]).map(a => runAutomation(a))
  )

  const total = results.reduce((sum, r) => sum + r.count, 0)
  const errors = results.filter(r => r.error)

  console.log(`[cron/automacoes] ${total} ações executadas em ${automations.length} automações ativas.`)
  if (errors.length) {
    console.error('[cron/automacoes] erros:', errors)
  }

  return NextResponse.json({
    ok:          true,
    executado_em: new Date().toISOString(),
    total_acoes:  total,
    resultados:   results,
    erros:        errors.length,
  })
}

// POST: permite chamada manual com corpo { clinicId?, type? } para filtrar
export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  let body: { clinicId?: string; type?: string } = {}
  try { body = await req.json() } catch { /* sem body */ }

  const db = createAdminClient()

  let query = db.from('clinic_automations').select('*').eq('active', true)
  if (body.clinicId) query = query.eq('clinic_id', body.clinicId)
  if (body.type)     query = query.eq('type', body.type)

  const { data: automations, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!automations?.length) {
    return NextResponse.json({ ok: true, message: 'Nenhuma automação ativa encontrada.', results: [] })
  }

  const results = await Promise.all(
    (automations as ClinicAutomation[]).map(a => runAutomation(a))
  )

  return NextResponse.json({
    ok:          true,
    executado_em: new Date().toISOString(),
    total_acoes:  results.reduce((s, r) => s + r.count, 0),
    resultados:   results,
  })
}
