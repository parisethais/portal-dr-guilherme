import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import { createClient } from '@/lib/supabase/server'
import { computeLabAlerts } from '@/lib/lab-alerts'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

function fmtDateTime(iso: string) {
  const d = new Date(iso)
  return (
    d.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ' ' +
    d.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
  )
}

const TIPO_LABEL: Record<string, string> = {
  primeira_consulta:           'Primeira Consulta',
  nova_consulta:               'Nova Consulta',
  retorno:                     'Retorno',
  primeira_consulta_desconto:  'Primeira Consulta (desc.)',
  nova_consulta_desconto:      'Nova Consulta (desc.)',
}

// ── Route Handler ─────────────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> },
) {
  // Autenticação via session cookie
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 })
    }
  } catch {
    // Em ambiente de dev pode não ter cookie — continua com admin
  }

  const { patientId } = await params
  const db = createAdminClient()

  // ── 1. Paciente ───────────────────────────────────────────────────────

  const { data: paciente, error: pErr } = await db
    .from('profiles')
    .select('id, full_name, data_nascimento, sexo, diagnostico, retorno_previsto, status_paciente')
    .eq('id', patientId)
    .eq('role', 'paciente')
    .single()

  if (pErr || !paciente) {
    return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 })
  }

  // ── 2. Consultas ──────────────────────────────────────────────────────

  const { data: todasConsultas } = await db
    .from('consultas')
    .select('id, data_hora, tipo, local, status, evolucao, diagnosticos, conduta, impressao, exame_fisico, pas, pad, fc, prontuario_finalizado, created_at')
    .eq('patient_id', patientId)
    .order('data_hora', { ascending: false })
    .limit(20)

  const agora = new Date()
  const consultas = (todasConsultas ?? []).filter(c => c.status !== 'cancelada' && c.status !== 'cancelado')

  // Próxima consulta agendada
  const proximaConsulta = consultas
    .filter(c => c.status === 'agendado' && new Date(c.data_hora) > agora)
    .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime())[0] ?? null

  // Últimas 5 consultas realizadas
  const realizadas = consultas
    .filter(c => c.status === 'realizado' || c.status === 'realizada')
    .slice(0, 5)

  // ── 3. Exames Laboratoriais ───────────────────────────────────────────

  const { data: labResults } = await db
    .from('lab_results')
    .select('id, patient_id, exam_name, value, unit, collected_at, consulta_id, created_at')
    .eq('patient_id', patientId)
    .order('collected_at', { ascending: false })
    .limit(100)

  const alertas = computeLabAlerts(labResults ?? [])

  // Últimas coletas por exame (top 10 mais recentes)
  const porExame: Record<string, { valor: string; unidade: string | null; data: string }> = {}
  for (const r of (labResults ?? [])) {
    if (!porExame[r.exam_name]) {
      porExame[r.exam_name] = { valor: r.value, unidade: r.unit, data: r.collected_at }
    }
  }
  const labRecentes = Object.entries(porExame).slice(0, 15)

  // ── 4. Monta contexto para a IA ──────────────────────────────────────

  const idadeAnos = paciente.data_nascimento
    ? Math.floor((agora.getTime() - new Date(paciente.data_nascimento).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null

  const contexto = `
PACIENTE:
- Nome: ${paciente.full_name}
- Sexo: ${paciente.sexo ?? 'não informado'}
${idadeAnos != null ? `- Idade: ${idadeAnos} anos (nasc. ${fmtDate(paciente.data_nascimento!)})` : ''}
- Diagnóstico principal: ${paciente.diagnostico ?? 'não registrado'}
- Status: ${paciente.status_paciente ?? 'ativo'}
${paciente.retorno_previsto ? `- Retorno previsto: ${fmtDate(paciente.retorno_previsto)}` : ''}

${proximaConsulta ? `PRÓXIMA CONSULTA AGENDADA:
- Data: ${fmtDateTime(proximaConsulta.data_hora)}
- Tipo: ${TIPO_LABEL[proximaConsulta.tipo] ?? proximaConsulta.tipo}
- Local: ${proximaConsulta.local ?? 'não informado'}
` : 'SEM CONSULTA AGENDADA NO MOMENTO\n'}

${alertas.length > 0 ? `ALERTAS LABORATORIAIS ATIVOS (${alertas.length}):
${alertas.map(a => `- [${a.severity === 'critical' ? 'CRÍTICO' : 'ATENÇÃO'}] ${a.exam_name}: ${a.latestValue}${a.latestUnit ? ' ' + a.latestUnit : ''} — ${a.message} (${fmtDate(a.latestDate)})`).join('\n')}
` : 'ALERTAS LABORATORIAIS: nenhum alerta ativo\n'}

${labRecentes.length > 0 ? `ÚLTIMOS EXAMES LABORATORIAIS:
${labRecentes.map(([exame, v]) => `- ${exame}: ${v.valor}${v.unidade ? ' ' + v.unidade : ''} (${fmtDate(v.data)})`).join('\n')}
` : 'EXAMES LABORATORIAIS: nenhum resultado registrado\n'}

${realizadas.length > 0 ? `HISTÓRICO RECENTE (últimas ${realizadas.length} consultas realizadas):
${realizadas.map((c, i) => {
  let diags: { nome: string }[] = []
  try { diags = JSON.parse(c.diagnosticos ?? '[]') } catch { /* noop */ }

  return `
Consulta ${i + 1} — ${fmtDate(c.data_hora)} (${TIPO_LABEL[c.tipo] ?? c.tipo}):
${diags.length > 0 ? `  Diagnósticos: ${diags.map(d => d.nome).join(', ')}` : ''}
${c.evolucao ? `  Evolução: ${c.evolucao.slice(0, 300)}${c.evolucao.length > 300 ? '...' : ''}` : ''}
${c.conduta ? `  Conduta: ${c.conduta.slice(0, 200)}${c.conduta.length > 200 ? '...' : ''}` : ''}
${c.impressao ? `  Impressão: ${c.impressao.slice(0, 200)}` : ''}
${(c.pas || c.pad || c.fc) ? `  Sinais vitais: PA ${c.pas ?? '?'}/${c.pad ?? '?'} mmHg, FC ${c.fc ?? '?'} bpm` : ''}
`.trim()
}).join('\n\n')}
` : 'HISTÓRICO: nenhuma consulta realizada registrada\n'}
`.trim()

  // ── 5. Prompt para Claude ─────────────────────────────────────────────

  const prompt = `Você é um assistente clínico especializado em medicina interna e nefrologia.
Com base nos dados do paciente abaixo, gere um SUMÁRIO PRÉ-CONSULTA estruturado para o médico.

${contexto}

INSTRUÇÕES:
- Seja objetivo, clínico e direto. Use linguagem médica profissional em português (Brasil).
- Destaque o que é mais relevante para a consulta de hoje.
- Para alertas laboratoriais críticos, seja enfático.
- Sugira tópicos específicos a explorar na consulta com base na evolução.
- Máximo 350 palavras no total.

Retorne APENAS JSON válido neste formato (sem markdown, sem blocos de código):
{
  "sections": [
    {
      "emoji": "🩺",
      "titulo": "Resumo do Paciente",
      "conteudo": "texto aqui"
    },
    {
      "emoji": "🔴",
      "titulo": "Alertas e Atenções",
      "conteudo": "texto aqui (omitir section se não houver alertas)"
    },
    {
      "emoji": "📊",
      "titulo": "Evolução Recente",
      "conteudo": "texto aqui (baseado nas últimas consultas)"
    },
    {
      "emoji": "🔬",
      "titulo": "Laboratório",
      "conteudo": "texto aqui (resultados relevantes e tendências)"
    },
    {
      "emoji": "🎯",
      "titulo": "Sugestões para Esta Consulta",
      "conteudo": "texto aqui (3-4 bullets com o que explorar)"
    }
  ]
}

Omita sections sem conteúdo relevante. Inclua só o JSON, sem texto antes ou depois.`

  // ── 6. Chama Claude ───────────────────────────────────────────────────

  let sections: { emoji: string; titulo: string; conteudo: string }[] = []

  try {
    const response = await anthropic.messages.create({
      model:      'claude-opus-4-5',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: prompt }],
    })

    const text = (response.content[0] as { type: string; text: string })?.text ?? ''

    // Parse JSON — tenta extrair mesmo com texto extra
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      sections = parsed.sections ?? []
    }
  } catch (err) {
    console.error('[sumario] Anthropic error:', err)
    return NextResponse.json({ error: 'Erro ao gerar sumário. Tente novamente.' }, { status: 500 })
  }

  return NextResponse.json({
    gerado_em:        new Date().toISOString(),
    proxima_consulta: proximaConsulta
      ? `${fmtDateTime(proximaConsulta.data_hora)} — ${TIPO_LABEL[proximaConsulta.tipo] ?? proximaConsulta.tipo}`
      : null,
    sections,
  })
}
