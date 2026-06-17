'use server'

import Anthropic from '@anthropic-ai/sdk'
import { EXAM_CATALOG } from '@/lib/lab-catalog'
import type { ActionResult } from '@/lib/types'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'

/**
 * Gera uma URL assinada para o cliente fazer upload direto ao Supabase Storage,
 * sem passar pelo Next.js (evita limite de corpo da plataforma).
 */
export async function getLabOcrUploadUrl(
  fileName: string,
): Promise<ActionResult<{ signedUrl: string; path: string; token: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const admin = createAdminClient()
  const ext  = fileName.split('.').pop() ?? 'pdf'
  const path = `lab-ocr-temp/${user.id}/${Date.now()}.${ext}`

  const { data, error } = await admin.storage
    .from('exames')
    .createSignedUploadUrl(path)

  if (error) return { success: false, error: error.message }
  return { success: true, data: { signedUrl: data.signedUrl, path, token: data.token } }
}

export type OcrExtracted = Record<string, { value: string; unit: string }>

/**
 * Recebe o arquivo via FormData (não base64) para evitar problemas de
 * serialização de strings grandes em server actions do Next.js.
 */
export async function extractLabResultsFromFile(
  formData: FormData,
): Promise<ActionResult<OcrExtracted>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: 'Chave da API Anthropic não configurada.' }
  }

  try {
    const file = formData.get('file') as File | null
    if (!file || file.size === 0) {
      return { success: false, error: 'Arquivo não recebido pelo servidor.' }
    }

    // Converte para base64 no servidor — evita trafegar string enorme no corpo da action
    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')
    const mimeType = file.type || 'application/pdf'
    const isPdf = mimeType === 'application/pdf' || mimeType.includes('pdf')

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const MODEL = 'claude-3-5-sonnet-20241022'

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

    let responseText: string

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
            { type: 'image', source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 } },
            { type: 'text', text: prompt },
          ],
        }],
      })
      responseText = response.content.find(b => b.type === 'text')?.text ?? ''
    }

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
    const message = err instanceof Error ? err.message : String(err)
    console.error('[lab-ocr] Erro:', message)
    if (message.includes('prompt is too long') || message.includes('maximum context length')) {
      return {
        success: false,
        error: 'O laudo tem muitas páginas e não pôde ser lido automaticamente. Tente enviar somente as páginas com os resultados (geralmente as 2–3 primeiras) ou insira os valores manualmente.',
      }
    }
    return { success: false, error: `Erro ao analisar laudo: ${message}` }
  }
}
