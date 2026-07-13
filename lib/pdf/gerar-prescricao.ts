import PDFDocument from 'pdfkit'

export interface PrescricaoPdfItem {
  medicamento: string
  dose:        string | null
  posologia:   string | null
  via:         string | null
  obs:         string | null
  data_inicio: string
  data_fim:    string | null
}

export interface PrescricaoPdfData {
  patientName:     string
  patientCpf?:     string | null
  patientBirthday?: string | null
  doctorName:      string
  doctorCrm?:      string | null
  clinicName?:     string | null
  itens:           PrescricaoPdfItem[]
  geradoEm:        string
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch { return iso }
}

export async function gerarPrescricaoPdf(data: PrescricaoPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: {
      Title:   `Prescrição — ${data.patientName}`,
      Author:  data.doctorName,
      Subject: 'Prescrição Médica',
      Creator: 'MedEn — Sistema de Saúde',
    }})

    doc.on('data',  chunk => chunks.push(chunk))
    doc.on('end',   ()    => resolve(Buffer.concat(chunks)))
    doc.on('error', err   => reject(err))

    const PRIMARY = '#2D2B6B'
    const GRAY    = '#6B7280'
    const LIGHT   = '#F3F4F6'
    const pageW   = doc.page.width - 100

    // ── Cabeçalho ────────────────────────────────────────────────
    doc.rect(50, 40, pageW, 60).fill(PRIMARY)
    doc.fontSize(18).fillColor('#FFFFFF').font('Helvetica-Bold').text('MedEn', 65, 52)
    doc.fontSize(9).font('Helvetica').fillColor('rgba(255,255,255,0.7)').text('Sistema de Saúde', 65, 74)
    if (data.clinicName) {
      doc.fontSize(10).fillColor('#FFFFFF').font('Helvetica-Bold')
         .text(data.clinicName, 200, 62, { align: 'right', width: pageW - 155 })
    }
    doc.moveDown(4)

    // ── Título ────────────────────────────────────────────────────
    doc.fontSize(16).font('Helvetica-Bold').fillColor(PRIMARY)
       .text('PRESCRIÇÃO MÉDICA', { align: 'center' })
    doc.moveDown(1)

    function section(title: string) {
      doc.rect(50, doc.y, pageW, 20).fill(LIGHT)
      doc.fontSize(9).font('Helvetica-Bold').fillColor(PRIMARY).text(title, 58, doc.y - 16)
      doc.moveDown(0.8)
    }

    function field(label: string, value: string | null | undefined) {
      if (!value) return
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text(label + ':', { continued: true })
      doc.font('Helvetica').fillColor('#111827').text(' ' + value)
      doc.moveDown(0.3)
    }

    // ── Paciente ──────────────────────────────────────────────────
    section('PACIENTE')
    field('Nome', data.patientName)
    field('CPF',  data.patientCpf)
    field('Data de Nascimento', data.patientBirthday ? formatDate(data.patientBirthday) : undefined)
    doc.moveDown(0.5)

    // ── Médico ────────────────────────────────────────────────────
    section('MÉDICO PRESCRITOR')
    field('Nome', data.doctorName)
    field('CRM',  data.doctorCrm)
    doc.moveDown(0.5)

    // ── Medicamentos ──────────────────────────────────────────────
    section('MEDICAMENTOS PRESCRITOS')
    data.itens.forEach((item, idx) => {
      doc.fontSize(10).font('Helvetica-Bold').fillColor(PRIMARY)
         .text(`${idx + 1}. ${item.medicamento}`)
      if (item.dose)     doc.fontSize(9).font('Helvetica').fillColor('#374151').text(`   Dose: ${item.dose}`)
      if (item.posologia) doc.fontSize(9).font('Helvetica').fillColor('#374151').text(`   Posologia: ${item.posologia}`)
      if (item.via)       doc.fontSize(9).font('Helvetica').fillColor('#374151').text(`   Via: ${item.via}`)
      doc.fontSize(9).font('Helvetica').fillColor(GRAY)
         .text(`   Início: ${formatDate(item.data_inicio)}${item.data_fim ? `  ·  Término: ${formatDate(item.data_fim)}` : ''}`)
      if (item.obs) doc.fontSize(8).fillColor(GRAY).text(`   Obs: ${item.obs}`)
      doc.moveDown(0.7)
    })

    // ── Data e assinatura ─────────────────────────────────────────
    doc.moveDown(2)
    const dataEmissao = formatDate(data.geradoEm)
    doc.fontSize(9).font('Helvetica').fillColor(GRAY)
       .text(`Emitido em ${dataEmissao}`, { align: 'right' })
    doc.moveDown(3)
    doc.rect(doc.page.width / 2 + 30, doc.y, pageW / 2 - 30, 1).fill('#374151')
    doc.moveDown(0.4)
    doc.fontSize(9).font('Helvetica').fillColor('#374151')
       .text(data.doctorName, { align: 'right' })
    if (data.doctorCrm) {
      doc.fontSize(8).fillColor(GRAY).text(`CRM ${data.doctorCrm}`, { align: 'right' })
    }

    // ── Rodapé ────────────────────────────────────────────────────
    doc.moveDown(2)
    doc.rect(50, doc.y, pageW, 1).fill(LIGHT)
    doc.moveDown(0.5)
    doc.fontSize(8).font('Helvetica').fillColor(GRAY)
       .text('Este documento possui assinatura digital ICP-Brasil (CAdES-BES).', { align: 'center' })
    doc.text('Valide a assinatura em validar.iti.gov.br', { align: 'center' })

    doc.end()
  })
}
