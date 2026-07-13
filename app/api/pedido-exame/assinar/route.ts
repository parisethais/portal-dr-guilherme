import { NextRequest, NextResponse }                  from 'next/server'
import { createClient }                               from '@/lib/supabase/server'
import { createAdminClient }                          from '@/lib/supabase/admin-client'
import { gerarPedidoExamePdf }                        from '@/lib/pdf/gerar-pedido-exame'
import { birdIdAuth, birdIdSign, userDiscovery }      from '@/lib/birdid-api'
import { marcarPedidoAssinado }                       from '@/app/actions/pedidos-exame'
import { createHash }                                 from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })

  const body = await req.json() as { pedidoId?: string; otp?: string }
  if (!body.pedidoId || !body.otp) {
    return NextResponse.json({ error: 'pedidoId e otp são obrigatórios.' }, { status: 400 })
  }

  const db = createAdminClient()

  const { data: profile } = await db
    .from('profiles').select('id, full_name, cpf, crm').eq('id', user.id).single()

  if (!profile?.cpf) {
    return NextResponse.json({ error: 'CPF não cadastrado no perfil.' }, { status: 422 })
  }

  const { data: pedido } = await db
    .from('pedidos_exame')
    .select('*, profiles!patient_id(full_name, cpf, data_nascimento)')
    .eq('id', body.pedidoId)
    .single()

  if (!pedido) return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 })
  if (pedido.assinado) return NextResponse.json({ error: 'Este pedido já foi assinado.' }, { status: 409 })

  const { data: membership } = await db
    .from('clinic_members').select('clinics!clinic_id(name)')
    .eq('user_id', user.id).limit(1).single()
  const clinicName = (membership?.clinics as { name?: string } | null)?.name ?? null

  const patient = pedido.profiles as { full_name?: string; cpf?: string; data_nascimento?: string } | null
  const geradoEm = new Date().toISOString()

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await gerarPedidoExamePdf({
      patientName:      patient?.full_name      ?? 'Paciente',
      patientCpf:       patient?.cpf            ?? null,
      patientBirthday:  patient?.data_nascimento ?? null,
      doctorName:       profile.full_name        ?? 'Médico',
      doctorCrm:        profile.crm              ?? null,
      clinicName,
      tipo:             pedido.tipo,
      exames:           pedido.exames,
      urgencia:         pedido.urgencia,
      indicacaoClinica: pedido.indicacao_clinica ?? null,
      cid:              pedido.cid               ?? null,
      dataPedido:       pedido.data_pedido,
      geradoEm,
    })
  } catch (err) {
    console.error('[pedido-exame/assinar] PDF erro:', err)
    return NextResponse.json({ error: 'Erro ao gerar PDF.' }, { status: 500 })
  }

  const hashHex = createHash('sha256').update(pdfBuffer).digest('hex')
  const discovered = await userDiscovery(profile.cpf)

  let authResult: Awaited<ReturnType<typeof birdIdAuth>>
  try {
    authResult = await birdIdAuth({
      cpf: profile.cpf, otp: body.otp,
      apiUrl: discovered?.apiUrl, platform: discovered?.platform,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('401') || msg.includes('unauthorized') || msg.includes('invalid')) {
      return NextResponse.json({ error: 'OTP inválido ou expirado.' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Erro ao autenticar.' }, { status: 502 })
  }

  let cmsBase64: string
  try {
    cmsBase64 = await birdIdSign({
      access_token: authResult.access_token,
      certificate_alias: authResult.certificate_alias,
      documentId: pedido.id,
      hashHex,
      apiUrl: authResult.apiUrl,
    })
  } catch (err) {
    console.error('[pedido-exame/assinar] Sign erro:', err)
    return NextResponse.json({ error: 'Erro ao assinar.' }, { status: 502 })
  }

  const timestamp = Date.now()
  const pdfPath   = `pedidos-exame/${user.id}/${pedido.patient_id}/${timestamp}.pdf`
  const p7sPath   = `pedidos-exame/${user.id}/${pedido.patient_id}/${timestamp}.p7s`

  const [pdfUpload, p7sUpload] = await Promise.all([
    db.storage.from('documentos').upload(pdfPath, pdfBuffer, { contentType: 'application/pdf', upsert: true }),
    db.storage.from('documentos').upload(p7sPath, Buffer.from(cmsBase64, 'base64'), {
      contentType: 'application/pkcs7-signature', upsert: true,
    }),
  ])

  if (pdfUpload.error || p7sUpload.error) {
    return NextResponse.json({ error: 'Erro ao salvar arquivos.' }, { status: 500 })
  }

  const { data: pdfUrlData } = db.storage.from('documentos').getPublicUrl(pdfPath)
  const { data: p7sUrlData } = db.storage.from('documentos').getPublicUrl(p7sPath)

  await marcarPedidoAssinado(pedido.id, pdfUrlData.publicUrl, p7sUrlData.publicUrl)

  return NextResponse.json({
    success: true,
    pdfUrl: pdfUrlData.publicUrl,
    assinaturaUrl: p7sUrlData.publicUrl,
  })
}
