import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCallerTenantId } from '@/lib/get-caller-tenant'
import QRCode from 'qrcode'

interface Props {
  params: Promise<{ id: string }>
}

export default async function DocumentoPrintPage({ params }: Props) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const clinicId = await getCallerTenantId(user.id)

  const { data: doc } = await supabase
    .from('patient_documents')
    .select('id, title, content, patient_id, medico_id, created_at, assinado, assinado_at')
    .eq('id', id)
    .single()

  if (!doc) redirect('/')

  const [clinicRes, settingsRes, medicoRes, patientRes] = await Promise.all([
    supabase.from('clinics').select('name, logo_url').eq('id', clinicId).single(),
    supabase.from('clinic_settings').select('key, value').eq('clinic_id', clinicId).in('key', ['endereco', 'telefone', 'cidade', 'nome_exibicao']),
    supabase.from('profiles').select('full_name, crm, especialidade').eq('id', doc.medico_id).single(),
    supabase.from('profiles').select('full_name, cpf, data_nascimento').eq('id', doc.patient_id).single(),
  ])

  const settings: Record<string, string> = {}
  for (const row of settingsRes.data ?? []) settings[row.key] = row.value

  const clinic    = clinicRes.data
  const medico    = medicoRes.data
  const patient   = patientRes.data

  const clinicName = settings['nome_exibicao'] || clinic?.name || 'Consultório'
  const endereco   = settings['endereco'] ?? ''
  const cidade     = settings['cidade']   ?? ''
  const telefone   = settings['telefone'] ?? ''
  const logoUrl    = clinic?.logo_url ?? null
  const medicoNome = medico?.full_name ? `Dr(a). ${medico.full_name}` : 'Médico responsável'

  const dataFormatada = new Date(doc.created_at).toLocaleDateString('pt-BR', {
    timeZone: 'UTC', day: '2-digit', month: 'long', year: 'numeric',
  })

  // QR Code — aponta para página de verificação pública
  const verifyUrl = `https://app.meden.health/verificar/${id}`
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 96,
    margin: 1,
    color: { dark: '#1A1F2E', light: '#ffffff' },
  })

  const assinadoEm = doc.assinado_at
    ? new Date(doc.assinado_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <>
      <button id="print-btn" className="print-btn no-print">🖨 Imprimir / Salvar PDF</button>

      <div className="page">
        {/* Letterhead */}
        <div className="letterhead">
          {logoUrl && <img src={logoUrl} alt="Logo" />}
          <div className="letterhead-text">
            <h1>{clinicName}</h1>
            {(endereco || cidade) && (
              <div className="sub">{[endereco, cidade].filter(Boolean).join(' — ')}</div>
            )}
            {telefone && <div className="sub">Tel: {telefone}</div>}
          </div>
          {medico && (
            <div className="letterhead-right">
              <div style={{ fontWeight: 'bold', fontSize: '12px' }}>{medicoNome}</div>
              {medico.especialidade && <div>{medico.especialidade}</div>}
              {medico.crm && <div>CRM: {medico.crm}</div>}
            </div>
          )}
        </div>

        <div className="doc-date">{cidade ? `${cidade}, ` : ''}{dataFormatada}</div>

        <div className="doc-title">{doc.title}</div>

        {patient && (
          <div className="patient-info">
            <strong>Paciente:</strong> {patient.full_name ?? '—'}
            {patient.cpf && <>&emsp;<strong>CPF:</strong> {patient.cpf}</>}
            {patient.data_nascimento && (
              <>&emsp;<strong>Nascimento:</strong> {new Date(patient.data_nascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</>
            )}
          </div>
        )}

        <div className="doc-content">{doc.content}</div>

        {/* Signature + QR Code */}
        <div className="signature-area">
          <div className="signature-left">
            <div className="signature-line" />
            <div className="signature-name">{medicoNome}</div>
            {medico?.crm && <div className="signature-crm">CRM: {medico.crm}</div>}
            {medico?.especialidade && <div className="signature-crm">{medico.especialidade}</div>}
            {assinadoEm && (
              <div className="signature-crm" style={{ marginTop: 4 }}>
                Assinado digitalmente em {assinadoEm}
              </div>
            )}
          </div>
          <div className="qr-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR Code de verificação" width={80} height={80} />
            <div className="qr-label">Verifique a autenticidade</div>
          </div>
        </div>
      </div>
    </>
  )
}
