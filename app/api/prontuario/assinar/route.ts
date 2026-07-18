/**
 * POST /api/prontuario/assinar
 *
 * Assina digitalmente o prontuário de uma consulta usando BirdID/VIDaaS.
 *
 * Fluxo:
 *   1. Valida autenticação e ownership da consulta
 *   2. Gera PDF do prontuário
 *   3. Calcula hash SHA256 do PDF
 *   4. Autentica com BirdID usando CPF + OTP do médico
 *   5. Envia hash para BirdID → recebe assinatura CMS (CAdES-BES)
 *   6. Sobe PDF e assinatura (.p7s) para Supabase Storage
 *   7. Finaliza o prontuário e salva URLs na consulta
 *
 * Body: { consultaId: string, otp: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@/lib/supabase/server'
import { createAdminClient }         from '@/lib/supabase/admin-client'
import { requireStaff, assertRowInTenant } from '@/lib/auth-guard'
import { gerarProntuarioPdf }        from '@/lib/pdf/gerar-prontuario'
import { birdIdAuth, birdIdSign, userDiscovery } from '@/lib/birdid-api'
import { createHash }                from 'crypto'

export async function POST(req: NextRequest) {
  // ── Auth: apenas médico, e a consulta precisa ser do tenant dele ──
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const ctx = await requireStaff()
  if (!ctx || ctx.role === 'secretaria') {
    return NextResponse.json({ error: 'Apenas médicos podem assinar.' }, { status: 403 })
  }

  const body = await req.json() as { consultaId?: string; otp?: string }
  if (!body.consultaId || !body.otp) {
    return NextResponse.json({ error: 'consultaId e otp são obrigatórios.' }, { status: 400 })
  }

  if (!(await assertRowInTenant('consultas', body.consultaId, ctx))) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 403 })
  }

  const db = createAdminClient()

  // ── Perfil do médico ──────────────────────────────────────────
  const { data: profile } = await db
    .from('profiles')
    .select('id, full_name, cpf, crm')
    .eq('id', user.id)
    .single()

  if (!profile?.cpf) {
    return NextResponse.json(
      { error: 'CPF não cadastrado no perfil. Preencha em Configurações.' },
      { status: 422 },
    )
  }

  // ── Dados da consulta ─────────────────────────────────────────
  const { data: consulta } = await db
    .from('consultas')
    .select(`
      id, tipo, local, data_hora, status,
      prontuario_finalizado, prontuario_assinado,
      obs_consulta, diagnosticos, evolucao, conduta, exame_fisico,
      patient_id,
      profiles!patient_id (full_name, cpf, data_nascimento)
    `)
    .eq('id', body.consultaId)
    .single()

  if (!consulta) {
    return NextResponse.json({ error: 'Consulta não encontrada.' }, { status: 404 })
  }

  if (consulta.prontuario_assinado) {
    return NextResponse.json({ error: 'Este prontuário já foi assinado.' }, { status: 409 })
  }

  // ── Busca nome da clínica ─────────────────────────────────────
  const { data: membership } = await db
    .from('clinic_members')
    .select('clinic_id, clinics!clinic_id(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const clinicName = (membership?.clinics as { name?: string } | null)?.name ?? null

  // ── 1. Gera PDF ───────────────────────────────────────────────
  const patient = consulta.profiles as { full_name?: string; cpf?: string; data_nascimento?: string } | null
  const geradoEm = new Date().toISOString()

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await gerarProntuarioPdf({
      patientName:     patient?.full_name     ?? 'Paciente',
      patientCpf:      patient?.cpf           ?? null,
      patientBirthday: patient?.data_nascimento ?? null,
      doctorName:      profile.full_name      ?? 'Médico',
      doctorCrm:       profile.crm            ?? null,
      clinicName,
      consultaId:      consulta.id,
      dataHora:        consulta.data_hora,
      tipo:            consulta.tipo,
      diagnosticos:    consulta.diagnosticos,
      evolucao:        consulta.evolucao,
      conduta:         consulta.conduta,
      exameFisico:     consulta.exame_fisico,
      obsConsulta:     consulta.obs_consulta,
      geradoEm,
    })
  } catch (err) {
    console.error('[assinar] Erro ao gerar PDF:', err)
    return NextResponse.json({ error: 'Erro ao gerar PDF do prontuário.' }, { status: 500 })
  }

  // ── 2. Hash SHA256 do PDF ─────────────────────────────────────
  const hashHex = createHash('sha256').update(pdfBuffer).digest('hex')

  // ── 3. Descobre plataforma e autentica ───────────────────────
  const discovered = await userDiscovery(profile.cpf)

  let authResult: Awaited<ReturnType<typeof birdIdAuth>>
  try {
    authResult = await birdIdAuth({
      cpf:      profile.cpf,
      otp:      body.otp,
      apiUrl:   discovered?.apiUrl,
      platform: discovered?.platform,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // OTP inválido ou expirado é o erro mais comum
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('invalid')) {
      return NextResponse.json(
        { error: 'OTP inválido ou expirado. Abra o app BirdID e tente novamente.' },
        { status: 401 },
      )
    }
    console.error('[assinar] BirdID auth erro:', msg)
    return NextResponse.json({ error: 'Erro ao autenticar com o BirdID.' }, { status: 502 })
  }

  // ── 4. Assina o hash com BirdID ───────────────────────────────
  let cmsBase64: string
  try {
    cmsBase64 = await birdIdSign({
      access_token:      authResult.access_token,
      certificate_alias: authResult.certificate_alias,
      documentId:        consulta.id,
      hashHex,
      apiUrl:            authResult.apiUrl,
    })
  } catch (err) {
    console.error('[assinar] BirdID sign erro:', err)
    return NextResponse.json({ error: 'Erro ao assinar o documento com o BirdID.' }, { status: 502 })
  }

  // ── 5. Sobe arquivos para Supabase Storage ────────────────────
  const timestamp = Date.now()
  const pdfPath   = `prontuarios/${user.id}/${consulta.id}/${timestamp}.pdf`
  const p7sPath   = `prontuarios/${user.id}/${consulta.id}/${timestamp}.p7s`

  const [pdfUpload, p7sUpload] = await Promise.all([
    db.storage.from('documentos').upload(pdfPath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: true,
    }),
    db.storage.from('documentos').upload(
      p7sPath,
      Buffer.from(cmsBase64, 'base64'),
      { contentType: 'application/pkcs7-signature', upsert: true },
    ),
  ])

  if (pdfUpload.error || p7sUpload.error) {
    console.error('[assinar] Storage upload erro:', pdfUpload.error, p7sUpload.error)
    return NextResponse.json({ error: 'Erro ao salvar arquivos no storage.' }, { status: 500 })
  }

  const { data: pdfUrlData } = db.storage.from('documentos').getPublicUrl(pdfPath)
  const { data: p7sUrlData } = db.storage.from('documentos').getPublicUrl(p7sPath)

  // ── 6. Salva na consulta e finaliza prontuário ────────────────
  const now = new Date().toISOString()
  await db.from('consultas').update({
    prontuario_finalizado:    true,
    prontuario_finalizado_at: consulta.prontuario_finalizado ? undefined : now,
    prontuario_assinado:      true,
    prontuario_assinado_at:   now,
    prontuario_pdf_url:       pdfUrlData.publicUrl,
    prontuario_assinatura_url: p7sUrlData.publicUrl,
    updated_at:               now,
  }).eq('id', consulta.id)

  return NextResponse.json({
    success:        true,
    pdfUrl:         pdfUrlData.publicUrl,
    assinaturaUrl:  p7sUrlData.publicUrl,
  })
}
