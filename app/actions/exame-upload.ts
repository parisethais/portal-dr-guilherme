'use server'

import { createAdminClient } from '@/lib/supabase/admin-client'
import type { ActionResult } from '@/lib/types'

// ── Lookup público por form_token ─────────────────────────────
export async function getPatientByToken(token: string): Promise<{
  id: string
  full_name: string | null
  lgpd_accepted: boolean
  tenant_id: string
} | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('id, full_name, lgpd_accepted, tenant_id')
    .eq('form_token', token)
    .eq('role', 'paciente')
    .single()
  return data ?? null
}

// ── Gera ou retorna o form_token do paciente ──────────────────
export async function getOrCreateExameToken(
  patientId: string,
): Promise<ActionResult<{ token: string }>> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('form_token')
    .eq('id', patientId)
    .single()

  if (profile?.form_token) return { success: true, data: { token: profile.form_token } }

  // Gera novo token aleatório
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
  const { error } = await admin
    .from('profiles')
    .update({ form_token: token })
    .eq('id', patientId)

  if (error) return { success: false, error: error.message }
  return { success: true, data: { token } }
}

// ── Aceite de LGPD por token (sem auth) ──────────────────────
export async function acceptLgpdByToken(
  token: string,
): Promise<ActionResult> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({
      lgpd_accepted:    true,
      lgpd_accepted_at: new Date().toISOString(),
      lgpd_version:     '2025-06-01',
    })
    .eq('form_token', token)
    .eq('role', 'paciente')

  if (error) return { success: false, error: error.message }
  return { success: true }
}

// ── Upload de arquivo via token ───────────────────────────────
export async function uploadExameByToken(
  token: string,
  formData: FormData,
): Promise<ActionResult<{ url: string; fileName: string }>> {
  const patient = await getPatientByToken(token)
  if (!patient) return { success: false, error: 'Link inválido ou expirado.' }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) return { success: false, error: 'Arquivo inválido.' }
  if (file.size > 30 * 1024 * 1024) return { success: false, error: 'O arquivo deve ter no máximo 30 MB.' }

  const ext  = file.name.split('.').pop() ?? 'pdf'
  const path = `paciente-uploads/${patient.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const admin = createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('exames')
    .upload(path, file, { contentType: file.type || 'application/pdf', upsert: false })

  if (uploadError) return { success: false, error: `Erro ao enviar: ${uploadError.message}` }

  const { data: { publicUrl } } = admin.storage.from('exames').getPublicUrl(path)
  return { success: true, data: { url: publicUrl, fileName: file.name } }
}

// ── Classificação com IA e salvamento ────────────────────────
export type ExameCategoria = 'laboratorial' | 'imagem' | 'biopsia'

export interface ClassificacaoResult {
  categoria:      ExameCategoria
  tipo:           string
  data_realizado: string | null
  laudo_resumido: string
}

export async function classifyAndSaveExame(
  token: string,
  fileUrl: string,
  fileName: string,
): Promise<ActionResult<ClassificacaoResult>> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return { success: false, error: 'IA não configurada no servidor.' }
  }

  const patient = await getPatientByToken(token)
  if (!patient) return { success: false, error: 'Link inválido.' }

  // ── Baixa o arquivo e classifica com Claude ───────────────
  let fileBuffer: ArrayBuffer
  let contentType: string
  try {
    const res = await fetch(fileUrl)
    if (!res.ok) return { success: false, error: 'Não foi possível acessar o arquivo.' }
    fileBuffer = await res.arrayBuffer()
    contentType = res.headers.get('content-type') ?? 'application/pdf'
  } catch {
    return { success: false, error: 'Erro ao acessar o arquivo.' }
  }

  const base64 = Buffer.from(fileBuffer).toString('base64')
  const isPdf  = contentType.includes('pdf')
  const isImg  = contentType.startsWith('image/')
  if (!isPdf && !isImg) return { success: false, error: 'Formato não suportado. Use PDF ou imagem.' }

  const { default: Anthropic } = await import('@anthropic-ai/sdk')
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const fileContent = isPdf
    ? ({ type: 'document' as const, source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: base64 } })
    : ({ type: 'image'    as const, source: { type: 'base64' as const, media_type: contentType as 'image/jpeg', data: base64 } })

  const prompt = `Você é um assistente médico. Analise este documento e retorne SOMENTE um JSON válido, sem texto adicional:
{
  "categoria": "laboratorial" | "imagem" | "biopsia",
  "tipo": "<nome específico do exame, ex: Hemograma Completo, Tomografia de Tórax, Biópsia Renal>",
  "data_realizado": "<YYYY-MM-DD ou null>",
  "laudo_resumido": "<resumo objetivo do resultado principal, máximo 400 caracteres>"
}

