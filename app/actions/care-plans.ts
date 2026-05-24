'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/lib/types'
import { getCallerTenantId } from '@/lib/get-caller-tenant'

export async function upsertCarePlan(patientId: string, content: string): Promise<ActionResult> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autorizado.' }

  if (!content.trim()) return { success: false, error: 'O plano de cuidados não pode estar vazio.' }

  const tenantId = await getCallerTenantId(user.id)

  const { error } = await supabase.from('care_plans').upsert(
    {
      patient_id: patientId,
      content:    content.trim(),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
      tenant_id:  tenantId,
    },
    { onConflict: 'patient_id' }
  )

  if (error) return { success: false, error: error.message }

  revalidatePath('/medico')
  revalidatePath('/paciente')
  return { success: true }
}
