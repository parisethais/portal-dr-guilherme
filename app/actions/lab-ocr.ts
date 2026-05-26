'use server'

import Anthropic from '@anthropic-ai/sdk'
import { EXAM_CATALOG } from '@/lib/lab-catalog'
import type { ActionResult } from '@/lib/types'

export type OcrExtracted = Record<string, { value: string; unit: string }>

export async function extractLabResultsFromFile(
  fileBase64: string,
  mimeType: string,
): Promise<ActionResult<OcrExtracted>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: 'Chave da API Anthropic não configurada. Configure ANTHROPIC_API_KEY nas variáveis de ambiente.' }
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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

    const isPdf = mimeType === 'application/pdf'

    let responseText: string

    if (isPdf) {
      // PDFs: tenta API estável primeiro (claude-sonnet-4-5+), fallback para beta se falhar
      try {
        const response = await client.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 4096,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: fileBase64,
                  },
                } as any,
                { type: 'text', text: prompt },
              ],
            },
          ],
        })
        responseText = response.content.find(b => b.type === 'text')?.text ?? ''
      } catch {
        // Fallback: API beta legacy
        const response = await client.beta.messages.create({
          model: 'claude-sonnet-4-5',
          max_tokens: 4096,
          betas: ['pdfs-2024-09-25'],
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'document',
                  source: {
                    type: 'base64',
                    media_type: 'application/pdf',
                    data: fileBase64,
                  },
                },
                { type: 'text', text: prompt },
              ],
            },
          ],
        })
        responseText = response.content.find(b => b.type === 'text')?.text ?? ''
      }
    } else {
      // Imagens usam a API padrão
      const response = await client.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
                  data: fileBase64,
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      })
      responseText = response.content.find(b => b.type === 'text')?.text ?? ''
    }

    // Extrai JSON da resposta (pode vir com ```json ou texto ao redor)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[lab-ocr] Resposta sem JSON:', responseText.slice(0, 200))
      return { success: false, error: 'Não foi possível identificar resultados neste arquivo. Tente inserir manualmente.' }
    }

    const extracted: OcrExtracted = JSON.parse(jsonMatch[0])

    if (Object.keys(extracted).length === 0) {
      return { success: false, error: 'Nenhum resultado reconhecido no laudo. Tente inserir manualmente.' }
    }

    return { success: true, data: extracted }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[lab-ocr] Erro ao chamar Anthropic:', message)
    return { success: false, error: `Erro ao analisar laudo: ${message}` }
  }
}
