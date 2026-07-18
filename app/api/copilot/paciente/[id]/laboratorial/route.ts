import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeLabAlerts } from '@/lib/lab-alerts'
import { isCopilotAuthorized, COPILOT_TENANT } from '@/lib/copilot-auth'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isCopilotAuthorized(req)) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  }

  const { id } = await params
  const admin = createAdminClient()

  // Verifica que o paciente existe no tenant do copilot
  const { data: paciente, error: pErr } = await admin
    .from('profiles')
    .select('id, full_name')
    .eq('id', id)
    .eq('role', 'paciente')
    .eq('tenant_id', COPILOT_TENANT)
    .single()

  if (pErr || !paciente) {
    return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 })
  }

  // Busca todos os resultados laboratoriais
  const { data: results, error: rErr } = await admin
    .from('lab_results')
    .select('id, patient_id, exam_name, value, unit, unit, collected_at, consulta_id, created_at')
    .eq('patient_id', id)
    .order('collected_at', { ascending: false })

  if (rErr) {
    return NextResponse.json({ error: rErr.message }, { status: 500 })
  }

  const labResults = results ?? []

  // Agrupa por exame para visão histórica
  const porExame: Record<string, { data: string; valor: string; unidade: string | null }[]> = {}
  for (const r of labResults) {
    if (!porExame[r.exam_name]) porExame[r.exam_name] = []
    porExame[r.exam_name].push({
      data:     r.collected_at,
      valor:    r.value,
      unidade:  r.unit,
    })
  }

  // Datas únicas de coleta (para visão de painéis)
  const datasColeta = [...new Set(labResults.map(r => r.collected_at))].sort().reverse()

  // Calcula alertas
  const alertas = computeLabAlerts(labResults)

  return NextResponse.json({
    paciente: { id: paciente.id, nome: paciente.full_name },
    datas_de_coleta: datasColeta,
    total_resultados: labResults.length,
    alertas: {
      criticos:  alertas.filter(a => a.severity === 'critical').length,
      atencao:   alertas.filter(a => a.severity === 'warning').length,
      lista: alertas.map(a => ({
        exame:      a.exam_name,
        severidade: a.severity,
        direcao:    a.direction,
        mensagem:   a.message,
        valor_atual: `${a.latestValue}${a.latestUnit ? ' ' + a.latestUnit : ''}`,
        data:       a.latestDate,
      })),
    },
    historico_por_exame: Object.entries(porExame).map(([exame, medicoes]) => ({
      exame,
      medicoes,
    })),
  })
}
