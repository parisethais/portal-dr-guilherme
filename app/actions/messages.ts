'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { notificarCopilot } from '@/lib/copilot'
import type { ActionResult } from '@/lib/types'

export async function sendMessage(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const recipientId = formData.get('recipient_id') as string
  const content = formData.get('content') as string

  if (!recipientId || !content?.trim()) {
    return { success: false, error: 'Preencha todos os campos.' }
  }

  const { error } = await supabase.from('messages').insert({
    sender_id:    user.id,
    recipient_id: recipientId,
    content:      content.trim(),
  })

  if (error) return { success: false, error: error.message }

  // Só notifica o copilot se quem enviou for paciente (não médico)
  supabase.from('profiles').select('full_name, phone, role').eq('id', user.id).single()
    .then(({ data: remetente }) => {
      if (remetente?.role === 'paciente') {
        notificarCopilot({
          evento: 'mensagem_enviada',
          paciente: { nome: remetente.full_name ?? '', telefone: remetente.phone },
          mensagem: content.trim(),
        })
      }
    })

  revalidatePath('/medico')
  revalidatePath('/paciente')
  return { success: true }
}

export async function markMessageAsRead(messageId: string): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { error } = await supabase
    .from('messages')
    .update({ read: true })
    .eq('id', messageId)
    .eq('recipient_id', user.id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/paciente')
  return { success: true }
}
