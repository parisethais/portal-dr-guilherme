'use server'
import { NextRequest, NextResponse }      from 'next/server'
import { createClient }                   from '@/lib/supabase/server'
import { createAdminClient }              from '@/lib/supabase/admin-client'
import { gerarPrescricaoPdf }             from '@/lib/pdf/gerar-prescricao'
import { birdIdAuth, birdIdSign, userDiscovery } from '@/lib/birdid-api'
import { createHash }                     from 'crypto'

export async function POST(req: NextRequest) {
  // ── Auth ─────────────────────────────────────────────────────
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json() as { patientId?: string; otp?: string }
  if (!body.patientId || !body.otp) {
    return NextResponse.json({ error: 'patientId e otp são obrigatórios.' }, { status: 400 })
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
      { status: 422 }
    )
  }

  // ── Perfil do paciente ────────────────────────────────────────
  const { data: patient } = await db
    .from('profiles')
    .select('full_name, cpf, data_nascimento')
    .eq('id', body.patientId)
    .single()

  // ── Prescrições ativas ────────────────────────────────────────
  const { data: prescricoes } = await db
    .from('prescricoes')
    .select('*')
    .eq('patient_id', body.patientId)
    .eq('ativo', true)
    .order('data_inicio', { ascending: false })

  if (!prescricoes || prescricoes.length === 0) {
    return NextResponse.json(
      { error: 'Nenhuma prescrição ativa para assinar.' },
      { status: 404 }
    )
  }

  // ── Clínica ───────────────────────────────────────────────────
  const { data: membership } = await db
    .from('clinic_members')
    .select('clinics!clinic_id(name)')
    .eq('user_id', user.id)
    .limit(1)
    .single()
  const clinicName = (membership?.clinics as { name?: string } | null)?.name ?? null

  // ── 1. Gera PDF ───────────────────────────────────────────────
  const geradoEm = new Date().toISOString()

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await gerarPrescricaoPdf({
      patientName:     patient?.full_name     ?? 'Paciente',
      patientCpf:      patient?.cpf           ?? null,
      patientBirthday: patient?.data_nascimento ?? null,
      doctorName:      profile.full_name      ?? 'Médico',
      doctorCrm:       profile.crm            ?? null,
      clinicName,
      geradoEm,
      itens: prescricoes.map(p => ({
        medicamento: p.medicamento,
        dose:        p.dose        ?? null,
        posologia:   p.posologia   ?? null,
        via:         p.via         ?? null,
        obs:         p.obs         ?? null,
        data_inicio: p.data_inicio,
        data_fim:    p.data_fim    ?? null,
      })),
    })
  } catch (err) {
    console.error('[prescricao/assinar] Erro ao gerar PDF:', err)
    return NextResponse.json({ error: 'Erro ao gerar PDF da prescrição.' }, { status: 500 })
  }

  // ── 2. Hash SHA256 ────────────────────────────────────────────
  const docId  = `prescricao-${body.patientId}-${Date.now()}`
  const hashHex = createHash('sha256').update(pdfBuffer).digest('hex')

  // ── 3. Descobre plataforma e autentica ────────────────────────
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
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('invalid')) {
      return NextResponse.json(
        { error: 'OTP inválido ou expirado. Abra o app e tente novamente.' },
        { status: 401 }
      )
    }
    return NextResponse.json({ error: 'Erro ao autenticar com a assinatura digital.' }, { status: 502 })
  }

  // ── 4. Assina ─────────────────────────────────────────────────
  let cmsBase64: string
  try {
    cmsBase64 = await birdIdSign({
      access_token:      authResult.access_token,
      certificate_alias: authResult.certificate_alias,
      documentId:        docId,
      hashHex,
      apiUrl:            authResult.apiUrl,
    })
  } catch (err) {
    console.error('[prescricao/assinar] Sign erro:', err)
    return NextResponse.json({ error: 'Erro ao assinar a prescrição.' }, { status: 502 })
  }

  // ── 5. Upload Storage ─────────────────────────────────────────
  const timestamp = Date.now()
  const pdfPath   = `prescricoes/${user.id}/${body.patientId}/${timestamp}.pdf`
  const p7sPath   = `prescricoes/${user.id}/${body.patientId}/${timestamp}.p7s`

  const [pdfUpload, p7sUpload] = await Promise.all([
    db.storage.from('documentos').upload(pdfPath, pdfBuffer, {
      contentType: 'application/pdf', upsert: true,
    }),
    db.storage.from('documentos').upload(
      p7sPath, Buffer.from(cmsBase64, 'base64'),
      { contentType: 'application/pkcs7-signature', upsert: true }
    ),
  ])

  if (pdfUpload.error || p7sUpload.error) {
    return NextResponse.json({ error: 'Erro ao salvar arquivos.' }, { status: 500 })
  }

  const { data: pdfUrlData } = db.storage.from('documentos').getPublicUrl(pdfPath)
  const { data: p7sUrlData } = db.storage.from('documentos').getPublicUrl(p7sPath)

  return NextResponse.json({
    success:       true,
    pdfUrl:        pdfUrlData.publicUrl,
    assinaturaUrl: p7sUrlData.publicUrl,
  })
}
