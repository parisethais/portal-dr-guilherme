/**
 * Geração de PDF do prontuário médico usando PDFKit.
 * Retorna o PDF como Buffer.
 */

import PDFDocument from 'pdfkit'

export interface ProntuarioPdfData {
  // Paciente
  patientName:     string
  patientCpf?:     string | null
  patientBirthday?: string | null   // YYYY-MM-DD

  // Médico
  doctorName:      string
  doctorCrm?:      string | null
  clinicName?:     string | null

  // Consulta
  consultaId:      string
  dataHora:        string           // ISO
  tipo:            string

  // Conteúdo
  diagnosticos?:   string | null    // JSON array ou texto
  evolucao?:       string | null
  conduta?:        string | null
  exameFisico?:    string | null
  obsConsulta?:    string | null

  // Meta
  geradoEm:        string           // ISO timestamp
}

function parseDiagnosticos(raw: string | null | undefined): string {
  if (!raw) return '—'
  try {
    const arr = JSON.parse(raw) as { nome?: string; cid?: string }[]
    if (!Array.isArray(arr) || arr.length === 0) return '—'
    return arr.map(d => d.cid ? `${d.nome} (${d.cid})` : d.nome ?? '').filter(Boolean).join('\n')
  } catch {
    return raw
  }
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'America/Sao_Paulo',
    })
  } catch { return iso }
}

export async function gerarProntuarioPdf(data: ProntuarioPdfData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: {
      Title:    `Prontuário — ${data.patientName}`,
      Author:   data.doctorName,
      Subject:  'Prontuário Médico Eletrônico',
      Creator:  'MedEn — Sistema de Saúde',
    }})

    doc.on('data',  chunk => chunks.push(chunk))
    doc.on('end',   ()    => resolve(Buffer.concat(chunks)))
    doc.on('error', err   => reject(err))

    const PRIMARY   = '#2D2B6B'
    const GRAY      = '#6B7280'
    const LIGHT     = '#F3F4F6'
    const pageW     = doc.page.width - 100   // margins

    // ── Cabeçalho ─────────────────────────────────────────────
    doc.rect(50, 40, pageW, 60).fill(PRIMARY)

    doc.fontSize(18).fillColor('#FFFFFF').font('Helvetica-Bold')
       .text('MedEn', 65, 52)
    doc.fontSize(9).font('Helvetica').fillColor('rgba(255,255,255,0.7)')
       .text('Sistema de Saúde', 65, 74)

    if (data.clinicName) {
      doc.fontSize(10).fillColor('#FFFFFF').font('Helvetica-Bold')
         .text(data.clinicName, 200, 62, { align: 'right', width: pageW - 155 })
    }

    doc.moveDown(4)

    // ── Título ────────────────────────────────────────────────
    doc.fontSize(16).font('Helvetica-Bold').fillColor(PRIMARY)
       .text('PRONTUÁRIO MÉDICO ELETRÔNICO', { align: 'center' })
    doc.moveDown(0.3)
    doc.fontSize(9).font('Helvetica').fillColor(GRAY)
       .text(`Consulta: ${data.consultaId}`, { align: 'center' })
    doc.moveDown(1)

    // ── Seção helper ──────────────────────────────────────────
    function section(title: string) {
      doc.rect(50, doc.y, pageW, 20).fill(LIGHT)
      doc.fontSize(9).font('Helvetica-Bold').fillColor(PRIMARY)
         .text(title, 58, doc.y - 16)
      doc.moveDown(0.8)
    }

    function field(label: string, value: string | null | undefined) {
      if (!value) return
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text(label + ':', { continued: true })
      doc.font('Helvetica').fillColor('#111827').text(' ' + value)
      doc.moveDown(0.3)
    }

    function multiline(label: string, value: string | null | undefined) {
      if (!value) return
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text(label + ':')
      doc.font('Helvetica').fillColor('#111827').text(value, { indent: 10 })
      doc.moveDown(0.5)
    }

    // ── Dados da Consulta ─────────────────────────────────────
    section('DADOS DA CONSULTA')
    field('Data e Hora',   formatDate(data.dataHora))
    field('Tipo',          data.tipo)
    doc.moveDown(0.5)

    // ── Paciente ──────────────────────────────────────────────
    section('PACIENTE')
    field('Nome',             data.patientName)
    field('CPF',              data.patientCpf)
    field('Data de Nascimento', data.patientBirthday
      ? formatDate(data.patientBirthday + 'T00:00:00')
      : undefined)
    doc.moveDown(0.5)

    // ── Médico Responsável ────────────────────────────────────
    section('MÉDICO RESPONSÁVEL')
    field('Nome', data.doctorName)
    field('CRM',  data.doctorCrm)
    doc.moveDown(0.5)

    // ── Observação da Consulta ────────────────────────────────
    if (data.obsConsulta) {
      section('OBSERVAÇÃO DA CONSULTA')
      multiline('', data.obsConsulta)
    }

    // ── Exame Físico ──────────────────────────────────────────
    if (data.exameFisico) {
      section('EXAME FÍSICO')
      multiline('', data.exameFisico)
    }

    // ── Diagnósticos ──────────────────────────────────────────
    section('DIAGNÓSTICOS')
    multiline('', parseDiagnosticos(data.diagnosticos))

    // ── Evolução ──────────────────────────────────────────────
    if (data.evolucao) {
      section('EVOLUÇÃO')
      multiline('', data.evolucao)
    }

    // ── Conduta ───────────────────────────────────────────────
    if (data.conduta) {
      section('CONDUTA')
      multiline('', data.conduta)
    }

    // ── Rodapé com info de assinatura ─────────────────────────
    doc.moveDown(2)
    doc.rect(50, doc.y, pageW, 1).fill(LIGHT)
    doc.moveDown(0.5)

    doc.fontSize(8).font('Helvetica').fillColor(GRAY)
       .text(`Documento gerado em ${formatDate(data.geradoEm)} pelo sistema MedEn.`, { align: 'center' })
    doc.text('Este documento possui assinatura digital ICP-Brasil (CAdES-BES).', { align: 'center' })
    doc.text('Valide a assinatura em validar.iti.gov.br', { align: 'center' })

    doc.end()
  })
}
