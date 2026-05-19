'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin-client'
import type { ActionResult, ImagingTipo } from '@/lib/types'

// ── Upload de arquivo de exame de imagem ─────────────────────

export async function uploadImagingFile(
  patientId: string,
  formData: FormData,
): Promise<ActionResult<{ url: string; fileName: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const file = formData.get('file') as File
  if (!file || file.size === 0) return { success: false, error: 'Arquivo inválido.' }
  if (file.size > 50 * 1024 * 1024) return { success: false, error: 'O arquivo deve ter no máximo 50 MB.' }

  const ext = file.name.split('.').pop() ?? 'bin'
  const path = `prontuario/${patientId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  // Usa adminClient para storage (bypassa RLS do bucket — auth já verificada acima)
  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('exames')
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) return { success: false, error: `Erro ao enviar: ${uploadError.message}` }

  const { data: { publicUrl } } = admin.storage.from('exames').getPublicUrl(path)

  return { success: true, data: { url: publicUrl, fileName: file.name } }
}

// ── Análise com IA ───────────────────────────────────────────

export interface ImagingAnalysis {
  tipo_sugerido:  ImagingTipo
  data_realizado: string | null   // YYYY-MM-DD
  laudo_extraido: string
}

export async function analyzeImagingFile(
  fileUrl: string,
): Promise<ActionResult<ImagingAnalysis>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: 'Chave ANTHROPIC_API_KEY não configurada no servidor.' }
  }

  // Baixa o arquivo da URL pública
  let fileBuffer: ArrayBuffer
  let contentType: string
  try {
    const res = await fetch(fileUrl)
    if (!res.ok) return { success: false, error: 'Não foi possível baixar o arquivo para análise.' }
    fileBuffer = await res.arrayBuffer()
    contentType = res.headers.get('content-type') ?? 'application/pdf'
  } catch {
    return { success: false, error: 'Erro ao acessar o arquivo.' }
  }

  const base64 = Buffer.from(fileBuffer).toString('base64')
  const isPdf  = contentType.includes('pdf')
  const isImg  = contentType.startsWith('image/')

  if (!isPdf && !isImg) {
    return { success: false, error: 'Formato não suportado para análise. Use PDF ou imagem.' }
  }

  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const fileContent = isPdf
    ? ({
        type: 'document' as const,
        source: {
          type: 'base64' as const,
          media_type: 'application/pdf' as const,
          data: base64,
        },
      })
    : ({
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: contentType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: base64,
        },
      })

  const prompt = `Você é um assistente médico especializado em nefrologia.
Analise este exame e retorne SOMENTE um JSON válido, sem texto adicional, no formato:
{
  "tipo_sugerido": "<um de: usg_rins | eco | tc_torax | tc_abdomen | ecg | outro>",
  "data_realizado": "<YYYY-MM-DD ou null se não encontrar>",
  "laudo_extraido": "<resumo claro e conciso do laudo em português, máximo 400 caracteres>"
}
Seja objetivo. Extraia as informações diretamente do documento.`

  try {
    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [fileContent, { type: 'text', text: prompt }],
      }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { success: false, error: 'A IA não retornou dados estruturados. Tente novamente.' }

    const parsed = JSON.parse(jsonMatch[0])

    const TIPOS_VALIDOS: ImagingTipo[] = ['usg_rins', 'eco', 'tc_torax', 'tc_abdomen', 'ecg', 'outro']
    const tipo: ImagingTipo = TIPOS_VALIDOS.includes(parsed.tipo_sugerido)
      ? parsed.tipo_sugerido
      : 'outro'

    return {
      success: true,
      data: {
        tipo_sugerido:  tipo,
        data_realizado: parsed.data_realizado ?? null,
        laudo_extraido: parsed.laudo_extraido ?? '',
      },
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return { success: false, error: `Erro na análise com IA: ${msg}` }
  }
}
