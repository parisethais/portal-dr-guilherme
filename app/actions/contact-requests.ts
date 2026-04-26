'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

export async function createContactRequest(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const subject = formData.get('subject') as string
  const message = formData.get('message') as string

  if (!subject?.trim() || !message?.trim()) {
    return { success: false, error: 'Preencha todos os campos.' }
  }

  const { error } = await supabase.from('contact_requests').insert({
    patient_id: user.id,
    subject: subject.trim(),
    message: message.trim(),
  })

  if (error) return { success: false, error: error.message }

  revalidatePath('/paciente')
  return { success: true }
}

export async function updateContactRequestStatus(
  requestId: string,
  status: 'pendente' | 'em_andamento' | 'resolvido'
): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const { error } = await supabase
    .from('contact_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  return { success: true }
}
