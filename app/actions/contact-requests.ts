'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { notificarCopilot } from '@/lib/copilot'
import { enviarRespostaAoContato } from '@/lib/email'
import type { ActionResult } from '@/lib/types'

export async function createContactRequest(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const subject = formData.get('subject') as string
  const message = formData.get('message') as string

  if (!subject?.trim() || !message?.trim()) {
    return { success: false, error: 'Preencha todos os campos.' }
  }

  const { error } = await supabase.from('contact_requests').insert({
    patient_id: user.id,
    subject:    subject.trim(),
    message:    message.trim(),
  })

  if (error) return { success: false, error: error.message }

  // Notifica o copilot (fire and forget)
  supabase.from('profiles').select('full_name, phone').eq('id', user.id).single()
    .then(({ data: paciente }) => {
      if (paciente) {
        notificarCopilot({
          evento: 'contato_solicitado',
          paciente: { nome: paciente.full_name ?? '', telefone: paciente.phone },
          mensagem: `[${subject.trim()}] ${message.trim()}`,
        })
      }
    })

  revalidatePath('/paciente')
  return { success: true }
}

export async function updateContactRequestStatus(
  requestId: string,
  status: 'pendente' | 'em_andamento' | 'resolvido'
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { error } = await supabase
    .from('contact_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  return { success: true }
}

export async function replyToContactRequest(
  requestId: string,
  response: string,
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  if (!response?.trim()) return { success: false, error: 'Escreva uma resposta.' }

  // Busca a solicitação + dados do paciente
  const { data: req, error: reqErr } = await supabase
    .from('contact_requests')
    .select('*, patient:profiles(full_name, email, phone)')
    .eq('id', requestId)
    .single()

  if (reqErr || !req) return { success: false, error: 'Solicitação não encontrada.' }

  // Salva a resposta e marca como resolvido
  const { error: updateErr } = await supabase
    .from('contact_requests')
    .update({
      response:      response.trim(),
      responded_at:  new Date().toISOString(),
      status:        'resolvido',
      updated_at:    new Date().toISOString(),
    })
    .eq('id', requestId)

  if (updateErr) return { success: false, error: updateErr.message }

  // Cria uma mensagem no portal para o paciente ver
  await supabase.from('messages').insert({
    sender_id:    user.id,
    recipient_id: req.patient_id,
    content:      `Re: ${req.subject}\n\n${response.trim()}`,
  })

  // Envia e-mail (fire and forget — não bloqueia se falhar)
  const paciente = req.patient as { full_name: string | null; email: string | null; phone: string | null } | null
  if (paciente?.email && paciente?.full_name) {
    enviarRespostaAoContato({
      pacienteEmail:    paciente.email,
      pacienteNome:     paciente.full_name,
      assunto:          req.subject,
      mensagemOriginal: req.message,
      resposta:         response.trim(),
    }).catch(err => console.error('[email] Falha ao enviar:', err))
  }

  revalidatePath('/medico')
  revalidatePath('/paciente')
  return { success: true }
}
