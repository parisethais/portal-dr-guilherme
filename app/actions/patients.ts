'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'

export async function createPatient(
  fullName: string,
  email: string
): Promise<ActionResult<{ password: string }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  if (!fullName.trim() || !email.trim()) {
    return { success: false, error: 'Nome e e-mail são obrigatórios.' }
  }

  const admin = createAdminClient()

  // Gera senha temporária: Portal + 4 dígitos aleatórios
  const digits = Math.floor(1000 + Math.random() * 9000)
  const tempPassword = `Portal${digits}`

  const { data, error } = await admin.auth.admin.createUser({
    email:         email.trim(),
    password:      tempPassword,
    email_confirm: true, // pula confirmação de email
    user_metadata: {
      full_name: fullName.trim(),
      role:      'paciente',
    },
  })

  if (error) {
    if (error.message.includes('already registered') || error.message.includes('already been registered')) {
      return { success: false, error: 'Este e-mail já está cadastrado.' }
    }
    return { success: false, error: error.message }
  }

  // Garante o perfil com role correto
  if (data.user) {
    await admin.from('profiles').upsert({
      id:        data.user.id,
      full_name: fullName.trim(),
      role:      'paciente',
    }, { onConflict: 'id' })
  }

  revalidatePath('/medico')
  return { success: true, data: { password: tempPassword } }
}

export async function deletePatient(patientId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  const admin = createAdminClient()

  // 1. Apaga dados do paciente em ordem para evitar erros de FK
  const byPatientId = [
    'consultas',
    'invoices',
    'care_plan_attachments',
    'care_plans',
    'patient_exams',
    'documents',
    'contact_requests',
  ]
  for (const table of byPatientId) {
    await admin.from(table).delete().eq('patient_id', patientId)
  }

  // Mensagens: paciente pode ser sender ou recipient
  await admin.from('messages').delete().eq('recipient_id', patientId)
  await admin.from('messages').delete().eq('sender_id', patientId)

  // 2. Deleta o profile explicitamente (remove qualquer FK residual)
  await admin.from('profiles').delete().eq('id', patientId)

  // 3. Deleta o usuário do Auth
  const { error } = await admin.auth.admin.deleteUser(patientId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  return { success: true }
}
