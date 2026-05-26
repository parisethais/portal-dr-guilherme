import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { EXAM_CATALOG } from '@/lib/lab-catalog'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

export async function POST(req: NextRequest) {
  // Verifica autenticação
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ success: false, error: 'Não autorizado.' }, { status: 401 })
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ success: false, error: 'Chave da API Anthropic não configurada.' }, { status: 500 })
  }

  try {
    // Recebe apenas o path do Storage (corpo pequeno — arquivo já foi para o Supabase)
    const { path } = await req.json() as { path: string }
    if (!path) {
      return NextResponse.json({ success: false, error: 'Path do arquivo não informado.' })
    }

    // Baixa o arquivo do Supabase Storage
    const admin = createAdminClient()
    const { data: fileData, error: downloadError } = await admin.storage
      .from('exames')
      .download(path)

    if (downloadError || !fileData) {
      return NextResponse.json({ success: false, error: 'Não foi possível acessar o arquivo no storage.' })
    }

    // Determina tipo pelo caminho
    const ext = path.split('.').pop()?.toLowerCase() ?? 'pdf'
    const mimeType = ext === 'pdf'  ? 'application/pdf'
                   : ext === 'png'  ? 'image/png'
                   : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                   : ext === 'webp' ? 'image/webp'
                   : 'application/pdf'
    const isPdf = mimeType === 'application/pdf'

    const arrayBuffer = await fileData.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    // Remove o arquivo temporário (não espera — fire and forget)
    admin.storage.from('exames').remove([path]).catch(() => {})

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const MODEL = 'claude-opus-4-5'

    const examList = EXAM_CATALOG.map(e => `"${e.name}"`).join(', ')
    const prompt = `Você é um especialista em análise de laudos laboratoriais. Analise este laudo e extraia os resultados dos exames.

Retorne SOMENTE um objeto JSON válido, sem texto adicional, no formato:
{"nome_exame": {"value": "valor_numerico_ou_qualitativo", "unit": "unidade"}}

Procure pelos seguintes exames (use estes nomes exatos como chaves, somente os que encontrar no laudo):
${examList}

Regras:
- Use o valor exato como aparece no laudo (ex: "1.2", "negativo", "n.react", "4500")
- Use a unidade exata do laudo
- Ignore exames não listados acima
- Se um exame aparecer com resultado "alterado" ou "referência" sem valor numérico, ignore-o
- Não inclua exames não encontrados`

    let responseText = ''

    if (isPdf) {
      try {
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: 4096,
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as any,
              { type: 'text', text: prompt },
            ],
          }],
        })
        responseText = response.content.find(b => b.type === 'text')?.text ?? ''
      } catch (pdfErr) {
        console.warn('[lab-ocr] API estável falhou, tentando beta:', pdfErr instanceof Error ? pdfErr.message : String(pdfErr))
        const response = await client.beta.messages.create({
          model: MODEL,
          max_tokens: 4096,
          betas: ['pdfs-2024-09-25'],
          messages: [{
            role: 'user',
            content: [
              { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
              { type: 'text', text: prompt },
            ],
          }],
        })
        responseText = response.content.find(b => b.type === 'text')?.text ?? ''
      }
    } else {
      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                data: base64,
              },
            },
            { type: 'text', text: prompt },
          ],
        }],
      })
      responseText = response.content.find(b => b.type === 'text')?.text ?? ''
    }

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[lab-ocr] Resposta sem JSON:', responseText.slice(0, 200))
      return NextResponse.json({ success: false, error: 'Não foi possível identificar resultados neste arquivo. Tente inserir manualmente.' })
    }

    const extracted = JSON.parse(jsonMatch[0])

    if (Object.keys(extracted).length === 0) {
      return NextResponse.json({ success: false, error: 'Nenhum resultado reconhecido no laudo. Tente inserir manualmente.' })
    }

    return NextResponse.json({ success: true, data: extracted })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[lab-ocr] Erro:', message)
    return NextResponse.json({ success: false, error: `Erro ao analisar laudo: ${message}` }, { status: 500 })
  }
}
