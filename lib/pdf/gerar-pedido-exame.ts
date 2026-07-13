import PDFDocument from 'pdfkit'

export interface PedidoExamePdfData {
  patientName:      string
  patientCpf?:      string | null
  patientBirthday?: string | null
  doctorName:       string
  doctorCrm?:       string | null
  clinicName?:      string | null
  tipo:             string
  exames:           string
  urgencia:         string
  indicacaoClinica?: string | null
  cid?:             string | null
  dataPedido:       string
  geradoEm:         string
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso + (iso.length === 10 ? 'T12:00:00' : '')).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })
  } catch { return iso }
}

const TIPO_LABEL: Record<string, string> = {
  laboratorial: 'Exames Laboratoriais',
  imagem:       'Exames de Imagem',
  outro:        'Outros Exames',
}

export async function gerarPedidoExamePdf(data: PedidoExamePdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: {
      Title:   `Pedido de Exame — ${data.patientName}`,
      Author:  data.doctorName,
      Subject: 'Pedido de Exame Médico',
      Creator: 'MedEn — Sistema de Saúde',
    }})

    doc.on('data',  chunk => chunks.push(chunk))
    doc.on('end',   ()    => resolve(Buffer.concat(chunks)))
    doc.on('error', err   => reject(err))

    const PRIMARY = '#2D2B6B'
    const GRAY    = '#6B7280'
    const LIGHT   = '#F3F4F6'
    const RED     = '#DC2626'
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

    // ── Título + urgência ─────────────────────────────────────────
    doc.fontSize(16).font('Helvetica-Bold').fillColor(PRIMARY)
       .text('PEDIDO DE EXAME', { align: 'center' })

    if (data.urgencia === 'urgente') {
      doc.moveDown(0.3)
      doc.fontSize(11).font('Helvetica-Bold').fillColor(RED)
         .text('⚠ URGENTE', { align: 'center' })
    }
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
    section('MÉDICO SOLICITANTE')
    field('Nome', data.doctorName)
    field('CRM',  data.doctorCrm)
    doc.moveDown(0.5)

    // ── Pedido ────────────────────────────────────────────────────
    section(TIPO_LABEL[data.tipo] ?? 'EXAMES SOLICITADOS')
    field('Data do pedido', formatDate(data.dataPedido))
    if (data.indicacaoClinica) field('Indicação clínica', data.indicacaoClinica)
    if (data.cid)              field('CID', data.cid)
    doc.moveDown(0.5)

    doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text('Exames solicitados:')
    doc.moveDown(0.3)

    // Lista de exames — cada linha separada por quebra
    const linhas = data.exames.split('\n').map(l => l.trim()).filter(Boolean)
    linhas.forEach((linha, i) => {
      doc.fontSize(10).font('Helvetica').fillColor('#111827')
         .text(`${i + 1}. ${linha}`, { indent: 10 })
      doc.moveDown(0.3)
    })

    // ── Assinatura ────────────────────────────────────────────────
    doc.moveDown(3)
    const dataFmt = formatDate(data.dataPedido)
    doc.fontSize(9).font('Helvetica').fillColor(GRAY)
       .text(`Data: ${dataFmt}`, { align: 'right' })
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
