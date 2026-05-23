import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { createClient } from '@/lib/supabase/server'
import { computeLabAlerts } from '@/lib/lab-alerts'
import { EXAM_CATALOG } from '@/lib/lab-catalog'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

function fmtDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  // Auth check
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
  } catch { /* dev fallback */ }

  const { patientId } = await params
  const date = req.nextUrl.searchParams.get('date') // YYYY-MM-DD

  const db = createAdminClient()

  // Paciente
  const { data: paciente } = await db
    .from('profiles')
    .select('id, full_name, data_nascimento, sexo, diagnostico')
    .eq('id', patientId)
    .eq('role', 'paciente')
    .single()

  if (!paciente) return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 })

  // Resultados: todos para alertas; filtro por data para interpretar
  const { data: allResults } = await db
    .from('lab_results')
    .select('id, patient_id, exam_name, value, unit, collected_at, consulta_id, created_at')
    .eq('patient_id', patientId)
    .order('collected_at', { ascending: false })
    .limit(200)

  const labResults = allResults ?? []

  // Resultados da data solicitada (ou a mais recente se não especificada)
  const targetDate = date ?? labResults[0]?.collected_at ?? null
  if (!targetDate) {
    return NextResponse.json({ error: 'Nenhum resultado laboratorial encontrado.' }, { status: 404 })
  }

  const resultsDaData = labResults.filter(r => r.collected_at === targetDate)
  if (!resultsDaData.length) {
    return NextResponse.json({ error: 'Nenhum resultado para essa data.' }, { status: 404 })
  }

  // Alertas de TODOS os resultados (contexto histórico)
  const alertas = computeLabAlerts(labResults)

  // Referências para enriquecer o contexto
  const refMap: Record<string, string> = {}
  for (const def of EXAM_CATALOG) {
    let ref = ''
    if (def.noRef)       { ref = 'qualitativo'; }
    else if (def.refMin !== undefined && def.refMax !== undefined) { ref = `${def.refMin}–${def.refMax}` }
    else if (def.refMax !== undefined)  { ref = `≤ ${def.refMax}` }
    else if (def.refMin !== undefined)  { ref = `≥ ${def.refMin}` }
    if (ref) refMap[def.name] = `${ref}${def.unit ? ' ' + def.unit : ''}`
  }

  // Monta tabela de resultados da data
  const tabelaResultados = resultsDaData.map(r => {
    const ref = refMap[r.exam_name] ?? '—'
    return `- ${r.exam_name}: ${r.value}${r.unit ? ' ' + r.unit : ''} (ref: ${ref})`
  }).join('\n')

  const idadeAnos = paciente.data_nascimento
    ? Math.floor((Date.now() - new Date(paciente.data_nascimento).getTime()) / (365.25 * 86_400_000))
    : null

  const alertasTexto = alertas.length > 0
    ? alertas.map(a => `- [${a.severity === 'critical' ? 'CRÍTICO' : 'ATENÇÃO'}] ${a.exam_name}: ${a.latestValue}${a.latestUnit ? ' ' + a.latestUnit : ''} — ${a.message}`).join('\n')
    : 'Nenhum alerta ativo com base no histórico.'

  // Prompt
  const prompt = `Você é um assistente clínico especializado em medicina interna e nefrologia.
Interprete os seguintes resultados laboratoriais de forma clínica e objetiva.

PACIENTE:
- Nome: ${paciente.full_name}${idadeAnos ? `, ${idadeAnos} anos` : ''}
- Sexo: ${paciente.sexo ?? 'não informado'}
- Diagnóstico principal: ${paciente.diagnostico ?? 'não informado'}

RESULTADOS DA COLETA DE ${fmtDate(targetDate)}:
${tabelaResultados}

ALERTAS DO HISTÓRICO COMPLETO:
${alertasTexto}

INSTRUÇÕES:
- Interprete clinicamente cada grupo de exames (função renal, hematologia, eletrólitos, metabolismo, etc.)
- Destaque achados anormais e sua relevância clínica para o diagnóstico do paciente
- Sugira condutas específicas para valores alterados (ex: "Ajuste de dose de X", "Repetir exame em Y dias")
- Identifique tendências comparando com os alertas históricos quando disponível
- Use linguagem médica profissional em português (Brasil)
- Seja conciso mas completo. Máximo 400 palavras.

Retorne APENAS JSON válido (sem markdown):
{
  "sections": [
    {
      "emoji": "🔬",
      "titulo": "Função Renal",
      "conteudo": "texto interpretativo aqui"
    }
  ],
  "resumo_geral": "Uma frase descrevendo o estado geral dos exames"
}

Inclua apenas seções com resultados relevantes. Só o JSON, sem texto antes ou depois.`

  try {
    const response = await anthropic.messages.create({
      model:      'claude-opus-4-5',
      max_tokens: 1200,
      messages:   [{ role: 'user', content: prompt }],
    })

    const text = (response.content[0] as { type: string; text: string })?.text ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Resposta inválida da IA')

    const parsed = JSON.parse(jsonMatch[0])

    return NextResponse.json({
      gerado_em:     new Date().toISOString(),
      data_coleta:   targetDate,
      data_fmt:      fmtDate(targetDate),
      resumo_geral:  parsed.resumo_geral ?? '',
      sections:      parsed.sections ?? [],
    })
  } catch (err) {
    console.error('[labs/interpretar]', err)
    return NextResponse.json({ error: 'Erro ao gerar interpretação. Tente novamente.' }, { status: 500 })
  }
}
