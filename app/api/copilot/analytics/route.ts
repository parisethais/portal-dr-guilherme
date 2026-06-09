import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeLabAlerts } from '@/lib/lab-alerts'

const SECRET = process.env.COPILOT_SECRET

export async function GET(req: NextRequest) {
  if (req.headers.get('x-copilot-secret') !== SECRET) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  // ?periodo=30d|90d|6m|1a|tudo  (padrão: tudo)
  const periodo = req.nextUrl.searchParams.get('periodo') ?? 'tudo'

  const admin = createAdminClient()

  // ── Data de corte ──────────────────────────────────────────────
  let dataCorte: string | null = null
  if (periodo !== 'tudo') {
    const agora = new Date()
    if (periodo === '30d')  agora.setDate(agora.getDate() - 30)
    if (periodo === '90d')  agora.setDate(agora.getDate() - 90)
    if (periodo === '6m')   agora.setMonth(agora.getMonth() - 6)
    if (periodo === '1a')   agora.setFullYear(agora.getFullYear() - 1)
    dataCorte = agora.toISOString()
  }

  // ── Busca paralela de todas as entidades ──────────────────────
  const [
    { data: pacientes },
    { data: consultas },
    { data: labResults },
  ] = await Promise.all([
    admin.from('profiles').select('id, sexo, data_nascimento, status_paciente, diagnostico, created_at').eq('role', 'paciente'),
    dataCorte
      ? admin.from('consultas').select('id, tipo, local, status, data_hora, patient_id, diagnosticos, evolucao, pas, pad, fc').gte('data_hora', dataCorte)
      : admin.from('consultas').select('id, tipo, local, status, data_hora, patient_id, diagnosticos, evolucao, pas, pad, fc'),
    admin.from('lab_results').select('id, patient_id, exam_name, value, unit, collected_at, consulta_id, created_at'),
  ])

  const pacs  = pacientes  ?? []
  const conss = consultas  ?? []
  const labs  = labResults ?? []

  // ── Pacientes ─────────────────────────────────────────────────
  const porStatus: Record<string, number> = {}
  const porSexo:   Record<string, number> = {}
  for (const p of pacs) {
    porStatus[p.status_paciente ?? 'desconhecido'] = (porStatus[p.status_paciente ?? 'desconhecido'] ?? 0) + 1
    const s = p.sexo ?? 'não informado'
    porSexo[s] = (porSexo[s] ?? 0) + 1
  }

  // Faixas etárias
  const faixasEtarias: Record<string, number> = { '<18': 0, '18-30': 0, '31-45': 0, '46-60': 0, '61-75': 0, '>75': 0 }
  for (const p of pacs) {
    if (!p.data_nascimento) continue
    const idade = Math.floor((Date.now() - new Date(p.data_nascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    if      (idade < 18)  faixasEtarias['<18']++
    else if (idade < 31)  faixasEtarias['18-30']++
    else if (idade < 46)  faixasEtarias['31-45']++
    else if (idade < 61)  faixasEtarias['46-60']++
    else if (idade < 76)  faixasEtarias['61-75']++
    else                  faixasEtarias['>75']++
  }

  // ── Consultas ─────────────────────────────────────────────────
  const naoCanceladas = conss.filter(c => c.status !== 'cancelada')

  const porTipo:   Record<string, number> = {}
  const porLocal:  Record<string, number> = {}
  const porStatus2: Record<string, number> = {}
  for (const c of conss) {
    porTipo[c.tipo]     = (porTipo[c.tipo]     ?? 0) + 1
    porLocal[c.local]   = (porLocal[c.local]   ?? 0) + 1
    porStatus2[c.status] = (porStatus2[c.status] ?? 0) + 1
  }

  // Top diagnósticos (extrai de JSON das consultas)
  const dxCount: Record<string, number> = {}
  for (const c of naoCanceladas) {
    if (!c.diagnosticos) continue
    try {
      const dxs = JSON.parse(c.diagnosticos) as { nome: string }[]
      for (const dx of dxs) {
        if (dx.nome) dxCount[dx.nome] = (dxCount[dx.nome] ?? 0) + 1
      }
    } catch { /* ignora */ }
  }
  const topDiagnosticos = Object.entries(dxCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([nome, total]) => ({ nome, total }))

  // Sinais vitais médios (apenas consultas com dados)
  const comPA  = naoCanceladas.filter(c => c.pas != null && c.pad != null)
  const comFC  = naoCanceladas.filter(c => c.fc != null)
  const mediaPA = comPA.length > 0 ? {
    pas: Math.round(comPA.reduce((s, c) => s + (c.pas ?? 0), 0) / comPA.length),
    pad: Math.round(comPA.reduce((s, c) => s + (c.pad ?? 0), 0) / comPA.length),
    n:   comPA.length,
  } : null
  const mediaFC = comFC.length > 0 ? {
    fc: Math.round(comFC.reduce((s, c) => s + (c.fc ?? 0), 0) / comFC.length),
    n:  comFC.length,
  } : null

  // Consultas por mês (últimos 12 meses)
  const porMes: Record<string, number> = {}
  for (const c of naoCanceladas) {
    const mes = c.data_hora.slice(0, 7) // YYYY-MM
    porMes[mes] = (porMes[mes] ?? 0) + 1
  }
  const evolucaoMensal = Object.entries(porMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([mes, total]) => ({ mes, total }))

  // ── Laboratorial ──────────────────────────────────────────────
  // Pacientes com alertas laboratoriais
  const labPorPaciente: Record<string, typeof labs> = {}
  for (const r of labs) {
    ;(labPorPaciente[r.patient_id] ??= []).push(r)
  }

  let pacientesComAlertaCritico = 0
  let pacientesComAlertaAtencao = 0
  const examesAlteradosCount: Record<string, number> = {}

  for (const [, resultados] of Object.entries(labPorPaciente)) {
    const alertas = computeLabAlerts(resultados)
    if (alertas.some(a => a.severity === 'critical')) pacientesComAlertaCritico++
    else if (alertas.some(a => a.severity === 'warning')) pacientesComAlertaAtencao++
    for (const a of alertas) {
      examesAlteradosCount[a.exam_name] = (examesAlteradosCount[a.exam_name] ?? 0) + 1
    }
  }

  const topExamesAlterados = Object.entries(examesAlteradosCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([exame, pacientes_afetados]) => ({ exame, pacientes_afetados }))

  // ── Resposta ──────────────────────────────────────────────────
  return NextResponse.json({
    periodo,
    gerado_em: new Date().toISOString(),

    pacientes: {
      total:        pacs.length,
      por_status:   porStatus,
      por_sexo:     porSexo,
      faixas_etarias: faixasEtarias,
    },

    consultas: {
      total:          conss.length,
      nao_canceladas: naoCanceladas.length,
      por_tipo:       porTipo,
      por_local:      porLocal,
      por_status:     porStatus2,
      evolucao_mensal: evolucaoMensal,
      sinais_vitais_medios: {
        pressao_arterial: mediaPA,
        frequencia_cardiaca: mediaFC,
      },
    },

    diagnosticos: {
      top_20: topDiagnosticos,
    },

    laboratorial: {
      pacientes_com_alerta_critico: pacientesComAlertaCritico,
      pacientes_com_alerta_atencao: pacientesComAlertaAtencao,
      top_exames_alterados:         topExamesAlterados,
    },
  })
}