Critérios de categoria:
- laboratorial: hemograma, bioquímica, urina, hormônios, sorologias, culturas, genética
- imagem: radiografia, tomografia, ultrassom, ressonância, ecocardiograma, cintilografia, PET-scan, endoscopia
- biopsia: laudo anatomopatológico, biópsia, citologia, imunohistoquímica`

  let rawText = ''
  const MODEL = 'claude-haiku-4-5-20251001'

  try {
    try {
      const msg = await client.messages.create({
        model: MODEL, max_tokens: 512,
        messages: [{ role: 'user', content: [fileContent, { type: 'text', text: prompt }] }],
      })
      rawText = msg.content[0].type === 'text' ? msg.content[0].text : ''
    } catch {
      const msg = await client.beta.messages.create({
        model: MODEL, max_tokens: 512, betas: ['pdfs-2024-09-25'],
        messages: [{ role: 'user', content: [fileContent, { type: 'text', text: prompt }] }],
      })
      rawText = msg.content[0].type === 'text' ? msg.content[0].text : ''
    }
  } catch (err) {
    return { success: false, error: `Erro na IA: ${err instanceof Error ? err.message : 'Erro desconhecido'}` }
  }

  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return { success: false, error: 'IA não retornou classificação. Tente novamente.' }

  let parsed: ClassificacaoResult
  try {
    parsed = JSON.parse(jsonMatch[0])
  } catch {
    return { success: false, error: 'Resposta da IA inválida.' }
  }

  const CATEGORIAS: ExameCategoria[] = ['laboratorial', 'imagem', 'biopsia']
  if (!CATEGORIAS.includes(parsed.categoria)) parsed.categoria = 'imagem'
  if (!parsed.tipo)           parsed.tipo           = fileName
  if (!parsed.laudo_resumido) parsed.laudo_resumido = ''

  const today = new Date().toISOString().slice(0, 10)
  const dataRealizado = parsed.data_realizado ?? today

  // ── Salva no banco ────────────────────────────────────────
  const admin = createAdminClient()

  if (parsed.categoria === 'biopsia') {
    const { error } = await admin.from('biopsia_results').insert({
      patient_id:     patient.id,
      tenant_id:      patient.tenant_id,
      tipo:           parsed.tipo,
      data_realizado: dataRealizado,
      laudo_resumido: parsed.laudo_resumido || null,
      file_url:       fileUrl,
      file_name:      fileName,
    })
    if (error) return { success: false, error: error.message }
  } else {
    // laboratorial e imagem → imaging_results (armazenamento de PDF/documento)
    const { error } = await admin.from('imaging_results').insert({
      patient_id:     patient.id,
      tenant_id:      patient.tenant_id,
      tipo:           parsed.tipo,
      data_realizado: dataRealizado,
      laudo_resumido: parsed.laudo_resumido || null,
      file_url:       fileUrl,
      file_name:      fileName,
    })
    if (error) return { success: false, error: error.message }
  }

  return { success: true, data: parsed }
}
